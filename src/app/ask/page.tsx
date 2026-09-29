"use client";

import { PolicyGate } from "@/components/layout/PolicyGate";
import { AskWorkspace } from "@/components/chat/AskWorkspace";
import { PageHeader } from "@/components/common/ui";

export default function AskPage() {
  return (
    <div>
      <PageHeader title="Ask policy" description="Plain-language answers, separated from the exact policy evidence they rely on." />
      <PolicyGate>{(p) => <AskWorkspace key={p.id} policy={p} />}</PolicyGate>
    </div>
  );
}
