"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import { Calculator, GitCompareArrows, RefreshCw } from "lucide-react";
import * as api from "@/lib/api";
import type { EstimateInput, EstimateResult, Policy } from "@/lib/types";
import { PolicyGate } from "@/components/layout/PolicyGate";
import { EstimateForm, type EstimateFormHandle } from "@/components/scenario/EstimateForm";
import { EstimateResultView } from "@/components/calculation/EstimateResultView";
import { Button, Card, CardHeader, PageHeader } from "@/components/common/ui";
import { StateBlock } from "@/components/common/StateBlock";

const LAST_KEY = "coverlens.lastEstimateInput";

function EstimateWorkspace({ policy }: { policy: Policy }) {
  const formRef = useRef<EstimateFormHandle>(null);
  const [result, setResult] = useState<EstimateResult | null>(null);
  const [lastInput, setLastInput] = useState<EstimateInput | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const run = async (input: EstimateInput) => {
    setLoading(true);
    setError(null);
    setLastInput(input);
    try {
      const r = await api.estimateTreatment(policy.id, input);
      setResult(r);
      try {
        sessionStorage.setItem(LAST_KEY, JSON.stringify(input));
      } catch {
        /* ignore */
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not calculate.");
    } finally {
      setLoading(false);
    }
  };

  const onPatch = (patch: Partial<EstimateInput>) => {
    formRef.current?.patch(patch);
    if (lastInput) void run({ ...lastInput, ...patch });
  };

  return (
    <div className="grid gap-6 xl:grid-cols-12">
      <Card className="self-start xl:col-span-5 xl:sticky xl:top-6">
        <CardHeader icon={<Calculator className="h-4 w-4" />} title="Treatment scenario" subtitle={`Using terms from ${policy.meta?.policyName ?? policy.fileName}`} />
        <div className="p-5">
          <EstimateForm ref={formRef} terms={policy.terms} onSubmit={run} loading={loading} compact />
        </div>
      </Card>
      <div className="xl:col-span-7">
        {error ? (
          <Card>
            <StateBlock kind="server_error" body={error} action={lastInput && <Button variant="outline" onClick={() => run(lastInput)}><RefreshCw className="h-4 w-4" /> Retry</Button>} />
          </Card>
        ) : result ? (
          <>
            <EstimateResultView result={result} onPatch={onPatch} busy={loading} />
            {result.complete && (
              <div className="mt-5 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white p-4">
                <p className="text-sm text-slate-600">Want to see how a different room, hospital or city changes this?</p>
                <Link href="/compare" className="inline-flex h-9 items-center gap-2 rounded-lg bg-slate-900 px-3 text-sm font-medium text-white hover:bg-slate-800">
                  <GitCompareArrows className="h-4 w-4" /> Compare scenarios
                </Link>
              </div>
            )}
          </>
        ) : (
          <Card>
            <StateBlock
              kind="empty"
              title="Describe the treatment scenario"
              body="Fill in the details and we'll show the indicative cost, what your policy may pay, and what you may pay — with every step traced to policy evidence."
            />
          </Card>
        )}
      </div>
    </div>
  );
}

export default function EstimatePage() {
  return (
    <div>
      <PageHeader title="Treatment estimate" description="Here is the indicative financial effect of a treatment under your policy." />
      <PolicyGate>{(p) => <EstimateWorkspace key={p.id} policy={p} />}</PolicyGate>
    </div>
  );
}
