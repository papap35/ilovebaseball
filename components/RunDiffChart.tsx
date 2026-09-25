"use client";

import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Cell,
  ReferenceLine,
} from "recharts";
import { TeamSummary } from "@/lib/analytics/summary";

export default function RunDiffChart({ teams }: { teams: TeamSummary[] }) {
  const data = [...teams].sort((a, b) => b.runDiff - a.runDiff);

  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 12, left: -12, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
          <XAxis dataKey="short" tick={{ fontSize: 12, fill: "#334155" }} />
          <YAxis tick={{ fontSize: 11, fill: "#64748b" }} width={40} />
          <ReferenceLine y={0} stroke="#94a3b8" />
          <Tooltip
            formatter={(v) => [`${Number(v) >= 0 ? "+" : ""}${v} 分`, "得失分差"]}
            contentStyle={{ fontSize: 12, borderRadius: 8 }}
          />
          <Bar dataKey="runDiff" radius={[4, 4, 4, 4]}>
            {data.map((d) => (
              <Cell key={d.id} fill={d.color} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
