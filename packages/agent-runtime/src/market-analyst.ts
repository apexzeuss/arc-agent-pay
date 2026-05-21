// The brain for prediction markets. Given real Polymarket markets, decide which
// bets have an edge. Split, like the trader scorer:
//   1. JUDGMENT (per market): Claude estimates the TRUE probability of YES, picks
//      a side vs the market price, gives conviction + a one-line rationale.
//   2. SIZING (across markets): pure deterministic TS — bankroll weight is
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
  // edge — we just lean toward the favorite with low conviction. (Real value
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
- conviction: integer 0-100 — how confident you are in your estimate.
- rationale: one sentence, max 140 chars, concrete.

Only pick YES/NO when you genuinely think the market is mispriced. It is fine — expected — to SKIP most markets.

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
