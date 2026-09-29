import { Fragment, type ReactNode } from "react";

function escapeRe(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function markTerms(text: string, terms: string[]): ReactNode {
  const clean = terms.map((t) => t.trim()).filter((t) => t.length >= 3);
  if (!clean.length) return text;
  const re = new RegExp(`(${clean.sort((a, b) => b.length - a.length).map(escapeRe).join("|")})`, "gi");
  const parts = text.split(re);
  return parts.map((p, i) => (i % 2 === 1 ? <mark key={i} className="evidence-hl">{p}</mark> : <Fragment key={i}>{p}</Fragment>));
}

/** Highlights sentences that contain any of the query terms, and marks the terms themselves. */
export function HighlightedText({ text, terms = [] }: { text: string; terms?: string[] }) {
  if (!terms.length) return <>{text}</>;
  const sentences = text.split(/(?<=[.;:])\s+/);
  const lower = terms.map((t) => t.toLowerCase()).filter((t) => t.length >= 3);
  return (
    <>
      {sentences.map((s, i) => {
        const hit = lower.some((t) => s.toLowerCase().includes(t));
        return (
          <Fragment key={i}>
            {hit ? <span className="sentence-hl">{markTerms(s, terms)}</span> : s}
            {i < sentences.length - 1 ? " " : ""}
          </Fragment>
        );
      })}
    </>
  );
}
