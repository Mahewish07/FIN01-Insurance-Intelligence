import { processNextStage, toListItem } from "@/lib/server/pipeline";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 60;

type Ctx = { params: Promise<{ id: string }> };

/** Executes the next pending processing stage and reports the real resulting status. */
export async function POST(_req: Request, { params }: Ctx) {
  const { id } = await params;
  const row = await processNextStage(id);
  if (!row) return Response.json({ error: "not_found", message: "Policy not found." }, { status: 404 });
  return Response.json({ policy: toListItem(row) });
}
