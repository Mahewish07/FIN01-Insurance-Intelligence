"use client";

import { useState } from "react";
import { Database, MessageSquareX, Server } from "lucide-react";
import { USE_MOCKS } from "@/lib/api";
import { Badge, Button, Card, CardHeader, PageHeader } from "@/components/common/ui";
import { ProvenanceLabel } from "@/components/common/provenance";

export default function SettingsPage() {
  const [cleared, setCleared] = useState(false);
  const clearChats = () => {
    try {
      Object.keys(sessionStorage)
        .filter((k) => k.startsWith("coverlens."))
        .forEach((k) => sessionStorage.removeItem(k));
    } catch {
      /* ignore */
    }
    setCleared(true);
  };
  return (
    <div className="max-w-3xl">
      <PageHeader title="Settings" description="Workspace configuration and data sources." />
      <div className="space-y-5">
        <Card>
          <CardHeader icon={<Server className="h-4 w-4" />} title="API mode" subtitle="Set NEXT_PUBLIC_USE_MOCKS=true to run entirely on simulated data" />
          <div className="flex items-center justify-between px-5 py-4 text-sm">
            <span className="text-slate-600">Current mode</span>
            {USE_MOCKS ? <Badge tone="amber">Mock API (browser)</Badge> : <Badge tone="green">Live API + PostgreSQL</Badge>}
          </div>
        </Card>
        <Card>
          <CardHeader icon={<Database className="h-4 w-4" />} title="Data sources & labels" subtitle="How CoverLens labels the origin of every piece of information" />
          <ul className="divide-y divide-slate-100 text-sm">
            <li className="flex flex-col gap-1 px-5 py-3 sm:flex-row sm:items-center sm:justify-between"><ProvenanceLabel kind="evidence" /><span className="text-slate-600">Verbatim text from your uploaded document</span></li>
            <li className="flex flex-col gap-1 px-5 py-3 sm:flex-row sm:items-center sm:justify-between"><ProvenanceLabel kind="ai" /><span className="text-slate-600">Automatically generated explanation of that evidence</span></li>
            <li className="flex flex-col gap-1 px-5 py-3 sm:flex-row sm:items-center sm:justify-between"><ProvenanceLabel kind="calculation" /><span className="text-slate-600">Deterministic arithmetic on extracted terms</span></li>
            <li className="flex flex-col gap-1 px-5 py-3 sm:flex-row sm:items-center sm:justify-between"><ProvenanceLabel kind="external" /><span className="text-slate-600">Synthetic reference treatment-cost table (illustrative)</span></li>
          </ul>
        </Card>
        <Card>
          <CardHeader icon={<MessageSquareX className="h-4 w-4" />} title="Session data" subtitle="Conversations and last-used inputs are kept in this browser tab only" />
          <div className="flex items-center justify-between px-5 py-4">
            <span className="text-sm text-slate-600">{cleared ? "Cleared." : "Clear saved conversations and form inputs."}</span>
            <Button variant="outline" size="sm" onClick={clearChats}>Clear</Button>
          </div>
        </Card>
      </div>
    </div>
  );
}
