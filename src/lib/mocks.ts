/**
 * Mock API used when NEXT_PUBLIC_USE_MOCKS=true.
 * Runs the same pure engines as the server against the bundled sample policy, in memory.
 */
import type {
  AskResponse,
  ClauseCategory,
  CompareResult,
  EstimateInput,
  EstimateResult,
  EvidenceRef,
  PageContent,
  Policy,
  PolicyListItem,
  PolicyStatus,
  ReportItem,
} from "./types";
import { buildSummary, chunkPages, extractMeta, extractTerms, type RawChunk } from "./engine/understand";
import { SAMPLE_FILE_NAME, SAMPLE_POLICY_PAGES } from "./engine/samplePolicy";
import { answerQuestion, checkCoverage, type Retriever } from "./engine/answer";
import { compareEstimates, runEstimate } from "./engine/calc";

interface MockPolicy {
  policy: Policy;
  pages: string[];
  chunks: RawChunk[];
}

const store = new Map<string, MockPolicy>();
const reports: ReportItem[] = [];

function retriever(mp: MockPolicy): Retriever {
  return {
    async search(terms, limit, category) {
      const t = terms.map((x) => x.toLowerCase());
      return mp.chunks
        .filter((c) => !category || c.category === category)
        .map((c) => {
          const txt = (c.heading + " " + c.text).toLowerCase();
          const score = t.reduce((n, term) => n + (txt.includes(term) ? 1 : 0) + (c.heading.toLowerCase().includes(term) ? 1 : 0), 0);
          return { c, score };
        })
        .filter((x) => x.score > 0)
        .sort((a, b) => b.score - a.score)
        .slice(0, limit)
        .map((x) => x.c as EvidenceRef);
    },
    async byCategory(category: ClauseCategory, limit: number) {
      return mp.chunks.filter((c) => c.category === category).slice(0, limit);
    },
  };
}

function need(id: string): MockPolicy {
  const mp = store.get(id);
  if (!mp) throw Object.assign(new Error("Policy not found."), { code: "not_found" });
  return mp;
}

function listItem(p: Policy): PolicyListItem {
  const { meta, terms, summary, ...rest } = p;
  void meta;
  void terms;
  void summary;
  return rest;
}

export const mockApi = {
  async listPolicies(): Promise<PolicyListItem[]> {
    return Array.from(store.values()).map((m) => listItem(m.policy)).reverse();
  },
  async createPolicy(fileName: string, fileSize: number): Promise<PolicyListItem> {
    const id = globalThis.crypto.randomUUID();
    const policy: Policy = {
      id,
      fileName,
      fileSize,
      status: "extracting",
      errorCode: null,
      errorMessage: null,
      isSample: fileName === SAMPLE_FILE_NAME,
      pageCount: 0,
      policyName: null,
      insurer: null,
      createdAt: new Date().toISOString(),
      meta: null,
      terms: null,
      summary: null,
    };
    store.set(id, { policy, pages: [], chunks: [] });
    return listItem(policy);
  },
  async processPolicy(id: string): Promise<PolicyListItem> {
    const mp = need(id);
    const p = mp.policy;
    const next: Record<string, PolicyStatus> = { extracting: "understanding", understanding: "indexing", indexing: "ready" };
    if (p.status === "extracting") {
      // Mock mode has no PDF parser: the bundled sample text stands in for any upload.
      mp.pages = SAMPLE_POLICY_PAGES;
      p.pageCount = mp.pages.length;
    } else if (p.status === "understanding") {
      mp.chunks = chunkPages(mp.pages);
      const terms = extractTerms(mp.chunks);
      p.terms = terms;
      p.meta = extractMeta(mp.pages, mp.chunks, terms, p.fileName);
      p.summary = buildSummary(mp.chunks, terms);
      p.policyName = p.meta.policyName;
      p.insurer = p.meta.insurer;
    }
    p.status = next[p.status] ?? p.status;
    await new Promise((r) => setTimeout(r, 150));
    return listItem(p);
  },
  async getPolicy(id: string): Promise<Policy> {
    return need(id).policy;
  },
  async getPage(id: string, page: number): Promise<PageContent> {
    const mp = need(id);
    return { page, pageCount: mp.pages.length, chunks: mp.chunks.filter((c) => c.page === page) };
  },
  async ask(id: string, question: string): Promise<AskResponse> {
    const mp = need(id);
    return answerQuestion(retriever(mp), mp.policy, question);
  },
  async estimate(id: string, input: EstimateInput, save: boolean): Promise<EstimateResult> {
    const mp = need(id);
    const cov = await checkCoverage(retriever(mp), input.treatment);
    const result = runEstimate(input, mp.policy.terms, cov);
    if (save) {
      result.reportId = globalThis.crypto.randomUUID();
      reports.unshift({ id: result.reportId, policyId: id, kind: "estimate", title: `${result.treatmentLabel} · ${input.city}`, createdAt: new Date().toISOString(), result });
    }
    return result;
  },
  async compare(id: string, a: EstimateInput, b: EstimateInput): Promise<CompareResult> {
    const mp = need(id);
    const rt = retriever(mp);
    const res = compareEstimates(
      runEstimate(a, mp.policy.terms, await checkCoverage(rt, a.treatment)),
      runEstimate(b, mp.policy.terms, await checkCoverage(rt, b.treatment)),
      mp.policy.terms
    );
    res.reportId = globalThis.crypto.randomUUID();
    reports.unshift({ id: res.reportId, policyId: id, kind: "compare", title: `Compare: ${res.diffs.map((d) => d.label).join(", ")}`, createdAt: new Date().toISOString(), result: res });
    return res;
  },
  async deletePolicy(id: string) {
    store.delete(id);
  },
  async listReports(policyId?: string) {
    return reports.filter((r) => !policyId || r.policyId === policyId);
  },
  async deleteReport(id: string) {
    const i = reports.findIndex((r) => r.id === id);
    if (i >= 0) reports.splice(i, 1);
  },
};
