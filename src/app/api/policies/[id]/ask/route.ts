import { answerQuestion } from "@/lib/engine/answer";
import { dbRetriever, getPolicyRow, toPolicy } from "@/lib/server/pipeline";
import { askRequestSchema } from "@/lib/schemas";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

export async function POST(req: Request, { params }: Ctx) {
  const { id } = await params;
  const body = askRequestSchema.safeParse(await req.json().catch(() => null));
  if (!body.success) {
    return Response.json({ error: "bad_request", message: body.error.issues[0]?.message ?? "Invalid question." }, { status: 400 });
  }
  try {
    const row = await getPolicyRow(id);
    if (!row) return Response.json({ error: "not_found", message: "Policy not found." }, { status: 404 });
    if (row.status !== "ready") return Response.json({ error: "not_ready", message: "This policy is still being processed." }, { status: 409 });
    const answer = await answerQuestion(dbRetriever(id), toPolicy(row), body.data.question);
    return Response.json({ answer });
  } catch (e) {
    console.error(e);
    return Response.json({ error: "server_error", message: "Could not answer this question right now." }, { status: 500 });
  }
}
