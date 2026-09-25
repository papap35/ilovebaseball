"use client";

import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
  LabelList,
} from "recharts";
import { EloPoint } from "@/lib/analytics/elo";
import { Team } from "@/lib/teams";

/**
 * Four CPBL clubs sit in the warm half of the colour wheel, so brand colours alone
 * cannot separate six lines for colour-blind readers. Every series therefore carries
 * a direct end-of-line label - identity comes from the text, colour only reinforces it.
 */
interface LabelProps {
  x?: string | number;
  y?: string | number;
  index?: number;
}

function EndLabel({ short, color, x, y }: { short: string; color: string } & LabelProps) {
  return (
    <text x={Number(x) + 4} y={Number(y)} dy={3} fill={color} fontSize={10} fontWeight={700}>
      {short}
    </text>
  );
}

export default function EloTrendChart({ data, teams }: { data: EloPoint[]; teams: Team[] }) {
  const lastIndex = data.length - 1;

  return (
    <div className="h-80 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 8, right: 44, left: -12, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
          <XAxis
            dataKey="gameNo"
            tick={{ fontSize: 11, fill: "#64748b" }}
            tickFormatter={(v) => `第${v}戰`}
            minTickGap={40}
          />
          <YAxis
            domain={["dataMin - 20", "dataMax + 20"]}
            tick={{ fontSize: 11, fill: "#64748b" }}
            tickFormatter={(v: number) => v.toFixed(0)}
            width={52}
          />
          <Tooltip
            labelFormatter={(v) => `聯盟第 ${v} 場後`}
            formatter={(value, name) => {
              const team = teams.find((t) => t.id === name);
              return [Number(value).toFixed(0), team ? team.name : String(name)];
            }}
            contentStyle={{ fontSize: 12, borderRadius: 8 }}
          />
          <Legend
            formatter={(value) => {
              const t = teams.find((tm) => tm.id === value);
              return t ? t.short : value;
            }}
            wrapperStyle={{ fontSize: 12 }}
          />
          {teams.map((t) => (
            <Line
              key={t.id}
              type="monotone"
              dataKey={t.id}
              stroke={t.color}
              strokeWidth={2}
              dot={false}
              isAnimationActive={false}
            >
              <LabelList
                dataKey={t.id}
                content={(props) => {
                  const { index, x, y } = props as LabelProps;
                  if (index !== lastIndex) return null;
                  return <EndLabel short={t.short} color={t.color} x={x} y={y} />;
                }}
              />
            </Line>
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
