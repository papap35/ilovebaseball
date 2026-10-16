import {
  BattingLine,
  Game,
  PitchingLine,
  SeasonSnapshot,
  SeasonHalf,
  TeamId,
} from "../domain/types";
import { TEAMS } from "../teams";
import { mulberry32 } from "../rng";
import { CpblDataSource } from "./types";

const SEASON_START = "2026-03-28";
const GAMES_PER_TEAM = 120;
const SERIES_LENGTH = 3;
const REST_DAYS = 2;
/** CPBL splits its season into halves around the all-star break. */
const ROUNDS_PER_HALF = 20;
const ALL_STAR_BREAK_DAYS = 7;

const LEAGUE_RUNS_PER_GAME = 4.3;
const HOME_FIELD_RUNS = 0.15;
const RUN_NOISE = 7.5;
const TIE_RATE = 0.35;
const SEED = 1990;

/**
 * Hidden team strength in runs/game relative to league average. Kept deliberately
 * narrow: a wider spread compounds over 120 games into win percentages no real
 * CPBL season has produced, which in turn makes playoff odds collapse to 0/100.
 */
const TEAM_QUALITY: Record<TeamId, number> = {
  lions: 0.5,
  brothers: 0.42,
  monkeys: 0.18,
  guardians: -0.12,
  dragons: -0.38,
  hawks: -0.6,
};

const SURNAMES = [
  "陳", "林", "黃", "張", "李", "王", "吳", "劉", "蔡", "楊",
  "許", "鄭", "謝", "郭", "洪", "曾", "邱", "廖", "賴", "徐",
];
const GIVEN = [
  "冠宇", "柏恩", "柏翰", "俊傑", "承翰", "宗翰", "彥廷", "威廷", "文彬", "哲宇",
  "世偉", "志豪", "秉臻", "亞成", "宸豪", "岳東", "宥丞", "冠廷", "彥博", "睿哲",
];

function addDays(iso: string, days: number): string {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

function makeName(rng: () => number, used: Set<string>): string {
  for (let attempt = 0; attempt < 50; attempt++) {
    const name =
      SURNAMES[Math.floor(rng() * SURNAMES.length)] +
      GIVEN[Math.floor(rng() * GIVEN.length)];
    if (!used.has(name)) {
      used.add(name);
      return name;
    }
  }
  const fallback = `${SURNAMES[Math.floor(rng() * SURNAMES.length)]}${used.size}`;
  used.add(fallback);
  return fallback;
}

/** Roughly normal, mean 0, stdev ~0.33. */
function gaussian(rng: () => number): number {
  return (rng() + rng() + rng() - 1.5) / 1.5;
}

/** Circle-method round robin: team[0] fixed, the rest rotate each round. */
function roundRobinRounds(ids: TeamId[]): [TeamId, TeamId][][] {
  const n = ids.length;
  const rotating = ids.slice(1);
  const rounds: [TeamId, TeamId][][] = [];
  for (let r = 0; r < n - 1; r++) {
    const arranged = [ids[0], ...rotating];
    const pairs: [TeamId, TeamId][] = [];
    for (let i = 0; i < n / 2; i++) {
      pairs.push([arranged[i], arranged[n - 1 - i]]);
    }
    rounds.push(pairs);
    rotating.push(rotating.shift()!);
  }
  return rounds;
}

interface ScheduleSlot {
  date: string;
  half: SeasonHalf;
  homeId: TeamId;
  awayId: TeamId;
}

function buildSchedule(): ScheduleSlot[] {
  const ids = TEAMS.map((t) => t.id);
  const legRounds = roundRobinRounds(ids);
  const roundsPerTeamGame = legRounds.length * SERIES_LENGTH; // games per team per leg
  const totalRounds = Math.round((GAMES_PER_TEAM / roundsPerTeamGame) * legRounds.length);

  const slots: ScheduleSlot[] = [];
  let date = SEASON_START;
  // Home field alternates every time a given pair meets, so each matchup splits
  // its series evenly between the two parks instead of running in long blocks.
  const meetings = new Map<string, number>();

  for (let round = 0; round < totalRounds; round++) {
    const roundInLeg = round % legRounds.length;
    const pairs = legRounds[roundInLeg];
    const half: SeasonHalf = round < ROUNDS_PER_HALF ? 1 : 2;

    for (let g = 0; g < SERIES_LENGTH; g++) {
      for (const [a, b] of pairs) {
        const key = [a, b].sort().join("-");
        const seriesIndex = meetings.get(key) ?? 0;
        // The round-robin pivot team would otherwise host every series in a leg,
        // so the slot in the rotation flips the parity too.
        const hostsFirst = (seriesIndex + roundInLeg) % 2 === 0;
        slots.push({
          date,
          half,
          homeId: hostsFirst ? a : b,
          awayId: hostsFirst ? b : a,
        });
        if (g === SERIES_LENGTH - 1) meetings.set(key, seriesIndex + 1);
      }
      date = addDays(date, 1);
    }
    date = addDays(date, REST_DAYS);
    if (round + 1 === ROUNDS_PER_HALF) {
      date = addDays(date, ALL_STAR_BREAK_DAYS);
    }
  }

  return slots;
}

function simulateGame(
  rng: () => number,
  homeId: TeamId,
  awayId: TeamId
): { homeScore: number; awayScore: number } {
  const edge = TEAM_QUALITY[homeId] - TEAM_QUALITY[awayId];
  const homeExpected = LEAGUE_RUNS_PER_GAME + edge / 2 + HOME_FIELD_RUNS;
  const awayExpected = LEAGUE_RUNS_PER_GAME - edge / 2;

  let homeScore = Math.max(0, Math.round(homeExpected + gaussian(rng) * RUN_NOISE));
  let awayScore = Math.max(0, Math.round(awayExpected + gaussian(rng) * RUN_NOISE));

  if (homeScore === awayScore) {
    // CPBL caps extra innings, so some games are left as ties.
    if (rng() >= TIE_RATE) {
      if (rng() < 0.5 + edge * 0.1 + 0.04) homeScore += 1;
      else awayScore += 1;
    }
  }
  return { homeScore, awayScore };
}

function buildBatters(rng: () => number, teamId: TeamId, used: Set<string>): BattingLine[] {
  const quality = TEAM_QUALITY[teamId];
  return Array.from({ length: 9 }).map(() => {
    const pa = Math.round(380 + rng() * 180);
    const bbRate = 0.055 + rng() * 0.065;
    const bb = Math.round(pa * bbRate);
    const hbp = Math.round(pa * (0.005 + rng() * 0.012));
    const sf = Math.round(2 + rng() * 5);
    const ab = pa - bb - hbp - sf;
    const avg = Math.min(0.36, Math.max(0.21, 0.268 + quality * 0.035 + gaussian(rng) * 0.075));
    const h = Math.round(ab * avg);
    const hr = Math.round(ab * (0.008 + rng() * 0.042 + Math.max(0, quality) * 0.008));
    const doubles = Math.round(ab * (0.032 + rng() * 0.028));
    const triples = Math.round(ab * (0.001 + rng() * 0.007));
    const extraBase = Math.min(h, hr + doubles + triples);
    return {
      teamId,
      name: makeName(rng, used),
      pa,
      ab,
      h,
      doubles: extraBase === h ? Math.max(0, doubles - 1) : doubles,
      triples,
      hr,
      bb,
      hbp,
      so: Math.round(pa * (0.11 + rng() * 0.13)),
      sf,
      rbi: Math.round(hr * 2.4 + h * 0.32 + rng() * 14),
      sb: Math.round(rng() * rng() * 28),
    };
  });
}

function buildPitchers(rng: () => number, teamId: TeamId, used: Set<string>): PitchingLine[] {
  const quality = TEAM_QUALITY[teamId];
  return Array.from({ length: 6 }).map((_, i) => {
    const isStarter = i < 4;
    const ip = isStarter ? 105 + rng() * 70 : 45 + rng() * 30;
    const era = Math.min(6.4, Math.max(1.9, 3.85 - quality * 0.55 + gaussian(rng) * 1.15));
    const er = Math.round((era * ip) / 9);
    const decisions = Math.round(ip / (isStarter ? 12 : 22));
    const winShare = Math.min(0.78, Math.max(0.22, 0.5 + quality * 0.18 - (era - 3.85) * 0.06));
    const w = Math.round(decisions * winShare);
    return {
      teamId,
      name: makeName(rng, used),
      w,
      l: Math.max(0, decisions - w),
      sv: isStarter ? 0 : Math.round(rng() * rng() * 24),
      ip: Math.round(ip * 10) / 10,
      h: Math.round(ip * (0.82 + rng() * 0.29)),
      hr: Math.round(ip * (0.05 + rng() * 0.07)),
      bb: Math.round(ip * (0.22 + rng() * 0.2)),
      hbp: Math.round(ip * (0.015 + rng() * 0.035)),
      so: Math.round(ip * (0.6 + rng() * 0.42)),
      er,
    };
  });
}

function buildSnapshot(year: number, asOf: string): SeasonSnapshot {
  const rng = mulberry32(SEED);
  const venueByTeam = new Map(TEAMS.map((t) => [t.id, t.venue]));
  const schedule = buildSchedule();

  const games: Game[] = schedule.map((slot, i) => {
    const played = slot.date <= asOf;
    const result = played ? simulateGame(rng, slot.homeId, slot.awayId) : null;
    return {
      id: `g${i + 1}`,
      date: slot.date,
      half: slot.half,
      homeId: slot.homeId,
      awayId: slot.awayId,
      venue: venueByTeam.get(slot.homeId)!,
      homeScore: result ? result.homeScore : null,
      awayScore: result ? result.awayScore : null,
    };
  });

  const batting: BattingLine[] = [];
  const pitching: PitchingLine[] = [];
  const usedNames = new Set<string>();
  for (const team of TEAMS) {
    batting.push(...buildBatters(rng, team.id, usedNames));
    pitching.push(...buildPitchers(rng, team.id, usedNames));
  }

  return { year, asOf, teams: TEAMS, games, batting, pitching };
}

export function createSimulatedSource(asOf: string): CpblDataSource {
  let cached: SeasonSnapshot | null = null;
  return {
    name: "simulated",
    simulated: true,
    async loadSeason(year: number) {
      if (!cached) cached = buildSnapshot(year, asOf);
      return cached;
    },
  };
}
