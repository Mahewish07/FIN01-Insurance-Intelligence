"use client";

import Link from "next/link";
import { useEffect, useState, type ReactNode } from "react";
import { AlertTriangle, ArrowRight, Calculator, CircleCheck, FileSearch, FileStack, Gauge, Layers, ListChecks, Lock, MessageSquareText, ShieldCheck, Upload, Wallet } from "lucide-react";
import * as api from "@/lib/api";
import type { EstimateResult, EvidenceRef, Policy, ReportItem } from "@/lib/types";
import { cn, formatINR } from "@/lib/utils";
import { usePolicy } from "@/components/layout/PolicyContext";
import { Card, CardHeader, Skeleton } from "@/components/common/ui";
import { StateBlock } from "@/components/common/StateBlock";
import { ProvenanceLabel } from "@/components/common/provenance";
import { EvidenceChip } from "@/components/evidence/EvidenceViewer";
import { ExposureChart } from "@/components/charts/ExposureChart";

function greeting() {
  const h = new Date().getHours();
  return h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening";
}

function Stat({ label, value, sub, icon: Icon, tone }: { label: string; value: ReactNode; sub?: string; icon: typeof Gauge; tone: string }) {
  return (
    <Card className="p-4">
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium text-slate-500">{label}</p>
        <span className={cn("flex h-7 w-7 items-center justify-center rounded-md", tone)}>
          <Icon className="h-4 w-4" />
        </span>
      </div>
      <p className="mt-2 text-xl font-semibold text-slate-900 tabular">{value}</p>
      {sub && <p className="mt-0.5 truncate text-xs text-slate-500">{sub}</p>}
    </Card>
  );
}

function Meter({ label, count, total, color, desc }: { label: string; count: number; total: number; color: string; desc: string }) {
  return (
    <div>
      <div className="flex items-baseline justify-between text-sm">
        <span className="font-medium text-slate-700">{label}</span>
        <span className="font-semibold text-slate-900 tabular">{count}</span>
      </div>
      <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-slate-100">
        <div className={cn("h-full rounded-full", color)} style={{ width: `${total ? (count / total) * 100 : 0}%` }} />
      </div>
      <p className="mt-1 text-xs text-slate-500">{desc}</p>
    </div>
  );
}

function RestrictionRow({ label, value, evidence }: { label: string; value: string | null; evidence?: EvidenceRef | null }) {
  return (
    <li className="flex items-start justify-between gap-3 py-2.5">
      <div className="min-w-0">
        <p className="text-xs text-slate-500">{label}</p>
        <p className={cn("text-sm font-medium", value ? "text-slate-900" : "text-amber-700")}>{value ?? "Not found — needs verification"}</p>
      </div>
      {evidence && <EvidenceChip evidence={evidence} className="shrink-0 px-1.5 py-0.5 text-[11px]" />}
    </li>
  );
}

function PolicyDashboard({ policy }: { policy: Policy }) {
  const [latest, setLatest] = useState<EstimateResult | null | undefined>(undefined);
  useEffect(() => {
    let c = false;
    api
      .listReports(policy.id)
      .then((r: ReportItem[]) => {
        const est = r.find((x) => x.kind === "estimate" && (x.result as EstimateResult).complete);
        if (!c) setLatest(est ? (est.result as EstimateResult) : null);
      })
      .catch(() => !c && setLatest(null));
    return () => {
      c = true;
    };
  }, [policy.id]);

  const s = policy.summary;
  const t = policy.terms;
  const allItems = s ? [...s.coverage, ...s.exclusions, ...s.waitingPeriods, ...s.financial, ...s.claims] : [];
  const verify = allItems.filter((i) => i.status === "verify");
  const restrictions = allItems.filter((i) => i.status === "restriction");
  const covered = s?.coverage.length ?? 0;
  const excluded = s?.exclusions.length ?? 0;
  const total = covered + excluded + verify.length;

  const keyFields: { found: boolean; partial: boolean }[] = t
    ? [
        { found: !!t.sumInsured, partial: false },
        { found: !!t.roomRent, partial: t.roomRent?.type === "category" },
        { found: t.copayPct !== null || !!t.seniorCopay, partial: false },
        { found: t.deductible !== null, partial: false },
        { found: !!t.initialWaitingDays, partial: false },
        { found: !!t.pedWaitingMonths, partial: false },
        { found: !!t.specificWaitingMonths, partial: t.specificWaitingKeywords.length === 0 },
        { found: !!t.refs.network, partial: false },
        ...t.subLimits.map((sl) => ({ found: true, partial: !sl.amount && !sl.pctSI })),
      ]
    : [];
  const strong = keyFields.filter((k) => k.found && !k.partial).length;
  const partial = keyFields.filter((k) => k.found && k.partial).length;
  const missing = keyFields.filter((k) => !k.found).length;

  const sub = t?.subLimits ?? [];
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Policy status" value={<span className="flex items-center gap-1.5 text-emerald-700"><CircleCheck className="h-5 w-5" /> Ready</span>} sub={policy.meta?.policyName ?? policy.fileName} icon={ShieldCheck} tone="bg-emerald-50 text-emerald-700" />
        <Stat label="Coverage categories" value={covered} sub="benefit clauses identified" icon={Layers} tone="bg-brand-50 text-brand-700" />
        <Stat label="Important restrictions" value={restrictions.length} sub="waiting periods, limits, co-pay" icon={AlertTriangle} tone="bg-orange-50 text-orange-700" />
        <Stat label="Missing information" value={verify.length} sub={verify.length ? "items need verification" : "nothing flagged"} icon={ListChecks} tone="bg-amber-50 text-amber-700" />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader icon={<ShieldCheck className="h-4 w-4" />} title="Coverage snapshot" subtitle="From automatic clause classification" action={<Link href={`/policies/${policy.id}`} className="text-xs font-medium text-brand-700 hover:underline">Full summary</Link>} />
          <div className="space-y-4 p-5">
            <Meter label="Potentially covered" count={covered} total={total} color="bg-emerald-500" desc="Benefit clauses describing what is paid for" />
            <Meter label="Potentially excluded" count={excluded} total={total} color="bg-rose-500" desc="Exclusion clauses — read exceptions carefully" />
            <Meter label="Needs verification" count={verify.length} total={total} color="bg-amber-500" desc={verify.length ? verify.slice(0, 3).map((v) => v.title).join(", ") : "No gaps flagged in key terms"} />
          </div>
        </Card>

        <Card>
          <CardHeader icon={<Wallet className="h-4 w-4" />} title="Financial exposure" subtitle={latest ? `Latest estimate · ${latest.treatmentLabel}` : "Based on your latest treatment estimate"} action={<ProvenanceLabel kind="calculation" />} />
          <div className="p-5">
            {latest === undefined ? (
              <Skeleton className="h-36" />
            ) : latest && latest.figures ? (
              <div className="flex flex-col items-center gap-5 sm:flex-row">
                <ExposureChart insurer={latest.figures.insurer} oop={latest.figures.oop} />
                <dl className="w-full space-y-3 text-sm">
                  <div className="flex justify-between gap-3"><dt className="text-slate-500">Estimated treatment cost</dt><dd className="font-semibold tabular">{latest.costRange ? `${formatINR(latest.costRange.low)} – ${formatINR(latest.costRange.high)}` : formatINR(latest.figures.bill)}</dd></div>
                  <div className="flex justify-between gap-3"><dt className="text-slate-500">Potential insurer contribution</dt><dd className="font-semibold text-brand-800 tabular">{formatINR(latest.figures.insurer)}</dd></div>
                  <div className="flex justify-between gap-3"><dt className="text-slate-500">Potential OOP</dt><dd className="font-semibold text-rose-700 tabular">{formatINR(latest.figures.oop)}</dd></div>
                  <p className="text-[11px] italic text-slate-400">Illustrative, on a typical bill of {formatINR(latest.figures.bill)}.</p>
                </dl>
              </div>
            ) : (
              <StateBlock kind="empty" compact title="No estimate yet" body="Run a treatment estimate to see your potential out-of-pocket exposure." action={<Link href="/estimate" className="inline-flex h-9 items-center gap-2 rounded-lg bg-brand-700 px-3 text-sm font-medium text-white"><Calculator className="h-4 w-4" /> Estimate a treatment</Link>} />
            )}
          </div>
        </Card>

        <Card>
          <CardHeader icon={<AlertTriangle className="h-4 w-4" />} title="Important restrictions" subtitle="Terms most likely to reduce a claim" action={<ProvenanceLabel kind="evidence" />} />
          <ul className="divide-y divide-slate-100 px-5">
            <RestrictionRow
              label="Waiting period"
              value={t?.pedWaitingMonths || t?.specificWaitingMonths ? [t?.initialWaitingDays ? `${t.initialWaitingDays} days initial` : null, t?.pedWaitingMonths ? `${t.pedWaitingMonths} mo pre-existing` : null, t?.specificWaitingMonths ? `${t.specificWaitingMonths} mo specified` : null].filter(Boolean).join(" · ") : null}
              evidence={t?.refs.pedWaiting ?? t?.refs.specificWaiting}
            />
            <RestrictionRow label="Co-payment" value={t?.copayPct ? `${t.copayPct}%${t.seniorCopay ? ` (${t.seniorCopay.pct}% if ${t.seniorCopay.age}+)` : ""}` : t?.seniorCopay ? `${t.seniorCopay.pct}% if aged ${t.seniorCopay.age}+` : null} evidence={t?.refs.copay ?? t?.refs.seniorCopay} />
            <RestrictionRow label="Room-rent limit" value={t?.roomRent ? `${t.roomRent.label}${t.proportionateDeduction ? " · proportionate deduction" : ""}` : null} evidence={t?.refs.roomRent} />
            <RestrictionRow label="Sub-limits" value={sub.length ? sub.map((x) => `${x.name}${x.amount ? ` ${formatINR(x.amount)}` : x.pctSI ? ` ${x.pctSI}% SI` : ""}`).join(" · ") : null} evidence={sub[0]?.ref} />
          </ul>
        </Card>

        <Card>
          <CardHeader icon={<FileSearch className="h-4 w-4" />} title="Evidence health" subtitle="How well key policy terms are supported by the document" />
          <div className="grid grid-cols-3 gap-3 p-5">
            {[
              { label: "Strong evidence", n: strong, cls: "text-emerald-700 bg-emerald-50", d: "Term found with a clear clause" },
              { label: "Partial evidence", n: partial, cls: "text-amber-700 bg-amber-50", d: "Clause found, detail unclear" },
              { label: "Missing information", n: missing, cls: "text-rose-700 bg-rose-50", d: "Not found in document" },
            ].map((x) => (
              <div key={x.label} className={cn("rounded-lg p-3", x.cls)}>
                <p className="text-2xl font-semibold tabular">{x.n}</p>
                <p className="text-xs font-semibold">{x.label}</p>
                <p className="mt-1 text-[11px] opacity-80">{x.d}</p>
              </div>
            ))}
          </div>
          <div className="flex flex-wrap gap-2 border-t border-slate-100 px-5 py-3">
            <Link href="/ask" className="inline-flex items-center gap-1 text-xs font-medium text-brand-700 hover:underline"><MessageSquareText className="h-3.5 w-3.5" /> Ask about a gap</Link>
            <Link href="/estimate" className="inline-flex items-center gap-1 text-xs font-medium text-brand-700 hover:underline"><Calculator className="h-3.5 w-3.5" /> Supply inputs in an estimate</Link>
          </div>
        </Card>
      </div>
    </div>
  );
}

function Onboarding() {
  const steps = [
    { icon: Upload, title: "Upload your policy", body: "We read the PDF and index every clause." },
    { icon: MessageSquareText, title: "Ask in plain language", body: "Answers cite the exact page and section." },
    { icon: Calculator, title: "Estimate a treatment", body: "See what the insurer may pay — and what you may pay." },
    { icon: FileStack, title: "Compare & close gaps", body: "Test scenarios and see what information is missing." },
  ];
  return (
    <Card>
      <StateBlock kind="no_policy" action={<Link href="/policies" className="inline-flex h-10 items-center gap-2 rounded-lg bg-brand-700 px-4 text-sm font-medium text-white hover:bg-brand-800"><Upload className="h-4 w-4" /> Upload policy <ArrowRight className="h-4 w-4" /></Link>} />
      <ol className="grid gap-px border-t border-slate-100 bg-slate-100 sm:grid-cols-2 lg:grid-cols-4">
        {steps.map((s, i) => (
          <li key={s.title} className="bg-white p-5">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-slate-400">0{i + 1}</span>
              <s.icon className="h-4 w-4 text-brand-700" />
            </div>
            <p className="mt-2 text-sm font-semibold text-slate-900">{s.title}</p>
            <p className="mt-0.5 text-xs text-slate-500">{s.body}</p>
          </li>
        ))}
      </ol>
      <p className="flex items-center justify-center gap-1.5 border-t border-slate-100 py-3 text-xs text-slate-400"><Lock className="h-3 w-3" /> Your document is stored only in this workspace and can be deleted anytime.</p>
    </Card>
  );
}

export function DashboardView() {
  const { policies, active, activeId, activeLoading } = usePolicy();
  const [hello, setHello] = useState("Good morning");
  useEffect(() => setHello(greeting()), []);

  return (
    <div>
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">{hello}</h1>
          <p className="mt-1 text-sm text-slate-500">Understand your coverage before the bill arrives.</p>
        </div>
        <Link href="/policies" className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-brand-700 px-4 text-sm font-medium text-white shadow-sm hover:bg-brand-800">
          <Upload className="h-4 w-4" /> Upload Policy
        </Link>
      </div>
      {policies === null || (activeId && !active && activeLoading) ? (
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-24" />)}
        </div>
      ) : !active ? (
        <Onboarding />
      ) : active.status !== "ready" ? (
        <Card>
          <StateBlock kind={active.status === "failed" ? (active.errorCode === "ocr_required" ? "ocr_required" : "unsupported_pdf") : "processing"} body={active.errorMessage ?? undefined} action={<Link href="/policies" className="text-sm font-medium text-brand-700 underline">Go to policies</Link>} />
        </Card>
      ) : (
        <PolicyDashboard policy={active} />
      )}
    </div>
  );
}
