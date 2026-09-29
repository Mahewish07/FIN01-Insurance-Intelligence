"use client";

import { ArrowRight, FileSearch, IndianRupee, ShieldQuestion, Wallet } from "lucide-react";
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { CompareResult, EstimateResult } from "@/lib/types";
import { cn, formatCompactINR, formatINR } from "@/lib/utils";
import { Card, CardHeader } from "@/components/common/ui";
import { ProvenanceLabel, QualityPanel, StatusBadge } from "@/components/common/provenance";
import { EvidenceChip } from "@/components/evidence/EvidenceViewer";
import { MissingInfo } from "@/components/calculation/MissingInfo";

function ImpactCard({ icon: Icon, title, children }: { icon: typeof Wallet; title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-slate-200 p-4">
      <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
        <Icon className="h-3.5 w-3.5" /> {title}
      </div>
      <div className="mt-2 text-sm text-slate-800">{children}</div>
    </div>
  );
}

const ROWS: { key: string; label: string; get: (r: EstimateResult) => number | null }[] = [
  { key: "bill", label: "Estimated bill", get: (r) => r.figures?.bill ?? null },
  { key: "roomDeduction", label: "Room-rent deduction", get: (r) => r.figures?.roomDeduction ?? null },
  { key: "eligible", label: "Eligible amount", get: (r) => r.figures?.afterSumInsured ?? null },
  { key: "deductible", label: "Deductible", get: (r) => r.figures?.deductible ?? null },
  { key: "copay", label: "Co-payment", get: (r) => r.figures?.copay ?? null },
  { key: "insurer", label: "Potential insurer contribution", get: (r) => r.figures?.insurer ?? null },
  { key: "oop", label: "Potential OOP", get: (r) => r.figures?.oop ?? null },
];

export function ScenarioCompareView({ result }: { result: CompareResult }) {
  const { a, b, diffs, impacts } = result;
  const chartData = ROWS.filter((r) => ["bill", "insurer", "oop"].includes(r.key)).map((r) => ({ name: r.label.replace("Potential ", ""), A: r.get(a) ?? 0, B: r.get(b) ?? 0 }));
  return (
    <div className="space-y-5 animate-fade-in">
      <Card>
        <CardHeader title="Changed inputs" subtitle="Only inputs that differ between scenarios are shown" />
        {diffs.length === 0 ? (
          <p className="px-5 py-6 text-sm text-slate-500">The two scenarios are identical. Change at least one input in Scenario B.</p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {diffs.map((d) => (
              <li key={d.key} className="grid grid-cols-[1fr_auto] items-center gap-3 px-5 py-3 sm:grid-cols-[180px_1fr]">
                <span className="text-sm font-medium text-slate-700">{d.label}</span>
                <span className="flex flex-wrap items-center gap-2 text-sm">
                  <span className="rounded-md bg-slate-100 px-2 py-0.5 text-slate-700"><span className="mr-1 text-xs font-semibold text-slate-400">A</span>{d.a}</span>
                  <ArrowRight className="h-3.5 w-3.5 text-slate-400" />
                  <span className="rounded-md bg-indigo-50 px-2 py-0.5 font-medium text-indigo-900 ring-1 ring-indigo-200"><span className="mr-1 text-xs font-semibold text-indigo-400">B</span>{d.b}</span>
                </span>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card>
        <CardHeader title="What changes" subtitle="Here is what your scenario changes" action={<ProvenanceLabel kind="ai" />} />
        <div className="grid gap-3 p-5 md:grid-cols-2">
          <ImpactCard icon={FileSearch} title="Policy impact">
            <ul className="space-y-2">
              {impacts.policy.map((p, i) => (
                <li key={i}>
                  {p.text}
                  {p.evidence && <EvidenceChip evidence={p.evidence} className="ml-1 mt-1 px-1.5 py-0.5 text-[11px]" />}
                </li>
              ))}
            </ul>
          </ImpactCard>
          <ImpactCard icon={IndianRupee} title="Cost impact">{impacts.cost}</ImpactCard>
          <ImpactCard icon={ShieldQuestion} title="Coverage impact">
            <div className="mb-2 flex flex-wrap gap-2">
              <span className="text-xs text-slate-500">A:</span> <StatusBadge status={a.coverageStatus} />
              <span className="text-xs text-slate-500">B:</span> <StatusBadge status={b.coverageStatus} />
            </div>
            {impacts.coverage}
          </ImpactCard>
          <ImpactCard icon={Wallet} title="OOP impact">{impacts.oop}</ImpactCard>
        </div>
      </Card>

      <Card>
        <CardHeader title="Side-by-side calculation" subtitle="Differences are highlighted" action={<ProvenanceLabel kind="calculation" />} />
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 text-left text-xs text-slate-500">
                <th className="px-5 py-2 font-medium">Line</th>
                <th className="px-3 py-2 text-right font-medium">Scenario A</th>
                <th className="px-3 py-2 text-right font-medium">Scenario B</th>
                <th className="px-5 py-2 text-right font-medium">Difference</th>
              </tr>
            </thead>
            <tbody>
              {ROWS.map((r) => {
                const va = r.get(a);
                const vb = r.get(b);
                const diff = va !== null && vb !== null ? vb - va : null;
                const changed = diff !== null && Math.abs(diff) >= 1;
                return (
                  <tr key={r.key} className={cn("border-b border-slate-50", changed && "bg-indigo-50/40")}>
                    <td className={cn("px-5 py-2.5", changed ? "font-medium text-slate-900" : "text-slate-600")}>{r.label}</td>
                    <td className="px-3 py-2.5 text-right tabular text-slate-700">{formatINR(va)}</td>
                    <td className={cn("px-3 py-2.5 text-right tabular", changed ? "font-semibold text-slate-900" : "text-slate-700")}>{formatINR(vb)}</td>
                    <td className={cn("px-5 py-2.5 text-right tabular text-xs", !changed ? "text-slate-300" : r.key === "insurer" ? (diff! > 0 ? "text-emerald-700" : "text-rose-700") : diff! > 0 ? "text-rose-700" : "text-emerald-700")}>
                      {diff === null ? "—" : changed ? `${diff > 0 ? "+" : "−"}${formatINR(Math.abs(diff))}` : "same"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {a.figures && b.figures && (
          <div className="h-56 p-5">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ left: 0, right: 8 }}>
                <CartesianGrid vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: "#64748b" }} tickLine={false} axisLine={false} />
                <YAxis tickFormatter={(v: number) => formatCompactINR(v)} tick={{ fontSize: 11, fill: "#64748b" }} width={52} tickLine={false} axisLine={false} />
                <Tooltip formatter={(v) => formatINR(Number(v))} contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Bar dataKey="A" fill="#94a3b8" radius={[4, 4, 0, 0]} isAnimationActive={false} />
                <Bar dataKey="B" fill="#6366f1" radius={[4, 4, 0, 0]} isAnimationActive={false} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
        <div className="grid gap-3 border-t border-slate-100 px-5 py-4 sm:grid-cols-2">
          <div><p className="mb-1 text-xs font-semibold text-slate-500">Scenario A reliability</p><QualityPanel quality={a.quality} compact /></div>
          <div><p className="mb-1 text-xs font-semibold text-slate-500">Scenario B reliability</p><QualityPanel quality={b.quality} compact /></div>
        </div>
        <p className="border-t border-slate-100 px-5 py-3 text-xs italic text-slate-500">Illustrative calculation based on supplied policy terms and reference cost data.</p>
      </Card>

      {(!a.complete || !b.complete) && (
        <div className="grid gap-4 lg:grid-cols-2">
          {!a.complete && <div><p className="mb-2 text-sm font-semibold text-slate-700">Scenario A</p><MissingInfo missing={a.missing} /></div>}
          {!b.complete && <div><p className="mb-2 text-sm font-semibold text-slate-700">Scenario B</p><MissingInfo missing={b.missing} /></div>}
        </div>
      )}
    </div>
  );
}
