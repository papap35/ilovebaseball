import { SeasonSnapshot, TeamId } from "../domain/types";
import { getDataSource, SEASON_YEAR } from "../sources";
import { buildElo, EloPoint } from "./elo";
import { buildStandings, TeamRecord } from "./standings";
import {
  BatterStats,
  LeagueConstants,
  ParkFactor,
  PitcherStats,
  PythagoreanRecord,
  computeBatterStats,
  computeLeagueConstants,
  computeParkFactors,
  computePitcherStats,
  computePythagorean,
} from "./advanced";
import { PlayoffOdds, simulatePlayoffOdds } from "./playoff";

export interface LeagueAnalytics {
  snapshot: SeasonSnapshot;
  standings: TeamRecord[];
  firstHalf: TeamRecord[];
  secondHalf: TeamRecord[];
  eloRatings: Map<TeamId, number>;
  eloSeries: EloPoint[];
  pythagorean: PythagoreanRecord[];
  parkFactors: ParkFactor[];
  playoffOdds: PlayoffOdds[];
  league: LeagueConstants;
  batters: BatterStats[];
  pitchers: PitcherStats[];
}

function build(snapshot: SeasonSnapshot): LeagueAnalytics {
  const standings = buildStandings(snapshot);
  const { ratings, series } = buildElo(snapshot);
  const parkFactors = computeParkFactors(snapshot);
  const league = computeLeagueConstants(snapshot);
  const parkFactorByTeam = new Map(parkFactors.map((p) => [p.teamId, p.index]));

  return {
    snapshot,
    standings,
    firstHalf: buildStandings(snapshot, { half: 1 }),
    secondHalf: buildStandings(snapshot, { half: 2 }),
    eloRatings: ratings,
    eloSeries: series,
    pythagorean: computePythagorean(standings),
    parkFactors,
    playoffOdds: simulatePlayoffOdds(snapshot, ratings),
    league,
    batters: computeBatterStats(snapshot.batting, league, parkFactorByTeam),
    pitchers: computePitcherStats(snapshot.pitching, league),
  };
}

let cached: Promise<LeagueAnalytics> | null = null;

export function getLeagueAnalytics(): Promise<LeagueAnalytics> {
  if (!cached) {
    cached = getDataSource().loadSeason(SEASON_YEAR).then(build);
  }
  return cached;
}

export function findRecord(analytics: LeagueAnalytics, teamId: TeamId): TeamRecord {
  return analytics.standings.find((s) => s.id === teamId)!;
}

export function findPythagorean(
  analytics: LeagueAnalytics,
  teamId: TeamId
): PythagoreanRecord {
  return analytics.pythagorean.find((p) => p.id === teamId)!;
}

export function findPlayoffOdds(analytics: LeagueAnalytics, teamId: TeamId): PlayoffOdds {
  return analytics.playoffOdds.find((p) => p.id === teamId)!;
}

export function leagueRank(analytics: LeagueAnalytics, teamId: TeamId): number {
  return analytics.standings.findIndex((s) => s.id === teamId) + 1;
}

export type { TeamRecord, EloPoint, PythagoreanRecord, ParkFactor, PlayoffOdds, BatterStats, PitcherStats };
