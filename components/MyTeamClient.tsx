"use client";

import { useSyncExternalStore } from "react";
import Link from "next/link";
import { TeamSummary } from "@/lib/analytics/summary";
import { FormPoint } from "@/lib/analytics/standings";
import { Game, TeamId } from "@/lib/domain/types";
import { getTeam } from "@/lib/teams";
import TeamBadge from "./TeamBadge";
import TeamFormChart from "./TeamFormChart";
import StatTile from "./StatTile";

const STORAGE_KEY = "ilovebaseball:favorite-team";
const DEFAULT_TEAM: TeamId = "brothers";

const listeners = new Set<() => void>();

function subscribe(callback: () => void) {
  listeners.add(callback);
  return () => listeners.delete(callback);
}

function readFavorite(): string {
  try {
    return window.localStorage.getItem(STORAGE_KEY) ?? DEFAULT_TEAM;
  } catch {
    return DEFAULT_TEAM;
  }
}

function readFavoriteServer(): string {
  return DEFAULT_TEAM;
}

function writeFavorite(id: TeamId) {
  try {
    window.localStorage.setItem(STORAGE_KEY, id);
  } catch {
    // localStorage unavailable (private mode) - the click still works for this session
  }
  listeners.forEach((listener) => listener());
}

function signed(value: number, digits = 0) {
  return `${value >= 0 ? "+" : ""}${value.toFixed(digits)}`;
}

export default function MyTeamClient({
  teams,
  formSeries,
  recentGames,
  nextGames,
}: {
  teams: TeamSummary[];
  formSeries: Record<string, FormPoint[]>;
  recentGames: Record<string, Game[]>;
  nextGames: Record<string, Game | null>;
}) {
  // useSyncExternalStore renders the server value during hydration and swaps to
  // the stored preference immediately afterwards - no effect, no hydration mismatch.
  const storedId = useSyncExternalStore(subscribe, readFavorite, readFavoriteServer);
  const favorite = teams.find((t) => t.id === storedId) ?? teams.find((t) => t.id === DEFAULT_TEAM)!;
  const meta = getTeam(favorite.id)!;
  const nextGame = nextGames[favorite.id];
  const nextOpponent = nextGame
    ? getTeam(nextGame.homeId === favorite.id ? nextGame.awayId : nextGame.homeId)
    : null;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-black tracking-tight mb-1">我的球隊</h1>
        <p className="text-sm text-slate-500">選擇你支持的球隊，戰績與晉級機率只看這一隊。</p>
      </div>

      <div className="flex flex-wrap gap-2">
        {teams.map((t) => {
          const teamMeta = getTeam(t.id)!;
          const active = t.id === favorite.id;
          return (
            <button
              key={t.id}
              onClick={() => writeFavorite(t.id)}
              aria-pressed={active}
              className={`flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm font-medium transition-colors ${
                active
                  ? "border-slate-900 bg-slate-900 text-white"
                  : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
              }`}
            >
              <TeamBadge team={teamMeta} size="sm" />
              {t.name}
            </button>
          );
        })}
      </div>

      <section className="rounded-2xl p-6 text-white" style={{ backgroundColor: meta.color }}>
        <div className="flex flex-wrap items-center gap-4">
          <TeamBadge team={meta} size="lg" />
          <div>
            <div className="text-xs tracking-wide opacity-80">我的主隊</div>
            <div className="text-2xl font-black">{favorite.name}</div>
          </div>
          <div className="ml-auto text-right">
            <div className="text-3xl font-black tabular-nums">
              {favorite.wins}
              <span className="text-lg font-medium opacity-80">勝</span>
              {favorite.losses}
              <span className="text-lg font-medium opacity-80">敗</span>
              {favorite.ties > 0 && (
                <>
                  {favorite.ties}
                  <span className="text-lg font-medium opacity-80">和</span>
                </>
              )}
            </div>
            <div className="text-sm opacity-90">
              聯盟第 {favorite.rank} 名 · 勝率 {favorite.winPct.toFixed(3)}
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-4 grid-cols-2 md:grid-cols-4">
        <StatTile
          label="季後賽晉級機率"
          value={`${(favorite.playoffOdds * 100).toFixed(1)}%`}
          note={
            favorite.playoffOdds >= 0.999
              ? "已確定晉級"
              : `下半季封王機率 ${(favorite.secondHalfCrown * 100).toFixed(1)}%`
          }
        />
        <StatTile label="近10場" value={favorite.last10} note={`連續 ${favorite.streak}`} />
        <StatTile
          label="得失分差"
          value={signed(favorite.runDiff)}
          note={`畢氏期望 ${favorite.expectedWins.toFixed(1)} 勝`}
        />
        <StatTile
          label="下一場"
          value={nextOpponent ? `對 ${nextOpponent.short}` : "賽季已結束"}
          note={nextGame ? `${nextGame.date}・${nextGame.homeId === favorite.id ? "主場" : "客場"}` : undefined}
        />
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-4">
        <h2 className="font-bold mb-2">賽季勝率走勢</h2>
        <TeamFormChart data={formSeries[favorite.id] ?? []} color={meta.color} />
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-4">
        <h2 className="font-bold mb-3">最近戰績</h2>
        <ul className="divide-y divide-slate-100">
          {(recentGames[favorite.id] ?? []).map((g) => {
            const isHome = g.homeId === favorite.id;
            const opp = getTeam(isHome ? g.awayId : g.homeId)!;
            const scored = (isHome ? g.homeScore : g.awayScore) ?? 0;
            const allowed = (isHome ? g.awayScore : g.homeScore) ?? 0;
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
                <span>{opp.name}</span>
                <span className="ml-auto tabular-nums font-semibold">
                  {scored} – {allowed}
                </span>
              </li>
            );
          })}
        </ul>
        <Link
          href={`/team/${favorite.id}`}
          className="mt-3 inline-block text-sm font-semibold text-indigo-600 hover:underline"
        >
          查看完整球隊數據 →
        </Link>
      </section>
    </div>
  );
}
