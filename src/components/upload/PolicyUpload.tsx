"use client";

import Link from "next/link";
import { useCallback, useRef, useState, type DragEvent } from "react";
import { Check, CircleAlert, FileText, FlaskConical, Loader2, UploadCloud } from "lucide-react";
import * as api from "@/lib/api";
import { ApiError } from "@/lib/api";
import type { PolicyListItem, PolicyStatus } from "@/lib/types";
import { cn, formatBytes, MAX_UPLOAD_BYTES } from "@/lib/utils";
import { usePolicy } from "@/components/layout/PolicyContext";
import { Button, Card } from "@/components/common/ui";
import { StateBlock } from "@/components/common/StateBlock";

type StageKey = "upload" | "extract" | "understand" | "index" | "ready";
type StageState = "pending" | "active" | "done" | "skipped" | "failed";

const STAGES: { key: StageKey; label: string; desc: string }[] = [
  { key: "upload", label: "Uploading", desc: "Sending the PDF securely to the server" },
  { key: "extract", label: "Extracting", desc: "Reading text from every page" },
  { key: "understand", label: "Understanding clauses", desc: "Splitting sections and classifying clauses" },
  { key: "index", label: "Building search index", desc: "Making clauses searchable for evidence" },
  { key: "ready", label: "Ready", desc: "Your policy can now be queried" },
];

const STATUS_TO_STAGE: Record<PolicyStatus, StageKey> = {
  uploaded: "extract",
  extracting: "extract",
  understanding: "understand",
  indexing: "index",
  ready: "ready",
  failed: "ready",
};

function initialStages(): Record<StageKey, StageState> {
  return { upload: "pending", extract: "pending", understand: "pending", index: "pending", ready: "pending" };
}

export function PolicyUpload({ onReady }: { onReady?: (p: PolicyListItem) => void }) {
  const { refresh, setActiveId } = usePolicy();
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [file, setFile] = useState<{ name: string; size: number } | null>(null);
  const [stages, setStages] = useState(initialStages);
  const [uploadFraction, setUploadFraction] = useState(0);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<{ code: string; message: string } | null>(null);
  const [result, setResult] = useState<PolicyListItem | null>(null);

  const set = (k: StageKey, s: StageState) => setStages((prev) => ({ ...prev, [k]: s }));

  const runPipeline = useCallback(
    async (policy: PolicyListItem) => {
      let current = policy;
      // Each call performs exactly one real server stage; the UI only advances on completion.
      for (let i = 0; i < 6 && current.status !== "ready" && current.status !== "failed"; i++) {
        const stage = STATUS_TO_STAGE[current.status];
        set(stage, "active");
        const next = await api.processPolicy(current.id);
        if (next.status === "failed") {
          set(stage, "failed");
          current = next;
          break;
        }
        set(stage, "done");
        current = next;
      }
      if (current.status === "failed") {
        setError({ code: current.errorCode ?? "server_error", message: current.errorMessage ?? "Processing failed." });
      } else if (current.status === "ready") {
        set("ready", "done");
        setResult(current);
        setActiveId(current.id);
        onReady?.(current);
      }
      await refresh();
    },
    [onReady, refresh, setActiveId]
  );

  const start = useCallback(
    async (f: File) => {
      setError(null);
      setResult(null);
      setStages(initialStages());
      setUploadFraction(0);
      if (!/\.pdf$/i.test(f.name) && f.type !== "application/pdf") {
        setError({ code: "unsupported_pdf", message: "Only PDF files are supported. Please choose a .pdf file." });
        return;
      }
      if (f.size > MAX_UPLOAD_BYTES) {
        setError({ code: "too_large", message: `This file is ${formatBytes(f.size)}. The maximum size is ${formatBytes(MAX_UPLOAD_BYTES)}.` });
        return;
      }
      setFile({ name: f.name, size: f.size });
      setRunning(true);
      try {
        set("upload", "active");
        const created = await api.uploadPolicy(f, setUploadFraction);
        set("upload", "done");
        await runPipeline(created);
      } catch (e) {
        setStages((prev) => {
          const k = (Object.keys(prev) as StageKey[]).find((x) => prev[x] === "active");
          return k ? { ...prev, [k]: "failed" } : prev;
        });
        setError(e instanceof ApiError ? { code: e.code, message: e.message } : { code: "server_error", message: "Something went wrong." });
      } finally {
        setRunning(false);
      }
    },
    [runPipeline]
  );

  const startSample = useCallback(async () => {
    setError(null);
    setResult(null);
    setStages({ ...initialStages(), upload: "skipped", extract: "skipped" });
    setFile({ name: "Sample – CareShield Health Policy (text)", size: 0 });
    setRunning(true);
    try {
      const created = await api.createSamplePolicy();
      await runPipeline(created);
    } catch (e) {
      setError(e instanceof ApiError ? { code: e.code, message: e.message } : { code: "server_error", message: "Something went wrong." });
    } finally {
      setRunning(false);
    }
  }, [runPipeline]);

  const onDrop = (e: DragEvent) => {
    e.preventDefault();
    setDragging(false);
    if (running) return;
    const f = e.dataTransfer.files?.[0];
    if (f) void start(f);
  };

  const doneCount = (Object.values(stages) as StageState[]).filter((s) => s === "done" || s === "skipped").length;
  const progress = Math.min(1, (doneCount + (stages.upload === "active" ? uploadFraction : 0)) / STAGES.length);
  const showProgress = running || result || (error && file && doneCount > 0) || stages.upload !== "pending";

  return (
    <Card className="overflow-hidden">
      <div
        onDragOver={(e) => {
          e.preventDefault();
          if (!running) setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        className={cn("m-4 rounded-xl border-2 border-dashed transition-colors sm:m-5", dragging ? "border-brand-500 bg-brand-50" : "border-slate-300 bg-slate-50/60")}
      >
        <div className="flex flex-col items-center px-6 py-10 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white shadow-sm ring-1 ring-slate-200">
            <UploadCloud className="h-6 w-6 text-brand-700" />
          </div>
          <h2 className="mt-4 text-base font-semibold text-slate-900">Upload policy PDF</h2>
          <p className="mt-1 text-sm text-slate-500">Drag and drop your policy wording here, or browse from your device.</p>
          <div className="mt-5 flex flex-wrap justify-center gap-2">
            <Button onClick={() => inputRef.current?.click()} disabled={running}>
              <FileText className="h-4 w-4" /> Choose PDF
            </Button>
            <Button variant="outline" onClick={startSample} disabled={running}>
              <FlaskConical className="h-4 w-4" /> Try sample policy
            </Button>
          </div>
          <p className="mt-4 text-xs text-slate-400">Supported: PDF with selectable text · Maximum file size: {formatBytes(MAX_UPLOAD_BYTES)}</p>
          <input
            ref={inputRef}
            type="file"
            accept="application/pdf,.pdf"
            className="sr-only"
            aria-label="Choose policy PDF"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void start(f);
              e.target.value = "";
            }}
          />
        </div>
      </div>

      {showProgress && file && (
        <div className="border-t border-slate-100 px-5 py-5">
          <div className="flex items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-2">
              <FileText className="h-4 w-4 shrink-0 text-slate-400" />
              <span className="truncate text-sm font-medium text-slate-800">{file.name}</span>
              {file.size > 0 && <span className="shrink-0 text-xs text-slate-400">{formatBytes(file.size)}</span>}
            </div>
            <span className="text-xs font-medium text-slate-500 tabular">{doneCount}/{STAGES.length} stages</span>
          </div>
          <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-slate-100" role="progressbar" aria-valuenow={Math.round(progress * 100)} aria-valuemin={0} aria-valuemax={100}>
            <div className={cn("h-full rounded-full transition-all duration-300", error ? "bg-rose-500" : "bg-brand-600")} style={{ width: `${progress * 100}%` }} />
          </div>
          <ol className="mt-4 grid gap-2 sm:grid-cols-5">
            {STAGES.map((s) => {
              const st = stages[s.key];
              return (
                <li key={s.key} className={cn("flex items-start gap-2 rounded-lg p-2 sm:flex-col", st === "active" && "bg-sky-50", st === "failed" && "bg-rose-50")}>
                  <span
                    className={cn(
                      "flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs",
                      st === "done" && "bg-brand-600 text-white",
                      st === "skipped" && "bg-slate-200 text-slate-500",
                      st === "active" && "bg-sky-100 text-sky-700",
                      st === "failed" && "bg-rose-100 text-rose-700",
                      st === "pending" && "bg-slate-100 text-slate-400"
                    )}
                  >
                    {st === "done" ? <Check className="h-3.5 w-3.5" /> : st === "active" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : st === "failed" ? <CircleAlert className="h-3.5 w-3.5" /> : st === "skipped" ? "–" : null}
                  </span>
                  <div>
                    <p className={cn("text-xs font-semibold", st === "pending" ? "text-slate-400" : "text-slate-800")}>{s.label}</p>
                    <p className="text-[11px] leading-snug text-slate-500">
                      {st === "skipped" ? "Not needed for sample text" : s.key === "upload" && st === "active" ? `${Math.round(uploadFraction * 100)}% sent` : s.desc}
                    </p>
                  </div>
                </li>
              );
            })}
          </ol>
        </div>
      )}

      {error && (
        <div className="border-t border-slate-100">
          <StateBlock
            compact
            kind={error.code === "ocr_required" ? "ocr_required" : error.code === "unsupported_pdf" || error.code === "too_large" ? "unsupported_pdf" : "server_error"}
            title={error.code === "too_large" ? "File too large" : undefined}
            body={error.message}
            action={<Button variant="outline" onClick={() => inputRef.current?.click()}>Choose another file</Button>}
          />
        </div>
      )}

      {result && (
        <div className="flex flex-col items-start justify-between gap-3 border-t border-slate-100 bg-emerald-50/50 px-5 py-4 sm:flex-row sm:items-center">
          <div className="flex items-center gap-2 text-sm text-emerald-900">
            <Check className="h-4 w-4" />
            <span>
              <strong>{result.policyName ?? result.fileName}</strong> is ready · {result.pageCount} pages indexed
            </span>
          </div>
          <div className="flex gap-2">
            <Link href={`/policies/${result.id}`} className="inline-flex h-9 items-center rounded-lg bg-brand-700 px-3 text-sm font-medium text-white hover:bg-brand-800">
              View policy summary
            </Link>
            <Link href="/ask" className="inline-flex h-9 items-center rounded-lg border border-slate-300 bg-white px-3 text-sm font-medium text-slate-800 hover:bg-slate-50">
              Ask a question
            </Link>
          </div>
        </div>
      )}
    </Card>
  );
}

/** Resumes processing for a policy whose pipeline was interrupted. */
export async function resumeProcessing(id: string): Promise<PolicyListItem> {
  let p = await api.processPolicy(id);
  for (let i = 0; i < 5 && p.status !== "ready" && p.status !== "failed"; i++) p = await api.processPolicy(id);
  return p;
}
