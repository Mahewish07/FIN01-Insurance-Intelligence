"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { ChevronLeft, ChevronRight, FileText, X } from "lucide-react";
import * as api from "@/lib/api";
import type { ClauseCategory, EvidenceRef, PageContent } from "@/lib/types";
import { cn } from "@/lib/utils";
import { usePolicy } from "@/components/layout/PolicyContext";
import { ProvenanceLabel } from "@/components/common/provenance";
import { Button, Skeleton } from "@/components/common/ui";
import { StateBlock } from "@/components/common/StateBlock";
import { HighlightedText } from "./Highlight";

export const CATEGORY_LABEL: Record<ClauseCategory, string> = {
  coverage: "Coverage",
  exclusion: "Exclusion",
  waiting_period: "Waiting period",
  financial: "Financial limit",
  claim: "Claim procedure",
  definition: "Definition",
  general: "General",
};

interface EvidenceCtx {
  openEvidence: (ref: EvidenceRef) => void;
}
const Ctx = createContext<EvidenceCtx | null>(null);

export function useEvidence() {
  const c = useContext(Ctx);
  if (!c) throw new Error("useEvidence must be used within EvidenceProvider");
  return c;
}

export function EvidenceProvider({ children }: { children: ReactNode }) {
  const [current, setCurrent] = useState<EvidenceRef | null>(null);
  const openEvidence = useCallback((ref: EvidenceRef) => setCurrent(ref), []);
  return (
    <Ctx.Provider value={{ openEvidence }}>
      {children}
      {current && <EvidenceDrawer evidence={current} onClose={() => setCurrent(null)} />}
    </Ctx.Provider>
  );
}

function EvidenceDrawer({ evidence, onClose }: { evidence: EvidenceRef; onClose: () => void }) {
  const { activeId } = usePolicy();
  const [page, setPage] = useState(evidence.page);
  const [content, setContent] = useState<PageContent | null>(null);
  const [error, setError] = useState<string | null>(null);
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => setPage(evidence.page), [evidence]);
  useEffect(() => {
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  useEffect(() => {
    if (!activeId) return;
    let cancelled = false;
    setContent(null);
    setError(null);
    api
      .getPolicyPage(activeId, page)
      .then((c) => !cancelled && setContent(c))
      .catch((e) => !cancelled && setError(e instanceof Error ? e.message : "Could not load page."));
    return () => {
      cancelled = true;
    };
  }, [activeId, page]);

  const terms = evidence.highlight ?? [];

  return (
    <div className="fixed inset-0 z-50 flex justify-end" role="dialog" aria-modal="true" aria-label="Policy evidence viewer">
      <div className="absolute inset-0 bg-slate-900/30" onClick={onClose} />
      <div className="animate-slide-in relative flex h-full w-full max-w-xl flex-col bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-3">
          <div className="flex items-center gap-2">
            <FileText className="h-4 w-4 text-amber-700" />
            <span className="text-sm font-semibold text-slate-900">Policy document viewer</span>
          </div>
          <Button ref={closeRef} variant="ghost" size="icon" onClick={onClose} aria-label="Close viewer">
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="flex-1 overflow-y-auto">
          <section className="border-b border-slate-100 bg-amber-50/40 px-5 py-4">
            <div className="flex flex-wrap items-center gap-2">
              <ProvenanceLabel kind="evidence" />
              <span className="text-xs text-slate-500">Exact text from your document</span>
            </div>
            <dl className="mt-3 grid grid-cols-3 gap-2 text-xs">
              <div>
                <dt className="text-slate-500">Page</dt>
                <dd className="font-semibold text-slate-900">{evidence.page}</dd>
              </div>
              <div>
                <dt className="text-slate-500">Section</dt>
                <dd className="font-semibold text-slate-900">{evidence.section}</dd>
              </div>
              <div>
                <dt className="text-slate-500">Clause category</dt>
                <dd className="font-semibold text-slate-900">{CATEGORY_LABEL[evidence.category]}</dd>
              </div>
            </dl>
            {evidence.heading && <p className="mt-3 text-sm font-semibold text-slate-800">{evidence.heading}</p>}
            <blockquote className="mt-2 font-serif text-[15px] leading-relaxed text-slate-800">
              “<HighlightedText text={evidence.text} terms={terms} />”
            </blockquote>
          </section>

          <section className="px-5 py-4">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">Full page {page}{content ? ` of ${content.pageCount}` : ""}</h3>
              <div className="flex gap-1">
                <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)} aria-label="Previous page">
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button variant="outline" size="sm" disabled={!content || page >= content.pageCount} onClick={() => setPage((p) => p + 1)} aria-label="Next page">
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
            {error && <StateBlock kind="server_error" body={error} compact />}
            {!content && !error && (
              <div className="space-y-2">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-11/12" />
                <Skeleton className="h-4 w-10/12" />
              </div>
            )}
            {content && content.chunks.length === 0 && <p className="text-sm text-slate-500">No indexed text on this page.</p>}
            <div className="space-y-3 rounded-lg border border-slate-200 bg-stone-50 p-4">
              {content?.chunks.map((c) => {
                const cited = c.chunkId === evidence.chunkId;
                return (
                  <div key={c.chunkId} className={cn("rounded-md p-2 font-serif text-sm leading-relaxed text-slate-700", cited && "bg-white ring-2 ring-amber-400")}>
                    <div className="mb-1 flex items-center gap-2 font-sans text-[11px] text-slate-500">
                      <span className="font-semibold">§ {c.section}</span>
                      <span>·</span>
                      <span>{CATEGORY_LABEL[c.category]}</span>
                      {cited && <span className="rounded bg-amber-100 px-1 font-semibold text-amber-800">Cited</span>}
                    </div>
                    {cited ? <HighlightedText text={c.text} terms={terms} /> : c.text}
                  </div>
                );
              })}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

/** Compact clickable citation chip: "Page 12 · Section 6.3". */
export function EvidenceChip({ evidence, className }: { evidence: EvidenceRef; className?: string }) {
  const { openEvidence } = useEvidence();
  return (
    <button
      type="button"
      onClick={() => openEvidence(evidence)}
      className={cn("inline-flex items-center gap-1.5 rounded-md border border-amber-200 bg-amber-50 px-2 py-1 text-xs font-medium text-amber-900 hover:bg-amber-100", className)}
    >
      <FileText className="h-3 w-3" aria-hidden />
      Page {evidence.page} · Section {evidence.section}
    </button>
  );
}

/** Card with quoted clause text; used in evidence panels. */
export function EvidenceCard({ evidence, active }: { evidence: EvidenceRef; active?: boolean }) {
  const { openEvidence } = useEvidence();
  return (
    <div className={cn("rounded-lg border bg-amber-50/30 p-3", active ? "border-amber-400" : "border-amber-200/70")}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-xs">
          <span className="font-semibold text-slate-800">Page {evidence.page} · Section {evidence.section}</span>
          <span className="rounded bg-white px-1.5 py-0.5 text-[11px] text-slate-600 ring-1 ring-slate-200">{CATEGORY_LABEL[evidence.category]}</span>
        </div>
        <button type="button" onClick={() => openEvidence(evidence)} className="text-xs font-medium text-amber-800 underline-offset-2 hover:underline">
          Open in document
        </button>
      </div>
      {evidence.heading && <p className="mt-1.5 text-xs font-semibold text-slate-700">{evidence.heading}</p>}
      <p className="mt-1 line-clamp-6 font-serif text-sm leading-relaxed text-slate-700">
        “<HighlightedText text={evidence.text} terms={evidence.highlight ?? []} />”
      </p>
    </div>
  );
}
