import { Game, TeamId } from "../domain/types";
import { getTeam } from "../teams";
import { LeagueAnalytics } from "./index";
import { headToHead, teamGames } from "./standings";

/**
 * Plain serialisable view of a team, safe to hand to client components. Server
 * components hold the full analytics; the browser only ever receives this.
 */
export interface TeamSummary {
  id: TeamId;
  name: string;
  short: string;
  color: string;
  venue: string;
  rank: number;
  wins: number;
  losses: number;
  ties: number;
  winPct: number;
  gamesBack: number;
  runsFor: number;
  runsAgainst: number;
  runDiff: number;
  streak: string;
  last10: string;
  homeRecord: string;
  awayRecord: string;
  elo: number;
  expectedWins: number;
  luck: number;
  playoffOdds: number;
  secondHalfCrown: number;
  parkFactor: number;
}

export interface HeadToHeadEntry {
  a: TeamId;
  b: TeamId;
  aWins: number;
  bWins: number;
  ties: number;
}

export function buildTeamSummaries(analytics: LeagueAnalytics): TeamSummary[] {
  const parkByTeam = new Map(analytics.parkFactors.map((p) => [p.teamId, p.index]));

  return analytics.standings.map((record, index) => {
    const team = getTeam(record.id)!;
    const pyth = analytics.pythagorean.find((p) => p.id === record.id)!;
    const odds = analytics.playoffOdds.find((p) => p.id === record.id)!;
    return {
      id: record.id,
      name: team.name,
      short: team.short,
      color: team.color,
      venue: team.venue,
      rank: index + 1,
      wins: record.wins,
      losses: record.losses,
      ties: record.ties,
      winPct: record.winPct,
      gamesBack: record.gamesBack,
      runsFor: record.runsFor,
      runsAgainst: record.runsAgainst,
      runDiff: record.runDiff,
      streak: record.streak,
      last10: record.last10,
      homeRecord: record.homeRecord,
      awayRecord: record.awayRecord,
      elo: analytics.eloRatings.get(record.id)!,
      expectedWins: pyth.expectedWins,
      luck: pyth.luck,
      playoffOdds: odds.playoff,
      secondHalfCrown: odds.secondHalfCrown,
      parkFactor: parkByTeam.get(record.id) ?? 100,
    };
  });
}

export function buildHeadToHead(analytics: LeagueAnalytics): HeadToHeadEntry[] {
  const ids = analytics.snapshot.teams.map((t) => t.id);
  const entries: HeadToHeadEntry[] = [];
  for (let i = 0; i < ids.length; i++) {
    for (let j = i + 1; j < ids.length; j++) {
      const h2h = headToHead(analytics.snapshot, ids[i], ids[j]);
      entries.push({ a: ids[i], b: ids[j], aWins: h2h.aWins, bWins: h2h.bWins, ties: h2h.ties });
    }
  }
  return entries;
}

export function lookupHeadToHead(
  entries: HeadToHeadEntry[],
  a: TeamId,
  b: TeamId
): { aWins: number; bWins: number; ties: number; total: number } {
  const direct = entries.find((e) => e.a === a && e.b === b);
  if (direct) {
    return {
      aWins: direct.aWins,
      bWins: direct.bWins,
      ties: direct.ties,
      total: direct.aWins + direct.bWins + direct.ties,
    };
  }
  const flipped = entries.find((e) => e.a === b && e.b === a);
  if (flipped) {
    return {
      aWins: flipped.bWins,
      bWins: flipped.aWins,
      ties: flipped.ties,
      total: flipped.aWins + flipped.bWins + flipped.ties,
    };
  }
  return { aWins: 0, bWins: 0, ties: 0, total: 0 };
}

/** Most recent finished games for every team, for client-side team switching. */
export function buildRecentGamesByTeam(
  analytics: LeagueAnalytics,
  count: number
): Record<string, Game[]> {
  const result: Record<string, Game[]> = {};
  for (const team of analytics.snapshot.teams) {
    const played = teamGames(analytics.snapshot, team.id).filter(
      (g) => g.homeScore !== null
    );
    result[team.id] = played.slice(-count).reverse();
  }
  return result;
}

export function nextGameByTeam(analytics: LeagueAnalytics): Record<string, Game | null> {
  const result: Record<string, Game | null> = {};
  for (const team of analytics.snapshot.teams) {
    const upcoming = teamGames(analytics.snapshot, team.id).find(
      (g) => g.homeScore === null
    );
    result[team.id] = upcoming ?? null;
  }
  return result;
}
