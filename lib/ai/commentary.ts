import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { MatchupFacts } from "./facts";

const MODEL = "claude-opus-5";
const MAX_TOKENS = 2000;

export interface CommentaryResult {
  source: "ai" | "template";
  headline: string;
  paragraphs: string[];
}

const CommentarySchema = z.object({
  headline: z.string(),
  paragraphs: z.array(z.string()),
});

/**
 * Kept byte-stable so it can serve as a cacheable prefix; every varying number
 * goes in the user message instead.
 */
const SYSTEM_PROMPT = `你是一位資深的中華職棒（CPBL）球評，替台灣球迷撰寫賽前分析。

寫作要求：
- 使用繁體中文，語氣像球評在賽前節目上的分析，專業但不生硬。
- 用台灣棒球圈慣用的說法（例如「開轟」「中繼」「守備率」「先發輪值」「牛棚」「勝差」「和局」）。
- 全文 3 段，每段 2 到 4 句。第一段講雙方基本盤與模型勝率，第二段講近況與關鍵球員，第三段講勝負關鍵與季後賽意義。
- 另外給一句 20 字以內的標題，點出這場的看點。

絕對規則：
- 只能使用使用者訊息中提供的數據。禁止引用任何未提供的數字、球員、日期或事件。
- 不要杜撰傷兵、交易、先發投手或天氣。資料裡沒有的就不要提。
- 不要把模型勝率說成必然結果，要保留比賽的不確定性。
- 不要使用條列符號或 Markdown 標記，只輸出純文字段落。`;

/** No key configured means the template path, not an exception round-trip. */
export function isAiConfigured(): boolean {
  return Boolean(process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_AUTH_TOKEN);
}

function client(): Anthropic {
  // Reads ANTHROPIC_API_KEY / ANTHROPIC_AUTH_TOKEN from the environment.
  return new Anthropic();
}

export async function generateAiCommentary(facts: MatchupFacts): Promise<CommentaryResult> {
  const response = await client().messages.parse({
    model: MODEL,
    max_tokens: MAX_TOKENS,
    thinking: { type: "adaptive" },
    output_config: {
      effort: "low",
      format: zodOutputFormat(CommentarySchema),
    },
    system: [
      {
        type: "text",
        text: SYSTEM_PROMPT,
        cache_control: { type: "ephemeral" },
      },
    ],
    messages: [
      {
        role: "user",
        content: `請依照下列本季數據，撰寫這場比賽的賽前分析。\n\n${JSON.stringify(facts, null, 2)}`,
      },
    ],
  });

  const parsed = response.parsed_output;
  if (!parsed || parsed.paragraphs.length === 0) {
    throw new Error("Claude 回應無法解析為預期格式");
  }

  return {
    source: "ai",
    headline: parsed.headline,
    paragraphs: parsed.paragraphs,
  };
}

export function describeApiError(error: unknown): string {
  if (error instanceof Anthropic.AuthenticationError) return "未設定或無效的 ANTHROPIC_API_KEY";
  if (error instanceof Anthropic.RateLimitError) return "Claude API 速率限制";
  if (error instanceof Anthropic.APIConnectionError) return "無法連線至 Claude API";
  if (error instanceof Anthropic.APIError) return `Claude API 錯誤 ${error.status}`;
  return error instanceof Error ? error.message : "未知錯誤";
}
