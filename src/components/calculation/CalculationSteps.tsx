"use client";

import { ArrowDown } from "lucide-react";
import type { CalcStep } from "@/lib/types";
import { cn, formatINR } from "@/lib/utils";
import { InfoTip } from "@/components/common/ui";
import { EvidenceChip } from "@/components/evidence/EvidenceViewer";

export function CalculationSteps({ steps, dense }: { steps: CalcStep[]; dense?: boolean }) {
  return (
    <ol className="space-y-0">
      {steps.map((s, i) => {
        const strong = s.kind === "start" || s.kind === "result" || s.kind === "oop";
        return (
          <li key={s.key}>
            <div
              className={cn(
                "flex flex-col gap-1 rounded-lg px-3 sm:flex-row sm:items-center sm:justify-between",
                dense ? "py-1.5" : "py-2.5",
                s.kind === "result" && "bg-brand-50",
                s.kind === "oop" && "bg-rose-50"
              )}
            >
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className={cn("text-sm", strong ? "font-semibold text-slate-900" : "text-slate-700")}>{s.label}</span>
                  <InfoTip text={s.tooltip} />
                </div>
                {(s.note || s.evidence) && (
                  <div className="mt-0.5 flex flex-wrap items-center gap-2">
                    {s.note && <span className="text-xs text-slate-500">{s.note}</span>}
                    {s.evidence && <EvidenceChip evidence={s.evidence} className="px-1.5 py-0.5 text-[11px]" />}
                  </div>
                )}
              </div>
              <div className="flex shrink-0 items-baseline gap-2 tabular sm:justify-end">
                {!strong && s.delta !== 0 && <span className="text-xs font-medium text-amber-700">−{formatINR(Math.abs(s.delta))}</span>}
                {!strong && s.delta === 0 && <span className="text-xs text-slate-400">no change</span>}
                <span className={cn("text-sm", strong ? "font-semibold" : "text-slate-800", s.kind === "oop" && "text-rose-700", s.kind === "result" && "text-brand-800")}>
                  {formatINR(s.amount)}
                </span>
              </div>
            </div>
            {i < steps.length - 1 && (
              <div className="flex justify-start pl-5" aria-hidden>
                <ArrowDown className="h-3 w-3 text-slate-300" />
              </div>
            )}
          </li>
        );
      })}
    </ol>
  );
}
