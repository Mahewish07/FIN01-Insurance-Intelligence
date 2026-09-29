import type {
  ClauseCategory,
  EvidenceRef,
  PolicyMeta,
  PolicySummary,
  PolicyTerms,
  RoomType,
  SubLimit,
  SummaryItem,
} from "@/lib/types";
import { formatINR } from "@/lib/utils";

export interface RawChunk extends EvidenceRef {
  ordinal: number;
}

const HEADING_RE = /^\s*((?:section\s+)?\d{1,2}(?:\.\d{1,2}){0,3})[.)]?\s+([A-Z(][^\n]{1,110})$/i;
const INLINE_SPLIT_RE = /\s(?=\d{1,2}\.\d{1,2}(?:\.\d{1,2})?\s+[A-Z])/g;

const CATEGORY_KEYWORDS: Record<Exclude<ClauseCategory, "general">, string[]> = {
  exclusion: ["exclusion", "excluded", "not covered", "not payable", "shall not be liable", "will not pay", "not admissible", "permanent exclusion"],
  waiting_period: ["waiting period", "pre-existing", "continuous coverage", "months of continuous", "initial waiting"],
  financial: ["co-pay", "copay", "co-payment", "deductible", "room rent", "sub-limit", "sublimit", "proportionate", "limit of", "limited to", "sum insured", "per day"],
  claim: ["claim", "cashless", "reimbursement", "documents", "intimation", "tpa", "discharge summary", "pre-authorisation", "pre-authorization"],
  definition: [" means ", "definition", "shall mean", "defined as"],
  coverage: ["covered", "we will pay", "indemnify", "benefit", "hospitalisation", "hospitalization", "day care", "pre-hospital", "post-hospital", "ambulance", "expenses incurred"],
};

export function classify(heading: string, text: string): ClauseCategory {
  const h = ` ${heading.toLowerCase()} `;
  const t = ` ${text.toLowerCase()} `;
  let best: ClauseCategory = "general";
  let bestScore = 0;
  (Object.keys(CATEGORY_KEYWORDS) as (keyof typeof CATEGORY_KEYWORDS)[]).forEach((cat) => {
    let score = 0;
    for (const k of CATEGORY_KEYWORDS[cat]) {
      if (h.includes(k)) score += 4;
      const matches = t.split(k).length - 1;
      score += Math.min(matches, 4);
    }
    if (score > bestScore) {
      bestScore = score;
      best = cat;
    }
  });
  return best;
}

function normalize(s: string) {
  return s.replace(/\u00a0/g, " ").replace(/[ \t]+/g, " ").trim();
}

function splitLong(text: string, max = 1100): string[] {
  if (text.length <= max) return [text];
  const sentences = text.split(/(?<=[.;:])\s+/);
  const out: string[] = [];
  let cur = "";
  for (const s of sentences) {
    if ((cur + " " + s).length > max && cur) {
      out.push(cur.trim());
      cur = s;
    } else cur += " " + s;
  }
  if (cur.trim()) out.push(cur.trim());
  return out;
}

export function chunkPages(pages: string[]): RawChunk[] {
  const chunks: RawChunk[] = [];
  let ordinal = 0;
  let lastSection = "General";
  let lastHeading = "";
  pages.forEach((raw, idx) => {
    const page = idx + 1;
    let text = raw.replace(/\r/g, "");
    const lineCount = text.split("\n").length;
    if (lineCount < 4) text = text.replace(INLINE_SPLIT_RE, "\n");
    const lines = text.split("\n").map(normalize).filter(Boolean);
    let current: { section: string; heading: string; lines: string[] } = {
      section: lastSection,
      heading: lastHeading,
      lines: [],
    };
    const flush = () => {
      const body = current.lines.join(" ").trim();
      if (body.length < 25) return;
      if (current.lines.length <= 1 && body.length < 70 && HEADING_RE.test(current.lines[0] ?? "")) return;
      for (const part of splitLong(body)) {
        chunks.push({
          chunkId: globalThis.crypto.randomUUID(),
          page,
          section: current.section,
          heading: current.heading,
          category: classify(current.heading, part),
          text: part,
          ordinal: ordinal++,
        });
      }
    };
    for (const line of lines) {
      const m = line.match(HEADING_RE);
      if (m && line.length < 140) {
        flush();
        const section = m[1].replace(/^section\s+/i, "");
        const rest = m[2];
        const headingEnd = rest.search(/[.:]\s/);
        const heading = headingEnd > 0 && headingEnd < 80 ? rest.slice(0, headingEnd) : rest.length < 80 ? rest : rest.slice(0, 60);
        current = { section, heading: heading.trim(), lines: [line] };
        lastSection = section;
        lastHeading = heading.trim();
      } else {
        current.lines.push(line);
      }
    }
    flush();
  });
  return chunks;
}

// ---------- extraction helpers ----------

export function parseAmount(num: string, unit?: string): number {
  const n = parseFloat(num.replace(/,/g, ""));
  if (!unit) return n;
  const u = unit.toLowerCase();
  if (u.startsWith("lakh") || u.startsWith("lac")) return n * 100000;
  if (u.startsWith("crore") || u === "cr") return n * 10000000;
  return n;
}

const AMOUNT = String.raw`(?:₹|rs\.?|inr)\s*([\d,]+(?:\.\d+)?)\s*(lakhs?|lacs?|crores?|cr)?`;

function sentences(text: string): string[] {
  return text.split(/(?<=[.;])\s+(?=[A-Z(•\-])/).map((s) => s.trim()).filter(Boolean);
}

function ref(c: RawChunk, highlight?: string[]): EvidenceRef {
  return { chunkId: c.chunkId, page: c.page, section: c.section, heading: c.heading, category: c.category, text: c.text, highlight };
}

function firstMatch(chunks: RawChunk[], re: RegExp, filter?: (c: RawChunk) => boolean) {
  for (const c of chunks) {
    if (filter && !filter(c)) continue;
    const m = c.text.match(re);
    if (m) return { m, c };
  }
  return null;
}

const SUBLIMIT_TOPICS: { name: string; keywords: string[] }[] = [
  { name: "Joint replacement", keywords: ["joint replacement", "knee", "hip", "arthroplasty"] },
  { name: "Cataract", keywords: ["cataract"] },
  { name: "Maternity", keywords: ["maternity", "delivery", "caesarean"] },
  { name: "Hernia", keywords: ["hernia"] },
  { name: "Kidney stone", keywords: ["kidney stone", "lithotripsy", "renal"] },
  { name: "Gallbladder", keywords: ["gallbladder", "cholecystectomy"] },
  { name: "Cardiac procedures", keywords: ["angioplasty", "cardiac", "bypass"] },
  { name: "Modern treatments", keywords: ["robotic", "modern treatment"] },
];

const SPECIFIC_WAIT_TERMS = ["joint replacement", "knee", "hip", "cataract", "hernia", "kidney stone", "gallbladder", "cholecystectomy", "hysterectomy", "sinus", "tonsil", "piles", "arthroplasty", "renal", "lithotripsy"];

export function extractTerms(chunks: RawChunk[]): PolicyTerms {
  const refs: PolicyTerms["refs"] = {};
  const all = chunks;

  let sumInsured: number | null = null;
  const si = firstMatch(all, new RegExp(String.raw`sum insured[^.\n]{0,60}?` + AMOUNT, "i"));
  if (si) {
    sumInsured = parseAmount(si.m[1], si.m[2]);
    refs.sumInsured = ref(si.c, ["sum insured"]);
  }

  let copayPct: number | null = null;
  let seniorCopay: PolicyTerms["seniorCopay"] = null;
  let nonNetworkCopayPct: number | null = null;
  for (const c of all) {
    for (const s of sentences(c.text)) {
      const low = s.toLowerCase();
      if (!/co-?pay/.test(low)) continue;
      const pctM = s.match(/(\d{1,2}(?:\.\d)?)\s*%/);
      if (!pctM) continue;
      const pct = parseFloat(pctM[1]);
      const ageM = low.match(/aged?\s*(?:of\s*)?(\d{2})\s*(?:years?)?\s*(?:and|or)?\s*(?:above|older)?/);
      if (ageM && /(age|aged|senior)/.test(low)) {
        if (!seniorCopay) {
          seniorCopay = { age: parseInt(ageM[1], 10), pct };
          refs.seniorCopay = ref(c, ["co-payment", "copayment", "co-pay"]);
        }
      } else if (/non-?network/.test(low)) {
        if (nonNetworkCopayPct === null) {
          nonNetworkCopayPct = pct;
          refs.nonNetworkCopay = ref(c, ["non-network", "co-payment"]);
        }
      } else if (copayPct === null && !/no co-?pay/.test(low)) {
        copayPct = pct;
        refs.copay = ref(c, ["co-payment", "copayment", "co-pay"]);
      }
    }
  }

  let deductible: number | null = null;
  let deductibleBasis: PolicyTerms["deductibleBasis"] = "unknown";
  const ded = firstMatch(all, new RegExp(String.raw`deductible[^.\n]{0,80}?` + AMOUNT, "i"));
  if (ded) {
    deductible = parseAmount(ded.m[1], ded.m[2]);
    const clause = ded.c.text.toLowerCase();
    deductibleBasis = /aggregate|annual|per policy year/.test(clause)
      ? "aggregate"
      : /per (?:claim|hospitali[sz]ation|admission|event)/.test(clause)
        ? "per_claim"
        : "unknown";
    refs.deductible = ref(ded.c, ["deductible"]);
  }

  let roomRent: PolicyTerms["roomRent"] = null;
  const pctRoom = firstMatch(all, /room rent[^.]{0,160}?(\d(?:\.\d+)?)\s*%\s*of\s*(?:the\s*)?sum insured/i);
  const fixedRoom = firstMatch(all, new RegExp(String.raw`room rent[^.]{0,120}?` + AMOUNT + String.raw`\s*per day`, "i"));
  const catRoom = firstMatch(all, /(single private (?:a\.?c\.?\s*)?room|shared room|twin sharing|general ward)[^.]{0,40}/i, (c) => /room/i.test(c.text) && /(eligib|entitle|limit|categor|covered)/i.test(c.text));
  const noRoom = firstMatch(all, /no (?:cap|limit|sub-?limit|restriction) on room rent/i);
  if (pctRoom) {
    const v = parseFloat(pctRoom.m[1]);
    roomRent = { type: "percent_si", value: v, label: `${v}% of sum insured per day` };
    refs.roomRent = ref(pctRoom.c, ["room rent", "% of sum insured", "proportionate"]);
  } else if (fixedRoom) {
    const v = parseAmount(fixedRoom.m[1], fixedRoom.m[2]);
    roomRent = { type: "fixed", value: v, label: `${formatINR(v)} per day` };
    refs.roomRent = ref(fixedRoom.c, ["room rent", "per day"]);
  } else if (noRoom) {
    roomRent = { type: "none", value: null, label: "No room rent limit" };
    refs.roomRent = ref(noRoom.c, ["room rent"]);
  } else if (catRoom) {
    const t = catRoom.m[1].toLowerCase();
    const category: RoomType = t.includes("single") ? "single" : t.includes("general") ? "general" : "shared";
    roomRent = { type: "category", value: null, category, label: `Up to ${catRoom.m[1]}` };
    refs.roomRent = ref(catRoom.c, [catRoom.m[1].toLowerCase()]);
  }
  const prop = firstMatch(all, /proportionate/i);
  if (prop) refs.proportionate = ref(prop.c, ["proportionate"]);

  let initialWaitingDays: number | null = null;
  const iw = firstMatch(all, /(\d{2,3})\s*days?[^.]{0,120}?(?:commencement|inception|first policy|start)/i, (c) => /wait/i.test(c.text));
  if (iw) {
    initialWaitingDays = parseInt(iw.m[1], 10);
    refs.initialWaiting = ref(iw.c, ["days", "waiting period"]);
  }

  let pedWaitingMonths: number | null = null;
  let specificWaitingMonths: number | null = null;
  let specificWaitingKeywords: string[] = [];
  for (const c of all) {
    for (const s of sentences(c.text)) {
      const low = s.toLowerCase();
      const mM = low.match(/(\d{1,2})\s*months/);
      const yM = low.match(/(\d)\s*(?:\(\w+\)\s*)?years?/);
      const months = mM ? parseInt(mM[1], 10) : yM ? parseInt(yM[1], 10) * 12 : null;
      if (!months) continue;
      if (pedWaitingMonths === null && /pre-?existing/.test(low) && /(wait|continuous)/.test(low + c.text.toLowerCase())) {
        pedWaitingMonths = months;
        refs.pedWaiting = ref(c, ["pre-existing", `${mM ? mM[1] + " months" : "years"}`]);
      } else if (specificWaitingMonths === null && /(specific|specified|listed)/.test(low) && /(wait|continuous)/.test(low)) {
        specificWaitingMonths = months;
        refs.specificWaiting = ref(c, ["specific", "waiting", `${mM ? mM[1] + " months" : ""}`].filter(Boolean));
        const ctx = c.text.toLowerCase();
        specificWaitingKeywords = SPECIFIC_WAIT_TERMS.filter((k) => ctx.includes(k));
      }
    }
  }

  const hasSubLimitSchedule = all.some((c) => /sub-?limit/i.test(c.text));
  const subLimits: SubLimit[] = [];
  for (const topic of SUBLIMIT_TOPICS) {
    for (const c of all) {
      if (c.category === "exclusion" || c.category === "waiting_period") continue;
      const found = sentences(c.text).find((s) => {
        const low = s.toLowerCase();
        return topic.keywords.some((k) => low.includes(k)) && /(sub-?limit|limited to|maximum of|capped|up to)/.test(low);
      });
      if (found) {
        const amt = found.match(new RegExp(AMOUNT, "i"));
        const pct = found.match(/(\d{1,2})\s*%\s*of\s*(?:the\s*)?sum insured/i);
        subLimits.push({
          name: topic.name,
          keywords: topic.keywords,
          amount: amt ? parseAmount(amt[1], amt[2]) : null,
          pctSI: pct ? parseInt(pct[1], 10) : null,
          ref: ref(c, [...topic.keywords, "limited to", "sub-limit"]),
        });
        break;
      }
    }
  }

  const net = firstMatch(all, /network (?:hospital|provider)s?/i, (c) => /cashless/i.test(c.text) && !/\bmeans\b/i.test(c.text));
  if (net) refs.network = ref(net.c, ["network", "cashless"]);

  return {
    sumInsured,
    copayPct,
    seniorCopay,
    nonNetworkCopayPct,
    deductible,
    deductibleBasis,
    roomRent,
    proportionateDeduction: !!prop,
    initialWaitingDays,
    pedWaitingMonths,
    specificWaitingMonths,
    specificWaitingKeywords,
    hasSubLimitSchedule,
    subLimits,
    refs,
  };
}

export function extractMeta(pages: string[], chunks: RawChunk[], terms: PolicyTerms, fileName: string): PolicyMeta {
  const head = pages.slice(0, 3).join("\n");
  const grab = (re: RegExp) => {
    const m = head.match(re);
    return m ? normalize(m[1]).replace(/[.;,]$/, "").slice(0, 120) : null;
  };
  const insurerFound =
    grab(/insurer\s*[:\-]\s*([^\n]+)/i) ??
    grab(/([A-Z][A-Za-z&.\s]{2,60}?(?:General |Health )?Insurance (?:Company|Co\.)\s*(?:of India\s*)?(?:Limited|Ltd\.?))/);
  const policyName =
    grab(/policy name\s*[:\-]\s*([^\n]+)/i) ??
    grab(/product name\s*[:\-]\s*([^\n]+)/i) ??
    grab(/^\s*([A-Z][^\n]{3,80}(?:Policy|Plan))\s*$/m) ??
    fileName.replace(/\.pdf$/i, "");
  const plan = grab(/(?:plan|variant)\s*(?:name|type)?\s*[:\-]\s*([^\n]+)/i);
  const period = grab(/policy period\s*[:\-]\s*([^\n]+)/i) ?? grab(/period of insurance\s*[:\-]\s*([^\n]+)/i);
  const networkRef = terms.refs.network;
  let networkInfo: string | null = null;
  if (networkRef) {
    const s = sentences(networkRef.text).find((x) => /network/i.test(x));
    networkInfo = s ? s.slice(0, 220) : null;
  }
  void chunks;
  return {
    policyName,
    insurer: insurerFound,
    plan,
    period,
    sumInsured: terms.sumInsured,
    roomEligibility: terms.roomRent?.label ?? null,
    networkInfo,
  };
}

function firstSentence(text: string, max = 190): string {
  const body = text.replace(/^\s*\d{1,2}(?:\.\d{1,2}){0,3}[.)]?\s+[^.:]{0,80}[.:]\s*/, "");
  const s = sentences(body)[0] ?? body;
  return s.length > max ? s.slice(0, max - 1).trimEnd() + "…" : s;
}

function itemsFromCategory(chunks: RawChunk[], cat: ClauseCategory, status: SummaryItem["status"], limit: number): SummaryItem[] {
  const seen = new Set<string>();
  const out: SummaryItem[] = [];
  for (const c of chunks) {
    if (c.category !== cat) continue;
    const key = `${c.section}-${c.heading}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({
      id: c.chunkId,
      title: c.heading || `Section ${c.section}`,
      status,
      explanation: firstSentence(c.text),
      evidence: [ref(c)],
    });
    if (out.length >= limit) break;
  }
  return out;
}

export function buildSummary(chunks: RawChunk[], terms: PolicyTerms): PolicySummary {
  const r = terms.refs;
  const waitingPeriods: SummaryItem[] = [
    {
      id: "initial-wait",
      title: "Initial waiting period",
      status: terms.initialWaitingDays ? "restriction" : "verify",
      explanation: terms.initialWaitingDays
        ? `${terms.initialWaitingDays} days from policy start for illness claims (accidents usually exempt).`
        : "No initial waiting period clause was identified. Verify with your insurer.",
      evidence: r.initialWaiting ? [r.initialWaiting] : [],
    },
    {
      id: "ped-wait",
      title: "Pre-existing diseases",
      status: terms.pedWaitingMonths ? "restriction" : "verify",
      explanation: terms.pedWaitingMonths
        ? `${terms.pedWaitingMonths} months of continuous coverage before pre-existing conditions are covered.`
        : "Waiting period for pre-existing conditions could not be identified.",
      evidence: r.pedWaiting ? [r.pedWaiting] : [],
    },
    {
      id: "specific-wait",
      title: "Specific illnesses / procedures",
      status: terms.specificWaitingMonths ? "restriction" : "verify",
      explanation: terms.specificWaitingMonths
        ? `${terms.specificWaitingMonths} months for listed conditions${terms.specificWaitingKeywords.length ? ` (e.g. ${terms.specificWaitingKeywords.slice(0, 4).join(", ")})` : ""}.`
        : "Specific-illness waiting period could not be identified.",
      evidence: r.specificWaiting ? [r.specificWaiting] : [],
    },
  ];

  const financial: SummaryItem[] = [
    {
      id: "si",
      title: "Sum insured",
      status: terms.sumInsured ? "info" : "verify",
      explanation: terms.sumInsured ? `${formatINR(terms.sumInsured)} per policy year.` : "Sum insured was not found in the document. Check your policy schedule.",
      evidence: r.sumInsured ? [r.sumInsured] : [],
    },
    {
      id: "room",
      title: "Room rent limit",
      status: terms.roomRent ? (terms.roomRent.type === "none" ? "info" : "restriction") : "verify",
      explanation: terms.roomRent
        ? `${terms.roomRent.label}.${terms.proportionateDeduction ? " Exceeding it can trigger proportionate deduction of associated charges." : ""}`
        : "No room rent clause was identified.",
      evidence: [r.roomRent, r.proportionate].filter((x): x is EvidenceRef => !!x),
    },
    {
      id: "copay",
      title: "Co-payment",
      status: terms.copayPct || terms.seniorCopay || terms.nonNetworkCopayPct ? "restriction" : "verify",
      explanation:
        [
          terms.copayPct ? `${terms.copayPct}% on admissible claims` : null,
          terms.seniorCopay ? `${terms.seniorCopay.pct}% for insured aged ${terms.seniorCopay.age}+` : null,
          terms.nonNetworkCopayPct ? `${terms.nonNetworkCopayPct}% at non-network hospitals` : null,
        ]
          .filter(Boolean)
          .join("; ") || "No co-payment clause was identified.",
      evidence: [r.copay, r.seniorCopay, r.nonNetworkCopay].filter((x): x is EvidenceRef => !!x),
    },
    {
      id: "deductible",
      title: "Deductible",
      status: terms.deductible ? "restriction" : "verify",
      explanation: terms.deductible
        ? `${formatINR(terms.deductible)} borne by you before the insurer pays${terms.deductibleBasis === "aggregate" ? " across the policy year" : terms.deductibleBasis === "per_claim" ? " on each claim" : ""}.`
        : "No deductible clause was identified.",
      evidence: r.deductible ? [r.deductible] : [],
    },
    ...terms.subLimits.map<SummaryItem>((s, i) => ({
      id: `sub-${i}`,
      title: `Sub-limit: ${s.name}`,
      status: "restriction",
      explanation: s.amount ? `Limited to ${formatINR(s.amount)}.` : s.pctSI ? `Limited to ${s.pctSI}% of sum insured.` : "A sub-limit applies; exact amount unclear.",
      evidence: s.ref ? [s.ref] : [],
    })),
  ];

  return {
    coverage: itemsFromCategory(chunks, "coverage", "covered", 10),
    exclusions: itemsFromCategory(chunks, "exclusion", "excluded", 12),
    waitingPeriods,
    financial,
    claims: itemsFromCategory(chunks, "claim", "info", 8),
  };
}
