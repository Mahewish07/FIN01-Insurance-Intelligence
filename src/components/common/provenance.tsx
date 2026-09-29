import { Calculator, FileText, Globe, MessageSquareText } from "lucide-react";
import type { ReactNode } from "react";
import type { AnswerStatus, ItemStatus, Quality } from "@/lib/types";
import { cn } from "@/lib/utils";

export type Provenance = "ai" | "evidence" | "calculation" | "external";

const PROV: Record<Provenance, { label: string; icon: typeof FileText; cls: string }> = {
  ai: { label: "AI interpretation", icon: MessageSquareText, cls: "text-indigo-700 bg-indigo-50 ring-indigo-200" },
  evidence: { label: "Policy evidence", icon: FileText, cls: "text-amber-800 bg-amber-50 ring-amber-200" },
  calculation: { label: "Calculation", icon: Calculator, cls: "text-sky-800 bg-sky-50 ring-sky-200" },
  external: { label: "External reference", icon: Globe, cls: "text-slate-700 bg-slate-100 ring-slate-300" },
};

export function ProvenanceLabel({ kind, className, suffix }: { kind: Provenance; className?: string; suffix?: string }) {
  const p = PROV[kind];
  const Icon = p.icon;
  return (
    <span className={cn("inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide ring-1 ring-inset", p.cls, className)}>
      <Icon className="h-3 w-3" aria-hidden />
      {p.label}
      {suffix && <span className="font-normal normal-case tracking-normal opacity-80">· {suffix}</span>}
    </span>
  );
}

/** Container that visually differentiates the source of a block of content. */
export function ProvenanceBlock({ kind, children, className, suffix }: { kind: Provenance; children: ReactNode; className?: string; suffix?: string }) {
  const border = { ai: "border-indigo-300", evidence: "border-amber-400", calculation: "border-sky-400", external: "border-slate-400" }[kind];
  const bg = { ai: "bg-white", evidence: "bg-amber-50/40", calculation: "bg-sky-50/30", external: "bg-slate-50" }[kind];
  return (
    <div className={cn("rounded-r-lg border-l-[3px] py-2.5 pl-3 pr-3", border, bg, className)}>
      <ProvenanceLabel kind={kind} suffix={suffix} />
      <div className="mt-2">{children}</div>
    </div>
  );
}

const STATUS: Record<AnswerStatus | ItemStatus, { label: string; cls: string; dot: string }> = {
  covered: { label: "Potentially covered", cls: "bg-emerald-50 text-emerald-800 ring-emerald-200", dot: "bg-emerald-500" },
  excluded: { label: "Potentially excluded", cls: "bg-rose-50 text-rose-800 ring-rose-200", dot: "bg-rose-500" },
  verify: { label: "Needs verification", cls: "bg-amber-50 text-amber-800 ring-amber-200", dot: "bg-amber-500" },
  insufficient: { label: "Insufficient evidence", cls: "bg-slate-100 text-slate-700 ring-slate-300", dot: "bg-slate-400" },
  conflict: { label: "Conflicting clauses", cls: "bg-violet-50 text-violet-800 ring-violet-200", dot: "bg-violet-500" },
  info: { label: "Information", cls: "bg-sky-50 text-sky-800 ring-sky-200", dot: "bg-sky-500" },
  restriction: { label: "Restriction", cls: "bg-orange-50 text-orange-800 ring-orange-200", dot: "bg-orange-500" },
};

export function StatusBadge({ status, label, size = "sm" }: { status: AnswerStatus | ItemStatus; label?: string; size?: "sm" | "lg" }) {
  const s = STATUS[status];
  return (
    <span className={cn("inline-flex items-center gap-1.5 rounded-full font-semibold ring-1 ring-inset", s.cls, size === "lg" ? "px-3 py-1 text-sm" : "px-2 py-0.5 text-xs")}>
      <span className={cn("h-1.5 w-1.5 rounded-full", s.dot)} aria-hidden />
      {label ?? s.label}
    </span>
  );
}

const Q_EVIDENCE = { strong: ["Strong", "text-emerald-700"], partial: ["Partial", "text-amber-700"], missing: ["Missing", "text-rose-700"] } as const;
const Q_CALC = { complete: ["Complete", "text-emerald-700"], incomplete: ["Incomplete", "text-amber-700"], not_applicable: ["Not applicable", "text-slate-500"] } as const;
const Q_COST = {
  reference: ["Reference estimate", "text-emerald-700"],
  synthetic: ["Synthetic reference", "text-amber-700"],
  user_supplied: ["Supplied by you", "text-sky-700"],
  none: ["No cost data", "text-rose-700"],
  not_applicable: ["Not applicable", "text-slate-500"],
} as const;

/** Qualitative reliability indicators — deliberately no percentage "confidence". */
export function QualityPanel({ quality, className, compact }: { quality: Quality; className?: string; compact?: boolean }) {
  const rows: [string, readonly [string, string]][] = [
    ["Evidence", Q_EVIDENCE[quality.evidence]],
    ["Calculation", Q_CALC[quality.calculation]],
    ["Cost data", Q_COST[quality.costData]],
  ];
  return (
    <dl className={cn(compact ? "flex flex-wrap gap-x-4 gap-y-1" : "grid grid-cols-3 gap-2", "text-xs", className)}>
      {rows.map(([k, [v, cls]]) => (
        <div key={k} className={cn(!compact && "rounded-lg bg-slate-50 px-2.5 py-2")}>
          <dt className="text-slate-500">{k}{compact ? ":" : ""}</dt>
          <dd className={cn("font-semibold", cls, compact && "inline ml-1")}>{v}</dd>
        </div>
      ))}
    </dl>
  );
}
