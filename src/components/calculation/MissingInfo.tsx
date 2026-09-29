"use client";

import { useState } from "react";
import { FileSearch, HelpCircle, MapPin } from "lucide-react";
import type { EstimateInput, MissingField } from "@/lib/types";
import { Button, Input } from "@/components/common/ui";

function inputPlaceholder(inputKey: MissingField["inputKey"]) {
  if (inputKey === "alreadyUtilized") return "Amount already claimed (₹), e.g. 0";
  if (inputKey === "deductibleAlreadyMet") return "Amount already met (₹), e.g. 0";
  if (inputKey === "roomRentLimitOverride") return "Eligible room charge per day (₹)";
  if (inputKey === "copayOverride") return "Applicable co-payment (%), e.g. 20";
  if (inputKey === "billOverride") return "Hospital estimate (₹)";
  return "Amount (₹)";
}

/** "Here is what we still don't know" — every gap explains why it matters and where to find it. */
export function MissingInfo({ missing, onSubmit, busy }: { missing: MissingField[]; onSubmit?: (patch: Partial<EstimateInput>) => void; busy?: boolean }) {
  const [values, setValues] = useState<Record<string, string>>({});
  const editable = missing.filter((m) => m.requiresInput !== false && m.inputKey);
  const canSubmit = !!onSubmit && editable.length > 0 && editable.every((m) => values[m.key]?.trim());

  return (
    <div className="rounded-xl border border-amber-200 bg-amber-50/50">
      <div className="border-b border-amber-200/70 px-5 py-4">
        <h3 className="text-base font-semibold text-amber-950">Cannot reliably complete this calculation yet.</h3>
        <p className="mt-0.5 text-sm text-amber-900/80">We found {missing.length} missing item{missing.length > 1 ? "s" : ""}. Nothing is guessed — provide or verify them to continue.</p>
      </div>
      <ol className="divide-y divide-amber-200/60">
        {missing.map((m, i) => {
          const needsInput = m.requiresInput !== false && !!m.inputKey;
          return (
            <li key={m.key} className="px-5 py-4">
              <div className="flex items-start gap-3">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-amber-200 text-xs font-semibold text-amber-900">{i + 1}</span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-slate-900">{m.label}</p>
                  <div className="mt-2 grid gap-2 sm:grid-cols-2">
                    <div className="flex gap-2 text-xs text-slate-700">
                      <HelpCircle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-700" />
                      <span><span className="font-semibold">Why we need it: </span>{m.why}</span>
                    </div>
                    <div className="flex gap-2 text-xs text-slate-700">
                      <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-700" />
                      <span><span className="font-semibold">Where it may be found: </span>{m.whereToFind}</span>
                    </div>
                  </div>
                  {needsInput && onSubmit ? (
                    <div className="mt-3 max-w-xs">
                      <label className="sr-only" htmlFor={`missing-${m.key}`}>{m.label}</label>
                      <Input
                        id={`missing-${m.key}`}
                        inputMode="numeric"
                        placeholder={inputPlaceholder(m.inputKey)}
                        value={values[m.key] ?? ""}
                        onChange={(e) => setValues((v) => ({ ...v, [m.key]: e.target.value.replace(/[^\d]/g, "") }))}
                      />
                    </div>
                  ) : !needsInput ? (
                    <p className="mt-3 inline-flex items-center gap-1.5 rounded-md bg-amber-100 px-2 py-1 text-xs font-medium text-amber-900">
                      <FileSearch className="h-3.5 w-3.5" /> Requires policy / insurer verification — no value will be guessed.
                    </p>
                  ) : null}
                </div>
              </div>
            </li>
          );
        })}
      </ol>
      {canSubmit && onSubmit && (
        <div className="flex justify-end border-t border-amber-200/70 px-5 py-3">
          <Button
            loading={busy}
            onClick={() => {
              const patch: Partial<EstimateInput> = {};
              for (const m of editable) {
                if (m.inputKey) (patch as Record<string, number>)[m.inputKey] = Number(values[m.key]);
              }
              onSubmit(patch);
            }}
          >
            Continue calculation
          </Button>
        </div>
      )}
    </div>
  );
}
