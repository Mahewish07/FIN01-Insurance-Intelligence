"use client";

import { forwardRef, useImperativeHandle, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ChevronDown, SlidersHorizontal } from "lucide-react";
import { estimateInputSchema, type EstimateFormValues } from "@/lib/schemas";
import type { EstimateInput, PolicyTerms } from "@/lib/types";
import { TREATMENTS, METRO_CITIES, TIER2_CITIES, findTreatment, ROOM_LABEL, HOSPITAL_LABEL } from "@/lib/engine/costData";
import { cn, formatINR } from "@/lib/utils";
import { Button, FieldError, Input, Label, Select, Toggle } from "@/components/common/ui";

export interface EstimateFormHandle {
  validate: () => Promise<EstimateInput | null>;
  patch: (p: Partial<EstimateInput>) => void;
}

export const DEFAULT_ESTIMATE: EstimateFormValues = {
  treatment: "Knee replacement (unilateral)",
  city: "Mumbai",
  hospitalTier: "standard",
  patientAge: 45,
  networkHospital: true,
  roomType: "single",
  preExisting: false,
  policyYears: 3,
  sumInsured: null,
  alreadyUtilized: 0,
  roomRentLimitOverride: null,
  subLimitOverride: null,
  copayOverride: null,
  deductibleOverride: null,
  deductibleAlreadyMet: null,
  lengthOfStay: null,
  billOverride: null,
};

const num = { setValueAs: (v: unknown) => (v === "" || v === null || v === undefined || Number.isNaN(Number(v)) ? null : Number(v)) };
const int = { setValueAs: (v: unknown) => (v === "" || v === null || v === undefined ? undefined : Number(v)) };

const CITY_OPTIONS = [...METRO_CITIES.slice(0, 8), ...TIER2_CITIES.slice(0, 8)].map((c) => c.replace(/\b\w/g, (m) => m.toUpperCase()));
const ROOM_RANK = { general: 0, shared: 1, single: 2, deluxe: 3, suite: 4 } as const;

interface Props {
  idPrefix?: string;
  terms: PolicyTerms | null;
  defaultValues?: Partial<EstimateFormValues>;
  onSubmit?: (input: EstimateInput) => void;
  submitLabel?: string;
  loading?: boolean;
  compact?: boolean;
  highlightKeys?: string[];
}

export const EstimateForm = forwardRef<EstimateFormHandle, Props>(function EstimateForm(
  { idPrefix = "est", terms, defaultValues, onSubmit, submitLabel = "Estimate cost", loading, compact, highlightKeys = [] },
  ref
) {
  const [advanced, setAdvanced] = useState(false);
  const form = useForm({
    resolver: zodResolver(estimateInputSchema),
    defaultValues: { ...DEFAULT_ESTIMATE, ...defaultValues },
  });
  const { register, control, handleSubmit, watch, formState, setValue, trigger, getValues } = form;
  const errors = formState.errors;

  useImperativeHandle(ref, () => ({
    validate: async () => {
      const ok = await trigger();
      if (!ok) return null;
      return estimateInputSchema.parse(getValues()) as EstimateInput;
    },
    patch: (p) => {
      Object.entries(p).forEach(([k, v]) => setValue(k as keyof EstimateFormValues, v as never, { shouldDirty: true }));
      if (Object.keys(p).some((k) => ["roomRentLimitOverride", "subLimitOverride", "copayOverride", "deductibleOverride", "deductibleAlreadyMet", "lengthOfStay"].includes(k))) setAdvanced(true);
    },
  }));

  const treatment = watch("treatment");
  const roomType = watch("roomType");
  const preExisting = watch("preExisting");
  const known = findTreatment(treatment ?? "");
  const noCostData = (treatment ?? "").trim().length > 2 && !known;
  const categoryExceeded = terms?.roomRent?.type === "category" && ROOM_RANK[roomType] > ROOM_RANK[terms.roomRent.category];
  const roomUnknown = (!terms?.roomRent || categoryExceeded) && roomType !== "general";
  const siUnknown = !terms?.sumInsured;
  const id = (k: string) => `${idPrefix}-${k}`;
  const hl = (k: string) => (highlightKeys.includes(k) ? "rounded-lg bg-amber-50 p-2 -m-2 ring-1 ring-amber-200" : "");

  const grid = compact ? "grid gap-4 sm:grid-cols-2" : "grid gap-4 sm:grid-cols-2 xl:grid-cols-3";

  return (
    <form onSubmit={onSubmit ? handleSubmit((v) => onSubmit(v as EstimateInput)) : (e) => e.preventDefault()} noValidate className="space-y-5">
      <div className={grid}>
        <div className={cn("sm:col-span-2", !compact && "xl:col-span-1", hl("treatment"))}>
          <Label htmlFor={id("treatment")} hint="Pick a listed treatment for reference costs, or type any procedure.">Treatment</Label>
          <Input id={id("treatment")} list={id("treatments")} invalid={!!errors.treatment} {...register("treatment")} />
          <datalist id={id("treatments")}>
            {TREATMENTS.map((t) => (
              <option key={t.id} value={t.label} />
            ))}
          </datalist>
          <FieldError message={errors.treatment?.message} />
        </div>
        <div className={hl("city")}>
          <Label htmlFor={id("city")} hint="City affects reference hospital costs (metro / tier-2 / other).">City</Label>
          <Input id={id("city")} list={id("cities")} invalid={!!errors.city} {...register("city")} />
          <datalist id={id("cities")}>
            {CITY_OPTIONS.map((c) => (
              <option key={c} value={c} />
            ))}
          </datalist>
          <FieldError message={errors.city?.message} />
        </div>
        <div className={hl("hospitalTier")}>
          <Label htmlFor={id("tier")}>Hospital tier</Label>
          <Select id={id("tier")} {...register("hospitalTier")}>
            {Object.entries(HOSPITAL_LABEL).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </Select>
        </div>
        <div className={hl("patientAge")}>
          <Label htmlFor={id("age")} hint="Some policies apply a higher co-payment above a certain age.">Patient age</Label>
          <Input id={id("age")} type="number" inputMode="numeric" invalid={!!errors.patientAge} {...register("patientAge", int)} />
          <FieldError message={errors.patientAge?.message} />
        </div>
        <div className={hl("roomType")}>
          <Label htmlFor={id("room")} hint="Rooms above your policy's limit can reduce the whole claim proportionately.">Room type</Label>
          <Select id={id("room")} {...register("roomType")}>
            {Object.entries(ROOM_LABEL).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </Select>
        </div>
        <div className={hl("networkHospital")}>
          <Label htmlFor={id("network")} hint="Network hospitals offer cashless treatment; non-network may attract extra co-payment.">Network hospital</Label>
          <Controller control={control} name="networkHospital" render={({ field }) => <Toggle id={id("network")} checked={!!field.value} onChange={field.onChange} label={field.value ? "Yes, network hospital" : "No, non-network"} />} />
        </div>
        <div className={hl("preExisting")}>
          <Label htmlFor={id("ped")} hint="Is this treatment related to a condition you had before buying the policy?">Pre-existing condition</Label>
          <Controller control={control} name="preExisting" render={({ field }) => <Toggle id={id("ped")} checked={!!field.value} onChange={field.onChange} label={field.value ? "Yes, related" : "No"} />} />
        </div>
        <div className={hl("policyYears")}>
          <Label htmlFor={id("years")} hint="Continuous years with this policy (including portability credit). Used for waiting periods.">
            Years with this policy
          </Label>
          <Input id={id("years")} type="number" inputMode="numeric" invalid={!!errors.policyYears} {...register("policyYears", int)} />
          {preExisting && terms?.pedWaitingMonths && <p className="mt-1 text-xs text-slate-500">Policy PED waiting: {terms.pedWaitingMonths} months</p>}
          <FieldError message={errors.policyYears?.message} />
        </div>
        <div className={hl("sumInsured")}>
          <Label htmlFor={id("si")} hint="Leave empty to use the sum insured found in your policy.">Sum insured (₹)</Label>
          <Input id={id("si")} type="number" inputMode="numeric" placeholder={terms?.sumInsured ? `From policy: ${formatINR(terms.sumInsured)}` : "Not found in policy — enter it"} invalid={siUnknown && !!errors.sumInsured} {...register("sumInsured", num)} />
        </div>
        <div className={hl("alreadyUtilized")}>
          <Label htmlFor={id("used")} hint="Amount already claimed in the current policy year. Enter 0 if none.">Already utilised (₹)</Label>
          <Input id={id("used")} type="number" inputMode="numeric" placeholder="e.g. 0" {...register("alreadyUtilized", num)} />
        </div>

        {noCostData && (
          <div className={cn("sm:col-span-2 rounded-lg border border-slate-200 bg-slate-50 p-3", !compact && "xl:col-span-3")}>
            <Label htmlFor={id("bill")} hint="We have no reference cost data for this treatment.">Hospital estimate for this treatment (₹)</Label>
            <Input id={id("bill")} type="number" inputMode="numeric" placeholder="From the hospital's written estimate" {...register("billOverride", num)} />
            <p className="mt-1 text-xs text-slate-500">No reference cost data exists for “{treatment}”. Enter the hospital estimate to calculate.</p>
          </div>
        )}
        {roomUnknown && (
          <div className={cn("sm:col-span-2 rounded-lg border border-amber-200 bg-amber-50/60 p-3", !compact && "xl:col-span-3")}>
            <Label htmlFor={id("roomlimit")} hint="Needed only to calculate the proportional impact of this room choice.">{categoryExceeded ? "Eligible room charge per day (₹)" : "Applicable room limit per day (₹)"}</Label>
            <Input id={id("roomlimit")} type="number" inputMode="numeric" placeholder={categoryExceeded ? "Ask hospital for eligible category tariff" : "Check your policy schedule"} {...register("roomRentLimitOverride", num)} />
          </div>
        )}
      </div>

      <div className="rounded-lg border border-slate-200">
        <button type="button" onClick={() => setAdvanced((a) => !a)} aria-expanded={advanced} className="flex w-full items-center justify-between px-3 py-2.5 text-sm font-medium text-slate-700">
          <span className="flex items-center gap-2">
            <SlidersHorizontal className="h-4 w-4 text-slate-400" /> {advanced ? "Hide" : "Show"} advanced policy inputs
          </span>
          <ChevronDown className={cn("h-4 w-4 text-slate-400 transition-transform", advanced && "rotate-180")} />
        </button>
        {advanced && (
          <div className="grid gap-4 border-t border-slate-100 p-3 sm:grid-cols-2 animate-fade-in">
            <p className="sm:col-span-2 text-xs text-slate-500">Override values only if your policy schedule differs from what was extracted. Empty = use policy terms.</p>
            <div>
              <Label htmlFor={id("los")}>Length of stay (days)</Label>
              <Input id={id("los")} type="number" placeholder={known ? `Typical: ${known.stayDays}` : "e.g. 3"} {...register("lengthOfStay", num)} />
            </div>
            {!noCostData && (
              <div>
                <Label htmlFor={id("bill2")} hint="Replaces the reference cost with your hospital's estimate.">Hospital estimate (₹)</Label>
                <Input id={id("bill2")} type="number" placeholder="Optional" {...register("billOverride", num)} />
              </div>
            )}
            {!roomUnknown && (
              <div>
                <Label htmlFor={id("rl")}>Room limit per day (₹)</Label>
                <Input id={id("rl")} type="number" placeholder={terms?.roomRent?.label ?? "Optional"} {...register("roomRentLimitOverride", num)} />
              </div>
            )}
            <div>
              <Label htmlFor={id("sl")}>Treatment sub-limit (₹)</Label>
              <Input id={id("sl")} type="number" placeholder="From policy if available" {...register("subLimitOverride", num)} />
            </div>
            <div>
              <Label htmlFor={id("cp")}>Co-payment (%)</Label>
              <Input id={id("cp")} type="number" placeholder={terms?.copayPct ? `Policy: ${terms.copayPct}%` : "Policy: none found"} {...register("copayOverride", num)} />
            </div>
            <div>
              <Label htmlFor={id("dd")}>Deductible (₹)</Label>
              <Input id={id("dd")} type="number" placeholder={terms?.deductible ? `Policy: ${formatINR(terms.deductible)}` : "Policy: none found"} {...register("deductibleOverride", num)} />
            </div>
            {terms?.deductibleBasis === "aggregate" && (
              <div>
                <Label htmlFor={id("dd-met")} hint="Enter 0 if no amount of this annual deductible has already been satisfied this policy year.">Aggregate deductible already met (₹)</Label>
                <Input id={id("dd-met")} type="number" placeholder="e.g. 0" {...register("deductibleAlreadyMet", num)} />
              </div>
            )}
          </div>
        )}
      </div>

      {onSubmit && (
        <Button type="submit" size="lg" loading={loading} className="w-full sm:w-auto">
          {submitLabel}
        </Button>
      )}
    </form>
  );
});
