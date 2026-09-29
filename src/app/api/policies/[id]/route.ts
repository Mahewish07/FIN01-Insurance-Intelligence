import { eq } from "drizzle-orm";
import { db } from "@/db";
import { policies } from "@/db/schema";
import { getPolicyRow, toPolicy } from "@/lib/server/pipeline";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: Request, { params }: Ctx) {
  const { id } = await params;
  try {
    const row = await getPolicyRow(id);
    if (!row) return Response.json({ error: "not_found", message: "Policy not found." }, { status: 404 });
    return Response.json({ policy: toPolicy(row) });
  } catch (e) {
    console.error(e);
    return Response.json({ error: "server_error", message: "Could not load the policy." }, { status: 500 });
  }
}

export async function DELETE(_req: Request, { params }: Ctx) {
  const { id } = await params;
  try {
    const row = await getPolicyRow(id);
    if (!row) return Response.json({ error: "not_found", message: "Policy not found." }, { status: 404 });
    await db.delete(policies).where(eq(policies.id, id));
    return Response.json({ ok: true });
  } catch (e) {
    console.error(e);
    return Response.json({ error: "server_error", message: "Could not delete the policy." }, { status: 500 });
  }
}
