import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { AppShell } from "@/components/layout/AppShell";
import "./globals.css";


export const metadata: Metadata = {
  title: "CoverLens AI — Health coverage & treatment-cost intelligence",
  description: "Understand your health insurance coverage before the bill arrives. Evidence-grounded answers from your own policy.",
};

export const viewport: Viewport = { themeColor: "#1a5c57", width: "device-width", initialScale: 1 };

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-slate-50 font-sans text-slate-900 antialiased">
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
