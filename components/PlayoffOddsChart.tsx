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
  LabelList,
} from "recharts";
import { TeamSummary } from "@/lib/analytics/summary";

export default function PlayoffOddsChart({ teams }: { teams: TeamSummary[] }) {
  const data = [...teams]
    .sort((a, b) => a.playoffOdds - b.playoffOdds)
    .map((t) => ({ ...t, pct: t.playoffOdds * 100 }));

  return (
    <div className="h-72 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={data}
          layout="vertical"
          margin={{ top: 4, right: 44, left: 8, bottom: 4 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" horizontal={false} />
          <XAxis
            type="number"
            domain={[0, 100]}
            tick={{ fontSize: 11, fill: "#64748b" }}
            tickFormatter={(v) => `${v}%`}
          />
          <YAxis
            type="category"
            dataKey="short"
            tick={{ fontSize: 12, fill: "#334155" }}
            width={56}
          />
          <Tooltip
            formatter={(v, _name, item) => [
              `${Number(v).toFixed(1)}%`,
              (item?.payload as TeamSummary | undefined)?.name ?? "晉級機率",
            ]}
            labelFormatter={() => "季後賽晉級機率"}
            contentStyle={{ fontSize: 12, borderRadius: 8 }}
          />
          <Bar dataKey="pct" radius={[0, 4, 4, 0]} barSize={18}>
            {data.map((d) => (
              <Cell key={d.id} fill={d.color} />
            ))}
            <LabelList
              dataKey="pct"
              position="right"
              formatter={(v) => `${Number(v).toFixed(1)}%`}
              style={{ fontSize: 11, fill: "#475569", fontWeight: 600 }}
            />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
