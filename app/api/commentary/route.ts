import { getLeagueAnalytics } from "@/lib/analytics";
import { buildHeadToHead, buildTeamSummaries, lookupHeadToHead } from "@/lib/analytics/summary";
import { TeamId } from "@/lib/domain/types";
import { getTeam } from "@/lib/teams";
import { predictMatchup } from "@/lib/predict";
import { buildMatchupFacts } from "@/lib/ai/facts";
import {
  CommentaryResult,
  describeApiError,
  generateAiCommentary,
  isAiConfigured,
} from "@/lib/ai/commentary";

/**
 * Commentary for a given matchup only changes when the underlying snapshot does,
 * so one generation per matchup per snapshot is enough.
 */
const cache = new Map<string, CommentaryResult>();

export async function POST(request: Request) {
  let body: { homeId?: string; awayId?: string };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "請求格式錯誤" }, { status: 400 });
  }

  const homeId = body.homeId;
  const awayId = body.awayId;
  if (!homeId || !awayId || homeId === awayId || !getTeam(homeId) || !getTeam(awayId)) {
    return Response.json({ error: "請指定兩支不同的球隊" }, { status: 400 });
  }

  const analytics = await getLeagueAnalytics();
  const cacheKey = `${analytics.snapshot.asOf}:${homeId}:${awayId}`;
  const cached = cache.get(cacheKey);
  if (cached) return Response.json(cached);

  const summaries = buildTeamSummaries(analytics);
  const headToHead = buildHeadToHead(analytics);
  const facts = buildMatchupFacts(
    analytics,
    summaries,
    headToHead,
    homeId as TeamId,
    awayId as TeamId
  );

  let result: CommentaryResult | null = null;
  try {
    if (isAiConfigured()) {
      result = await generateAiCommentary(facts);
    } else {
      console.warn("ANTHROPIC_API_KEY 未設定，改用離線模板球評");
    }
  } catch (error) {
    // Rate limit, network failure or an unparseable response - fall back to the
    // deterministic template so the feature still works.
    console.warn("AI commentary unavailable, using template:", describeApiError(error));
  }

  if (!result) {
    const home = summaries.find((t) => t.id === homeId)!;
    const away = summaries.find((t) => t.id === awayId)!;
    const prediction = predictMatchup(
      home,
      away,
      lookupHeadToHead(headToHead, homeId as TeamId, awayId as TeamId)
    );
    result = {
      source: "template",
      headline: `${home.short} 對 ${away.short}：模型預估主隊勝率 ${(prediction.homeWinPct * 100).toFixed(1)}%`,
      paragraphs: prediction.commentary,
    };
  }

  cache.set(cacheKey, result);
  return Response.json(result);
}
