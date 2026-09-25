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
  LabelList,
} from "recharts";
import { ParkFactor } from "@/lib/analytics/advanced";
import { getTeam } from "@/lib/teams";

/**
 * Park factor is polarity data around a neutral 100, so it uses a diverging
 * blue/red encoding rather than team colours - the sign is the message here.
 */
const HITTER_FRIENDLY = "#b91c1c";
const PITCHER_FRIENDLY = "#1d4ed8";
const NEUTRAL = "#94a3b8";

export default function ParkFactorChart({ parks }: { parks: ParkFactor[] }) {
  const data = [...parks]
    .sort((a, b) => b.index - a.index)
    .map((p) => ({
      ...p,
      short: getTeam(p.teamId)?.short ?? p.venue,
      delta: Math.round((p.index - 100) * 10) / 10,
    }));

  return (
    <div className="h-72 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} layout="vertical" margin={{ top: 4, right: 40, left: 8, bottom: 4 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" horizontal={false} />
          <XAxis
            type="number"
            domain={[-12, 12]}
            tick={{ fontSize: 11, fill: "#64748b" }}
            tickFormatter={(v) => `${v > 0 ? "+" : ""}${v}`}
          />
          <YAxis
            type="category"
            dataKey="short"
            tick={{ fontSize: 12, fill: "#334155" }}
            width={56}
          />
          <ReferenceLine x={0} stroke="#64748b" />
          <Tooltip
            formatter={(_v, _n, item) => {
              const p = item?.payload as (ParkFactor & { delta: number }) | undefined;
              if (!p) return ["", ""];
              return [`指數 ${p.index.toFixed(1)}（主場 ${p.homeRunsPerGame} 分 / 客場 ${p.awayRunsPerGame} 分）`, p.venue];
            }}
            labelFormatter={() => ""}
            contentStyle={{ fontSize: 12, borderRadius: 8 }}
          />
          <Bar dataKey="delta" radius={[4, 4, 4, 4]} barSize={18}>
            {data.map((d) => (
              <Cell
                key={d.venue}
                fill={
                  Math.abs(d.delta) < 1.5
                    ? NEUTRAL
                    : d.delta > 0
                      ? HITTER_FRIENDLY
                      : PITCHER_FRIENDLY
                }
              />
            ))}
            <LabelList
              dataKey="index"
              position="right"
              formatter={(v) => Number(v).toFixed(1)}
              style={{ fontSize: 11, fill: "#475569", fontWeight: 600 }}
            />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
