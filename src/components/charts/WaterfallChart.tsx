"use client";

import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { CalcStep } from "@/lib/types";
import { formatCompactINR, formatINR } from "@/lib/utils";

const COLORS: Record<CalcStep["kind"], string> = {
  start: "#475569",
  reduce: "#f59e0b",
  cap: "#fb923c",
  result: "#1f716b",
  oop: "#e11d48",
};

export function WaterfallChart({ steps }: { steps: CalcStep[] }) {
  const data = steps
    .filter((s) => !(s.kind !== "start" && s.kind !== "result" && s.kind !== "oop" && s.delta === 0))
    .map((s) => {
      const isBar = s.kind === "start" || s.kind === "result" || s.kind === "oop";
      return {
        name: s.label.replace("Potential ", "").replace("insurer payment", "Insurer pays"),
        base: isBar ? 0 : s.amount,
        value: isBar ? s.amount : Math.abs(s.delta),
        kind: s.kind,
        label: isBar ? formatINR(s.amount) : `−${formatINR(Math.abs(s.delta))}`,
      };
    });
  return (
    <div className="h-64 w-full" role="img" aria-label="Waterfall chart of the calculation from bill to out-of-pocket">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid vertical={false} stroke="#e2e8f0" />
          <XAxis dataKey="name" tick={{ fontSize: 11, fill: "#64748b" }} interval={0} tickLine={false} axisLine={false} height={40} />
          <YAxis tickFormatter={(v: number) => formatCompactINR(v)} tick={{ fontSize: 11, fill: "#64748b" }} width={52} tickLine={false} axisLine={false} />
          <Tooltip
            cursor={{ fill: "#f1f5f9" }}
            formatter={(_v, name, item) => (name === "base" ? [null, null] : [item.payload.label, "Amount"])}
            contentStyle={{ fontSize: 12, borderRadius: 8, borderColor: "#e2e8f0" }}
          />
          <Bar dataKey="base" stackId="a" fill="transparent" isAnimationActive={false} />
          <Bar dataKey="value" stackId="a" radius={[4, 4, 0, 0]} isAnimationActive={false}>
            {data.map((d, i) => (
              <Cell key={i} fill={COLORS[d.kind]} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
