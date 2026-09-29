"use client";

import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { formatINR } from "@/lib/utils";

export function ExposureChart({ insurer, oop }: { insurer: number; oop: number }) {
  const data = [
    { name: "Insurer may pay", value: insurer, color: "#1f716b" },
    { name: "You may pay", value: oop, color: "#e11d48" },
  ];
  const total = insurer + oop;
  return (
    <div className="relative h-36 w-36 shrink-0" role="img" aria-label={`Insurer ${formatINR(insurer)}, you ${formatINR(oop)}`}>
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie data={data} dataKey="value" innerRadius={46} outerRadius={64} paddingAngle={2} stroke="none" isAnimationActive={false}>
            {data.map((d) => (
              <Cell key={d.name} fill={d.color} />
            ))}
          </Pie>
          <Tooltip formatter={(v) => formatINR(Number(v))} contentStyle={{ fontSize: 12, borderRadius: 8 }} />
        </PieChart>
      </ResponsiveContainer>
      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-lg font-semibold text-rose-700 tabular">{total ? Math.round((oop / total) * 100) : 0}%</span>
        <span className="text-[10px] text-slate-500">out-of-pocket</span>
      </div>
    </div>
  );
}
