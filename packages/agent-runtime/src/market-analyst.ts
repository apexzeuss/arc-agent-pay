// The brain for prediction markets. Given real Polymarket markets, decide which
// bets have an edge. Split, like the trader scorer:
//   1. JUDGMENT (per market): Claude estimates the TRUE probability of YES, picks
//      a side vs the market price, gives conviction + a one-line rationale.
//   2. SIZING (across markets): pure deterministic TS. bankroll weight is
//      proportional to edge × conviction; markets with no edge get 0.
// Claude when ANTHROPIC_API_KEY is set; transparent fallback otherwise.

import { type PredictionMarket } from "@arc-agent-pay/shared";

const MODEL = process.env.ANTHROPIC_MODEL ?? "claude-sonnet-4-6";

type Engine = "claude" | "fallback";
export type Side = "YES" | "NO" | "SKIP";

export type MarketPick = {
  id: string;
  question: string;
  side: Side;
  marketProb: number; // the market's YES price (implied probability)
  modelProb: number; // the AI's estimated true probability of YES
  edge: number; // +EV signal for the chosen side (positive = worth betting)
  conviction: number; // 0-100
  rationale: string;
  weight: number; // 0..1 share of bankroll; sums to 1 across non-skip picks
};

export type AnalysisResult = {
  engine: Engine;
  picks: MarketPick[];
  cashWeight: number; // 1 - sum(weights); 1.0 if nothing is worth betting
};

// Deep analysis: the paid product. Richer per-market output that's actually
// worth paying for. not just a probability.
export type DeepMarketPick = MarketPick & {
  background: string[]; // 2-4 facts the user should know about this market
  recentEvents: string[]; // 1-3 recent developments that move the probability
  scenarios: { path: string; resolvesTo: "YES" | "NO"; likelihood: number }[]; // 2-3 plausible paths
  recommendation: string; // 1-2 sentences: where to bet, why
  changeMyMind: string; // 1 sentence: what news/event would reverse the take
};

// Edge for the chosen side. YES profits if true prob > price; NO is the mirror.
function edgeFor(side: Side, modelProb: number, marketProb: number): number {
  if (side === "YES") return modelProb - marketProb;
  if (side === "NO") return marketProb - modelProb;
  return 0;
}

// --- Sizing: weights from judgments (pure) -----------------------------------

function applyWeights(
  judged: Omit<MarketPick, "weight">[],
): { picks: MarketPick[]; cashWeight: number } {
  const score = (p: Omit<MarketPick, "weight">) =>
    p.side === "SKIP" || p.edge <= 0 ? 0 : p.edge * p.conviction;

  const total = judged.reduce((a, p) => a + score(p), 0);
  const picks: MarketPick[] = judged.map((p) => ({
    ...p,
    weight: total === 0 ? 0 : score(p) / total,
  }));
  const allocated = picks.reduce((a, p) => a + p.weight, 0);
  return { picks, cashWeight: Math.max(0, 1 - allocated) };
}

// --- Fallback judge (no API key): bet the favorite, claim no edge ------------

function fallbackJudge(m: PredictionMarket): Omit<MarketPick, "weight"> {
  // Without world knowledge we can't beat the market, so we don't claim an
  // edge. we just lean toward the favorite with low conviction. (Real value
  // comes from Claude; this only keeps the pipeline running.)
  const side: Side = m.yesPrice >= 0.5 ? "YES" : "NO";
  const modelProb = m.yesPrice; // no disagreement with the market
  const conviction = Math.round(Math.abs(m.yesPrice - 0.5) * 60); // 0..30
  return {
    id: m.id,
    question: m.question,
    side,
    marketProb: m.yesPrice,
    modelProb,
    edge: 0, // heuristic claims no edge
    conviction,
    rationale: `Heuristic: lean ${side} (market favorite at ${(Math.max(m.yesPrice, m.noPrice) * 100).toFixed(0)}%). No independent edge.`,
  };
}

// --- Claude judge ------------------------------------------------------------

const SYSTEM_PROMPT = `You are a sharp prediction-market analyst. For each market you are given the question, the market's current YES price (its implied probability), and volume. For EACH market:
- modelProb: YOUR honest estimate of the true probability of YES (0.0-1.0), using your own knowledge and reasoning. Be calibrated, not contrarian for its own sake.
- side: "YES" if you think the true probability is meaningfully ABOVE the market price, "NO" if meaningfully BELOW, "SKIP" if you have no real edge or it's too uncertain.
- conviction: integer 0-100. how confident you are in your estimate.
- rationale: one sentence, max 140 chars, concrete.

Only pick YES/NO when you genuinely think the market is mispriced. It is fine. expected. to SKIP most markets.

Return ONLY a JSON array, one object per market, same order:
[{"id": string, "side": "YES"|"NO"|"SKIP", "modelProb": number, "conviction": number, "rationale": string}]
No prose, no markdown fences.`;

function marketDigest(m: PredictionMarket): string {
  return `id=${m.id} | "${m.question}" | market YES price=${(m.yesPrice * 100).toFixed(0)}% | volume=$${Math.round(m.volumeUsd).toLocaleString()}${m.endDate ? ` | ends ${m.endDate.slice(0, 10)}` : ""}`;
}

async function claudeJudge(
  markets: PredictionMarket[],
  apiKey: string,
): Promise<Omit<MarketPick, "weight">[]> {
  const userContent = `Markets:\n\n${markets.map(marketDigest).join("\n")}`;

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 1500,
      system: [{ type: "text", text: SYSTEM_PROMPT, cache_control: { type: "ephemeral" } }],
      messages: [{ role: "user", content: userContent }],
    }),
  });

  if (!res.ok) throw new Error(`Anthropic API ${res.status}: ${await res.text()}`);

  const data = (await res.json()) as { content: { type: string; text?: string }[] };
  const text = data.content.find((b) => b.type === "text")?.text ?? "";
  const start = text.indexOf("[");
  const end = text.lastIndexOf("]");
  if (start === -1 || end === -1) throw new Error(`Claude returned no JSON array:\n${text}`);

  const parsed = JSON.parse(text.slice(start, end + 1)) as {
    id: string;
    side: string;
    modelProb: number;
    conviction: number;
    rationale: string;
  }[];

  return markets.map((m) => {
    const j = parsed.find((p) => String(p.id) === m.id);
    if (!j) return fallbackJudge(m);
    const side = (["YES", "NO", "SKIP"].includes(j.side) ? j.side : "SKIP") as Side;
    const modelProb = Math.max(0, Math.min(1, Number(j.modelProb)));
    return {
      id: m.id,
      question: m.question,
      side,
      marketProb: m.yesPrice,
      modelProb,
      edge: edgeFor(side, modelProb, m.yesPrice),
      conviction: Math.max(0, Math.min(100, Math.round(j.conviction))),
      rationale: String(j.rationale).slice(0, 140),
    };
  });
}

// --- Public entry point ------------------------------------------------------

export async function analyzeMarkets(markets: PredictionMarket[]): Promise<AnalysisResult> {
  const apiKey = process.env.ANTHROPIC_API_KEY;

  let engine: Engine;
  let judged: Omit<MarketPick, "weight">[];

  if (apiKey) {
    try {
      judged = await claudeJudge(markets, apiKey);
      engine = "claude";
    } catch (err) {
      console.warn(`[market-analyst] Claude call failed, using fallback: ${(err as Error).message}`);
      judged = markets.map(fallbackJudge);
      engine = "fallback";
    }
  } else {
    judged = markets.map(fallbackJudge);
    engine = "fallback";
  }

  const { picks, cashWeight } = applyWeights(judged);
  return { engine, picks, cashWeight };
}

// --- Deep analysis (paid product) -------------------------------------------

const DEEP_SYSTEM_PROMPT = `You are a sharp prediction-market analyst writing a paid research note. The reader pays for your insight, so do not just restate the market's price; give them genuine value. Use your own knowledge of recent events, structural facts, and likely paths.

STYLE: Write naturally, like a human analyst. Do NOT use em-dashes ("—") or en-dashes ("–") anywhere in your output. Use commas, periods, semicolons, or parentheses instead. Avoid AI-stock phrases.

Return ONLY a JSON object, no prose, no markdown:
{
  "modelProb": number,           // your honest estimate of true probability of YES (0.0-1.0)
  "side": "YES" | "NO" | "SKIP", // your recommendation; SKIP only if you genuinely have no edge
  "conviction": number,          // 0-100, how confident you are
  "rationale": string,           // one-line summary of the bet thesis (≤140 chars)
  "background": [string],        // 2-4 facts the reader should know to understand the market
  "recentEvents": [string],      // 1-3 specific recent developments (last weeks/months) that move the probability
  "scenarios": [
    { "path": string, "resolvesTo": "YES"|"NO", "likelihood": number }   // 2-3 plausible paths to resolution; likelihood 0.0-1.0
  ],
  "recommendation": string,      // 1-2 sentences: which side to take and why; concrete
  "changeMyMind": string         // 1 sentence: what specific news/event would flip the call
}

Be concrete. Name people, dates, dollar amounts, polling numbers, court rulings, prior base rates. If you don't have a real edge, set side=SKIP but still fill in the other fields so the reader gets value.`;

async function claudeDeepJudge(
  market: PredictionMarket,
  apiKey: string,
  model: string = MODEL,
): Promise<Omit<DeepMarketPick, "weight">> {
  const userContent = `Market: "${market.question}"
Market YES price: ${(market.yesPrice * 100).toFixed(0)}% (implied probability the market is giving YES)
24h volume: $${Math.round(market.volumeUsd).toLocaleString()}${market.endDate ? `\nResolves by: ${market.endDate.slice(0, 10)}` : ""}`;

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model,
      max_tokens: 1800,
      system: [{ type: "text", text: DEEP_SYSTEM_PROMPT, cache_control: { type: "ephemeral" } }],
      messages: [{ role: "user", content: userContent }],
    }),
  });

  if (!res.ok) throw new Error(`Anthropic API ${res.status}: ${await res.text()}`);

  const data = (await res.json()) as { content: { type: string; text?: string }[] };
  const text = data.content.find((b) => b.type === "text")?.text ?? "";
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start === -1 || end === -1) throw new Error(`Claude returned no JSON:\n${text}`);

  const parsed = JSON.parse(text.slice(start, end + 1)) as {
    modelProb: number;
    side: string;
    conviction: number;
    rationale: string;
    background?: unknown[];
    recentEvents?: unknown[];
    scenarios?: { path?: unknown; resolvesTo?: unknown; likelihood?: unknown }[];
    recommendation?: string;
    changeMyMind?: string;
  };

  const side = (["YES", "NO", "SKIP"].includes(parsed.side) ? parsed.side : "SKIP") as Side;
  const modelProb = Math.max(0, Math.min(1, Number(parsed.modelProb)));
  const arrOfStr = (v: unknown): string[] =>
    Array.isArray(v) ? v.map((x) => String(x)).filter((s) => s.length > 0).slice(0, 4) : [];
  const scenarios = Array.isArray(parsed.scenarios)
    ? parsed.scenarios.slice(0, 3).map((s) => ({
        path: String(s?.path ?? ""),
        resolvesTo: (s?.resolvesTo === "YES" || s?.resolvesTo === "NO") ? s.resolvesTo as "YES" | "NO" : "YES" as const,
        likelihood: Math.max(0, Math.min(1, Number(s?.likelihood ?? 0))),
      })).filter((s) => s.path.length > 0)
    : [];

  return {
    id: market.id,
    question: market.question,
    side,
    marketProb: market.yesPrice,
    modelProb,
    edge: edgeFor(side, modelProb, market.yesPrice),
    conviction: Math.max(0, Math.min(100, Math.round(Number(parsed.conviction) || 0))),
    rationale: String(parsed.rationale ?? "").slice(0, 140),
    background: arrOfStr(parsed.background),
    recentEvents: arrOfStr(parsed.recentEvents),
    scenarios,
    recommendation: String(parsed.recommendation ?? "").slice(0, 300),
    changeMyMind: String(parsed.changeMyMind ?? "").slice(0, 200),
  };
}

function deepFallback(market: PredictionMarket, reason: "no-key" | "error" = "no-key"): Omit<DeepMarketPick, "weight"> {
  const base = fallbackJudge(market);
  const note = reason === "no-key"
    ? "No Claude API key set; running heuristic fallback. Set ANTHROPIC_API_KEY to enable real analysis."
    : "Analysis temporarily unavailable for this market (rate limit or transient error). Click Re-analyze to retry.";
  return {
    ...base,
    background: [
      `The market currently prices YES at ${(market.yesPrice * 100).toFixed(0)}%.`,
      `Volume to date: $${Math.round(market.volumeUsd).toLocaleString()}.`,
    ],
    recentEvents: [],
    scenarios: [],
    recommendation: note,
    changeMyMind: " ",
  };
}

// Retry once on transient failures (rate limit, network blip).
async function claudeDeepJudgeWithRetry(
  market: PredictionMarket,
  apiKey: string,
  model: string = MODEL,
): Promise<Omit<DeepMarketPick, "weight">> {
  try {
    return await claudeDeepJudge(market, apiKey, model);
  } catch (err) {
    const msg = (err as Error).message ?? "";
    if (/429|rate|timeout|ETIMEDOUT|ECONNRESET/i.test(msg)) {
      await new Promise((r) => setTimeout(r, 600 + Math.random() * 800));
      return claudeDeepJudge(market, apiKey, model);
    }
    throw err;
  }
}

// Fast model for the bulk 16-market overview. Roughly 2-3× faster than Sonnet.
const BULK_MODEL = process.env.ANTHROPIC_BULK_MODEL ?? "claude-haiku-4-5-20251001";

export async function analyzeMarketDeep(market: PredictionMarket, opts?: { fast?: boolean }): Promise<DeepMarketPick> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  const model = opts?.fast ? BULK_MODEL : MODEL;
  let judged: Omit<DeepMarketPick, "weight">;
  if (apiKey) {
    try {
      judged = await claudeDeepJudgeWithRetry(market, apiKey, model);
    } catch (err) {
      console.warn(`[market-analyst] Deep Claude call failed: ${(err as Error).message}`);
      judged = deepFallback(market, "error");
    }
  } else {
    judged = deepFallback(market, "no-key");
  }
  return { ...judged, weight: 1 };
}
