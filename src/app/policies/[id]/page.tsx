"use client";

import Link from "next/link";
import { use, useEffect } from "react";
import { Calculator, MessageSquareText } from "lucide-react";
import { usePolicy } from "@/components/layout/PolicyContext";
import { PolicyGate } from "@/components/layout/PolicyGate";
import { PolicySummaryView } from "@/components/policy/PolicySummaryView";
import { PageHeader } from "@/components/common/ui";
import { StateBlock } from "@/components/common/StateBlock";

export default function PolicyDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { policies, activeId, setActiveId } = usePolicy();
  const exists = policies?.some((p) => p.id === id);

  useEffect(() => {
    if (exists && activeId !== id) setActiveId(id);
  }, [exists, activeId, id, setActiveId]);

  if (policies && !exists) {
    return <StateBlock kind="empty" title="Policy not found" body="It may have been deleted." action={<Link href="/policies" className="text-sm font-medium text-brand-700 underline">Back to policies</Link>} />;
  }

  return (
    <div>
      <PageHeader
        title="Policy summary"
        description="Here is what the policy says — each item links to the exact clause."
        action={
          <>
            <Link href="/ask" className="inline-flex h-10 items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 text-sm font-medium text-slate-800 hover:bg-slate-50">
              <MessageSquareText className="h-4 w-4" /> Ask
            </Link>
            <Link href="/estimate" className="inline-flex h-10 items-center gap-2 rounded-lg bg-brand-700 px-3 text-sm font-medium text-white hover:bg-brand-800">
              <Calculator className="h-4 w-4" /> Estimate treatment
            </Link>
          </>
        }
      />
      {activeId === id ? <PolicyGate>{(p) => <PolicySummaryView policy={p} />}</PolicyGate> : null}
    </div>
  );
}
