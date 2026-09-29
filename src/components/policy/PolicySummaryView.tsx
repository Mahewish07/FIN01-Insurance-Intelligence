"use client";

import { useState } from "react";
import { Ban, Building2, CalendarRange, ClipboardList, FileText, Hospital, IndianRupee, Hourglass, BedDouble, Scale, ShieldCheck, Tag } from "lucide-react";
import type { Policy, SummaryItem } from "@/lib/types";
import { cn, formatINR } from "@/lib/utils";
import { Card, CardHeader } from "@/components/common/ui";
import { ProvenanceLabel, StatusBadge } from "@/components/common/provenance";
import { useEvidence } from "@/components/evidence/EvidenceViewer";

function Fact({ icon: Icon, label, value, missing }: { icon: typeof FileText; label: string; value: string | null; missing?: string }) {
  return (
    <div className="flex items-start gap-3 rounded-lg p-3">
      <Icon className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
      <div className="min-w-0">
        <dt className="text-xs text-slate-500">{label}</dt>
        <dd className={cn("mt-0.5 text-sm font-medium", value ? "text-slate-900" : "text-amber-700")}>{value ?? missing ?? "Not found in document"}</dd>
      </div>
    </div>
  );
}

export function SummaryItemRow({ item }: { item: SummaryItem }) {
  const { openEvidence } = useEvidence();
  return (
    <li className="flex flex-col gap-2 py-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-sm font-medium text-slate-900">{item.title}</p>
          <StatusBadge status={item.status} label={item.status === "info" ? "Detail" : undefined} />
        </div>
        <p className="mt-1 text-sm text-slate-600">{item.explanation}</p>
      </div>
      {item.evidence.length > 0 ? (
        <button
          type="button"
          onClick={() => openEvidence(item.evidence[0])}
          className="inline-flex shrink-0 items-center gap-1.5 self-start rounded-md border border-amber-200 bg-amber-50 px-2 py-1 text-xs font-medium text-amber-900 hover:bg-amber-100"
        >
          <FileText className="h-3 w-3" /> View evidence · p.{item.evidence[0].page}
        </button>
      ) : (
        <span className="shrink-0 self-start text-xs text-slate-400">No evidence found</span>
      )}
    </li>
  );
}

const TABS = [
  { key: "coverage", label: "Coverage", icon: ShieldCheck },
  { key: "exclusions", label: "Exclusions", icon: Ban },
  { key: "waitingPeriods", label: "Waiting periods", icon: Hourglass },
  { key: "financial", label: "Financial restrictions", icon: Scale },
  { key: "claims", label: "Claim requirements", icon: ClipboardList },
] as const;

export function PolicySummaryView({ policy }: { policy: Policy }) {
  const [tab, setTab] = useState<(typeof TABS)[number]["key"]>("coverage");
  const m = policy.meta;
  const s = policy.summary;
  const items = s ? s[tab] : [];
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader
          icon={<FileText className="h-4 w-4" />}
          title={m?.policyName ?? policy.fileName}
          subtitle={`${policy.pageCount} pages · extracted from ${policy.fileName}`}
          action={<ProvenanceLabel kind="evidence" suffix="auto-extracted" />}
        />
        <dl className="grid gap-1 p-2 sm:grid-cols-2 lg:grid-cols-4">
          <Fact icon={Building2} label="Insurer" value={m?.insurer ?? null} />
          <Fact icon={Tag} label="Plan" value={m?.plan ?? null} />
          <Fact icon={CalendarRange} label="Policy period" value={m?.period ?? null} />
          <Fact icon={IndianRupee} label="Sum insured" value={m?.sumInsured ? formatINR(m.sumInsured) : null} missing="Not found — you can enter it in estimates" />
          <Fact icon={BedDouble} label="Room eligibility" value={m?.roomEligibility ?? null} />
          <div className="sm:col-span-2 lg:col-span-3">
            <Fact icon={Hospital} label="Network information" value={m?.networkInfo ?? null} />
          </div>
        </dl>
      </Card>

      <Card>
        <div className="flex gap-1 overflow-x-auto border-b border-slate-100 px-3 pt-3" role="tablist">
          {TABS.map((t) => {
            const Icon = t.icon;
            const count = s ? s[t.key].length : 0;
            return (
              <button
                key={t.key}
                role="tab"
                aria-selected={tab === t.key}
                onClick={() => setTab(t.key)}
                className={cn(
                  "flex shrink-0 items-center gap-2 border-b-2 px-3 pb-3 text-sm font-medium",
                  tab === t.key ? "border-brand-600 text-brand-800" : "border-transparent text-slate-500 hover:text-slate-800"
                )}
              >
                <Icon className="h-4 w-4" />
                {t.label}
                <span className="rounded-full bg-slate-100 px-1.5 text-xs text-slate-600">{count}</span>
              </button>
            );
          })}
        </div>
        <div className="px-5">
          {items.length === 0 ? (
            <p className="py-10 text-center text-sm text-slate-500">No clauses of this type were identified in the document. This may mean they are absent or phrased unusually — verify with your insurer.</p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {items.map((i) => (
                <SummaryItemRow key={i.id} item={i} />
              ))}
            </ul>
          )}
        </div>
        <p className="border-t border-slate-100 px-5 py-3 text-xs text-slate-400">
          Titles and statuses are generated by automatic clause classification. Always read the cited policy evidence.
        </p>
      </Card>
    </div>
  );
}
