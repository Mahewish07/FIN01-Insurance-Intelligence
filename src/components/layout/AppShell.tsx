"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, type ReactNode } from "react";
import {
  Calculator,
  FileStack,
  GitCompareArrows,
  LayoutDashboard,
  Lock,
  Menu,
  MessageSquareText,
  ScrollText,
  Settings,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { USE_MOCKS } from "@/lib/api";
import { PolicyProvider, usePolicy } from "./PolicyContext";
import { EvidenceProvider } from "@/components/evidence/EvidenceViewer";

const NAV = [
  { href: "/", label: "Dashboard", short: "Home", icon: LayoutDashboard },
  { href: "/policies", label: "Policies", short: "Policies", icon: FileStack },
  { href: "/ask", label: "Ask Policy", short: "Ask", icon: MessageSquareText },
  { href: "/estimate", label: "Treatment Estimate", short: "Estimate", icon: Calculator },
  { href: "/compare", label: "Scenario Compare", short: "Compare", icon: GitCompareArrows },
  { href: "/reports", label: "Reports", short: "Reports", icon: ScrollText },
];
const BOTTOM = [
  { href: "/settings", label: "Settings", icon: Settings },
  { href: "/privacy", label: "Privacy", icon: Lock },
];

export function Logo({ className }: { className?: string }) {
  return (
    <Link href="/" className={cn("flex items-center gap-2.5", className)} aria-label="CoverLens AI home">
      <svg viewBox="0 0 32 32" className="h-8 w-8" aria-hidden>
        <rect width="32" height="32" rx="8" className="fill-brand-700" />
        <circle cx="14.5" cy="14.5" r="6.5" fill="none" stroke="white" strokeWidth="2.4" />
        <path d="M19.5 19.5 L24 24" stroke="white" strokeWidth="2.6" strokeLinecap="round" />
        <path d="M11.5 14.5 h6 M14.5 11.5 v6" stroke="#9fe1d9" strokeWidth="2" strokeLinecap="round" />
      </svg>
      <span className="leading-none">
        <span className="block text-[15px] font-semibold tracking-tight text-slate-900">CoverLens</span>
        <span className="block text-[10px] font-medium uppercase tracking-[0.14em] text-slate-500">Coverage intelligence</span>
      </span>
    </Link>
  );
}

function isActive(pathname: string, href: string) {
  return href === "/" ? pathname === "/" : pathname.startsWith(href);
}

function PolicySwitcher() {
  const { policies, activeId, setActiveId } = usePolicy();
  const ready = (policies ?? []).filter((p) => p.status === "ready");
  if (!ready.length) return null;
  return (
    <div className="px-3 pb-3">
      <label htmlFor="policy-switch" className="mb-1 block px-1 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
        Active policy
      </label>
      <select
        id="policy-switch"
        value={activeId ?? ""}
        onChange={(e) => setActiveId(e.target.value)}
        className="h-9 w-full truncate rounded-lg border border-slate-200 bg-slate-50 px-2 text-sm text-slate-800"
      >
        {ready.map((p) => (
          <option key={p.id} value={p.id}>
            {p.policyName ?? p.fileName}
          </option>
        ))}
      </select>
    </div>
  );
}

function SidebarNav({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  return (
    <>
      <nav className="flex-1 space-y-0.5 px-3" aria-label="Main">
        {NAV.map((n) => {
          const Icon = n.icon;
          const active = isActive(pathname, n.href);
          return (
            <Link
              key={n.href}
              href={n.href}
              onClick={onNavigate}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                active ? "bg-brand-50 text-brand-800" : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
              )}
            >
              <Icon className={cn("h-4 w-4", active ? "text-brand-700" : "text-slate-400")} />
              {n.label}
            </Link>
          );
        })}
      </nav>
      <div className="space-y-0.5 border-t border-slate-100 px-3 py-3">
        {BOTTOM.map((n) => {
          const Icon = n.icon;
          const active = isActive(pathname, n.href);
          return (
            <Link
              key={n.href}
              href={n.href}
              onClick={onNavigate}
              className={cn("flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium", active ? "bg-slate-100 text-slate-900" : "text-slate-500 hover:bg-slate-100 hover:text-slate-900")}
            >
              <Icon className="h-4 w-4" />
              {n.label}
            </Link>
          );
        })}
      </div>
    </>
  );
}

export function Disclaimer() {
  return (
    <footer className="mx-auto max-w-7xl px-4 pb-24 pt-8 text-center text-xs leading-relaxed text-slate-400 sm:px-6 lg:pb-8">
      CoverLens provides indicative analysis based on supplied documents and reference data. It does not guarantee claim approval or replace advice from your insurer.
    </footer>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  return (
    <PolicyProvider>
      <EvidenceProvider>
        <div className="min-h-screen bg-slate-50">
          {/* Desktop sidebar */}
          <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col border-r border-slate-200 bg-white lg:flex">
            <div className="px-5 py-5">
              <Logo />
            </div>
            <PolicySwitcher />
            <SidebarNav />
          </aside>

          {/* Mobile top bar */}
          <header className="sticky top-0 z-30 flex items-center justify-between border-b border-slate-200 bg-white/95 px-4 py-3 backdrop-blur lg:hidden">
            <Logo />
            <button onClick={() => setMenuOpen(true)} className="rounded-lg p-2 text-slate-600 hover:bg-slate-100" aria-label="Open menu">
              <Menu className="h-5 w-5" />
            </button>
          </header>
          {menuOpen && (
            <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true">
              <div className="absolute inset-0 bg-slate-900/30" onClick={() => setMenuOpen(false)} />
              <div className="animate-slide-in absolute inset-y-0 right-0 flex w-72 flex-col bg-white py-4 shadow-xl">
                <div className="mb-4 flex items-center justify-between px-5">
                  <Logo />
                  <button onClick={() => setMenuOpen(false)} className="rounded-lg p-2 text-slate-500" aria-label="Close menu">
                    <X className="h-5 w-5" />
                  </button>
                </div>
                <PolicySwitcher />
                <SidebarNav onNavigate={() => setMenuOpen(false)} />
              </div>
            </div>
          )}

          <div className="lg:pl-64">
            {USE_MOCKS && (
              <div className="bg-amber-100 px-4 py-1.5 text-center text-xs font-medium text-amber-900">Mock API mode — data is simulated in the browser.</div>
            )}
            <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:py-8">{children}</main>
            <Disclaimer />
          </div>

          {/* Mobile bottom nav */}
          <nav className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-5 border-t border-slate-200 bg-white pb-[env(safe-area-inset-bottom)] lg:hidden" aria-label="Primary">
            {NAV.slice(0, 5).map((n) => {
              const Icon = n.icon;
              const active = isActive(pathname, n.href);
              return (
                <Link key={n.href} href={n.href} className={cn("flex flex-col items-center gap-0.5 py-2 text-[11px] font-medium", active ? "text-brand-700" : "text-slate-500")}>
                  <Icon className="h-5 w-5" />
                  {n.short}
                </Link>
              );
            })}
          </nav>
        </div>
      </EvidenceProvider>
    </PolicyProvider>
  );
}
