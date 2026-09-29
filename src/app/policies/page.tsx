"use client";

import Link from "next/link";
import { useState } from "react";
import { CheckCircle2, FileText, Loader2, RotateCw, Trash2 } from "lucide-react";
import * as api from "@/lib/api";
import { formatBytes, formatDate } from "@/lib/utils";
import { usePolicy } from "@/components/layout/PolicyContext";
import { PolicyUpload, resumeProcessing } from "@/components/upload/PolicyUpload";
import { Badge, Button, Card, CardHeader, PageHeader, Skeleton } from "@/components/common/ui";
import type { PolicyListItem } from "@/lib/types";

function StatusCell({ p }: { p: PolicyListItem }) {
  if (p.status === "ready") return <Badge tone="green"><CheckCircle2 className="h-3 w-3" /> Ready</Badge>;
  if (p.status === "failed")
    return <Badge tone="red">{p.errorCode === "ocr_required" ? "OCR required" : p.errorCode === "unsupported_pdf" ? "Unsupported PDF" : "Failed"}</Badge>;
  return <Badge tone="blue">Processing · {p.status}</Badge>;
}

export default function PoliciesPage() {
  const { policies, activeId, setActiveId, refresh } = usePolicy();
  const [busy, setBusy] = useState<string | null>(null);

  const remove = async (id: string) => {
    if (!confirm("Delete this policy and all its analysis? This cannot be undone.")) return;
    setBusy(id);
    try {
      await api.deletePolicy(id);
      if (activeId === id) setActiveId(null);
      await refresh();
    } finally {
      setBusy(null);
    }
  };
  const resume = async (id: string) => {
    setBusy(id);
    try {
      await resumeProcessing(id);
      await refresh();
    } finally {
      setBusy(null);
    }
  };

  return (
    <div>
      <PageHeader title="Policies" description="Upload a policy document. CoverLens reads it, classifies its clauses and builds a searchable evidence index." />
      <div className="grid gap-6 lg:grid-cols-5">
        <div className="lg:col-span-3">
          <PolicyUpload />
        </div>
        <Card className="lg:col-span-2 self-start">
          <CardHeader icon={<FileText className="h-4 w-4" />} title="Your policies" subtitle="Select one to make it active across CoverLens" />
          {policies === null ? (
            <div className="space-y-2 p-4">
              <Skeleton className="h-12" />
              <Skeleton className="h-12" />
            </div>
          ) : policies.length === 0 ? (
            <p className="px-5 py-8 text-center text-sm text-slate-500">No policies yet. Upload a PDF or try the sample.</p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {policies.map((p) => (
                <li key={p.id} className="flex items-center gap-3 px-5 py-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      {p.status === "ready" ? (
                        <Link href={`/policies/${p.id}`} className="truncate text-sm font-medium text-slate-900 hover:text-brand-700" onClick={() => setActiveId(p.id)}>
                          {p.policyName ?? p.fileName}
                        </Link>
                      ) : (
                        <span className="truncate text-sm font-medium text-slate-900">{p.fileName}</span>
                      )}
                      {activeId === p.id && <Badge tone="brand">Active</Badge>}
                    </div>
                    <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-slate-500">
                      <StatusCell p={p} />
                      <span>{formatDate(p.createdAt)}</span>
                      {p.pageCount > 0 && <span>· {p.pageCount} pages</span>}
                      {p.fileSize > 0 && !p.isSample && <span>· {formatBytes(p.fileSize)}</span>}
                      {p.isSample && <span>· sample</span>}
                    </div>
                  </div>
                  {p.status !== "ready" && p.status !== "failed" && (
                    <Button variant="ghost" size="icon" onClick={() => resume(p.id)} disabled={busy === p.id} aria-label="Resume processing">
                      {busy === p.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <RotateCw className="h-4 w-4" />}
                    </Button>
                  )}
                  <Button variant="ghost" size="icon" onClick={() => remove(p.id)} disabled={busy === p.id} aria-label="Delete policy">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </div>
  );
}
