import { Game, SeasonHalf, SeasonSnapshot, TeamId, isFinal } from "../domain/types";

export interface TeamRecord {
  id: TeamId;
  gamesPlayed: number;
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
}

type Tally = {
  wins: number;
  losses: number;
  ties: number;
  runsFor: number;
  runsAgainst: number;
  homeWins: number;
  homeLosses: number;
  awayWins: number;
  awayLosses: number;
  results: ("W" | "L" | "T")[];
};

function emptyTally(): Tally {
  return {
    wins: 0,
    losses: 0,
    ties: 0,
    runsFor: 0,
    runsAgainst: 0,
    homeWins: 0,
    homeLosses: 0,
    awayWins: 0,
    awayLosses: 0,
    results: [],
  };
}

/** Ties are excluded from win percentage, as CPBL does it. */
export function winPct(wins: number, losses: number): number {
  const decided = wins + losses;
  return decided === 0 ? 0 : wins / decided;
}

function tallyGames(teams: TeamId[], games: Game[]): Map<TeamId, Tally> {
  const tallies = new Map<TeamId, Tally>(teams.map((id) => [id, emptyTally()]));

  for (const game of games) {
    if (!isFinal(game)) continue;
    const home = tallies.get(game.homeId);
    const away = tallies.get(game.awayId);
    if (!home || !away) continue;

    home.runsFor += game.homeScore;
    home.runsAgainst += game.awayScore;
    away.runsFor += game.awayScore;
    away.runsAgainst += game.homeScore;

    if (game.homeScore > game.awayScore) {
      home.wins++;
      home.homeWins++;
      home.results.push("W");
      away.losses++;
      away.awayLosses++;
      away.results.push("L");
    } else if (game.homeScore < game.awayScore) {
      away.wins++;
      away.awayWins++;
      away.results.push("W");
      home.losses++;
      home.homeLosses++;
      home.results.push("L");
    } else {
      home.ties++;
      home.results.push("T");
      away.ties++;
      away.results.push("T");
    }
  }

  return tallies;
}

function describeStreak(results: ("W" | "L" | "T")[]): string {
  const decided = results.filter((r) => r !== "T");
  if (decided.length === 0) return "-";
  const latest = decided[decided.length - 1];
  let length = 0;
  for (let i = decided.length - 1; i >= 0 && decided[i] === latest; i--) length++;
  return `${latest}${length}`;
}

export function buildStandings(
  snapshot: SeasonSnapshot,
  options: { half?: SeasonHalf } = {}
): TeamRecord[] {
  const teamIds = snapshot.teams.map((t) => t.id);
  const games = options.half
    ? snapshot.games.filter((g) => g.half === options.half)
    : snapshot.games;
  const tallies = tallyGames(teamIds, games);

  const records: TeamRecord[] = teamIds.map((id) => {
    const t = tallies.get(id)!;
    const last10 = t.results.filter((r) => r !== "T").slice(-10);
    const last10W = last10.filter((r) => r === "W").length;
    return {
      id,
      gamesPlayed: t.wins + t.losses + t.ties,
      wins: t.wins,
      losses: t.losses,
      ties: t.ties,
      winPct: winPct(t.wins, t.losses),
      gamesBack: 0,
      runsFor: t.runsFor,
      runsAgainst: t.runsAgainst,
      runDiff: t.runsFor - t.runsAgainst,
      streak: describeStreak(t.results),
      last10: `${last10W}-${last10.length - last10W}`,
      homeRecord: `${t.homeWins}-${t.homeLosses}`,
      awayRecord: `${t.awayWins}-${t.awayLosses}`,
    };
  });

  records.sort((a, b) => b.winPct - a.winPct || b.runDiff - a.runDiff);
  const leader = records[0];
  for (const r of records) {
    r.gamesBack = (leader.wins - r.wins + (r.losses - leader.losses)) / 2;
  }
  return records;
}

export function headToHead(snapshot: SeasonSnapshot, a: TeamId, b: TeamId) {
  let aWins = 0;
  let bWins = 0;
  let ties = 0;
  for (const game of snapshot.games) {
    if (!isFinal(game)) continue;
    const involvesBoth =
      (game.homeId === a && game.awayId === b) || (game.homeId === b && game.awayId === a);
    if (!involvesBoth) continue;

    if (game.homeScore === game.awayScore) ties++;
    else {
      const winner = game.homeScore > game.awayScore ? game.homeId : game.awayId;
      if (winner === a) aWins++;
      else bWins++;
    }
  }
  return { aWins, bWins, ties, total: aWins + bWins + ties };
}

export function teamGames(snapshot: SeasonSnapshot, teamId: TeamId): Game[] {
  return snapshot.games.filter((g) => g.homeId === teamId || g.awayId === teamId);
}

export interface FormPoint {
  gameNo: number;
  winPct: number;
  runDiff: number;
}

export function buildFormSeries(snapshot: SeasonSnapshot, teamId: TeamId): FormPoint[] {
  let wins = 0;
  let losses = 0;
  let runDiff = 0;
  const points: FormPoint[] = [];

  teamGames(snapshot, teamId).forEach((game) => {
    if (!isFinal(game)) return;
    const isHome = game.homeId === teamId;
    const scored = isHome ? game.homeScore : game.awayScore;
    const allowed = isHome ? game.awayScore : game.homeScore;
    runDiff += scored - allowed;
    if (scored > allowed) wins++;
    else if (scored < allowed) losses++;

    points.push({
      gameNo: points.length + 1,
      winPct: Math.round(winPct(wins, losses) * 1000) / 1000,
      runDiff,
    });
  });

  return points;
}
