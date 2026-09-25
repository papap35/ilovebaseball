import Link from "next/link";
import { TeamSummary } from "@/lib/analytics/summary";
import { getTeam } from "@/lib/teams";
import TeamBadge from "./TeamBadge";

function streakColor(streak: string) {
  if (streak.startsWith("W")) return "text-emerald-600";
  if (streak.startsWith("L")) return "text-rose-600";
  return "text-slate-400";
}

function signed(value: number, digits = 0) {
  return `${value >= 0 ? "+" : ""}${value.toFixed(digits)}`;
}

export default function StandingsTable({ teams }: { teams: TeamSummary[] }) {
  return (
    <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
      <table className="w-full text-sm whitespace-nowrap">
        <thead>
          <tr className="border-b border-slate-200 text-slate-500">
            <th className="px-3 py-2.5 text-left font-medium">排名</th>
            <th className="px-3 py-2.5 text-left font-medium">球隊</th>
            <th className="px-3 py-2.5 text-right font-medium">勝</th>
            <th className="px-3 py-2.5 text-right font-medium">敗</th>
            <th className="px-3 py-2.5 text-right font-medium">和</th>
            <th className="px-3 py-2.5 text-right font-medium">勝率</th>
            <th className="px-3 py-2.5 text-right font-medium">勝差</th>
            <th className="px-3 py-2.5 text-right font-medium">得失分差</th>
            <th className="px-3 py-2.5 text-right font-medium" title="實際勝場減去得失分推算的期望勝場">
              運氣
            </th>
            <th className="px-3 py-2.5 text-right font-medium">近10場</th>
            <th className="px-3 py-2.5 text-right font-medium">連勝/敗</th>
            <th className="px-3 py-2.5 text-right font-medium">Elo</th>
            <th className="px-3 py-2.5 text-right font-medium">晉級機率</th>
          </tr>
        </thead>
        <tbody>
          {teams.map((team) => {
            const meta = getTeam(team.id)!;
            return (
              <tr
                key={team.id}
                className="border-b border-slate-100 last:border-0 hover:bg-slate-50 transition-colors"
              >
                <td className="px-3 py-2.5 text-slate-500">{team.rank}</td>
                <td className="px-3 py-2.5">
                  <Link href={`/team/${team.id}`} className="flex items-center gap-2 font-semibold">
                    <TeamBadge team={meta} size="sm" />
                    {team.name}
                  </Link>
                </td>
                <td className="px-3 py-2.5 text-right tabular-nums">{team.wins}</td>
                <td className="px-3 py-2.5 text-right tabular-nums">{team.losses}</td>
                <td className="px-3 py-2.5 text-right tabular-nums text-slate-400">{team.ties}</td>
                <td className="px-3 py-2.5 text-right tabular-nums font-medium">
                  {team.winPct.toFixed(3)}
                </td>
                <td className="px-3 py-2.5 text-right tabular-nums">
                  {team.rank === 1 ? "-" : team.gamesBack.toFixed(1)}
                </td>
                <td
                  className={`px-3 py-2.5 text-right tabular-nums ${
                    team.runDiff >= 0 ? "text-emerald-600" : "text-rose-600"
                  }`}
                >
                  {signed(team.runDiff)}
                </td>
                <td
                  className={`px-3 py-2.5 text-right tabular-nums ${
                    team.luck >= 0 ? "text-sky-600" : "text-amber-600"
                  }`}
                >
                  {signed(team.luck, 1)}
                </td>
                <td className="px-3 py-2.5 text-right tabular-nums">{team.last10}</td>
                <td
                  className={`px-3 py-2.5 text-right tabular-nums font-medium ${streakColor(
                    team.streak
                  )}`}
                >
                  {team.streak}
                </td>
                <td className="px-3 py-2.5 text-right tabular-nums text-slate-500">
                  {team.elo.toFixed(0)}
                </td>
                <td className="px-3 py-2.5 text-right tabular-nums font-semibold">
                  {(team.playoffOdds * 100).toFixed(1)}%
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
