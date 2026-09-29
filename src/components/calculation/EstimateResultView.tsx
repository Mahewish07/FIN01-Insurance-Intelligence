"use client";

import { AlertOctagon, AlertTriangle, Info, TrendingDown } from "lucide-react";
import type { CalcFlag, EstimateInput, EstimateResult } from "@/lib/types";
import { cn, formatINR } from "@/lib/utils";
import { Card, CardHeader } from "@/components/common/ui";
import { ProvenanceBlock, ProvenanceLabel, QualityPanel, StatusBadge } from "@/components/common/provenance";
import { EvidenceChip } from "@/components/evidence/EvidenceViewer";
import { WaterfallChart } from "@/components/charts/WaterfallChart";
import { CalculationSteps } from "./CalculationSteps";
import { MissingInfo } from "./MissingInfo";

export function FlagList({ flags }: { flags: CalcFlag[] }) {
  if (!flags.length) return null;
  const order = { critical: 0, warning: 1, info: 2 };
  return (
    <ul className="space-y-2">
      {[...flags].sort((a, b) => order[a.severity] - order[b.severity]).map((f) => {
        const Icon = f.severity === "critical" ? AlertOctagon : f.severity === "warning" ? AlertTriangle : Info;
        return (
          <li
            key={f.id}
            className={cn(
              "flex items-start gap-2 rounded-lg px-3 py-2 text-sm",
              f.severity === "critical" && "bg-rose-50 text-rose-900",
              f.severity === "warning" && "bg-amber-50 text-amber-900",
              f.severity === "info" && "bg-slate-50 text-slate-700"
            )}
          >
            <Icon className="mt-0.5 h-4 w-4 shrink-0" />
            <div className="min-w-0 flex-1">
              {f.text}
              {f.evidence && <EvidenceChip evidence={f.evidence} className="ml-2 mt-1 px-1.5 py-0.5 text-[11px]" />}
            </div>
          </li>
        );
      })}
    </ul>
  );
}

function Figure({ label, value, tone, sub }: { label: string; value: number; tone?: "brand" | "rose" | "muted"; sub?: string }) {
  return (
    <div className={cn("rounded-lg p-3", tone === "brand" ? "bg-brand-50" : tone === "rose" ? "bg-rose-50" : "bg-slate-50")}>
      <p className="text-xs text-slate-500">{label}</p>
      <p className={cn("mt-1 text-lg font-semibold tabular", tone === "brand" ? "text-brand-800" : tone === "rose" ? "text-rose-700" : "text-slate-900")}>{formatINR(value)}</p>
      {sub && <p className="text-[11px] text-slate-500">{sub}</p>}
    </div>
  );
}

export function EstimateResultView({ result, onPatch, busy }: { result: EstimateResult; onPatch?: (p: Partial<EstimateInput>) => void; busy?: boolean }) {
  const f = result.figures;
  return (
    <div className="space-y-5 animate-fade-in">
      <Card>
        <div className="p-5 sm:p-6">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <ProvenanceLabel kind="calculation" />
              <ProvenanceLabel kind="external" suffix="cost reference" />
            </div>
            <StatusBadge status={result.coverageStatus} />
          </div>
          <p className="mt-4 text-sm text-slate-500">Indicative treatment cost · {result.treatmentLabel}</p>
          {result.costRange ? (
            <p className="mt-1 text-3xl font-semibold tracking-tight text-slate-900 tabular sm:text-4xl">
              {formatINR(result.costRange.low)} <span className="text-slate-400">–</span> {formatINR(result.costRange.high)}
            </p>
          ) : result.input.billOverride ? (
            <p className="mt-1 text-3xl font-semibold tracking-tight text-slate-900 tabular">{formatINR(result.input.billOverride)}</p>
          ) : (
            <p className="mt-1 text-lg font-semibold text-slate-500">No reference cost data</p>
          )}
          <p className="mt-1 text-xs text-slate-500">{result.costDataNote}</p>

          {f && (
            <div className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
              <Figure label="Potential eligible amount" value={f.afterSumInsured} sub={f.roomDeduction ? `after ${formatINR(f.roomDeduction)} room deduction` : undefined} />
              <Figure label="Deductible" value={f.deductible} />
              <Figure label="Co-payment" value={f.copay} />
              <Figure label="Potential insurer contribution" value={f.insurer} tone="brand" />
              <Figure label="Potential OOP" value={f.oop} tone="rose" sub={`on a typical bill of ${formatINR(f.bill)}`} />
            </div>
          )}

          <div className="mt-5 flex flex-col gap-3 border-t border-slate-100 pt-4 lg:flex-row lg:items-center lg:justify-between">
            <p className="text-xs italic text-slate-500">Illustrative calculation based on supplied policy terms and reference cost data.</p>
            <QualityPanel quality={result.quality} compact />
          </div>
        </div>
      </Card>

      {!result.complete && result.missing.length > 0 && <MissingInfo missing={result.missing} onSubmit={onPatch} busy={busy} />}

      <Card>
        <CardHeader title="What the policy says about this scenario" subtitle="Coverage position and restrictions triggered by your inputs" icon={<TrendingDown className="h-4 w-4" />} />
        <div className="space-y-4 p-5">
          <ProvenanceBlock kind="ai">
            <p className="text-sm text-slate-700">{result.coverageNote}</p>
            {result.coverageEvidence.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1.5">
                {result.coverageEvidence.slice(0, 4).map((e) => (
                  <EvidenceChip key={e.chunkId} evidence={e} />
                ))}
              </div>
            )}
          </ProvenanceBlock>
          <FlagList flags={result.flags} />
        </div>
      </Card>

      {result.complete && result.steps.length > 0 && (
        <Card>
          <CardHeader title="Calculation breakdown" subtitle="Bill → eligible amount → sub-limit → deductible → co-payment → insurer payment → out-of-pocket" action={<ProvenanceLabel kind="calculation" />} />
          <div className="grid gap-6 p-5 xl:grid-cols-2">
            <WaterfallChart steps={result.steps} />
            <CalculationSteps steps={result.steps} />
          </div>
        </Card>
      )}
    </div>
  );
}
