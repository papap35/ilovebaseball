import Link from "next/link";
import { getLeagueAnalytics } from "@/lib/analytics";
import { buildTeamSummaries } from "@/lib/analytics/summary";
import { TeamRecord } from "@/lib/analytics/standings";
import { isFinal } from "@/lib/domain/types";
import { TEAMS_IN_CHART_ORDER, getTeam } from "@/lib/teams";
import StandingsTable from "@/components/StandingsTable";
import RunDiffChart from "@/components/RunDiffChart";
import EloTrendChart from "@/components/EloTrendChart";
import PlayoffOddsChart from "@/components/PlayoffOddsChart";
import ParkFactorChart from "@/components/ParkFactorChart";
import TeamBadge from "@/components/TeamBadge";

function HalfStandings({ title, note, records }: { title: string; note: string; records: TeamRecord[] }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <h3 className="font-bold">{title}</h3>
      <p className="text-xs text-slate-500 mb-3">{note}</p>
      <ol className="space-y-1.5">
        {records.map((r, i) => {
          const team = getTeam(r.id)!;
          return (
            <li key={r.id} className="flex items-center gap-2 text-sm">
              <span className={`w-4 text-xs ${i === 0 ? "font-bold text-amber-600" : "text-slate-400"}`}>
                {i + 1}
              </span>
              <TeamBadge team={team} size="sm" />
              <span className={i === 0 ? "font-semibold" : ""}>{team.short}</span>
              <span className="ml-auto tabular-nums text-slate-500">
                {r.wins}勝{r.losses}敗{r.ties > 0 ? `${r.ties}和` : ""}
              </span>
              <span className="w-12 text-right tabular-nums font-medium">{r.winPct.toFixed(3)}</span>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

export default async function DashboardPage() {
  const analytics = await getLeagueAnalytics();
  const teams = buildTeamSummaries(analytics);
  const latestGames = analytics.snapshot.games.filter(isFinal).slice(-3).reverse();

  const firstHalfChampion = getTeam(analytics.firstHalf[0].id)!;
  const secondHalfLeader = getTeam(analytics.secondHalf[0].id)!;

  return (
    <div className="space-y-8">
      <section>
        <h1 className="text-2xl font-black tracking-tight mb-1">
          {analytics.snapshot.year} 中職例行賽戰績
        </h1>
        <p className="text-sm text-slate-500 mb-4">
          資料截至 {analytics.snapshot.asOf} · 排名、勝差、Elo 戰力值、畢氏運氣值與季後賽晉級機率
        </p>
        <StandingsTable teams={teams} />
        <p className="mt-2 text-xs text-slate-400">
          「運氣」為實際勝場減去得失分推算的畢氏期望勝場，正值代表贏得比得失分該有的多。
        </p>
      </section>

      <section className="grid gap-6 md:grid-cols-2">
        <HalfStandings
          title="上半季"
          note={`已結束 · ${firstHalfChampion.short}封王，取得季後賽門票`}
          records={analytics.firstHalf}
        />
        <HalfStandings
          title="下半季"
          note={`進行中 · 目前由${secondHalfLeader.short}領先`}
          records={analytics.secondHalf}
        />
      </section>

      <section className="grid gap-6 md:grid-cols-2">
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <h2 className="font-bold mb-1">季後賽晉級機率</h2>
          <p className="text-xs text-slate-500 mb-2">
            依現行 Elo 模擬剩餘賽程一萬次，按中職上下半季賽制判定晉級
          </p>
          <PlayoffOddsChart teams={teams} />
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <h2 className="font-bold mb-1">球場係數</h2>
          <p className="text-xs text-slate-500 mb-2">
            100 為中性，高於 100 代表該球場較有利打者（已對樣本數回歸修正）
          </p>
          <ParkFactorChart parks={analytics.parkFactors} />
        </div>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-4">
        <h2 className="font-bold mb-1">戰力 Elo 走勢</h2>
        <p className="text-xs text-slate-500 mb-2">
          僅依比賽結果動態更新的戰力評等，和局計 0.5 勝
        </p>
        <EloTrendChart data={analytics.eloSeries} teams={TEAMS_IN_CHART_ORDER} />
      </section>

      <section className="grid gap-6 md:grid-cols-2">
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <h2 className="font-bold mb-1">得失分差</h2>
          <p className="text-xs text-slate-500 mb-2">得分減失分，比勝率更早反映球隊真實強弱</p>
          <RunDiffChart teams={teams} />
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <h2 className="font-bold mb-1">最新戰果</h2>
          <p className="text-xs text-slate-500 mb-3">最近 3 場比賽</p>
          <ul className="space-y-2">
            {latestGames.map((g) => {
              const home = getTeam(g.homeId)!;
              const away = getTeam(g.awayId)!;
              const tie = g.homeScore === g.awayScore;
              return (
                <li
                  key={g.id}
                  className="flex items-center gap-2 rounded-lg bg-slate-50 px-3 py-2 text-sm"
                >
                  <span className="text-xs text-slate-400 w-[4.5rem] shrink-0">{g.date}</span>
                  <div className="flex flex-1 items-center justify-center gap-2.5">
                    <span className="flex items-center gap-1.5">
                      <TeamBadge team={away} size="sm" />
                      <span
                        className={
                          !tie && g.awayScore > g.homeScore ? "font-bold" : "text-slate-500"
                        }
                      >
                        {g.awayScore}
                      </span>
                    </span>
                    <span className="text-slate-300">–</span>
                    <span className="flex items-center gap-1.5">
                      <span
                        className={
                          !tie && g.homeScore > g.awayScore ? "font-bold" : "text-slate-500"
                        }
                      >
                        {g.homeScore}
                      </span>
                      <TeamBadge team={home} size="sm" />
                    </span>
                  </div>
                  {tie && <span className="text-xs text-slate-400">和局</span>}
                </li>
              );
            })}
          </ul>
        </div>
      </section>

      <section className="rounded-xl border border-indigo-200 bg-indigo-50 p-5">
        <span className="rounded-full bg-indigo-600 px-2 py-0.5 text-xs font-bold text-white">
          AI 球評
        </span>
        <h2 className="font-bold mt-2 mb-1">想知道今天這場誰會贏？</h2>
        <p className="text-sm text-slate-700 leading-relaxed">
          選定任意對戰組合，系統會結合戰績、Elo、近況、對戰紀錄、畢氏期望勝與球場係數，
          交給 Claude 生成一段賽前分析。
        </p>
        <Link
          href="/predict"
          className="mt-3 inline-block text-sm font-semibold text-indigo-700 hover:underline"
        >
          前往 AI 賽事預測 →
        </Link>
      </section>
    </div>
  );
}
