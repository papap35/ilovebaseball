import { getLeagueAnalytics } from "@/lib/analytics";
import { buildHeadToHead, buildTeamSummaries } from "@/lib/analytics/summary";
import PredictClient from "@/components/PredictClient";

export default async function PredictPage() {
  const analytics = await getLeagueAnalytics();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black tracking-tight mb-1">AI 賽事預測</h1>
        <p className="text-sm text-slate-500">
          勝率由 Elo 戰力值加上主場優勢推算，賽前分析則交給 Claude 依實際數據撰寫。
        </p>
      </div>
      <PredictClient
        teams={buildTeamSummaries(analytics)}
        headToHead={buildHeadToHead(analytics)}
      />
    </div>
  );
}
