import type {
  CalcFlag,
  CalcStep,
  CompareResult,
  CoverageCheck,
  EstimateInput,
  EstimateResult,
  EvidenceStrength,
  MissingField,
  PolicyTerms,
  ScenarioDiff,
} from "@/lib/types";
import { formatINR } from "@/lib/utils";
import {
  HOSPITAL_FACTOR,
  HOSPITAL_LABEL,
  ROOM_DAILY,
  ROOM_LABEL,
  cityFactor,
  findTreatment,
} from "./costData";

const COMMONLY_SUBLIMITED = ["knee_replacement", "hip_replacement", "cataract", "normal_delivery", "c_section", "hernia", "kidney_stone", "gallbladder"];

function round(n: number) {
  return Math.round(n / 100) * 100;
}

const ROOM_RANK = { general: 0, shared: 1, single: 2, deluxe: 3, suite: 4 } as const;

export function roomLimitDaily(
  terms: PolicyTerms | null,
  sumInsured: number | null,
  override: number | null | undefined,
  selectedRoom: EstimateInput["roomType"]
): { limit: number | null; known: boolean; label: string } {
  if (override !== null && override !== undefined && override > 0) {
    return { limit: override, known: true, label: `${formatINR(override)}/day (entered by you)` };
  }
  const rule = terms?.roomRent;
  if (!rule) return { limit: null, known: false, label: "Not found in policy" };
  if (rule.type === "none") return { limit: Infinity, known: true, label: rule.label };
  if (rule.type === "fixed") return { limit: rule.value, known: true, label: rule.label };
  if (rule.type === "category") {
    // A category clause is not a numeric cap. Only an above-category selection needs
    // the actual eligible daily rate before a proportionate deduction can be calculated.
    if (ROOM_RANK[selectedRoom] <= ROOM_RANK[rule.category]) return { limit: Infinity, known: true, label: rule.label };
    return { limit: null, known: false, label: rule.label };
  }
  if (sumInsured === null) return { limit: null, known: false, label: rule.label };
  return { limit: (sumInsured * rule.value) / 100, known: true, label: rule.label };
}

export function runEstimate(
  input: EstimateInput,
  terms: PolicyTerms | null,
  coverage: CoverageCheck
): EstimateResult {
  const treatment = findTreatment(input.treatment);
  const city = cityFactor(input.city || "");
  const factor = city.factor * HOSPITAL_FACTOR[input.hospitalTier];
  const stay = input.lengthOfStay ?? treatment?.stayDays ?? 3;
  const missing: MissingField[] = [];
  const flags: CalcFlag[] = [];

  const roomDaily = ROOM_DAILY[input.roomType] * factor;
  const roomUplift = (ROOM_DAILY[input.roomType] - ROOM_DAILY.single) * factor * stay * 1.6;

  let costRange: EstimateResult["costRange"] = null;
  if (treatment) {
    costRange = {
      low: round(Math.max(treatment.low * factor + roomUplift * 0.5, treatment.low * 0.5)),
      high: round(treatment.high * factor + roomUplift),
      typical: round(treatment.typical * factor + roomUplift),
    };
  }
  const bill = input.billOverride && input.billOverride > 0 ? input.billOverride : costRange?.typical ?? null;
  const costDataNote = input.billOverride
    ? "Bill amount supplied by you."
    : treatment
      ? `Synthetic reference range for ${treatment.label.toLowerCase()} · ${city.tier} city · ${HOSPITAL_LABEL[input.hospitalTier].toLowerCase()} hospital.`
      : "No reference cost data is available for this treatment.";

  if (bill === null) {
    missing.push({
      key: "bill",
      label: "Expected treatment bill",
      why: "We have no reference cost data for this treatment, so there is no bill amount to calculate from.",
      whereToFind: "Ask the hospital for a written cost estimate (pre-authorisation estimate) for the procedure.",
      inputKey: "billOverride",
    });
  }

  const sumInsured = input.sumInsured ?? terms?.sumInsured ?? null;
  if (sumInsured === null) {
    missing.push({
      key: "sumInsured",
      label: "Sum insured",
      why: "The maximum the insurer can pay is capped by your sum insured.",
      whereToFind: "Policy schedule (first pages of the policy document) or your insurer's app / e-card.",
      inputKey: "sumInsured",
    });
  }
  if (input.alreadyUtilized === null || input.alreadyUtilized === undefined) {
    missing.push({
      key: "remainingSI",
      label: "Remaining sum insured",
      why: "Claims made earlier this policy year reduce what is left for this treatment.",
      whereToFind: "Insurer / TPA portal claim history, or enter 0 if you have not claimed this year.",
      inputKey: "alreadyUtilized",
    });
  }

  const room = roomLimitDaily(terms, sumInsured, input.roomRentLimitOverride, input.roomType);
  if (!room.known && input.roomType !== "general" && stay > 0) {
    missing.push({
      key: "roomLimit",
      label: "Eligible room charge per day",
      why: "The selected room is above the policy's eligible category. A proportionate deduction cannot be calculated without the actual eligible daily room rate.",
      whereToFind: "Ask the hospital for the tariff of the policy-eligible room category, or check the room-rent amount in the policy schedule.",
      inputKey: "roomRentLimitOverride",
    });
  }

  // Sub-limit
  let subLimit: number | null = null;
  let subLimitRef = null;
  if (input.subLimitOverride && input.subLimitOverride > 0) {
    subLimit = input.subLimitOverride;
  } else if (treatment && terms) {
    const match = terms.subLimits.find((s) =>
      s.keywords.some((k) => treatment.keywords.includes(k) || treatment.label.toLowerCase().includes(k))
    );
    if (match) {
      subLimitRef = match.ref;
      if (match.amount) subLimit = match.amount;
      else if (match.pctSI && sumInsured) subLimit = (match.pctSI * sumInsured) / 100;
      else
        missing.push({
          key: "subLimit",
          label: "Exact treatment sub-limit",
          why: `The policy mentions a sub-limit for ${match.name}, but the exact amount could not be read.`,
          whereToFind: "Check the sub-limit table / annexure of the policy wording.",
          inputKey: "subLimitOverride",
        });
    } else if (terms.hasSubLimitSchedule && COMMONLY_SUBLIMITED.includes(treatment.id)) {
      missing.push({
        key: "subLimit",
        label: "Exact treatment sub-limit",
        why: "The policy refers to sub-limits but we could not identify one for this treatment.",
        whereToFind: "Check the sub-limit table / annexure in the policy wording or ask your insurer.",
        inputKey: "subLimitOverride",
      });
    }
  }

  // Co-payment
  let copayPct = 0;
  let copayNote = "";
  if (input.copayOverride !== null && input.copayOverride !== undefined) {
    copayPct = input.copayOverride;
    copayNote = "Co-payment entered by you.";
  } else if (terms) {
    const applicable: { pct: number; why: string }[] = [];
    if (terms.copayPct) applicable.push({ pct: terms.copayPct, why: "general co-payment" });
    if (terms.seniorCopay && input.patientAge >= terms.seniorCopay.age)
      applicable.push({ pct: terms.seniorCopay.pct, why: `age ${terms.seniorCopay.age}+ co-payment` });
    if (terms.nonNetworkCopayPct && !input.networkHospital)
      applicable.push({ pct: terms.nonNetworkCopayPct, why: "non-network hospital co-payment" });
    if (applicable.length === 1) {
      copayPct = applicable[0].pct;
      copayNote = `Applied the ${applicable[0].why} (${applicable[0].pct}%).`;
    } else if (applicable.length > 1) {
      const top = applicable.reduce((a, b) => (b.pct > a.pct ? b : a));
      copayPct = top.pct;
      copayNote = `Temporarily showing the highest identified rate (${top.pct}%), pending confirmation.`;
      missing.push({
        key: "copayApplication",
        label: "Applicable co-payment",
        why: `More than one co-payment clause may apply (${applicable.map((a) => `${a.pct}% ${a.why}`).join(", ")}). The policy does not make the interaction unambiguous.`,
        whereToFind: "Check whether the age and non-network co-pay clauses say 'instead of', 'in addition to', or ask the insurer/TPA to confirm the applicable rate.",
        inputKey: "copayOverride",
      });
      flags.push({ id: "copay-ambiguous", severity: "warning", text: "Multiple co-payment clauses may apply. Enter the insurer-confirmed rate before relying on a payment estimate.", evidence: terms.refs.copay ?? terms.refs.seniorCopay ?? terms.refs.nonNetworkCopay ?? null });
    } else {
      copayNote = "No co-payment clause was found; assumed 0%.";
      flags.push({ id: "no-copay", severity: "info", text: "No co-payment clause was found in the policy, so 0% was assumed." });
    }
  }

  // For an annual/aggregate deductible, the amount already met earlier in the policy year
  // changes this claim. Do not assume it has not been met.
  let deductible = input.deductibleOverride ?? terms?.deductible ?? 0;
  let deductibleNote = input.deductibleOverride !== null && input.deductibleOverride !== undefined ? "Deductible entered by you." : "";
  if (input.deductibleOverride === null || input.deductibleOverride === undefined) {
    if (terms?.deductibleBasis === "aggregate" && terms.deductible) {
      if (input.deductibleAlreadyMet === null || input.deductibleAlreadyMet === undefined) {
        missing.push({
          key: "deductibleAlreadyMet",
          label: "Deductible already met this policy year",
          why: "This policy uses an aggregate deductible, so any amount already borne earlier this year reduces the deductible left for this claim.",
          whereToFind: "Insurer/TPA claim history or prior claim settlement letters. Enter 0 if no part of the deductible has been met.",
          inputKey: "deductibleAlreadyMet",
        });
      } else {
        deductible = Math.max(0, terms.deductible - input.deductibleAlreadyMet);
        deductibleNote = `${formatINR(input.deductibleAlreadyMet)} already met; ${formatINR(deductible)} remains of the annual deductible.`;
      }
    } else if (terms?.deductible) {
      deductibleNote = terms.deductibleBasis === "per_claim" ? "Per-claim deductible as stated in the policy." : "Deductible basis is not explicit; calculated as a per-claim amount.";
      if (terms.deductibleBasis === "unknown") {
        flags.push({ id: "deductible-basis", severity: "warning", text: "The policy states a deductible but does not clearly say whether it is per claim or annual. This calculation uses it once for this claim.", evidence: terms.refs.deductible ?? null });
      }
    }
  }

  // Waiting periods / coverage gates
  let blocked: string | null = null;
  if (coverage.status === "excluded") {
    blocked = "The treatment appears to be excluded by the policy.";
    flags.push({ id: "excluded", severity: "critical", text: coverage.note, evidence: coverage.evidence[0] ?? null });
  }
  if (input.preExisting) {
    if (terms?.pedWaitingMonths) {
      if (input.policyYears * 12 < terms.pedWaitingMonths) {
        blocked = blocked ?? `Pre-existing disease waiting period (${terms.pedWaitingMonths} months) not yet completed.`;
        flags.push({
          id: "ped-wait",
          severity: "critical",
          text: `Pre-existing condition waiting period of ${terms.pedWaitingMonths} months is not completed (policy held ${input.policyYears} yr).`,
          evidence: terms.refs.pedWaiting ?? null,
        });
      } else {
        flags.push({ id: "ped-ok", severity: "info", text: `Pre-existing waiting period (${terms.pedWaitingMonths} months) appears completed.`, evidence: terms.refs.pedWaiting ?? null });
      }
    } else {
      flags.push({ id: "ped-unknown", severity: "warning", text: "The pre-existing disease waiting period could not be found in the policy." });
    }
  }
  if (treatment && terms?.specificWaitingMonths && terms.specificWaitingKeywords.some((k) => treatment.keywords.includes(k) || treatment.label.toLowerCase().includes(k))) {
    if (input.policyYears * 12 < terms.specificWaitingMonths) {
      blocked = blocked ?? `Specific treatment waiting period (${terms.specificWaitingMonths} months) not yet completed.`;
      flags.push({
        id: "specific-wait",
        severity: "critical",
        text: `${treatment.label} is listed under a ${terms.specificWaitingMonths}-month specific waiting period, which is not completed.`,
        evidence: terms.refs.specificWaiting ?? null,
      });
    } else {
      flags.push({
        id: "specific-ok",
        severity: "info",
        text: `${treatment.label} has a ${terms.specificWaitingMonths}-month specific waiting period, which appears completed.`,
        evidence: terms.refs.specificWaiting ?? null,
      });
    }
  }
  if (input.policyYears === 0 && terms?.initialWaitingDays) {
    flags.push({ id: "initial-wait", severity: "warning", text: `An initial waiting period of ${terms.initialWaitingDays} days applies to non-accident claims in the first policy year.`, evidence: terms.refs.initialWaiting ?? null });
  }
  if (!input.networkHospital) {
    flags.push({ id: "non-network", severity: "info", text: "Non-network hospital: cashless treatment is usually unavailable; you may need to pay first and claim reimbursement.", evidence: terms?.refs.network ?? null });
  }
  if (coverage.status === "verify" || coverage.status === "insufficient") {
    flags.push({ id: "coverage-verify", severity: "warning", text: coverage.note, evidence: coverage.evidence[0] ?? null });
  }
  if (coverage.status === "conflict") {
    flags.push({ id: "coverage-conflict", severity: "warning", text: coverage.note, evidence: coverage.evidence[0] ?? null });
  }
  if (coverage.status === "verify" || coverage.status === "insufficient" || coverage.status === "conflict") {
    missing.push({
      key: "coverageEligibility",
      label: "Confirmed coverage eligibility",
      why: "The policy evidence does not establish a single clear coverage outcome for this treatment. A financial payment figure would be misleading until this is resolved.",
      whereToFind: "Read the cited clauses and their exceptions, then ask the insurer/TPA for written pre-authorisation or coverage confirmation.",
      requiresInput: false,
    });
  }

  const evidenceStrength: EvidenceStrength =
    coverage.evidence.length === 0 ? "missing" : coverage.status === "covered" && terms?.refs.sumInsured ? "strong" : "partial";

  const base: Omit<EstimateResult, "complete" | "steps" | "figures"> = {
    input,
    treatmentLabel: treatment?.label ?? input.treatment,
    costRange,
    costDataNote,
    missing,
    flags,
    quality: {
      evidence: evidenceStrength,
      calculation: missing.length ? "incomplete" : "complete",
      costData: input.billOverride ? "user_supplied" : treatment ? "synthetic" : "none",
    },
    coverageStatus: coverage.status,
    coverageNote: coverage.note,
    coverageEvidence: coverage.evidence,
  };

  if (missing.length || bill === null || sumInsured === null) {
    return { ...base, complete: false, steps: [], figures: null };
  }

  // --- Calculation ---
  const steps: CalcStep[] = [];
  steps.push({
    key: "bill",
    label: "Treatment bill",
    amount: bill,
    delta: 0,
    kind: "start",
    tooltip: "Typical total hospital bill for this scenario, from the reference cost range (or the amount you entered).",
    note: costDataNote,
  });

  let roomDeduction = 0;
  if (room.limit !== null && room.limit !== Infinity && roomDaily > room.limit && stay > 0) {
    const roomCharges = roomDaily * stay;
    const excessRoom = (roomDaily - room.limit) * stay;
    const ratio = room.limit / roomDaily;
    const associated = terms?.proportionateDeduction
      ? (bill - roomCharges) * (treatment?.associatedShare ?? 0.6) * (1 - ratio)
      : 0;
    roomDeduction = round(Math.min(bill, excessRoom + associated));
    flags.push({
      id: "room-rent",
      severity: "warning",
      text: `${ROOM_LABEL[input.roomType]} (~${formatINR(roomDaily)}/day) exceeds the room limit of ${formatINR(room.limit)}/day${terms?.proportionateDeduction ? "; proportionate deduction applies to associated charges" : ""}.`,
      evidence: terms?.refs.roomRent ?? null,
    });
  }
  const eligible = bill - roomDeduction;
  steps.push({
    key: "eligible",
    label: "Eligible amount",
    amount: eligible,
    delta: -roomDeduction,
    kind: "reduce",
    tooltip: "Bill minus amounts the policy does not recognise, such as room rent above the limit and proportionate deductions on associated charges.",
    note: roomDeduction ? `Room limit: ${room.label}` : `Room limit: ${room.label} — no deduction`,
    evidence: roomDeduction ? terms?.refs.roomRent ?? null : null,
  });

  const afterSubLimit = subLimit !== null ? Math.min(eligible, subLimit) : eligible;
  steps.push({
    key: "sublimit",
    label: "Sub-limit",
    amount: afterSubLimit,
    delta: afterSubLimit - eligible,
    kind: "cap",
    tooltip: "Some treatments have a maximum payable amount (sub-limit) regardless of sum insured.",
    note: subLimit !== null ? `Capped at ${formatINR(subLimit)}` : "No treatment sub-limit identified",
    evidence: subLimitRef,
  });

  const remaining = Math.max(0, sumInsured - (input.alreadyUtilized ?? 0));
  const afterSumInsured = Math.min(afterSubLimit, remaining);
  if (afterSumInsured < afterSubLimit) {
    steps.push({
      key: "si",
      label: "Remaining sum insured",
      amount: afterSumInsured,
      delta: afterSumInsured - afterSubLimit,
      kind: "cap",
      tooltip: "The insurer cannot pay more than the sum insured left for this policy year.",
      note: `Remaining: ${formatINR(remaining)}`,
      evidence: terms?.refs.sumInsured ?? null,
    });
  }

  const ded = Math.min(deductible, afterSumInsured);
  const afterDed = afterSumInsured - ded;
  steps.push({
    key: "deductible",
    label: "Deductible",
    amount: afterDed,
    delta: -ded,
    kind: "reduce",
    tooltip: "A fixed amount you bear before the insurer pays.",
    note: deductible ? deductibleNote || `${formatINR(deductible)} as per policy` : "No deductible identified",
    evidence: terms?.refs.deductible ?? null,
  });

  const copay = round((afterDed * copayPct) / 100);
  let insurer = afterDed - copay;
  steps.push({
    key: "copay",
    label: "Co-payment",
    amount: insurer,
    delta: -copay,
    kind: "reduce",
    tooltip: "A percentage of the admissible claim that you share with the insurer.",
    note: copayNote || `${copayPct}%`,
    evidence: copayPct ? terms?.refs.copay ?? terms?.refs.seniorCopay ?? terms?.refs.nonNetworkCopay ?? null : null,
  });

  if (blocked) {
    steps.push({
      key: "blocked",
      label: "Coverage condition",
      amount: 0,
      delta: -insurer,
      kind: "reduce",
      tooltip: "A waiting period or exclusion may prevent the claim from being paid at all.",
      note: blocked,
    });
    insurer = 0;
  }

  steps.push({
    key: "insurer",
    label: "Potential insurer payment",
    amount: insurer,
    delta: 0,
    kind: "result",
    tooltip: "Indicative amount the insurer may pay if the claim is admitted on these terms.",
  });
  const oop = bill - insurer;
  steps.push({
    key: "oop",
    label: "Potential out-of-pocket",
    amount: oop,
    delta: 0,
    kind: "oop",
    tooltip: "Bill minus potential insurer payment. Excludes non-medical consumables, which often add 5–10%.",
  });

  return {
    ...base,
    complete: true,
    steps,
    figures: { bill, roomDeduction, eligible, afterSubLimit, afterSumInsured, deductible: ded, copay, insurer, oop },
  };
}

const INPUT_LABELS: Partial<Record<keyof EstimateInput, string>> = {
  treatment: "Treatment",
  city: "City",
  hospitalTier: "Hospital tier",
  patientAge: "Patient age",
  networkHospital: "Network hospital",
  roomType: "Room type",
  preExisting: "Pre-existing condition",
  policyYears: "Years with policy",
  sumInsured: "Sum insured",
  alreadyUtilized: "Already utilised",
  roomRentLimitOverride: "Room limit override",
  subLimitOverride: "Sub-limit override",
  copayOverride: "Co-payment override",
  deductibleOverride: "Deductible override",
  deductibleAlreadyMet: "Deductible already met",
  lengthOfStay: "Length of stay",
  billOverride: "Bill amount",
};

export function formatInputValue(key: keyof EstimateInput, v: unknown): string {
  if (v === null || v === undefined || v === "") return "—";
  if (key === "roomType") return ROOM_LABEL[v as keyof typeof ROOM_LABEL] ?? String(v);
  if (key === "hospitalTier") return HOSPITAL_LABEL[v as keyof typeof HOSPITAL_LABEL] ?? String(v);
  if (typeof v === "boolean") return v ? "Yes" : "No";
  if (["sumInsured", "alreadyUtilized", "roomRentLimitOverride", "subLimitOverride", "deductibleOverride", "deductibleAlreadyMet", "billOverride"].includes(key))
    return formatINR(Number(v));
  if (key === "copayOverride") return `${v}%`;
  if (key === "lengthOfStay") return `${v} days`;
  if (key === "policyYears") return `${v} yr`;
  return String(v);
}

export function compareEstimates(a: EstimateResult, b: EstimateResult, terms: PolicyTerms | null): CompareResult {
  const diffs: ScenarioDiff[] = [];
  (Object.keys(INPUT_LABELS) as (keyof EstimateInput)[]).forEach((k) => {
    const av = a.input[k] ?? null;
    const bv = b.input[k] ?? null;
    if (String(av ?? "") !== String(bv ?? "")) {
      diffs.push({ key: k, label: INPUT_LABELS[k] ?? k, a: formatInputValue(k, av), b: formatInputValue(k, bv) });
    }
  });

  const policy: CompareResult["impacts"]["policy"] = [];
  const aFlags = new Set(a.flags.map((f) => f.id));
  const bFlags = new Set(b.flags.map((f) => f.id));
  for (const f of b.flags) {
    if (!aFlags.has(f.id) && f.severity !== "info") {
      const page = f.evidence ? ` identified on Page ${f.evidence.page}` : "";
      const what = f.id === "room-rent" ? `the room-rent restriction${page}` : f.id.includes("wait") ? `a waiting-period restriction${page}` : `a policy condition${page}`;
      policy.push({ text: `Scenario B triggers ${what}. ${f.text}`, evidence: f.evidence });
    }
  }
  for (const f of a.flags) {
    if (!bFlags.has(f.id) && f.severity !== "info") {
      policy.push({ text: `Scenario A is affected by a condition Scenario B avoids: ${f.text}`, evidence: f.evidence });
    }
  }
  if (!policy.length) policy.push({ text: "No additional policy restriction is triggered by the changed inputs." });

  const billA = a.figures?.bill ?? null;
  const billB = b.figures?.bill ?? null;
  const oopA = a.figures?.oop ?? null;
  const oopB = b.figures?.oop ?? null;
  const diffText = (x: number | null, y: number | null, noun: string) => {
    if (x === null || y === null) return `Cannot compare ${noun} — one scenario is incomplete.`;
    const d = y - x;
    if (Math.abs(d) < 100) return `No material change in ${noun}.`;
    return `Scenario B's ${noun} is ${formatINR(Math.abs(d))} ${d > 0 ? "higher" : "lower"} (${formatINR(x)} → ${formatINR(y)}).`;
  };
  const coverage =
    a.coverageStatus === b.coverageStatus && (a.figures?.insurer ?? 0) > 0 === (b.figures?.insurer ?? 0) > 0
      ? `Coverage status is unchanged. Insurer contribution: ${formatINR(a.figures?.insurer)} → ${formatINR(b.figures?.insurer)}.`
      : `Coverage position changes. Insurer contribution: ${formatINR(a.figures?.insurer)} → ${formatINR(b.figures?.insurer)}.`;
  void terms;
  return {
    a,
    b,
    diffs,
    impacts: {
      policy,
      cost: diffText(billA, billB, "estimated bill"),
      coverage,
      oop: diffText(oopA, oopB, "potential out-of-pocket"),
    },
  };
}
