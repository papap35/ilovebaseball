"use client";

import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ReferenceLine,
} from "recharts";
import { FormPoint } from "@/lib/analytics/standings";

export default function TeamFormChart({
  data,
  color,
}: {
  data: FormPoint[];
  color: string;
}) {
  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 8, right: 12, left: -12, bottom: 0 }}>
          <defs>
            <linearGradient id="formFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity={0.35} />
              <stop offset="100%" stopColor={color} stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
          <XAxis
            dataKey="gameNo"
            tick={{ fontSize: 11, fill: "#64748b" }}
            tickFormatter={(v) => `第${v}戰`}
            minTickGap={40}
          />
          <YAxis
            domain={[0, 1]}
            tickFormatter={(v) => v.toFixed(2)}
            tick={{ fontSize: 11, fill: "#64748b" }}
            width={40}
          />
          <ReferenceLine y={0.5} stroke="#94a3b8" strokeDasharray="4 4" />
          <Tooltip
            labelFormatter={(v) => `第 ${v} 場後`}
            formatter={(v) => [Number(v).toFixed(3), "累積勝率"]}
            contentStyle={{ fontSize: 12, borderRadius: 8 }}
          />
          <Area
            type="monotone"
            dataKey="winPct"
            stroke={color}
            strokeWidth={2}
            fill="url(#formFill)"
            isAnimationActive={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
