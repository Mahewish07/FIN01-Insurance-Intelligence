export type PolicyStatus =
  | "uploaded"
  | "extracting"
  | "understanding"
  | "indexing"
  | "ready"
  | "failed";

export type PolicyErrorCode =
  | "unsupported_pdf"
  | "ocr_required"
  | "too_large"
  | "server_error";

export type ClauseCategory =
  | "coverage"
  | "exclusion"
  | "waiting_period"
  | "financial"
  | "claim"
  | "definition"
  | "general";

export interface EvidenceRef {
  chunkId: string;
  page: number;
  section: string;
  heading: string;
  category: ClauseCategory;
  text: string;
  highlight?: string[];
}

export interface PolicyMeta {
  policyName: string | null;
  insurer: string | null;
  plan: string | null;
  period: string | null;
  sumInsured: number | null;
  roomEligibility: string | null;
  networkInfo: string | null;
}

export type RoomRentRule =
  | { type: "percent_si"; value: number; label: string }
  | { type: "fixed"; value: number; label: string }
  | { type: "category"; value: null; category: RoomType; label: string }
  | { type: "none"; value: null; label: string };

export interface SubLimit {
  name: string;
  keywords: string[];
  amount: number | null;
  pctSI: number | null;
  ref: EvidenceRef | null;
}

export interface PolicyTerms {
  sumInsured: number | null;
  copayPct: number | null;
  seniorCopay: { age: number; pct: number } | null;
  nonNetworkCopayPct: number | null;
  deductible: number | null;
  /** Whether the extracted deductible applies to each claim or accumulates across the policy year. */
  deductibleBasis: "aggregate" | "per_claim" | "unknown";
  roomRent: RoomRentRule | null;
  proportionateDeduction: boolean;
  initialWaitingDays: number | null;
  pedWaitingMonths: number | null;
  specificWaitingMonths: number | null;
  specificWaitingKeywords: string[];
  hasSubLimitSchedule: boolean;
  subLimits: SubLimit[];
  refs: Partial<
    Record<
      | "sumInsured"
      | "copay"
      | "seniorCopay"
      | "nonNetworkCopay"
      | "deductible"
      | "roomRent"
      | "proportionate"
      | "initialWaiting"
      | "pedWaiting"
      | "specificWaiting"
      | "network",
      EvidenceRef
    >
  >;
}

export type ItemStatus = "covered" | "excluded" | "verify" | "restriction" | "info";

export interface SummaryItem {
  id: string;
  title: string;
  status: ItemStatus;
  explanation: string;
  evidence: EvidenceRef[];
}

export interface PolicySummary {
  coverage: SummaryItem[];
  exclusions: SummaryItem[];
  waitingPeriods: SummaryItem[];
  financial: SummaryItem[];
  claims: SummaryItem[];
}

export interface PolicyListItem {
  id: string;
  fileName: string;
  fileSize: number;
  status: PolicyStatus;
  errorCode: PolicyErrorCode | null;
  errorMessage: string | null;
  isSample: boolean;
  pageCount: number;
  policyName: string | null;
  insurer: string | null;
  createdAt: string;
}

export interface Policy extends PolicyListItem {
  meta: PolicyMeta | null;
  terms: PolicyTerms | null;
  summary: PolicySummary | null;
}

export interface PageContent {
  page: number;
  pageCount: number;
  chunks: EvidenceRef[];
}

export type EvidenceStrength = "strong" | "partial" | "missing";
export type CalcCompleteness = "complete" | "incomplete" | "not_applicable";
export type CostDataQuality = "reference" | "synthetic" | "user_supplied" | "none" | "not_applicable";

export interface Quality {
  evidence: EvidenceStrength;
  calculation: CalcCompleteness;
  costData: CostDataQuality;
}

export type AnswerStatus =
  | "covered"
  | "excluded"
  | "verify"
  | "insufficient"
  | "conflict"
  | "info";

export interface CalcStep {
  key: string;
  label: string;
  amount: number;
  delta: number;
  kind: "start" | "reduce" | "cap" | "result" | "oop";
  tooltip: string;
  note?: string;
  evidence?: EvidenceRef | null;
}

export interface AskResponse {
  id: string;
  question: string;
  status: AnswerStatus;
  headline: string;
  interpretation: string;
  why: string[];
  evidence: EvidenceRef[];
  calculation: { steps: CalcStep[]; assumptions: string[] } | null;
  quality: Quality;
  followUps: string[];
}

export type HospitalTier = "premium" | "standard" | "budget";
export type RoomType = "general" | "shared" | "single" | "deluxe" | "suite";

export interface EstimateInput {
  treatment: string;
  city: string;
  hospitalTier: HospitalTier;
  patientAge: number;
  networkHospital: boolean;
  roomType: RoomType;
  preExisting: boolean;
  policyYears: number;
  sumInsured: number | null;
  alreadyUtilized: number | null;
  roomRentLimitOverride?: number | null;
  subLimitOverride?: number | null;
  copayOverride?: number | null;
  deductibleOverride?: number | null;
  /** Amount of an aggregate deductible already satisfied earlier in this policy year. */
  deductibleAlreadyMet?: number | null;
  lengthOfStay?: number | null;
  billOverride?: number | null;
}

export interface MissingField {
  key: string;
  label: string;
  why: string;
  whereToFind: string;
  /** Omitted for an evidence gap that cannot be resolved by entering a number. */
  inputKey?: keyof EstimateInput;
  /** False when the user must verify the clause rather than fill in an input. */
  requiresInput?: boolean;
}

export interface CalcFlag {
  id: string;
  severity: "info" | "warning" | "critical";
  text: string;
  evidence?: EvidenceRef | null;
}

export interface EstimateFigures {
  bill: number;
  roomDeduction: number;
  eligible: number;
  afterSubLimit: number;
  afterSumInsured: number;
  deductible: number;
  copay: number;
  insurer: number;
  oop: number;
}

export interface EstimateResult {
  input: EstimateInput;
  treatmentLabel: string;
  costRange: { low: number; high: number; typical: number } | null;
  costDataNote: string;
  complete: boolean;
  missing: MissingField[];
  steps: CalcStep[];
  figures: EstimateFigures | null;
  flags: CalcFlag[];
  quality: Quality;
  coverageStatus: AnswerStatus;
  coverageNote: string;
  coverageEvidence: EvidenceRef[];
  reportId?: string;
}

export interface ScenarioDiff {
  key: string;
  label: string;
  a: string;
  b: string;
}

export interface CompareResult {
  a: EstimateResult;
  b: EstimateResult;
  diffs: ScenarioDiff[];
  impacts: {
    policy: { text: string; evidence?: EvidenceRef | null }[];
    cost: string;
    coverage: string;
    oop: string;
  };
  reportId?: string;
}

export interface ReportItem {
  id: string;
  policyId: string | null;
  kind: "estimate" | "compare";
  title: string;
  createdAt: string;
  result: EstimateResult | CompareResult;
}

export interface CoverageCheck {
  status: AnswerStatus;
  note: string;
  evidence: EvidenceRef[];
}
