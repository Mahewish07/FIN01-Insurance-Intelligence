import { getPage, getPolicyRow } from "@/lib/server/pipeline";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string; page: string }> };

export async function GET(_req: Request, { params }: Ctx) {
  const { id, page } = await params;
  const n = parseInt(page, 10);
  const row = await getPolicyRow(id);
  if (!row) return Response.json({ error: "not_found", message: "Policy not found." }, { status: 404 });
  if (!Number.isFinite(n) || n < 1 || n > row.pageCount) {
    return Response.json({ error: "not_found", message: "Page not found." }, { status: 404 });
  }
  const chunks = await getPage(id, n);
  return Response.json({ page: n, pageCount: row.pageCount, chunks });
}
