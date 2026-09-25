import { SeasonSnapshot, TeamId, isFinal } from "../domain/types";
import { mulberry32 } from "../rng";
import { winProbability } from "./elo";
import { winPct } from "./standings";

const ITERATIONS = 10000;
const TIE_RATE = 0.03;
const PLAYOFF_SPOTS = 3;

export interface PlayoffOdds {
  id: TeamId;
  /** probability of reaching the postseason at all */
  playoff: number;
  /** probability of winning the second-half title */
  secondHalfCrown: number;
  /** probability of finishing with the league's best full-season record */
  bestRecord: number;
}

interface SimRecord {
  full: { w: number; l: number };
  half1: { w: number; l: number };
  half2: { w: number; l: number };
}

function blankRecords(teams: TeamId[]): Map<TeamId, SimRecord> {
  return new Map(
    teams.map((id) => [
      id,
      { full: { w: 0, l: 0 }, half1: { w: 0, l: 0 }, half2: { w: 0, l: 0 } },
    ])
  );
}

function cloneRecords(base: Map<TeamId, SimRecord>): Map<TeamId, SimRecord> {
  const copy = new Map<TeamId, SimRecord>();
  for (const [id, r] of base) {
    copy.set(id, {
      full: { ...r.full },
      half1: { ...r.half1 },
      half2: { ...r.half2 },
    });
  }
  return copy;
}

function applyResult(records: Map<TeamId, SimRecord>, game: {
  homeId: TeamId;
  awayId: TeamId;
  half: 1 | 2;
  homeWon: boolean | null;
}) {
  if (game.homeWon === null) return; // ties do not affect win percentage
  const winner = game.homeWon ? game.homeId : game.awayId;
  const loser = game.homeWon ? game.awayId : game.homeId;
  const halfKey = game.half === 1 ? "half1" : "half2";
  const w = records.get(winner)!;
  const l = records.get(loser)!;
  w.full.w++;
  w[halfKey].w++;
  l.full.l++;
  l[halfKey].l++;
}

function bestBy(
  candidates: TeamId[],
  records: Map<TeamId, SimRecord>,
  key: "full" | "half1" | "half2"
): TeamId {
  let best = candidates[0];
  let bestPct = -1;
  let bestFull = -1;
  for (const id of candidates) {
    const r = records.get(id)!;
    const pct = winPct(r[key].w, r[key].l);
    const fullPct = winPct(r.full.w, r.full.l);
    if (pct > bestPct || (pct === bestPct && fullPct > bestFull)) {
      best = id;
      bestPct = pct;
      bestFull = fullPct;
    }
  }
  return best;
}

/**
 * CPBL postseason: the first-half and second-half champions qualify. If one team
 * wins both halves it advances straight to the Taiwan Series and the next two
 * full-season records contest the playoff series; otherwise the best remaining
 * full-season record takes the third spot.
 */
function qualifiers(teams: TeamId[], records: Map<TeamId, SimRecord>): TeamId[] {
  const champ1 = bestBy(teams, records, "half1");
  const champ2 = bestBy(teams, records, "half2");

  const qualified: TeamId[] = champ1 === champ2 ? [champ1] : [champ1, champ2];
  const remaining = teams.filter((id) => !qualified.includes(id));
  remaining.sort((a, b) => {
    const ra = records.get(a)!;
    const rb = records.get(b)!;
    return winPct(rb.full.w, rb.full.l) - winPct(ra.full.w, ra.full.l);
  });

  while (qualified.length < PLAYOFF_SPOTS && remaining.length > 0) {
    qualified.push(remaining.shift()!);
  }
  return qualified;
}

export function simulatePlayoffOdds(
  snapshot: SeasonSnapshot,
  ratings: Map<TeamId, number>,
  iterations: number = ITERATIONS
): PlayoffOdds[] {
  const teams = snapshot.teams.map((t) => t.id);

  const actual = blankRecords(teams);
  const remainingGames: { homeId: TeamId; awayId: TeamId; half: 1 | 2; homeWinProb: number }[] = [];

  for (const game of snapshot.games) {
    if (isFinal(game)) {
      applyResult(actual, {
        homeId: game.homeId,
        awayId: game.awayId,
        half: game.half,
        homeWon:
          game.homeScore === game.awayScore ? null : game.homeScore > game.awayScore,
      });
    } else {
      remainingGames.push({
        homeId: game.homeId,
        awayId: game.awayId,
        half: game.half,
        homeWinProb: winProbability(
          ratings.get(game.homeId) ?? 1500,
          ratings.get(game.awayId) ?? 1500
        ),
      });
    }
  }

  const playoffCount = new Map<TeamId, number>(teams.map((id) => [id, 0]));
  const crownCount = new Map<TeamId, number>(teams.map((id) => [id, 0]));
  const bestCount = new Map<TeamId, number>(teams.map((id) => [id, 0]));

  const rng = mulberry32(90125);

  for (let i = 0; i < iterations; i++) {
    const records = cloneRecords(actual);
    for (const game of remainingGames) {
      const roll = rng();
      const homeWon =
        roll < TIE_RATE ? null : rng() < game.homeWinProb;
      applyResult(records, { ...game, homeWon });
    }

    for (const id of qualifiers(teams, records)) {
      playoffCount.set(id, playoffCount.get(id)! + 1);
    }
    const crown = bestBy(teams, records, "half2");
    crownCount.set(crown, crownCount.get(crown)! + 1);
    const best = bestBy(teams, records, "full");
    bestCount.set(best, bestCount.get(best)! + 1);
  }

  return teams.map((id) => ({
    id,
    playoff: playoffCount.get(id)! / iterations,
    secondHalfCrown: crownCount.get(id)! / iterations,
    bestRecord: bestCount.get(id)! / iterations,
  }));
}
