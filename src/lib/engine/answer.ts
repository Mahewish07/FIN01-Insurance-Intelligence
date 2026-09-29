import type { AskResponse, ClauseCategory, CoverageCheck, EstimateInput, EvidenceRef, Policy, Quality } from "@/lib/types";
import { findTreatment } from "@/lib/engine/costData";
import { runEstimate } from "@/lib/engine/calc";
import { formatINR } from "@/lib/utils";

export interface Retriever {
  search(terms: string[], limit: number, category?: ClauseCategory): Promise<EvidenceRef[]>;
  byCategory(category: ClauseCategory, limit: number): Promise<EvidenceRef[]>;
}

const STOP = new Set(
  "a an the is are am was were be been of to in on for with by at from and or not no my me i we our you your this that these those it its does do did can could would should will shall may might what which who whom how much many when where why there here under policy plan insurance insurer insured covered cover coverage covers treatment treatments procedure procedures surgery surgical operation hospital hospitalisation hospitalization expense expenses cost costs claim claims get getting have has had any about if also like please tell know need needed apply applies applicable am pay paid payable disease illness condition therapy included include includes eligible eligibility".split(
    " "
  )
);

function keyTerms(question: string): string[] {
  const words = question
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length >= 3 && !STOP.has(w));
  const t = findTreatment(question);
  const extra = t ? t.keywords.filter((k) => question.toLowerCase().includes(k) || k.includes(" ")) : [];
  if (t && words.some((w) => t.keywords.some((k) => k.includes(w)))) extra.push(...t.keywords);
  // Keep the generated tsquery bounded even for a very long valid user question.
  return Array.from(new Set([...words, ...extra])).slice(0, 16);
}

function escapeRe(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function containsTerm(text: string, term: string) {
  const suffix = term.includes(" ") ? "" : "(?:s|es)?";
  return new RegExp(`\\b${escapeRe(term)}${suffix}\\b`, "i").test(text);
}

/**
 * Coverage benefits need a stronger match than exclusions. This avoids treating a
 * generic mention such as "surgical implants" as a benefit for "dental implant".
 */
function isDirectSubjectMatch(ref: EvidenceRef, terms: string[], treatmentKnown: boolean, allowSingleTerm: boolean) {
  const haystack = `${ref.heading} ${ref.text}`;
  const matched = terms.filter((term) => containsTerm(haystack, term));
  if (treatmentKnown) return matched.length > 0;
  if (terms.length <= 1) return matched.length > 0;
  return allowSingleTerm ? matched.length > 0 : matched.length >= 2;
}

function dedupe(refs: (EvidenceRef | null | undefined)[]): EvidenceRef[] {
  const seen = new Set<string>();
  const out: EvidenceRef[] = [];
  for (const r of refs) {
    if (!r || seen.has(r.chunkId)) continue;
    seen.add(r.chunkId);
    out.push(r);
  }
  return out;
}

export async function checkCoverage(rt: Retriever, text: string): Promise<CoverageCheck & { terms: string[]; direct: EvidenceRef[] }> {
  const terms = keyTerms(text);
  const treatment = findTreatment(text);
  const general = await rt.byCategory("coverage", 1);
  if (!terms.length) {
    return {
      status: "verify",
      note: "Please name the specific treatment so we can look for clauses that mention it.",
      evidence: general,
      terms,
      direct: [],
    };
  }

  const results = await rt.search(terms, 12);
  const direct = results
    .filter((r) => {
      const isExclusion = r.category === "exclusion";
      const isCondition = r.category === "waiting_period" || r.category === "financial";
      return isDirectSubjectMatch(r, terms, !!treatment, isExclusion || isCondition);
    })
    .map((r) => ({ ...r, highlight: [...terms, "not covered", "limited to", "months"] }));
  const excl = direct.filter((r) => r.category === "exclusion");
  const covering = direct.filter((r) => r.category === "coverage" || (r.category !== "exclusion" && /\b(covered|we will pay|payable)\b/i.test(r.text)));
  const conditions = direct.filter((r) => r.category === "waiting_period" || r.category === "financial");

  if (excl.length && covering.length) {
    return {
      status: "conflict",
      note: "The policy contains treatment-specific clauses that both include and exclude this treatment. The exception or exclusion needs insurer confirmation.",
      evidence: dedupe([...covering.slice(0, 2), ...excl.slice(0, 2)]),
      terms,
      direct,
    };
  }
  if (excl.length) {
    return {
      status: "excluded",
      note: `This treatment appears in the exclusions (Page ${excl[0].page}, Section ${excl[0].section}).`,
      evidence: dedupe(excl.slice(0, 3)),
      terms,
      direct,
    };
  }
  if (covering.length) {
    return {
      status: "covered",
      note: "The treatment is directly referenced in a benefit clause and no directly matching exclusion was found.",
      evidence: dedupe([...covering.slice(0, 3), ...conditions.slice(0, 2)]),
      terms,
      direct,
    };
  }
  if (conditions.length && general.length) {
    return {
      status: "covered",
      note: "The treatment is referenced in policy conditions and the general hospitalisation benefit; no directly matching exclusion was found.",
      evidence: dedupe([...general, ...conditions.slice(0, 3)]),
      terms,
      direct,
    };
  }
  if (general.length) {
    return {
      status: "verify",
      note: "This treatment is not specifically mentioned. It may fall under general in-patient hospitalisation cover, but this needs verification.",
      evidence: general,
      terms,
      direct,
    };
  }
  return {
    status: "insufficient",
    note: "We could not find enough policy text to assess this treatment.",
    evidence: [],
    terms,
    direct,
  };
}

const NA: Quality = { evidence: "partial", calculation: "not_applicable", costData: "not_applicable" };

const FOLLOW_UPS = [
  "What is my waiting period?",
  "Does the room type affect reimbursement?",
  "What exclusions apply?",
  "What documents are needed for a claim?",
];

export const DEFAULT_ASSUMPTIONS = {
  city: "Mumbai",
  hospitalTier: "standard" as const,
  patientAge: 40,
  networkHospital: true,
  roomType: "single" as const,
  preExisting: false,
  policyYears: 3,
  alreadyUtilized: 0,
};

export async function answerQuestion(rt: Retriever, policy: Policy, question: string): Promise<AskResponse> {
  const q = question.toLowerCase();
  const terms = policy.terms;
  const base = { id: globalThis.crypto.randomUUID(), question, calculation: null, followUps: FOLLOW_UPS.filter((f) => f.toLowerCase() !== q) };
  const r = terms?.refs ?? {};

  if (/wait/.test(q)) {
    const t = findTreatment(question);
    const why: string[] = [];
    if (terms?.initialWaitingDays) why.push(`Initial waiting period: ${terms.initialWaitingDays} days from policy start (accidents usually exempt).`);
    if (terms?.pedWaitingMonths) why.push(`Pre-existing diseases: ${terms.pedWaitingMonths} months of continuous coverage.`);
    if (terms?.specificWaitingMonths)
      why.push(`Specified illnesses/procedures: ${terms.specificWaitingMonths} months${terms.specificWaitingKeywords.length ? ` (includes ${terms.specificWaitingKeywords.slice(0, 5).join(", ")})` : ""}.`);
    const evidence = dedupe([r.initialWaiting, r.pedWaiting, r.specificWaiting]);
    const specific = t && terms?.specificWaitingKeywords.some((k) => t.keywords.includes(k));
    return {
      ...base,
      status: evidence.length ? "info" : "insufficient",
      headline: evidence.length ? "Waiting periods apply" : "Waiting periods not found",
      interpretation: evidence.length
        ? specific
          ? `${t!.label} is in the list of specified procedures, so it is typically payable only after ${terms!.specificWaitingMonths} months of continuous coverage.`
          : "The policy sets different waiting periods depending on the type of condition. Which one applies depends on your diagnosis and how long you have held the policy."
        : "We could not identify waiting-period clauses in this document. Check the 'Waiting Period' section or ask your insurer.",
      why,
      evidence,
      quality: { ...NA, evidence: evidence.length >= 2 ? "strong" : evidence.length ? "partial" : "missing" },
    };
  }

  if (/room|icu|ward/.test(q)) {
    const evidence = dedupe([r.roomRent, r.proportionate]);
    const rule = terms?.roomRent;
    const limit = rule?.type === "percent_si" && terms?.sumInsured ? (terms.sumInsured * rule.value) / 100 : rule?.type === "fixed" ? rule.value : null;
    return {
      ...base,
      status: rule ? "info" : "insufficient",
      headline: rule ? (rule.type === "none" ? "No room rent limit found" : "Yes — room type can affect reimbursement") : "Room limit not found",
      interpretation: rule
        ? rule.type === "none"
          ? "The policy states no cap on room rent, so room choice should not reduce the claim."
          : `Room rent is limited to ${rule.label}${limit ? ` (about ${formatINR(limit)}/day on your sum insured)` : ""}. ${terms?.proportionateDeduction ? "Choosing a costlier room can reduce not just the room charge but other associated charges proportionately." : "Amounts above the limit would be borne by you."}`
        : "We could not find a room-rent clause. Without it, we cannot tell whether room choice affects your claim.",
      why: rule
        ? [
            `Eligible room: ${rule.label}.`,
            ...(terms?.proportionateDeduction ? ["A proportionate-deduction clause applies when the room exceeds the limit."] : []),
            "Try Scenario Compare to see the effect of a different room type.",
          ]
        : [],
      evidence,
      quality: { ...NA, evidence: evidence.length >= 2 ? "strong" : evidence.length ? "partial" : "missing" },
      followUps: ["How much could I pay?", ...base.followUps],
    };
  }

  if (/exclu/.test(q)) {
    const excl = await rt.byCategory("exclusion", 8);
    return {
      ...base,
      status: excl.length ? "info" : "insufficient",
      headline: excl.length ? `${excl.length} exclusion clause${excl.length > 1 ? "s" : ""} identified` : "No exclusion clauses found",
      interpretation: excl.length
        ? "These sections list what the policy will not pay for. Some exclusions have exceptions — open the evidence to read the exact wording."
        : "We could not identify an exclusions section in this document.",
      why: excl.slice(0, 6).map((e) => `${e.heading || "Section " + e.section} (Page ${e.page})`),
      evidence: excl.slice(0, 6),
      quality: { ...NA, evidence: excl.length ? "strong" : "missing" },
    };
  }

  if (/document|paperwork|how (do|to|can) (i )?(make a )?claim|claim process|cashless|reimburse/.test(q)) {
    const found = await rt.search(["claim documents", "discharge summary", "cashless", "reimbursement", "intimation"], 4, "claim");
    const evidence = found.map((f) => ({ ...f, highlight: ["documents", "discharge summary", "claim form", "within", "hours", "days"] }));
    return {
      ...base,
      status: evidence.length ? "info" : "insufficient",
      headline: evidence.length ? "Claim requirements found" : "Claim requirements not found",
      interpretation: evidence.length
        ? "The policy describes how to intimate and document a claim. Deadlines matter — late intimation can delay or reduce a claim."
        : "We could not locate the claim procedure. Your insurer's website or TPA will list required documents.",
      why: evidence.map((e) => `${e.heading || "Section " + e.section} (Page ${e.page})`),
      evidence,
      quality: { ...NA, evidence: evidence.length >= 2 ? "strong" : evidence.length ? "partial" : "missing" },
    };
  }

  if (/how much|cost|out.of.pocket|\boop\b|could i pay|will i pay|pay for/.test(q)) {
    const t = findTreatment(question);
    if (!t) {
      return {
        ...base,
        status: "verify",
        headline: "Tell us the treatment",
        interpretation: "To estimate what you could pay, we need a specific treatment. Try “How much could I pay for knee replacement?” or use the Treatment Estimate page for full control.",
        why: [],
        evidence: [],
        quality: { evidence: "missing", calculation: "incomplete", costData: "none" },
        followUps: ["How much could I pay for knee replacement?", "How much could I pay for cataract surgery?"],
      };
    }
    const cov = await checkCoverage(rt, t.label + " " + question);
    const input: EstimateInput = { treatment: t.label, sumInsured: null, ...DEFAULT_ASSUMPTIONS };
    const est = runEstimate(input, terms, cov);
    return {
      ...base,
      status: est.complete ? "info" : "verify",
      headline: est.complete ? `Potential out-of-pocket ≈ ${formatINR(est.figures!.oop)}` : "Cannot reliably complete this calculation yet",
      interpretation: est.complete
        ? `For a typical ${t.label.toLowerCase()} bill of ${formatINR(est.figures!.bill)}, the insurer may pay about ${formatINR(est.figures!.insurer)} under the terms we found. Actual amounts vary by hospital and case.`
        : `Missing: ${est.missing.map((m) => m.label.toLowerCase()).join(", ")}. Use the Treatment Estimate page to supply these.`,
      why: est.flags.filter((f) => f.severity !== "info").map((f) => f.text),
      evidence: dedupe([...cov.evidence.slice(0, 2), ...est.steps.map((s) => s.evidence)]),
      calculation: est.complete
        ? {
            steps: est.steps,
            assumptions: ["Metro city, standard private hospital", "Single private room, network hospital", "Age 40, policy held 3 years, no prior claims this year", "Synthetic reference cost data"],
          }
        : null,
      quality: est.quality,
      followUps: ["Does the room type affect reimbursement?", "What is my waiting period?"],
    };
  }

  // Coverage (default)
  const cov = await checkCoverage(rt, question);
  const t = findTreatment(question);
  const headline =
    cov.status === "covered" ? "Potentially covered" : cov.status === "excluded" ? "Potentially excluded" : cov.status === "conflict" ? "Conflicting clauses" : cov.status === "insufficient" ? "Insufficient evidence" : "Needs verification";
  const why: string[] = [];
  if (cov.status === "covered" || cov.status === "verify" || cov.status === "conflict") {
    if (t && terms?.specificWaitingMonths && terms.specificWaitingKeywords.some((k) => t.keywords.includes(k)))
      why.push(`Waiting period: ${terms.specificWaitingMonths} months of continuous coverage (Page ${r.specificWaiting?.page}).`);
    const sub = t && terms?.subLimits.find((s) => s.keywords.some((k) => t.keywords.includes(k)));
    if (sub) why.push(`Applicable sub-limit: ${sub.amount ? formatINR(sub.amount) : sub.pctSI ? `${sub.pctSI}% of sum insured` : "amount unclear"} (Page ${sub.ref?.page}).`);
    if (terms?.sumInsured) why.push(`Sum insured: payable within ${formatINR(terms.sumInsured)} per policy year, less any earlier claims.`);
    if (terms?.roomRent && terms.roomRent.type !== "none") why.push(`Hospital/room conditions: room rent up to ${terms.roomRent.label}${terms.proportionateDeduction ? "; proportionate deduction if exceeded" : ""}.`);
    if (terms?.copayPct) why.push(`Co-payment of ${terms.copayPct}% applies to admissible claims.`);
  }
  const subject = t ? t.label.replace(/\s*\(.*\)/, "").toLowerCase() : cov.terms.slice(0, 3).join(" ") || "This treatment";
  const interpretation =
    cov.status === "covered"
      ? `${capitalize(subject)} appears to fall within the coverage described in the supplied policy. However, eligibility depends on the conditions below.`
      : cov.status === "excluded"
        ? `${capitalize(subject)} appears to be excluded by the policy. ${cov.note}`
        : cov.status === "conflict"
          ? `${capitalize(subject)} is mentioned in both a benefit clause and an exclusion clause. ${cov.note}`
          : cov.note;
  const evidence = dedupe([...cov.evidence, ...(cov.status === "covered" ? [r.roomRent] : [])]).slice(0, 5);
  return {
    ...base,
    status: cov.status,
    headline,
    interpretation,
    why,
    evidence,
    quality: {
      evidence: cov.direct.length >= 2 ? "strong" : cov.evidence.length ? "partial" : "missing",
      calculation: "not_applicable",
      costData: "not_applicable",
    },
    followUps: t ? [`How much could I pay for ${t.label.replace(/\s*\(.*\)/, "").toLowerCase()}?`, ...FOLLOW_UPS.slice(0, 3)] : base.followUps,
  };
}

function capitalize(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
