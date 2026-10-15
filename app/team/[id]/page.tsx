import { notFound } from "next/navigation";
import Link from "next/link";
import { getTeam, TEAMS } from "@/lib/teams";
import { getLeagueAnalytics } from "@/lib/analytics";
import { buildTeamSummaries } from "@/lib/analytics/summary";
import { buildFormSeries, teamGames } from "@/lib/analytics/standings";
import { isFinal } from "@/lib/domain/types";
import TeamBadge from "@/components/TeamBadge";
import TeamFormChart from "@/components/TeamFormChart";
import StatTile from "@/components/StatTile";

export function generateStaticParams() {
  return TEAMS.map((t) => ({ id: t.id }));
}

function signed(value: number, digits = 0) {
  return `${value >= 0 ? "+" : ""}${value.toFixed(digits)}`;
}

export default async function TeamPage(props: PageProps<"/team/[id]">) {
  const { id } = await props.params;
  const team = getTeam(id);
  if (!team) notFound();

  const analytics = await getLeagueAnalytics();
  const summary = buildTeamSummaries(analytics).find((t) => t.id === team.id)!;
  const formSeries = buildFormSeries(analytics.snapshot, team.id);
  const recent = teamGames(analytics.snapshot, team.id).filter(isFinal).slice(-8).reverse();
  const batters = analytics.batters
    .filter((b) => b.teamId === team.id)
    .sort((a, b) => b.wrcPlus - a.wrcPlus)
    .slice(0, 5);
  const pitchers = analytics.pitchers
    .filter((p) => p.teamId === team.id)
    .sort((a, b) => a.fip - b.fip)
    .slice(0, 4);
  const park = analytics.parkFactors.find((p) => p.teamId === team.id)!;

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center gap-4">
        <TeamBadge team={team} size="lg" />
        <div>
          <h1 className="text-2xl font-black tracking-tight">{team.name}</h1>
          <p className="text-sm text-slate-500">
            {team.venue} · 聯盟第 {summary.rank} 名 · {summary.wins}勝{summary.losses}敗
            {summary.ties > 0 ? `${summary.ties}和` : ""} · 勝率 {summary.winPct.toFixed(3)}
          </p>
        </div>
        <Link
          href="/predict"
          className="ml-auto text-sm font-semibold text-indigo-600 hover:underline"
        >
          用這隊做 AI 預測 →
        </Link>
      </div>

      <div className="grid gap-4 grid-cols-2 md:grid-cols-4">
        <StatTile label="季後賽晉級機率" value={`${(summary.playoffOdds * 100).toFixed(1)}%`} />
        <StatTile label="Elo 戰力值" value={summary.elo.toFixed(0)} />
        <StatTile
          label="畢氏期望勝場"
          value={summary.expectedWins.toFixed(1)}
          note={`實際 ${summary.wins} 勝（${signed(summary.luck, 1)}）`}
        />
        <StatTile
          label="得失分差"
          value={signed(summary.runDiff)}
          note={`得 ${summary.runsFor} / 失 ${summary.runsAgainst}`}
        />
      </div>

      <div className="grid gap-4 grid-cols-2 md:grid-cols-4">
        <StatTile label="近10場" value={summary.last10} />
        <StatTile label="連勝/敗" value={summary.streak} />
        <StatTile label="主 / 客場" value={`${summary.homeRecord} / ${summary.awayRecord}`} />
        <StatTile
          label="主場球場係數"
          value={park.index.toFixed(1)}
          note={park.index >= 100 ? "偏打者友善" : "偏投手友善"}
        />
      </div>

      <section className="rounded-xl border border-slate-200 bg-white p-4">
        <h2 className="font-bold mb-1">賽季累積勝率走勢</h2>
        <p className="text-xs text-slate-500 mb-2">虛線為五成基準線；和局不計入勝率</p>
        <TeamFormChart data={formSeries} color={team.color} />
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-xl border border-slate-200 bg-white p-4 overflow-x-auto">
          <h2 className="font-bold mb-1">打者（依 wRC+ 排序）</h2>
          <p className="text-xs text-slate-500 mb-3">
            wRC+ 100 為聯盟平均，已對球場係數校正
          </p>
          <table className="w-full text-sm whitespace-nowrap">
            <thead className="text-slate-400 text-xs">
              <tr>
                <th className="text-left font-medium pb-2">球員</th>
                <th className="text-right font-medium pb-2">打擊率</th>
                <th className="text-right font-medium pb-2">全壘打</th>
                <th className="text-right font-medium pb-2">打點</th>
                <th className="text-right font-medium pb-2">OPS</th>
                <th className="text-right font-medium pb-2">wOBA</th>
                <th className="text-right font-medium pb-2">wRC+</th>
              </tr>
            </thead>
            <tbody>
              {batters.map((b) => (
                <tr key={b.name} className="border-t border-slate-100">
                  <td className="py-1.5 font-medium">{b.name}</td>
                  <td className="py-1.5 text-right tabular-nums">{b.avg.toFixed(3)}</td>
                  <td className="py-1.5 text-right tabular-nums">{b.hr}</td>
                  <td className="py-1.5 text-right tabular-nums">{b.rbi}</td>
                  <td className="py-1.5 text-right tabular-nums">{b.ops.toFixed(3)}</td>
                  <td className="py-1.5 text-right tabular-nums">{b.woba.toFixed(3)}</td>
                  <td className="py-1.5 text-right tabular-nums font-semibold">
                    {b.wrcPlus.toFixed(0)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4 overflow-x-auto">
          <h2 className="font-bold mb-1">投手（依 FIP 排序）</h2>
          <p className="text-xs text-slate-500 mb-3">
            FIP 排除守備影響，比防禦率更能反映投手自身表現
          </p>
          <table className="w-full text-sm whitespace-nowrap">
            <thead className="text-slate-400 text-xs">
              <tr>
                <th className="text-left font-medium pb-2">球員</th>
                <th className="text-right font-medium pb-2">勝-敗</th>
                <th className="text-right font-medium pb-2">局數</th>
                <th className="text-right font-medium pb-2">防禦率</th>
                <th className="text-right font-medium pb-2">FIP</th>
                <th className="text-right font-medium pb-2">WHIP</th>
                <th className="text-right font-medium pb-2">K/9</th>
              </tr>
            </thead>
            <tbody>
              {pitchers.map((p) => (
                <tr key={p.name} className="border-t border-slate-100">
                  <td className="py-1.5 font-medium">{p.name}</td>
                  <td className="py-1.5 text-right tabular-nums">
                    {p.w}-{p.l}
                  </td>
                  <td className="py-1.5 text-right tabular-nums">{p.ip.toFixed(1)}</td>
                  <td className="py-1.5 text-right tabular-nums">{p.era.toFixed(2)}</td>
                  <td className="py-1.5 text-right tabular-nums font-semibold">
                    {p.fip.toFixed(2)}
                  </td>
                  <td className="py-1.5 text-right tabular-nums">{p.whip.toFixed(2)}</td>
                  <td className="py-1.5 text-right tabular-nums">{p.k9.toFixed(1)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-4">
        <h2 className="font-bold mb-3">最近賽事</h2>
        <ul className="divide-y divide-slate-100">
          {recent.map((g) => {
            const isHome = g.homeId === team.id;
            const opp = getTeam(isHome ? g.awayId : g.homeId)!;
            const scored = isHome ? g.homeScore : g.awayScore;
            const allowed = isHome ? g.awayScore : g.homeScore;
            const outcome = scored === allowed ? "和" : scored > allowed ? "勝" : "敗";
            const tone =
              outcome === "勝"
                ? "text-emerald-600"
                : outcome === "敗"
                  ? "text-rose-600"
                  : "text-slate-400";
            return (
              <li key={g.id} className="flex items-center gap-3 py-2 text-sm">
                <span className="w-[4.5rem] shrink-0 text-xs text-slate-400">{g.date}</span>
                <span className={`w-6 shrink-0 text-center text-xs font-bold ${tone}`}>
                  {outcome}
                </span>
                <span className="text-slate-500">{isHome ? "主" : "客"}</span>
                <TeamBadge team={opp} size="sm" />
                <span className="font-medium">{opp.name}</span>
                <span className="ml-auto tabular-nums font-semibold">
                  {scored} – {allowed}
                </span>
              </li>
            );
          })}
        </ul>
      </section>
    </div>
  );
}
