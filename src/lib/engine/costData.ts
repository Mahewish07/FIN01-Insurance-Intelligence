import type { HospitalTier, RoomType } from "@/lib/types";

/**
 * Synthetic reference cost table (INR) for a standard private hospital in a metro city.
 * These values are illustrative and are labelled as "synthetic" throughout the UI.
 */
export interface TreatmentRef {
  id: string;
  label: string;
  keywords: string[];
  low: number;
  high: number;
  typical: number;
  stayDays: number;
  /** share of the bill that is "associated medical expenses" subject to proportionate deduction */
  associatedShare: number;
}

export const TREATMENTS: TreatmentRef[] = [
  { id: "knee_replacement", label: "Knee replacement (unilateral)", keywords: ["knee", "joint replacement", "arthroplasty", "tkr"], low: 180000, high: 350000, typical: 255000, stayDays: 4, associatedShare: 0.6 },
  { id: "hip_replacement", label: "Hip replacement", keywords: ["hip", "joint replacement", "arthroplasty"], low: 220000, high: 420000, typical: 300000, stayDays: 5, associatedShare: 0.6 },
  { id: "cataract", label: "Cataract surgery (per eye)", keywords: ["cataract", "eye", "lens", "phaco"], low: 25000, high: 90000, typical: 45000, stayDays: 0, associatedShare: 0.5 },
  { id: "angioplasty", label: "Coronary angioplasty (single stent)", keywords: ["angioplasty", "stent", "cardiac", "heart", "ptca"], low: 180000, high: 400000, typical: 260000, stayDays: 3, associatedShare: 0.55 },
  { id: "cabg", label: "Bypass surgery (CABG)", keywords: ["bypass", "cabg", "cardiac", "heart surgery"], low: 250000, high: 550000, typical: 380000, stayDays: 7, associatedShare: 0.7 },
  { id: "appendectomy", label: "Appendectomy (laparoscopic)", keywords: ["appendix", "appendectomy", "appendicitis"], low: 60000, high: 150000, typical: 95000, stayDays: 2, associatedShare: 0.75 },
  { id: "hernia", label: "Hernia repair", keywords: ["hernia"], low: 55000, high: 140000, typical: 85000, stayDays: 2, associatedShare: 0.75 },
  { id: "gallbladder", label: "Gallbladder removal (cholecystectomy)", keywords: ["gallbladder", "cholecystectomy", "gall stone", "gallstone"], low: 70000, high: 160000, typical: 105000, stayDays: 2, associatedShare: 0.75 },
  { id: "normal_delivery", label: "Maternity – normal delivery", keywords: ["delivery", "maternity", "childbirth", "pregnancy"], low: 40000, high: 100000, typical: 65000, stayDays: 2, associatedShare: 0.8 },
  { id: "c_section", label: "Maternity – caesarean section", keywords: ["caesarean", "c-section", "cesarean", "maternity"], low: 80000, high: 200000, typical: 125000, stayDays: 4, associatedShare: 0.8 },
  { id: "dengue", label: "Dengue fever hospitalisation", keywords: ["dengue", "fever"], low: 30000, high: 120000, typical: 60000, stayDays: 4, associatedShare: 0.85 },
  { id: "kidney_stone", label: "Kidney stone removal (URSL/PCNL)", keywords: ["kidney stone", "renal", "lithotripsy", "ursl", "pcnl"], low: 60000, high: 180000, typical: 110000, stayDays: 2, associatedShare: 0.7 },
  { id: "chemotherapy", label: "Chemotherapy (per cycle, day care)", keywords: ["chemotherapy", "chemo", "cancer", "oncology"], low: 25000, high: 120000, typical: 55000, stayDays: 0, associatedShare: 0.4 },
];

export const METRO_CITIES = ["mumbai", "delhi", "new delhi", "bengaluru", "bangalore", "chennai", "hyderabad", "kolkata", "pune", "gurugram", "gurgaon", "noida"];
export const TIER2_CITIES = ["ahmedabad", "jaipur", "lucknow", "kochi", "chandigarh", "indore", "nagpur", "coimbatore", "surat", "bhopal", "visakhapatnam", "vadodara", "mysuru", "thiruvananthapuram", "bhubaneswar"];

export function cityFactor(city: string): { factor: number; tier: string } {
  const c = city.trim().toLowerCase();
  if (METRO_CITIES.includes(c)) return { factor: 1, tier: "Metro" };
  if (TIER2_CITIES.includes(c)) return { factor: 0.82, tier: "Tier-2" };
  return { factor: 0.68, tier: "Tier-3 / other" };
}

export const HOSPITAL_FACTOR: Record<HospitalTier, number> = { premium: 1.35, standard: 1, budget: 0.72 };

export const ROOM_DAILY: Record<RoomType, number> = {
  general: 1500,
  shared: 3000,
  single: 5000,
  deluxe: 8500,
  suite: 15000,
};

export const ROOM_LABEL: Record<RoomType, string> = {
  general: "General ward",
  shared: "Twin sharing",
  single: "Single private room",
  deluxe: "Deluxe room",
  suite: "Suite",
};

export const HOSPITAL_LABEL: Record<HospitalTier, string> = {
  premium: "Premium / corporate",
  standard: "Standard private",
  budget: "Budget / trust",
};

export function findTreatment(query: string): TreatmentRef | null {
  const q = query.trim().toLowerCase();
  if (!q) return null;
  const exact = TREATMENTS.find((t) => t.label.toLowerCase() === q || t.id === q);
  if (exact) return exact;
  let best: TreatmentRef | null = null;
  let bestScore = 0;
  for (const t of TREATMENTS) {
    let score = 0;
    for (const k of t.keywords) if (q.includes(k)) score += k.length;
    if (t.label.toLowerCase().includes(q)) score += q.length;
    if (score > bestScore) {
      bestScore = score;
      best = t;
    }
  }
  return best;
}
