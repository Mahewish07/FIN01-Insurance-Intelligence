"use client";

import { useEffect, useRef, useState } from "react";
import { FileText, SendHorizonal, User } from "lucide-react";
import * as api from "@/lib/api";
import type { AskResponse, Policy } from "@/lib/types";
import { cn } from "@/lib/utils";
import { Button, Card, Skeleton } from "@/components/common/ui";
import { ProvenanceLabel } from "@/components/common/provenance";
import { StateBlock } from "@/components/common/StateBlock";
import { EvidenceCard } from "@/components/evidence/EvidenceViewer";
import { AnswerCard } from "./AnswerCard";

export const SUGGESTED = [
  "Is knee replacement covered?",
  "Is this treatment covered?",
  "What is my waiting period?",
  "Does the room type affect reimbursement?",
  "What exclusions apply?",
  "What documents are needed for a claim?",
  "How much could I pay for knee replacement?",
];

type Turn = { id: string; question: string; answer?: AskResponse; error?: string };

export function AskWorkspace({ policy }: { policy: Policy }) {
  const storageKey = `coverlens.chat.${policy.id}`;
  const [turns, setTurns] = useState<Turn[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    try {
      const s = sessionStorage.getItem(storageKey);
      if (s) {
        const t = JSON.parse(s) as Turn[];
        setTurns(t);
        setSelected(t[t.length - 1]?.id ?? null);
      }
    } catch {
      /* ignore */
    }
  }, [storageKey]);

  useEffect(() => {
    try {
      sessionStorage.setItem(storageKey, JSON.stringify(turns.filter((t) => t.answer)));
    } catch {
      /* ignore */
    }
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [turns, storageKey]);

  const ask = async (q: string) => {
    const question = q.trim();
    if (question.length < 3 || busy) return;
    const id = globalThis.crypto.randomUUID();
    setTurns((t) => [...t, { id, question }]);
    setSelected(id);
    setText("");
    setBusy(true);
    try {
      const answer = await api.askPolicy(policy.id, question);
      setTurns((t) => t.map((x) => (x.id === id ? { ...x, answer } : x)));
    } catch (e) {
      setTurns((t) => t.map((x) => (x.id === id ? { ...x, error: e instanceof Error ? e.message : "Something went wrong." } : x)));
    } finally {
      setBusy(false);
    }
  };

  const current = turns.find((t) => t.id === selected) ?? turns[turns.length - 1];

  return (
    <div className="grid gap-6 lg:grid-cols-5">
      {/* Conversation */}
      <div className="flex min-h-[60vh] flex-col lg:col-span-3">
        <div className="flex-1 space-y-5">
          {turns.length === 0 && (
            <Card className="p-6">
              <h2 className="text-base font-semibold text-slate-900">Ask anything about {policy.meta?.policyName ?? "your policy"}</h2>
              <p className="mt-1 text-sm text-slate-500">Answers are short, grounded in your document, and always show the clauses they rely on.</p>
              <div className="mt-5 grid gap-2 sm:grid-cols-2">
                {SUGGESTED.map((s) => (
                  <button key={s} onClick={() => ask(s)} className="rounded-lg border border-slate-200 px-3 py-2.5 text-left text-sm text-slate-700 hover:border-brand-200 hover:bg-brand-50">
                    {s}
                  </button>
                ))}
              </div>
            </Card>
          )}
          {turns.map((t) => (
            <div key={t.id} className="space-y-3">
              <div className="flex justify-end">
                <div className="flex max-w-[85%] items-start gap-2 rounded-2xl rounded-tr-sm bg-slate-800 px-4 py-2.5 text-sm text-white">
                  <User className="mt-0.5 h-3.5 w-3.5 shrink-0 opacity-60" />
                  {t.question}
                </div>
              </div>
              {t.answer ? (
                <AnswerCard answer={t.answer} selected={current?.id === t.id} onSelect={() => setSelected(t.id)} onFollowUp={ask} />
              ) : t.error ? (
                <Card><StateBlock kind="server_error" body={t.error} compact action={<Button variant="outline" size="sm" onClick={() => ask(t.question)}>Retry</Button>} /></Card>
              ) : (
                <Card className="space-y-2 p-5" aria-live="polite">
                  <p className="text-xs text-slate-500">Searching the policy index…</p>
                  <Skeleton className="h-5 w-40" />
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-4/5" />
                </Card>
              )}
            </div>
          ))}
          <div ref={endRef} />
        </div>

        <div className="sticky bottom-16 mt-5 lg:bottom-4">
          {turns.length > 0 && (
            <div className="mb-2 flex gap-1.5 overflow-x-auto pb-1">
              {SUGGESTED.slice(1).map((s) => (
                <button key={s} onClick={() => ask(s)} disabled={busy} className="shrink-0 rounded-full border border-slate-200 bg-white px-3 py-1 text-xs text-slate-600 hover:bg-slate-50 disabled:opacity-50">
                  {s}
                </button>
              ))}
            </div>
          )}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              void ask(text);
            }}
            className="flex items-center gap-2 rounded-xl border border-slate-300 bg-white p-1.5 shadow-sm focus-within:border-brand-500 focus-within:ring-2 focus-within:ring-brand-100"
          >
            <label htmlFor="ask-input" className="sr-only">Ask about your policy</label>
            <input
              id="ask-input"
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="e.g. Is cataract surgery covered?"
              maxLength={500}
              className="h-10 flex-1 bg-transparent px-2 text-sm outline-none placeholder:text-slate-400"
            />
            <Button type="submit" size="icon" disabled={text.trim().length < 3 || busy} aria-label="Send question">
              <SendHorizonal className="h-4 w-4" />
            </Button>
          </form>
        </div>
      </div>

      {/* Evidence panel */}
      <aside className="hidden lg:col-span-2 lg:block">
        <div className="sticky top-6">
          <Card className="flex max-h-[calc(100vh-3rem)] flex-col">
            <div className="border-b border-slate-100 px-5 py-4">
              <div className="flex items-center justify-between">
                <h2 className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                  <FileText className="h-4 w-4 text-amber-700" /> Evidence panel
                </h2>
                <ProvenanceLabel kind="evidence" />
              </div>
              {current && <p className="mt-1 truncate text-xs text-slate-500">For: “{current.question}”</p>}
            </div>
            <div className={cn("flex-1 space-y-3 overflow-y-auto p-4")}>
              {!current ? (
                <p className="py-8 text-center text-sm text-slate-500">Ask a question to see the exact policy clauses behind the answer.</p>
              ) : !current.answer ? (
                <>
                  <Skeleton className="h-24" />
                  <Skeleton className="h-24" />
                </>
              ) : current.answer.evidence.length === 0 ? (
                <StateBlock kind="insufficient_evidence" compact body="No policy clause directly supports this answer." />
              ) : (
                current.answer.evidence.map((e) => <EvidenceCard key={e.chunkId} evidence={e} />)
              )}
            </div>
            <p className="border-t border-slate-100 px-5 py-2.5 text-[11px] text-slate-400">Quoted text is taken verbatim from your document. Highlights mark the matched terms.</p>
          </Card>
        </div>
      </aside>
    </div>
  );
}
