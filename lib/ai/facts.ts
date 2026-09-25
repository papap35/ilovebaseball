import { LeagueAnalytics } from "../analytics";
import { TeamSummary, lookupHeadToHead, HeadToHeadEntry } from "../analytics/summary";
import { TeamId } from "../domain/types";
import { winProbability } from "../analytics/elo";

/**
 * The exact set of numbers the model is allowed to talk about. Anything not in
 * here is something it would have to invent, which the system prompt forbids.
 */
export interface MatchupFacts {
  asOf: string;
  venue: string;
  parkFactor: number;
  modelHomeWinPct: number;
  home: TeamFacts;
  away: TeamFacts;
  headToHead: { homeWins: number; awayWins: number; ties: number; total: number };
}

export interface TeamFacts {
  name: string;
  short: string;
  rank: number;
  wins: number;
  losses: number;
  ties: number;
  winPct: number;
  gamesBack: number;
  elo: number;
  last10: string;
  streak: string;
  runsFor: number;
  runsAgainst: number;
  runDiff: number;
  expectedWins: number;
  luck: number;
  playoffOdds: number;
  secondHalfCrown: number;
  homeRecord: string;
  awayRecord: string;
  topBatters: { name: string; avg: number; hr: number; rbi: number; ops: number; wrcPlus: number }[];
  topPitchers: { name: string; era: number; fip: number; whip: number; k9: number }[];
}

function teamFacts(
  analytics: LeagueAnalytics,
  summary: TeamSummary
): TeamFacts {
  const batters = analytics.batters
    .filter((b) => b.teamId === summary.id)
    .sort((a, b) => b.wrcPlus - a.wrcPlus)
    .slice(0, 3)
    .map((b) => ({
      name: b.name,
      avg: round(b.avg, 3),
      hr: b.hr,
      rbi: b.rbi,
      ops: round(b.ops, 3),
      wrcPlus: Math.round(b.wrcPlus),
    }));

  const pitchers = analytics.pitchers
    .filter((p) => p.teamId === summary.id)
    .sort((a, b) => a.fip - b.fip)
    .slice(0, 2)
    .map((p) => ({
      name: p.name,
      era: round(p.era, 2),
      fip: round(p.fip, 2),
      whip: round(p.whip, 2),
      k9: round(p.k9, 1),
    }));

  return {
    name: summary.name,
    short: summary.short,
    rank: summary.rank,
    wins: summary.wins,
    losses: summary.losses,
    ties: summary.ties,
    winPct: round(summary.winPct, 3),
    gamesBack: round(summary.gamesBack, 1),
    elo: Math.round(summary.elo),
    last10: summary.last10,
    streak: summary.streak,
    runsFor: summary.runsFor,
    runsAgainst: summary.runsAgainst,
    runDiff: summary.runDiff,
    expectedWins: round(summary.expectedWins, 1),
    luck: round(summary.luck, 1),
    playoffOdds: round(summary.playoffOdds * 100, 1),
    secondHalfCrown: round(summary.secondHalfCrown * 100, 1),
    homeRecord: summary.homeRecord,
    awayRecord: summary.awayRecord,
    topBatters: batters,
    topPitchers: pitchers,
  };
}

function round(value: number, digits: number): number {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

export function buildMatchupFacts(
  analytics: LeagueAnalytics,
  summaries: TeamSummary[],
  headToHead: HeadToHeadEntry[],
  homeId: TeamId,
  awayId: TeamId
): MatchupFacts {
  const home = summaries.find((t) => t.id === homeId)!;
  const away = summaries.find((t) => t.id === awayId)!;
  const h2h = lookupHeadToHead(headToHead, homeId, awayId);

  return {
    asOf: analytics.snapshot.asOf,
    venue: home.venue,
    parkFactor: home.parkFactor,
    modelHomeWinPct: round(winProbability(home.elo, away.elo) * 100, 1),
    home: teamFacts(analytics, home),
    away: teamFacts(analytics, away),
    headToHead: {
      homeWins: h2h.aWins,
      awayWins: h2h.bWins,
      ties: h2h.ties,
      total: h2h.total,
    },
  };
}
