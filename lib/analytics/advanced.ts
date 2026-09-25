import { BattingLine, PitchingLine, SeasonSnapshot, TeamId, isFinal } from "../domain/types";
import { TeamRecord, winPct } from "./standings";

/**
 * Linear weights for wOBA. Real weights are recalculated per league-season; these
 * are close enough for a league of this run environment and are applied uniformly,
 * so the league-relative numbers (wRC+) stay meaningful.
 */
const WOBA_WEIGHTS = { bb: 0.69, hbp: 0.72, single: 0.89, double: 1.27, triple: 1.62, hr: 2.1 };
const WOBA_SCALE = 1.15;
const PYTHAGOREAN_EXPONENT = 1.83;
/** One season of park data is a small sample, so regress halfway to neutral. */
const PARK_REGRESSION = 0.5;

export interface PythagoreanRecord {
  id: TeamId;
  expectedWinPct: number;
  expectedWins: number;
  actualWins: number;
  /** actual wins minus expected wins - positive means outperforming run differential */
  luck: number;
}

export interface ParkFactor {
  venue: string;
  teamId: TeamId;
  /** 100 is neutral; above 100 favours hitters */
  index: number;
  homeRunsPerGame: number;
  awayRunsPerGame: number;
  games: number;
}

export interface BatterStats extends BattingLine {
  avg: number;
  obp: number;
  slg: number;
  ops: number;
  woba: number;
  wrcPlus: number;
}

export interface PitcherStats extends PitchingLine {
  era: number;
  whip: number;
  fip: number;
  k9: number;
}

export interface LeagueConstants {
  wobaLeague: number;
  runsPerPa: number;
  cFip: number;
  eraLeague: number;
}

function singles(line: BattingLine): number {
  return Math.max(0, line.h - line.doubles - line.triples - line.hr);
}

function wobaNumerator(line: BattingLine): number {
  return (
    WOBA_WEIGHTS.bb * line.bb +
    WOBA_WEIGHTS.hbp * line.hbp +
    WOBA_WEIGHTS.single * singles(line) +
    WOBA_WEIGHTS.double * line.doubles +
    WOBA_WEIGHTS.triple * line.triples +
    WOBA_WEIGHTS.hr * line.hr
  );
}

function wobaDenominator(line: BattingLine): number {
  return line.ab + line.bb + line.sf + line.hbp;
}

export function computeLeagueConstants(snapshot: SeasonSnapshot): LeagueConstants {
  let num = 0;
  let den = 0;
  let pa = 0;
  for (const line of snapshot.batting) {
    num += wobaNumerator(line);
    den += wobaDenominator(line);
    pa += line.pa;
  }

  let runs = 0;
  for (const game of snapshot.games) {
    if (!isFinal(game)) continue;
    runs += game.homeScore + game.awayScore;
  }

  let hr = 0;
  let bb = 0;
  let hbp = 0;
  let so = 0;
  let ip = 0;
  let er = 0;
  for (const line of snapshot.pitching) {
    hr += line.hr;
    bb += line.bb;
    hbp += line.hbp;
    so += line.so;
    ip += line.ip;
    er += line.er;
  }

  const eraLeague = ip > 0 ? (9 * er) / ip : 0;
  const cFip = ip > 0 ? eraLeague - (13 * hr + 3 * (bb + hbp) - 2 * so) / ip : 0;

  return {
    wobaLeague: den > 0 ? num / den : 0,
    runsPerPa: pa > 0 ? runs / pa : 0,
    cFip,
    eraLeague,
  };
}

export function computeParkFactors(snapshot: SeasonSnapshot): ParkFactor[] {
  const home = new Map<TeamId, { runs: number; games: number }>();
  const away = new Map<TeamId, { runs: number; games: number }>();
  for (const team of snapshot.teams) {
    home.set(team.id, { runs: 0, games: 0 });
    away.set(team.id, { runs: 0, games: 0 });
  }

  for (const game of snapshot.games) {
    if (!isFinal(game)) continue;
    const total = game.homeScore + game.awayScore;
    const h = home.get(game.homeId)!;
    h.runs += total;
    h.games++;
    const a = away.get(game.awayId)!;
    a.runs += total;
    a.games++;
  }

  return snapshot.teams.map((team) => {
    const h = home.get(team.id)!;
    const a = away.get(team.id)!;
    const homeRpg = h.games > 0 ? h.runs / h.games : 0;
    const awayRpg = a.games > 0 ? a.runs / a.games : 0;
    const raw = awayRpg > 0 ? homeRpg / awayRpg : 1;
    const regressed = 1 + (raw - 1) * PARK_REGRESSION;
    return {
      venue: team.venue,
      teamId: team.id,
      index: Math.round(regressed * 1000) / 10,
      homeRunsPerGame: Math.round(homeRpg * 100) / 100,
      awayRunsPerGame: Math.round(awayRpg * 100) / 100,
      games: h.games,
    };
  });
}

export function computePythagorean(records: TeamRecord[]): PythagoreanRecord[] {
  return records.map((r) => {
    const rf = r.runsFor ** PYTHAGOREAN_EXPONENT;
    const ra = r.runsAgainst ** PYTHAGOREAN_EXPONENT;
    const expectedWinPct = rf + ra === 0 ? 0 : rf / (rf + ra);
    const decided = r.wins + r.losses;
    const expectedWins = expectedWinPct * decided;
    return {
      id: r.id,
      expectedWinPct,
      expectedWins,
      actualWins: r.wins,
      luck: r.wins - expectedWins,
    };
  });
}

export function computeBatterStats(
  lines: BattingLine[],
  league: LeagueConstants,
  parkFactorByTeam: Map<TeamId, number>
): BatterStats[] {
  return lines.map((line) => {
    const tb = singles(line) + 2 * line.doubles + 3 * line.triples + 4 * line.hr;
    const obpDen = line.ab + line.bb + line.hbp + line.sf;
    const woba = wobaDenominator(line) > 0 ? wobaNumerator(line) / wobaDenominator(line) : 0;
    const wraaPerPa = (woba - league.wobaLeague) / WOBA_SCALE;
    const pf = (parkFactorByTeam.get(line.teamId) ?? 100) / 100;
    const wrcPlus =
      league.runsPerPa > 0
        ? ((wraaPerPa + league.runsPerPa + (league.runsPerPa - pf * league.runsPerPa)) /
            league.runsPerPa) *
          100
        : 100;

    return {
      ...line,
      avg: line.ab > 0 ? line.h / line.ab : 0,
      obp: obpDen > 0 ? (line.h + line.bb + line.hbp) / obpDen : 0,
      slg: line.ab > 0 ? tb / line.ab : 0,
      ops:
        (obpDen > 0 ? (line.h + line.bb + line.hbp) / obpDen : 0) +
        (line.ab > 0 ? tb / line.ab : 0),
      woba,
      wrcPlus,
    };
  });
}

export function computePitcherStats(
  lines: PitchingLine[],
  league: LeagueConstants
): PitcherStats[] {
  return lines.map((line) => ({
    ...line,
    era: line.ip > 0 ? (9 * line.er) / line.ip : 0,
    whip: line.ip > 0 ? (line.h + line.bb) / line.ip : 0,
    fip:
      line.ip > 0
        ? (13 * line.hr + 3 * (line.bb + line.hbp) - 2 * line.so) / line.ip + league.cFip
        : 0,
    k9: line.ip > 0 ? (9 * line.so) / line.ip : 0,
  }));
}

export function pythagoreanWinPct(runsFor: number, runsAgainst: number): number {
  const rf = runsFor ** PYTHAGOREAN_EXPONENT;
  const ra = runsAgainst ** PYTHAGOREAN_EXPONENT;
  return rf + ra === 0 ? 0 : rf / (rf + ra);
}

export { winPct };
