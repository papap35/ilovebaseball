import { getLeagueAnalytics } from "@/lib/analytics";
import {
  buildRecentGamesByTeam,
  buildTeamSummaries,
  nextGameByTeam,
} from "@/lib/analytics/summary";
import { buildFormSeries, FormPoint } from "@/lib/analytics/standings";
import MyTeamClient from "@/components/MyTeamClient";

export default async function MyTeamPage() {
  const analytics = await getLeagueAnalytics();

  const formSeries: Record<string, FormPoint[]> = {};
  for (const team of analytics.snapshot.teams) {
    formSeries[team.id] = buildFormSeries(analytics.snapshot, team.id);
  }

  return (
    <MyTeamClient
      teams={buildTeamSummaries(analytics)}
      formSeries={formSeries}
      recentGames={buildRecentGamesByTeam(analytics, 5)}
      nextGames={nextGameByTeam(analytics)}
    />
  );
}
