"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import * as api from "@/lib/api";
import type { Policy, PolicyListItem } from "@/lib/types";

interface PolicyCtx {
  policies: PolicyListItem[] | null;
  listError: string | null;
  activeId: string | null;
  active: Policy | null;
  activeLoading: boolean;
  activeError: string | null;
  setActiveId: (id: string | null) => void;
  refresh: () => Promise<void>;
}

const Ctx = createContext<PolicyCtx | null>(null);
const KEY = "coverlens.activePolicy";

export function PolicyProvider({ children }: { children: ReactNode }) {
  const [policies, setPolicies] = useState<PolicyListItem[] | null>(null);
  const [listError, setListError] = useState<string | null>(null);
  const [activeId, setActiveIdState] = useState<string | null>(null);
  const [active, setActive] = useState<Policy | null>(null);
  const [activeLoading, setActiveLoading] = useState(false);
  const [activeError, setActiveError] = useState<string | null>(null);

  const setActiveId = useCallback((id: string | null) => {
    setActiveIdState(id);
    try {
      if (id) localStorage.setItem(KEY, id);
      else localStorage.removeItem(KEY);
    } catch {
      /* ignore */
    }
  }, []);

  const refresh = useCallback(async () => {
    try {
      const list = await api.listPolicies();
      setPolicies(list);
      setListError(null);
      setActiveIdState((cur) => {
        let stored: string | null = null;
        try {
          stored = localStorage.getItem(KEY);
        } catch {
          /* ignore */
        }
        const want = cur ?? stored;
        if (want && list.some((p) => p.id === want)) return want;
        const ready = list.find((p) => p.status === "ready");
        return ready?.id ?? list[0]?.id ?? null;
      });
    } catch (e) {
      setListError(e instanceof Error ? e.message : "Could not load policies.");
      setPolicies((p) => p ?? []);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const summaryStatus = policies?.find((p) => p.id === activeId)?.status;

  useEffect(() => {
    if (!activeId) {
      setActive(null);
      return;
    }
    let cancelled = false;
    setActiveLoading(true);
    api
      .getPolicy(activeId)
      .then((p) => {
        if (!cancelled) {
          setActive(p);
          setActiveError(null);
        }
      })
      .catch((e) => {
        if (!cancelled) setActiveError(e instanceof Error ? e.message : "Could not load policy.");
      })
      .finally(() => !cancelled && setActiveLoading(false));
    return () => {
      cancelled = true;
    };
  }, [activeId, summaryStatus]);

  const value = useMemo(
    () => ({ policies, listError, activeId, active, activeLoading, activeError, setActiveId, refresh }),
    [policies, listError, activeId, active, activeLoading, activeError, setActiveId, refresh]
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function usePolicy() {
  const c = useContext(Ctx);
  if (!c) throw new Error("usePolicy must be used inside PolicyProvider");
  return c;
}
