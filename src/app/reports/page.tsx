"use client";

import { useCallback, useEffect, useState } from "react";
import { Calculator, ChevronDown, GitCompareArrows, Trash2 } from "lucide-react";
import * as api from "@/lib/api";
import type { CompareResult, EstimateResult, ReportItem } from "@/lib/types";
import { cn, formatDate } from "@/lib/utils";
import { usePolicy } from "@/components/layout/PolicyContext";
import { Badge, Button, Card, PageHeader, Skeleton } from "@/components/common/ui";
import { StateBlock } from "@/components/common/StateBlock";
import { EstimateResultView } from "@/components/calculation/EstimateResultView";
import { ScenarioCompareView } from "@/components/scenario/ScenarioCompareView";

export default function ReportsPage() {
  const { activeId } = usePolicy();
  const [reports, setReports] = useState<ReportItem[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setReports(await api.listReports(activeId ?? undefined));
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load reports.");
    }
  }, [activeId]);

  useEffect(() => {
    void load();
  }, [load]);

  const remove = async (id: string) => {
    await api.deleteReport(id);
    await load();
  };

  return (
    <div>
      <PageHeader title="Reports" description="Saved estimates and scenario comparisons for the active policy." />
      {error ? (
        <Card><StateBlock kind="server_error" body={error} action={<Button variant="outline" onClick={load}>Retry</Button>} /></Card>
      ) : reports === null ? (
        <div className="space-y-3"><Skeleton className="h-16" /><Skeleton className="h-16" /></div>
      ) : reports.length === 0 ? (
        <Card><StateBlock kind="empty" title="No reports yet" body="Every treatment estimate and scenario comparison you run is saved here." /></Card>
      ) : (
        <div className="space-y-3">
          {reports.map((r) => {
            const isOpen = open === r.id;
            const Icon = r.kind === "estimate" ? Calculator : GitCompareArrows;
            const complete = r.kind === "estimate" ? (r.result as EstimateResult).complete : (r.result as CompareResult).a.complete && (r.result as CompareResult).b.complete;
            return (
              <Card key={r.id}>
                <div className="flex items-center gap-3 px-4 py-3">
                  <button onClick={() => setOpen(isOpen ? null : r.id)} className="flex min-w-0 flex-1 items-center gap-3 text-left" aria-expanded={isOpen}>
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-600"><Icon className="h-4 w-4" /></span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium text-slate-900">{r.title}</span>
                      <span className="mt-0.5 flex items-center gap-2 text-xs text-slate-500">
                        {formatDate(r.createdAt)}
                        <Badge tone={complete ? "green" : "amber"}>{complete ? "Complete" : "Incomplete"}</Badge>
                      </span>
                    </span>
                    <ChevronDown className={cn("h-4 w-4 text-slate-400 transition-transform", isOpen && "rotate-180")} />
                  </button>
                  <Button variant="ghost" size="icon" onClick={() => remove(r.id)} aria-label="Delete report"><Trash2 className="h-4 w-4" /></Button>
                </div>
                {isOpen && (
                  <div className="border-t border-slate-100 bg-slate-50/60 p-4">
                    {r.kind === "estimate" ? <EstimateResultView result={r.result as EstimateResult} /> : <ScenarioCompareView result={r.result as CompareResult} />}
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
