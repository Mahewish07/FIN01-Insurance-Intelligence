import { desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { reports } from "@/db/schema";
import type { ReportItem } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const policyId = new URL(req.url).searchParams.get("policyId");
  try {
    const q = db.select().from(reports);
    const rows =
      policyId && /^[0-9a-f-]{36}$/i.test(policyId)
        ? await q.where(eq(reports.policyId, policyId)).orderBy(desc(reports.createdAt)).limit(50)
        : await q.orderBy(desc(reports.createdAt)).limit(50);
    const items: ReportItem[] = rows.map((r) => ({
      id: r.id,
      policyId: r.policyId,
      kind: r.kind as ReportItem["kind"],
      title: r.title,
      createdAt: r.createdAt.toISOString(),
      result: r.result as ReportItem["result"],
    }));
    return Response.json({ reports: items });
  } catch (e) {
    console.error(e);
    return Response.json({ error: "server_error", message: "Could not load reports." }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  const id = new URL(req.url).searchParams.get("id");
  if (!id || !/^[0-9a-f-]{36}$/i.test(id)) return Response.json({ error: "bad_request", message: "Missing id." }, { status: 400 });
  await db.delete(reports).where(eq(reports.id, id));
  return Response.json({ ok: true });
}
