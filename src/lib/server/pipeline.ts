import { and, asc, desc, eq, isNull, lt, or, sql } from "drizzle-orm";
import { db } from "@/db";
import { policies, policyChunks, policyFiles } from "@/db/schema";
import type {
  ClauseCategory,
  EvidenceRef,
  Policy,
  PolicyErrorCode,
  PolicyListItem,
  PolicyMeta,
  PolicyStatus,
  PolicySummary,
  PolicyTerms,
} from "@/lib/types";
import { buildSummary, chunkPages, extractMeta, extractTerms, type RawChunk } from "@/lib/engine/understand";

type PolicyRow = typeof policies.$inferSelect;

export function toListItem(row: PolicyRow): PolicyListItem {
  const meta = row.meta as PolicyMeta | null;
  return {
    id: row.id,
    fileName: row.fileName,
    fileSize: row.fileSize,
    status: row.status as PolicyStatus,
    errorCode: (row.errorCode as PolicyErrorCode | null) ?? null,
    errorMessage: row.errorMessage,
    isSample: row.isSample,
    pageCount: row.pageCount,
    policyName: meta?.policyName ?? null,
    insurer: meta?.insurer ?? null,
    createdAt: row.createdAt.toISOString(),
  };
}

export function toPolicy(row: PolicyRow): Policy {
  return {
    ...toListItem(row),
    meta: (row.meta as PolicyMeta | null) ?? null,
    terms: (row.terms as PolicyTerms | null) ?? null,
    summary: (row.summary as PolicySummary | null) ?? null,
  };
}

export async function getPolicyRow(id: string) {
  if (!/^[0-9a-f-]{36}$/i.test(id)) return null;
  const rows = await db.select().from(policies).where(eq(policies.id, id)).limit(1);
  return rows[0] ?? null;
}

async function setStatus(id: string, patch: Partial<typeof policies.$inferInsert>, leaseToken?: string) {
  const where = leaseToken ? and(eq(policies.id, id), eq(policies.processingToken, leaseToken)) : eq(policies.id, id);
  await db
    .update(policies)
    .set({ ...patch, processingAt: null, processingToken: null, updatedAt: new Date() })
    .where(where);
}

async function fail(id: string, code: PolicyErrorCode, message: string, leaseToken?: string) {
  await setStatus(id, { status: "failed", errorCode: code, errorMessage: message }, leaseToken);
}

export async function stageExtract(row: PolicyRow, leaseToken?: string) {
  const file = await db.select().from(policyFiles).where(eq(policyFiles.policyId, row.id)).limit(1);
  if (!file[0]) return fail(row.id, "server_error", "The uploaded file could not be found. Please upload it again.", leaseToken);
  const buf = file[0].data;
  if (buf.subarray(0, 5).toString("latin1") !== "%PDF-") {
    return fail(row.id, "unsupported_pdf", "This file is not a valid PDF document.");
  }
  let pages: string[];
  try {
    const { extractText, getDocumentProxy } = await import("unpdf");
    const pdf = await getDocumentProxy(new Uint8Array(buf));
    const res = await extractText(pdf, { mergePages: false });
    pages = (res.text as string[]).map((t) => t ?? "");
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (/password/i.test(msg)) return fail(row.id, "unsupported_pdf", "This PDF is password-protected. Remove the password and upload again.", leaseToken);
    return fail(row.id, "unsupported_pdf", "We could not read this PDF. It may be corrupted or use an unsupported format.", leaseToken);
  }
  const totalChars = pages.reduce((n, p) => n + p.replace(/\s/g, "").length, 0);
  if (pages.length === 0 || totalChars / Math.max(pages.length, 1) < 60) {
    return fail(row.id, "ocr_required", "This PDF appears to be scanned images without selectable text. OCR is required before it can be analysed.", leaseToken);
  }
  await setStatus(row.id, { status: "understanding", pages, pageCount: pages.length }, leaseToken);
}

export async function runUnderstanding(id: string, pages: string[], fileName: string, leaseToken?: string) {
  const chunks = chunkPages(pages);
  if (chunks.length === 0) {
    return fail(id, "unsupported_pdf", "No readable clauses were found in this document.", leaseToken);
  }
  const terms = extractTerms(chunks);
  const meta = extractMeta(pages, chunks, terms, fileName);
  const summary = buildSummary(chunks, terms);

  await db.transaction(async (tx) => {
    if (leaseToken) {
      // Serialize the destructive rebuild with any lease takeover. If the token no
      // longer matches, do nothing: a newer worker owns this policy now.
      const ownership = await tx.execute(sql`select id from policies where id = ${id} and processing_token = ${leaseToken} for update`);
      if (ownership.rows.length === 0) return;
    }
    await tx.delete(policyChunks).where(eq(policyChunks.policyId, id));
    for (let i = 0; i < chunks.length; i += 200) {
      await tx.insert(policyChunks).values(
        chunks.slice(i, i + 200).map((c: RawChunk) => ({
          id: c.chunkId,
          policyId: id,
          page: c.page,
          section: c.section,
          heading: c.heading,
          category: c.category,
          text: c.text,
          ordinal: c.ordinal,
        }))
      );
    }
    const where = leaseToken ? and(eq(policies.id, id), eq(policies.processingToken, leaseToken)) : eq(policies.id, id);
    await tx
      .update(policies)
      .set({ status: "indexing", meta, terms, summary, processingAt: null, processingToken: null, updatedAt: new Date() })
      .where(where);
  });
}

export async function stageIndex(id: string, leaseToken?: string) {
  await db.execute(
    sql`update policy_chunks set search = setweight(to_tsvector('english', coalesce(heading, '')), 'A') || setweight(to_tsvector('english', text), 'B') where policy_id = ${id}`
  );
  await setStatus(id, { status: "ready" }, leaseToken);
}

/**
 * Runs exactly one pending stage. A database lease avoids duplicate chunk insertion
 * when the browser retries or two tabs call the process endpoint together. Leases
 * older than two minutes are recoverable after an interrupted worker.
 */
export async function processNextStage(id: string) {
  const beforeClaim = await getPolicyRow(id);
  if (!beforeClaim) return null;
  if (!["extracting", "understanding", "indexing"].includes(beforeClaim.status)) return beforeClaim;

  const staleBefore = new Date(Date.now() - 2 * 60 * 1000);
  const leaseToken = globalThis.crypto.randomUUID();
  const [row] = await db
    .update(policies)
    .set({ processingAt: new Date(), processingToken: leaseToken, updatedAt: new Date() })
    .where(
      and(
        eq(policies.id, id),
        eq(policies.status, beforeClaim.status),
        or(isNull(policies.processingAt), lt(policies.processingAt, staleBefore))
      )
    )
    .returning();

  // Another request owns the active lease. Return the current record without doing work.
  if (!row) return getPolicyRow(id);

  try {
    if (row.status === "extracting") await stageExtract(row, leaseToken);
    else if (row.status === "understanding") await runUnderstanding(id, (row.pages as string[]) ?? [], row.fileName, leaseToken);
    else if (row.status === "indexing") await stageIndex(id, leaseToken);
  } catch (e) {
    console.error("processing failed", e);
    await fail(id, "server_error", "Something went wrong while processing this policy. Please retry.", leaseToken);
  }
  return getPolicyRow(id);
}

function sanitizeTerm(t: string) {
  return t
    .toLowerCase()
    .split(/\s+/)
    .map((w) => w.replace(/[^a-z0-9]/g, ""))
    .filter((w) => w.length >= 2);
}

export async function searchChunks(policyId: string, terms: string[], limit = 8, category?: ClauseCategory) {
  const parts = terms
    .slice(0, 16)
    .map(sanitizeTerm)
    .filter((w) => w.length)
    .map((ws) => (ws.length > 1 ? `(${ws.join(" & ")})` : ws[0]));
  if (!parts.length) return [];
  const q = Array.from(new Set(parts)).join(" | ");
  const where = category
    ? sql`policy_id = ${policyId} and category = ${category} and search @@ to_tsquery('english', ${q})`
    : sql`policy_id = ${policyId} and search @@ to_tsquery('english', ${q})`;
  const res = await db.execute(
    sql`select id, page, section, heading, category, text, ts_rank_cd(search, to_tsquery('english', ${q})) as rank
        from policy_chunks where ${where} order by rank desc, ordinal asc limit ${limit}`
  );
  return (res.rows as Record<string, unknown>[]).map((r) => ({
    chunkId: String(r.id),
    page: Number(r.page),
    section: String(r.section),
    heading: String(r.heading),
    category: r.category as ClauseCategory,
    text: String(r.text),
    rank: Number(r.rank),
  }));
}

export async function chunksByCategory(policyId: string, category: ClauseCategory, limit = 6): Promise<EvidenceRef[]> {
  const rows = await db
    .select()
    .from(policyChunks)
    .where(and(eq(policyChunks.policyId, policyId), eq(policyChunks.category, category)))
    .orderBy(asc(policyChunks.ordinal))
    .limit(limit);
  return rows.map((r) => ({ chunkId: r.id, page: r.page, section: r.section, heading: r.heading, category: r.category as ClauseCategory, text: r.text }));
}

export async function getPage(policyId: string, page: number): Promise<EvidenceRef[]> {
  const rows = await db
    .select()
    .from(policyChunks)
    .where(and(eq(policyChunks.policyId, policyId), eq(policyChunks.page, page)))
    .orderBy(asc(policyChunks.ordinal));
  return rows.map((r) => ({ chunkId: r.id, page: r.page, section: r.section, heading: r.heading, category: r.category as ClauseCategory, text: r.text }));
}

export async function listPolicies() {
  const rows = await db.select().from(policies).orderBy(desc(policies.createdAt));
  return rows.map(toListItem);
}

export function dbRetriever(policyId: string) {
  return {
    search: (terms: string[], limit: number, category?: ClauseCategory) => searchChunks(policyId, terms, limit, category) as Promise<EvidenceRef[]>,
    byCategory: (category: ClauseCategory, limit: number) => chunksByCategory(policyId, category, limit),
  };
}
