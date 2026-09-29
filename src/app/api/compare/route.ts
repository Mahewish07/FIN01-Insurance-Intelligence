import { db } from "@/db";
import { reports } from "@/db/schema";
import { checkCoverage } from "@/lib/engine/answer";
import { dbRetriever, getPolicyRow, toPolicy } from "@/lib/server/pipeline";
import { compareEstimates, runEstimate } from "@/lib/engine/calc";
import { compareRequestSchema } from "@/lib/schemas";
import type { EstimateInput } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const parsed = compareRequestSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return Response.json({ error: "bad_request", message: parsed.error.issues[0]?.message ?? "Invalid input." }, { status: 400 });
  }
  try {
    const row = await getPolicyRow(parsed.data.policyId);
    if (!row) return Response.json({ error: "not_found", message: "Policy not found." }, { status: 404 });
    if (row.status !== "ready") return Response.json({ error: "not_ready", message: "This policy is still being processed." }, { status: 409 });
    const policy = toPolicy(row);
    const a = parsed.data.a as EstimateInput;
    const b = parsed.data.b as EstimateInput;
    const [covA, covB] = await Promise.all([checkCoverage(dbRetriever(policy.id), a.treatment), checkCoverage(dbRetriever(policy.id), b.treatment)]);
    const result = compareEstimates(runEstimate(a, policy.terms, covA), runEstimate(b, policy.terms, covB), policy.terms);
    const [rep] = await db
      .insert(reports)
      .values({
        policyId: policy.id,
        kind: "compare",
        title: `Compare: ${result.diffs.map((d) => d.label).join(", ") || "no changes"} · ${result.a.treatmentLabel}`,
        input: { a, b },
        result,
      })
      .returning({ id: reports.id });
    result.reportId = rep.id;
    return Response.json({ result });
  } catch (e) {
    console.error(e);
    return Response.json({ error: "server_error", message: "Could not compare scenarios." }, { status: 500 });
  }
}
