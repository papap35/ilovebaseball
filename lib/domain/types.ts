export type TeamId = "brothers" | "lions" | "monkeys" | "guardians" | "dragons" | "hawks";

export type SeasonHalf = 1 | 2;

export interface Team {
  id: TeamId;
  name: string;
  short: string;
  city: string;
  venue: string;
  color: string;
  colorSoft: string;
}

export interface Game {
  id: string;
  date: string;
  half: SeasonHalf;
  homeId: TeamId;
  awayId: TeamId;
  venue: string;
  /** null for games that have not been played yet */
  homeScore: number | null;
  awayScore: number | null;
}

/** Component batting stats, matching what a CPBL box score actually publishes. */
export interface BattingLine {
  teamId: TeamId;
  name: string;
  pa: number;
  ab: number;
  h: number;
  doubles: number;
  triples: number;
  hr: number;
  bb: number;
  hbp: number;
  so: number;
  sf: number;
  rbi: number;
  sb: number;
}

export interface PitchingLine {
  teamId: TeamId;
  name: string;
  w: number;
  l: number;
  sv: number;
  /** innings pitched, as a decimal (not the .1/.2 baseball notation) */
  ip: number;
  h: number;
  hr: number;
  bb: number;
  hbp: number;
  so: number;
  er: number;
}

/**
 * Everything a data source must supply. Derived numbers (standings, Elo, wRC+,
 * playoff odds) are never stored here - they are computed in lib/analytics from
 * these raw facts, so swapping in real CPBL data changes nothing downstream.
 */
export interface SeasonSnapshot {
  year: number;
  /** date the snapshot was taken; games after this have null scores */
  asOf: string;
  teams: Team[];
  games: Game[];
  batting: BattingLine[];
  pitching: PitchingLine[];
}

export function isFinal(
  game: Game
): game is Game & { homeScore: number; awayScore: number } {
  return game.homeScore !== null && game.awayScore !== null;
}
