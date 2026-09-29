"use client";

import { useEffect, useRef, useState } from "react";
import { GitCompareArrows } from "lucide-react";
import * as api from "@/lib/api";
import type { CompareResult, EstimateInput, Policy } from "@/lib/types";
import type { EstimateFormValues } from "@/lib/schemas";
import { PolicyGate } from "@/components/layout/PolicyGate";
import { DEFAULT_ESTIMATE, EstimateForm, type EstimateFormHandle } from "@/components/scenario/EstimateForm";
import { ScenarioCompareView } from "@/components/scenario/ScenarioCompareView";
import { Button, Card, PageHeader } from "@/components/common/ui";
import { StateBlock } from "@/components/common/StateBlock";

function CompareWorkspace({ policy }: { policy: Policy }) {
  const aRef = useRef<EstimateFormHandle>(null);
  const bRef = useRef<EstimateFormHandle>(null);
  const [base, setBase] = useState<EstimateFormValues | null>(null);
  const [result, setResult] = useState<CompareResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let v: EstimateFormValues = DEFAULT_ESTIMATE;
    try {
      const s = sessionStorage.getItem("coverlens.lastEstimateInput");
      if (s) v = { ...DEFAULT_ESTIMATE, ...(JSON.parse(s) as Partial<EstimateFormValues>) };
    } catch {
      /* ignore */
    }
    setBase(v);
  }, []);

  const compare = async () => {
    const [a, b] = await Promise.all([aRef.current?.validate(), bRef.current?.validate()]);
    if (!a || !b) return;
    setLoading(true);
    setError(null);
    try {
      setResult(await api.compareScenarios(policy.id, a as EstimateInput, b as EstimateInput));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not compare.");
    } finally {
      setLoading(false);
    }
  };

  if (!base) return null;
  const changed = result?.diffs.map((d) => d.key) ?? [];

  return (
    <div className="space-y-6">
      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="p-5">
          <div className="mb-4 flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-md bg-slate-200 text-sm font-bold text-slate-700">A</span>
            <h2 className="text-sm font-semibold text-slate-900">Scenario A</h2>
          </div>
          <EstimateForm ref={aRef} idPrefix="a" terms={policy.terms} defaultValues={base} compact />
        </Card>
        <Card className="border-indigo-200 p-5">
          <div className="mb-4 flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-md bg-indigo-100 text-sm font-bold text-indigo-700">B</span>
            <h2 className="text-sm font-semibold text-slate-900">Scenario B</h2>
          </div>
          <EstimateForm ref={bRef} idPrefix="b" terms={policy.terms} defaultValues={{ ...base, roomType: "deluxe" }} compact highlightKeys={changed} />
        </Card>
      </div>
      <div className="flex justify-center">
        <Button size="lg" onClick={compare} loading={loading}>
          <GitCompareArrows className="h-4 w-4" /> Compare scenarios
        </Button>
      </div>
      {error && <Card><StateBlock kind="server_error" body={error} compact /></Card>}
      {result && <ScenarioCompareView result={result} />}
    </div>
  );
}

export default function ComparePage() {
  return (
    <div>
      <PageHeader title="Scenario compare" description="Change one thing — room, hospital, city — and see exactly what the policy does differently." />
      <PolicyGate>{(p) => <CompareWorkspace key={p.id} policy={p} />}</PolicyGate>
    </div>
  );
}
