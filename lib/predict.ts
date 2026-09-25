import { TeamSummary } from "./analytics/summary";
import { winProbability } from "./analytics/elo";

export interface Prediction {
  homeWinPct: number;
  awayWinPct: number;
  commentary: string[];
}

export interface HeadToHeadSummary {
  aWins: number;
  bWins: number;
  ties: number;
  total: number;
}

function signed(value: number, digits = 0): string {
  return `${value >= 0 ? "+" : ""}${value.toFixed(digits)}`;
}

/**
 * Deterministic, offline prediction. Also used verbatim as the fallback whenever
 * the Claude-generated commentary is unavailable, so the app stays useful with
 * no API key and no network.
 */
export function predictMatchup(
  home: TeamSummary,
  away: TeamSummary,
  h2h: HeadToHeadSummary
): Prediction {
  const homeWinPct = winProbability(home.elo, away.elo);

  const commentary: string[] = [
    `${home.name}（主場，${home.wins}勝${home.losses}敗${home.ties}和，Elo ${home.elo.toFixed(0)}）` +
      `對上 ${away.name}（客場，${away.wins}勝${away.losses}敗${away.ties}和，Elo ${away.elo.toFixed(0)}），` +
      `模型預估主隊勝率 ${(homeWinPct * 100).toFixed(1)}%。`,
  ];

  const homeForm = Number(home.last10.split("-")[0]);
  const awayForm = Number(away.last10.split("-")[0]);
  if (homeForm !== awayForm) {
    const hotter = homeForm > awayForm ? home : away;
    commentary.push(
      `近況上 ${home.short}近10場 ${home.last10}、${away.short}近10場 ${away.last10}，` +
        `${hotter.short}手感較佳，是左右勝負的關鍵變數。`
    );
  } else {
    commentary.push(
      `雙方近10場同為 ${home.last10}，近況拉不開差距，預料是纏鬥型的比賽。`
    );
  }

  if (h2h.total > 0) {
    const tieNote = h2h.ties > 0 ? `、和 ${h2h.ties} 場` : "";
    commentary.push(
      `本季交手 ${h2h.total} 場，${home.short} ${h2h.aWins} 勝、${away.short} ${h2h.bWins} 勝${tieNote}。`
    );
  } else {
    commentary.push("本季雙方尚未交手。");
  }

  const luckGap = home.luck - away.luck;
  if (Math.abs(luckGap) >= 2) {
    const lucky = luckGap > 0 ? home : away;
    const unlucky = luckGap > 0 ? away : home;
    commentary.push(
      `畢氏期望勝場顯示 ${lucky.short} 實際戰績比得失分該有的水準多了 ${signed(Math.abs(lucky.luck), 1)} 勝，` +
        `${unlucky.short} 則是 ${signed(unlucky.luck, 1)} 勝，長期來看 ${lucky.short} 有向下修正的空間。`
    );
  } else {
    commentary.push(
      `${home.short} 得失分差 ${signed(home.runDiff)}、${away.short} ${signed(away.runDiff)}，` +
        `兩隊戰績都與得失分相符，沒有明顯的運氣成分。`
    );
  }

  if (home.playoffOdds > 0.01 || away.playoffOdds > 0.01) {
    commentary.push(
      `季後賽晉級機率：${home.short} ${(home.playoffOdds * 100).toFixed(1)}%、` +
        `${away.short} ${(away.playoffOdds * 100).toFixed(1)}%。`
    );
  }

  return { homeWinPct, awayWinPct: 1 - homeWinPct, commentary };
}
