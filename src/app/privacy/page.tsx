import Link from "next/link";
import { PageHeader, Card } from "@/components/common/ui";

const SECTIONS = [
  { h: "What we store", p: "The PDF you upload, the text extracted from it, the clauses identified, and the estimates or comparisons you choose to run. Conversations are kept only in your browser session." },
  { h: "What we don't do", p: "We don't send your document to third parties, sell data, or use it to train models. No personal medical records are required — only the policy wording." },
  { h: "Deleting your data", p: "Delete a policy from the Policies page to permanently remove the file, its extracted text, its search index and all related reports." },
  { h: "Limits of the analysis", p: "CoverLens provides indicative analysis based on supplied documents and reference data. Automatic clause classification can be wrong. It does not guarantee claim approval or replace advice from your insurer, TPA or a licensed advisor." },
  { h: "Cost data", p: "Treatment costs come from a synthetic reference table meant for illustration. Actual hospital bills vary widely — always request a written estimate from your hospital." },
];

export default function PrivacyPage() {
  return (
    <div className="max-w-3xl">
      <PageHeader title="Privacy & responsible use" description="How CoverLens handles your documents." />
      <Card className="divide-y divide-slate-100">
        {SECTIONS.map((s) => (
          <section key={s.h} className="px-5 py-4">
            <h2 className="text-sm font-semibold text-slate-900">{s.h}</h2>
            <p className="mt-1 text-sm leading-relaxed text-slate-600">{s.p}</p>
          </section>
        ))}
      </Card>
      <p className="mt-4 text-sm text-slate-500">
        Manage your documents on the <Link href="/policies" className="font-medium text-brand-700 underline">Policies</Link> page.
      </p>
    </div>
  );
}
