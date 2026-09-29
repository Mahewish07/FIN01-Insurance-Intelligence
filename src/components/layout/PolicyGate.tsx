"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { RefreshCw } from "lucide-react";
import type { Policy } from "@/lib/types";
import { usePolicy } from "./PolicyContext";
import { NoPolicyState, StateBlock } from "@/components/common/StateBlock";
import { Button, Card, Skeleton } from "@/components/common/ui";

/** Renders children only when a processed policy is active; otherwise shows the appropriate state. */
export function PolicyGate({ children }: { children: (policy: Policy) => ReactNode }) {
  const { policies, active, activeId, activeLoading, activeError, refresh, listError } = usePolicy();

  if (policies === null || (activeId && !active && activeLoading)) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-64" />
        <div className="grid gap-4 md:grid-cols-2">
          <Skeleton className="h-40" />
          <Skeleton className="h-40" />
        </div>
      </div>
    );
  }
  if (listError && !policies.length) {
    return (
      <Card>
        <StateBlock kind="server_error" body={listError} action={<Button variant="outline" onClick={() => refresh()}><RefreshCw className="h-4 w-4" /> Retry</Button>} />
      </Card>
    );
  }
  if (!activeId) return <Card><NoPolicyState /></Card>;
  if (activeError) {
    return (
      <Card>
        <StateBlock kind="server_error" body={activeError} action={<Button variant="outline" onClick={() => refresh()}><RefreshCw className="h-4 w-4" /> Retry</Button>} />
      </Card>
    );
  }
  if (!active) return <Skeleton className="h-60" />;
  if (active.status === "failed") {
    const kind = active.errorCode === "ocr_required" ? "ocr_required" : active.errorCode === "unsupported_pdf" ? "unsupported_pdf" : "server_error";
    return (
      <Card>
        <StateBlock
          kind={kind}
          body={active.errorMessage ?? undefined}
          action={<Link href="/policies" className="inline-flex h-10 items-center rounded-lg bg-brand-700 px-4 text-sm font-medium text-white">Upload another policy</Link>}
        />
      </Card>
    );
  }
  if (active.status !== "ready") {
    return (
      <Card>
        <StateBlock kind="processing" action={<Link href="/policies" className="text-sm font-medium text-brand-700 underline">View processing status</Link>} />
      </Card>
    );
  }
  return <>{children(active)}</>;
}
