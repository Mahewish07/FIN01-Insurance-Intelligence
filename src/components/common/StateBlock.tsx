import Link from "next/link";
import type { ReactNode } from "react";
import { AlertTriangle, Database, FileQuestion, FileWarning, GitCompareArrows, Loader2, ScanText, ServerCrash, ListChecks, Upload } from "lucide-react";
import { cn } from "@/lib/utils";

export type StateKind =
  | "no_policy"
  | "processing"
  | "unsupported_pdf"
  | "ocr_required"
  | "insufficient_evidence"
  | "conflicting_clauses"
  | "missing_inputs"
  | "server_error"
  | "no_cost_data"
  | "empty";

const CONFIG: Record<StateKind, { icon: typeof Upload; title: string; body: string; tone: string }> = {
  no_policy: { icon: Upload, title: "No policy uploaded yet", body: "Upload your health insurance policy PDF, or try the sample policy, to see what it covers.", tone: "text-brand-700 bg-brand-50" },
  processing: { icon: Loader2, title: "Your policy is being processed", body: "We're reading the document and indexing its clauses. This usually takes a few seconds.", tone: "text-sky-700 bg-sky-50" },
  unsupported_pdf: { icon: FileWarning, title: "We couldn't read this PDF", body: "The file may be corrupted, password-protected or not a valid PDF. Try exporting it again from your insurer's portal.", tone: "text-rose-700 bg-rose-50" },
  ocr_required: { icon: ScanText, title: "This PDF needs OCR", body: "It looks like a scanned document without selectable text. Run it through an OCR tool (e.g. 'Save as searchable PDF') and upload again.", tone: "text-amber-700 bg-amber-50" },
  insufficient_evidence: { icon: FileQuestion, title: "Insufficient evidence", body: "The policy text doesn't contain enough information to answer this reliably.", tone: "text-slate-700 bg-slate-100" },
  conflicting_clauses: { icon: GitCompareArrows, title: "Conflicting clauses found", body: "Different sections of the policy point in different directions. Review the evidence and confirm with your insurer.", tone: "text-violet-700 bg-violet-50" },
  missing_inputs: { icon: ListChecks, title: "Cannot reliably complete this calculation yet", body: "A few inputs are missing. Provide them below to continue.", tone: "text-amber-700 bg-amber-50" },
  server_error: { icon: ServerCrash, title: "Something went wrong", body: "We couldn't complete that request. Your data is safe — please try again.", tone: "text-rose-700 bg-rose-50" },
  no_cost_data: { icon: Database, title: "No cost data for this treatment", body: "We don't have reference costs for this treatment. Enter the hospital's estimate to continue.", tone: "text-slate-700 bg-slate-100" },
  empty: { icon: AlertTriangle, title: "Nothing here yet", body: "", tone: "text-slate-600 bg-slate-100" },
};

export function StateBlock({ kind, title, body, action, className, compact }: { kind: StateKind; title?: string; body?: ReactNode; action?: ReactNode; className?: string; compact?: boolean }) {
  const c = CONFIG[kind];
  const Icon = c.icon;
  return (
    <div className={cn("flex flex-col items-center text-center", compact ? "py-6 px-4" : "py-12 px-6", className)} role={kind === "server_error" ? "alert" : undefined}>
      <div className={cn("flex h-12 w-12 items-center justify-center rounded-full", c.tone)}>
        <Icon className={cn("h-6 w-6", kind === "processing" && "animate-spin")} aria-hidden />
      </div>
      <h3 className="mt-4 text-base font-semibold text-slate-900">{title ?? c.title}</h3>
      {(body ?? c.body) && <div className="mt-1.5 max-w-md text-sm text-slate-500">{body ?? c.body}</div>}
      {action && <div className="mt-5 flex flex-wrap justify-center gap-2">{action}</div>}
    </div>
  );
}

export function NoPolicyState() {
  return (
    <StateBlock
      kind="no_policy"
      action={
        <Link href="/policies" className="inline-flex h-10 items-center gap-2 rounded-lg bg-brand-700 px-4 text-sm font-medium text-white hover:bg-brand-800">
          <Upload className="h-4 w-4" /> Upload policy
        </Link>
      }
    />
  );
}
