import { SeasonSnapshot, TeamId, isFinal } from "../domain/types";

const START_ELO = 1500;
const K = 18;
export const HOME_FIELD_ELO = 45;

export interface EloPoint {
  gameNo: number;
  date: string;
  [teamId: string]: number | string;
}

export interface EloResult {
  ratings: Map<TeamId, number>;
  series: EloPoint[];
}

export function expectedScore(ratingA: number, ratingB: number): number {
  return 1 / (1 + 10 ** ((ratingB - ratingA) / 400));
}

/**
 * Ratings are derived only from observed results - never from the simulator's
 * hidden strength values - so this behaves identically on real box scores.
 */
export function buildElo(snapshot: SeasonSnapshot): EloResult {
  const ratings = new Map<TeamId, number>(snapshot.teams.map((t) => [t.id, START_ELO]));
  const series: EloPoint[] = [];
  const played = snapshot.games.filter(isFinal);

  played.forEach((game, index) => {
    const home = ratings.get(game.homeId)!;
    const away = ratings.get(game.awayId)!;
    const expectedHome = expectedScore(home + HOME_FIELD_ELO, away);

    // Ties score 0.5, matching the Elo convention for drawn games.
    const homeActual =
      game.homeScore === game.awayScore ? 0.5 : game.homeScore > game.awayScore ? 1 : 0;

    ratings.set(game.homeId, home + K * (homeActual - expectedHome));
    ratings.set(game.awayId, away + K * (1 - homeActual - (1 - expectedHome)));

    if ((index + 1) % 3 === 0 || index === played.length - 1) {
      const point: EloPoint = { gameNo: index + 1, date: game.date };
      for (const team of snapshot.teams) {
        point[team.id] = Math.round(ratings.get(team.id)! * 10) / 10;
      }
      series.push(point);
    }
  });

  return { ratings, series };
}

export function winProbability(
  homeElo: number,
  awayElo: number,
  homeFieldElo = HOME_FIELD_ELO
): number {
  return expectedScore(homeElo + homeFieldElo, awayElo);
}
