"use client";

import { useMemo, useState } from "react";
import { TeamSummary, HeadToHeadEntry, lookupHeadToHead } from "@/lib/analytics/summary";
import { TeamId } from "@/lib/domain/types";
import { predictMatchup } from "@/lib/predict";
import { getTeam } from "@/lib/teams";
import TeamBadge from "./TeamBadge";

interface CommentaryState {
  status: "idle" | "loading" | "done" | "error";
  source?: "ai" | "template";
  headline?: string;
  paragraphs?: string[];
  message?: string;
}

export default function PredictClient({
  teams,
  headToHead,
}: {
  teams: TeamSummary[];
  headToHead: HeadToHeadEntry[];
}) {
  const [homeId, setHomeId] = useState<TeamId>(teams[0].id);
  const [awayId, setAwayId] = useState<TeamId>(teams[1].id);
  const [commentary, setCommentary] = useState<CommentaryState>({ status: "idle" });

  const home = teams.find((t) => t.id === homeId)!;
  const away = teams.find((t) => t.id === awayId)!;
  const sameTeam = homeId === awayId;

  const prediction = useMemo(() => {
    if (sameTeam) return null;
    return predictMatchup(home, away, lookupHeadToHead(headToHead, homeId, awayId));
  }, [home, away, headToHead, homeId, awayId, sameTeam]);

  function changeMatchup(next: { home?: TeamId; away?: TeamId }) {
    if (next.home) setHomeId(next.home);
    if (next.away) setAwayId(next.away);
    setCommentary({ status: "idle" });
  }

  async function generateCommentary() {
    setCommentary({ status: "loading" });
    try {
      const res = await fetch("/api/commentary", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ homeId, awayId }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setCommentary({
        status: "done",
        source: data.source,
        headline: data.headline,
        paragraphs: data.paragraphs,
      });
    } catch (error) {
      setCommentary({
        status: "error",
        message: error instanceof Error ? error.message : "未知錯誤",
      });
    }
  }

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-slate-200 bg-white p-5">
        <div className="grid gap-4 sm:grid-cols-2">
          <TeamSelect
            label="主隊"
            value={homeId}
            teams={teams}
            onChange={(id) => changeMatchup({ home: id })}
          />
          <TeamSelect
            label="客隊"
            value={awayId}
            teams={teams}
            onChange={(id) => changeMatchup({ away: id })}
          />
        </div>

        {sameTeam ? (
          <p className="mt-6 text-sm text-rose-600">請選擇兩支不同的球隊。</p>
        ) : (
          prediction && (
            <div className="mt-6 space-y-5">
              <div className="flex items-center justify-center gap-8">
                <TeamOdds team={home} pct={prediction.homeWinPct} role="主場" />
                <span className="text-xs font-medium text-slate-400">VS</span>
                <TeamOdds team={away} pct={prediction.awayWinPct} role="客場" />
              </div>

              <div className="flex h-3 w-full overflow-hidden rounded-full bg-slate-100">
                <div
                  className="h-full"
                  style={{ width: `${prediction.homeWinPct * 100}%`, backgroundColor: home.color }}
                />
                <div className="w-0.5 shrink-0 bg-white" />
                <div
                  className="h-full flex-1"
                  style={{ backgroundColor: away.color }}
                />
              </div>

              <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                <h3 className="text-sm font-bold mb-2">模型依據</h3>
                <ul className="space-y-1 text-sm text-slate-600">
                  {prediction.commentary.map((line, i) => (
                    <li key={i}>{line}</li>
                  ))}
                </ul>
              </div>
            </div>
          )
        )}
      </div>

      {!sameTeam && (
        <div className="rounded-xl border border-indigo-200 bg-indigo-50 p-5">
          <div className="flex flex-wrap items-center gap-3">
            <span className="rounded-full bg-indigo-600 px-2 py-0.5 text-xs font-bold text-white">
              AI 球評
            </span>
            {commentary.status === "done" && (
              <span className="text-xs text-slate-500">
                {commentary.source === "ai" ? "由 Claude 生成" : "離線模板（AI 不可用）"}
              </span>
            )}
            <button
              onClick={generateCommentary}
              disabled={commentary.status === "loading"}
              className="ml-auto rounded-full bg-indigo-600 px-4 py-1.5 text-sm font-semibold text-white transition-colors hover:bg-indigo-700 disabled:opacity-50"
            >
              {commentary.status === "loading" ? "生成中…" : "生成賽前分析"}
            </button>
          </div>

          {commentary.status === "idle" && (
            <p className="mt-3 text-sm text-slate-600">
              按下按鈕，將雙方戰績、Elo、近況、對戰紀錄、畢氏期望勝與球場係數交給 Claude，生成一段賽前分析。
            </p>
          )}
          {commentary.status === "error" && (
            <p className="mt-3 text-sm text-rose-600">生成失敗：{commentary.message}</p>
          )}
          {commentary.status === "done" &&
            (commentary.source === "template" ? (
              <p className="mt-3 text-sm leading-relaxed text-slate-600">
                目前無法取得 Claude 生成的球評（伺服器未設定 ANTHROPIC_API_KEY）。
                上方「模型依據」已列出這場比賽的完整數據分析。
              </p>
            ) : (
              <div className="mt-3 space-y-2">
                {commentary.headline && (
                  <p className="font-bold text-slate-900">{commentary.headline}</p>
                )}
                {commentary.paragraphs?.map((p, i) => (
                  <p key={i} className="text-sm leading-relaxed text-slate-700">
                    {p}
                  </p>
                ))}
              </div>
            ))}
        </div>
      )}
    </div>
  );
}

function TeamSelect({
  label,
  value,
  teams,
  onChange,
}: {
  label: string;
  value: TeamId;
  teams: TeamSummary[];
  onChange: (id: TeamId) => void;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-medium text-slate-500">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value as TeamId)}
        className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium focus:border-indigo-400 focus:outline-none"
      >
        {teams.map((t) => (
          <option key={t.id} value={t.id}>
            {t.name}
          </option>
        ))}
      </select>
    </label>
  );
}

function TeamOdds({ team, pct, role }: { team: TeamSummary; pct: number; role: string }) {
  const meta = getTeam(team.id)!;
  return (
    <div className="flex flex-col items-center gap-1.5">
      <TeamBadge team={meta} size="lg" />
      <span className="text-sm font-semibold text-slate-900">{team.short}</span>
      <span className="text-xs text-slate-400">{role}</span>
      <span className="text-2xl font-black tabular-nums text-slate-900">
        {(pct * 100).toFixed(1)}%
      </span>
    </div>
  );
}
