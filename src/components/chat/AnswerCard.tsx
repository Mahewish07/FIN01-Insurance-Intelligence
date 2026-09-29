"use client";

import { Calculator, FileText, GitCompareArrows, HelpCircle } from "lucide-react";
import type { AskResponse } from "@/lib/types";
import { cn } from "@/lib/utils";
import { Collapsible } from "@/components/common/ui";
import { ProvenanceBlock, QualityPanel, StatusBadge } from "@/components/common/provenance";
import { EvidenceCard, EvidenceChip } from "@/components/evidence/EvidenceViewer";
import { CalculationSteps } from "@/components/calculation/CalculationSteps";

export function AnswerCard({ answer, selected, onSelect, onFollowUp }: { answer: AskResponse; selected?: boolean; onSelect?: () => void; onFollowUp?: (q: string) => void }) {
  return (
    <div
      onClick={onSelect}
      className={cn("rounded-xl border bg-white p-4 transition-shadow sm:p-5", selected ? "border-brand-200 shadow-sm ring-1 ring-brand-100" : "border-slate-200")}
    >
      <div className="flex flex-wrap items-center gap-2">
        <StatusBadge status={answer.status} size="lg" label={answer.status === "info" ? answer.headline : undefined} />
        {answer.status !== "info" && answer.headline !== undefined && !["Potentially covered", "Potentially excluded", "Needs verification", "Conflicting clauses", "Insufficient evidence"].includes(answer.headline) && (
          <span className="text-sm font-semibold text-slate-800">{answer.headline}</span>
        )}
      </div>

      {answer.status === "conflict" && (
        <div className="mt-3 flex items-start gap-2 rounded-lg bg-violet-50 px-3 py-2 text-sm text-violet-900">
          <GitCompareArrows className="mt-0.5 h-4 w-4 shrink-0" />
          Different clauses point in different directions. Read both pieces of evidence and confirm with your insurer before relying on this.
        </div>
      )}
      {answer.status === "insufficient" && (
        <div className="mt-3 flex items-start gap-2 rounded-lg bg-slate-100 px-3 py-2 text-sm text-slate-700">
          <HelpCircle className="mt-0.5 h-4 w-4 shrink-0" />
          The policy text doesn&apos;t contain enough information to answer this reliably. Try rephrasing or check with your insurer.
        </div>
      )}

      <ProvenanceBlock kind="ai" className="mt-3">
        <p className="text-sm leading-relaxed text-slate-800">{answer.interpretation}</p>
      </ProvenanceBlock>

      {answer.evidence.length > 0 && (
        <div className="mt-3 hidden flex-wrap items-center gap-1.5 lg:flex">
          <span className="text-xs font-medium text-slate-500">Evidence:</span>
          {answer.evidence.map((e) => (
            <EvidenceChip key={e.chunkId} evidence={e} />
          ))}
        </div>
      )}

      <div className="mt-3 space-y-2" onClick={(e) => e.stopPropagation()}>
        {answer.why.length > 0 && (
          <Collapsible title={answer.status === "covered" ? "Why? · eligibility depends on" : "Why?"} icon={<HelpCircle className="h-4 w-4 text-indigo-500" />} defaultOpen count={answer.why.length}>
            <ul className="list-disc space-y-1 pl-5 text-sm text-slate-700">
              {answer.why.map((w, i) => (
                <li key={i}>{w}</li>
              ))}
            </ul>
          </Collapsible>
        )}
        {answer.evidence.length > 0 && (
          <Collapsible title="Evidence" icon={<FileText className="h-4 w-4 text-amber-600" />} count={answer.evidence.length} className="lg:hidden">
            <div className="space-y-2">
              {answer.evidence.map((e) => (
                <EvidenceCard key={e.chunkId} evidence={e} />
              ))}
            </div>
          </Collapsible>
        )}
        {answer.calculation && (
          <Collapsible title="Calculation" icon={<Calculator className="h-4 w-4 text-sky-600" />}>
            <CalculationSteps steps={answer.calculation.steps} dense />
            <p className="mt-3 text-xs text-slate-500">Assumptions: {answer.calculation.assumptions.join(" · ")}</p>
          </Collapsible>
        )}
      </div>

      <QualityPanel quality={answer.quality} compact className="mt-3 border-t border-slate-100 pt-3" />

      {onFollowUp && answer.followUps.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5" onClick={(e) => e.stopPropagation()}>
          {answer.followUps.slice(0, 3).map((f) => (
            <button key={f} onClick={() => onFollowUp(f)} className="rounded-full border border-slate-200 px-2.5 py-1 text-xs text-slate-600 hover:border-brand-200 hover:bg-brand-50 hover:text-brand-800">
              {f}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
