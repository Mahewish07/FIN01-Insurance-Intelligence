import { db } from "@/db";
import { reports } from "@/db/schema";
import { checkCoverage } from "@/lib/engine/answer";
import { dbRetriever, getPolicyRow, toPolicy } from "@/lib/server/pipeline";
import { runEstimate } from "@/lib/engine/calc";
import { estimateRequestSchema } from "@/lib/schemas";
import type { EstimateInput } from "@/lib/types";
import { formatINR } from "@/lib/utils";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const parsed = estimateRequestSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return Response.json({ error: "bad_request", message: parsed.error.issues[0]?.message ?? "Invalid input." }, { status: 400 });
  }
  try {
    const row = await getPolicyRow(parsed.data.policyId);
    if (!row) return Response.json({ error: "not_found", message: "Policy not found." }, { status: 404 });
    if (row.status !== "ready") return Response.json({ error: "not_ready", message: "This policy is still being processed." }, { status: 409 });
    const policy = toPolicy(row);
    const input = parsed.data.input as EstimateInput;
    const cov = await checkCoverage(dbRetriever(policy.id), input.treatment);
    const result = runEstimate(input, policy.terms, cov);
    if (parsed.data.save !== false) {
      const [rep] = await db
        .insert(reports)
        .values({
          policyId: policy.id,
          kind: "estimate",
          title: `${result.treatmentLabel} · ${input.city}${result.figures ? ` · OOP ${formatINR(result.figures.oop)}` : " · incomplete"}`,
          input,
          result,
        })
        .returning({ id: reports.id });
      result.reportId = rep.id;
    }
    return Response.json({ result });
  } catch (e) {
    console.error(e);
    return Response.json({ error: "server_error", message: "Could not calculate the estimate." }, { status: 500 });
  }
}
