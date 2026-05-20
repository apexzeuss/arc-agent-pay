// The brain. Given traders (from any TraderSource), decide how much to copy
// each one. Two responsibilities, deliberately split:
//
//   1. JUDGMENT (per trader): a score 0-100 + a `degraded` flag + a rationale.
//      This is the part that wants real reasoning — so it calls Claude when an
//      ANTHROPIC_API_KEY is present, and falls back to a transparent heuristic
//      when it isn't (so the whole pipeline runs today, and so a key hiccup
//      mid-demo degrades gracefully instead of crashing).
//
//   2. WEIGHTS (across traders): pure deterministic TS. Degraded traders get
//      zero; the rest split the pot in proportion to score. Keeping this out of
//      the LLM means allocations are reproducible and auditable — and it's what
//      makes CopyProtect visible: when a trader degrades, its weight goes to 0
//      and redistributes to the healthy ones.

import {
  type Trader,
  type TraderId,
} from "@arc-agent-pay/shared";

const MODEL = process.env.ANTHROPIC_MODEL ?? "claude-sonnet-4-6";

export type Engine = "claude" | "fallback";

export type TraderScore = {
  id: TraderId;
  label: string;
  score: number; // 0-100
  degraded: boolean;
  rationale: string;
  weight: number; // 0..1; sums to 1 across non-degraded traders (0 if all degraded)
};

export type ScoringResult = {
  engine: Engine;
  scores: TraderScore[];
  cashWeight: number; // 1 - sum(weights); 1.0 when every trader is degraded
};

// --- Features the judgment is based on ---------------------------------------

type Features = {
  n: number;
  total: number; // sum of returns
  mean: number;
  recentMean: number; // last 3 trades
  earlierMean: number; // everything before the last 3
  stdev: number;
  winRate: number; // fraction of positive trades
};

const RECENT_N = 3;

function features(t: Trader): Features {
  const r = t.recentTrades.map((x) => x.returnPct);
  const n = r.length;
  const total = r.reduce((a, b) => a + b, 0);
  const mean = n > 0 ? total / n : 0;
  const recent = r.slice(-RECENT_N);
  const earlier = r.slice(0, Math.max(0, n - RECENT_N));
  const recentMean = recent.length ? recent.reduce((a, b) => a + b, 0) / recent.length : 0;
  const earlierMean = earlier.length ? earlier.reduce((a, b) => a + b, 0) / earlier.length : mean;
  const variance = n > 0 ? r.reduce((a, b) => a + (b - mean) ** 2, 0) / n : 0;
  const stdev = Math.sqrt(variance);
  const winRate = n > 0 ? r.filter((x) => x > 0).length / n : 0;
  return { n, total, mean, recentMean, earlierMean, stdev, winRate };
}

// --- Step 2 of the split: weights from judgments (pure, deterministic) --------

function applyWeights(
  judged: Omit<TraderScore, "weight">[],
): { scores: TraderScore[]; cashWeight: number } {
  const healthy = judged.filter((j) => !j.degraded && j.score > 0);
  const totalScore = healthy.reduce((a, b) => a + b.score, 0);

  const scores: TraderScore[] = judged.map((j) => ({
    ...j,
    weight:
      j.degraded || j.score <= 0 || totalScore === 0
        ? 0
        : j.score / totalScore,
  }));

  const allocated = scores.reduce((a, b) => a + b.weight, 0);
  // Floating-point guard, then derive cash as the remainder.
  const cashWeight = Math.max(0, 1 - allocated);
  return { scores, cashWeight };
}

// --- The fallback judge (no API key needed) ----------------------------------

function fallbackJudge(t: Trader): Omit<TraderScore, "weight"> {
  const f = features(t);

  // Degraded if the recent edge has turned negative, OR collapsed to less than
  // 30% of what it used to be. This is what catches Icarus.
  const degraded =
    f.recentMean < 0 ||
    (f.earlierMean > 0 && f.recentMean < f.earlierMean * 0.3);

  // Transparent score: reward recent risk-adjusted return + win rate,
  // penalize volatility. Clamped to 0-100.
  const raw =
    50 + f.recentMean * 300 + (f.winRate - 0.5) * 40 - f.stdev * 120;
  const score = Math.max(0, Math.min(100, Math.round(raw)));

  const pct = (x: number) => `${(x * 100).toFixed(0)}%`;
  const rationale = degraded
    ? `Edge degrading: last-3 avg ${pct(f.recentMean)} vs prior ${pct(f.earlierMean)}. Pull allocation.`
    : `Recent avg ${pct(f.recentMean)}, win rate ${pct(f.winRate)}, vol ${pct(f.stdev)}.`;

  return { id: t.id, label: t.label, score, degraded, rationale };
}

// --- The Claude judge --------------------------------------------------------

const SYSTEM_PROMPT = `You are a copy-trading risk analyst. You are given several traders, each with a short history of recent trade returns. For EACH trader, decide:
- score: integer 0-100, how much you'd trust copying them right now (risk-adjusted, recency-weighted; reward consistency, punish blowups and decaying edge).
- degraded: true if their edge has recently broken down (recent returns turned negative or collapsed vs their earlier performance) and you would PULL allocation. This is a protective signal — be willing to flag it.
- rationale: one sentence, max 140 characters, plain and specific.

Return ONLY a JSON array, one object per trader, in the same order, shaped:
[{"id": string, "score": number, "degraded": boolean, "rationale": string}]
No prose, no markdown fences.`;

function traderDigest(t: Trader): string {
  const f = features(t);
  const seq = t.recentTrades
    .map((x) => `${x.returnPct >= 0 ? "+" : ""}${(x.returnPct * 100).toFixed(0)}%`)
    .join(", ");
  return `id=${t.id} label=${t.label}
  recent returns (oldest→newest): ${seq}
  total=${(f.total * 100).toFixed(0)}% last3avg=${(f.recentMean * 100).toFixed(0)}% prioravg=${(f.earlierMean * 100).toFixed(0)}% winRate=${(f.winRate * 100).toFixed(0)}% vol=${(f.stdev * 100).toFixed(0)}%`;
}

async function claudeJudge(
  traders: Trader[],
  apiKey: string,
): Promise<Omit<TraderScore, "weight">[]> {
  const userContent = `Traders:\n\n${traders.map(traderDigest).join("\n\n")}`;

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 1024,
      system: [
        {
          type: "text",
          text: SYSTEM_PROMPT,
          cache_control: { type: "ephemeral" }, // stable across runs → cache it
        },
      ],
      messages: [{ role: "user", content: userContent }],
    }),
  });

  if (!res.ok) {
    throw new Error(`Anthropic API ${res.status}: ${await res.text()}`);
  }

  const data = (await res.json()) as { content: { type: string; text?: string }[] };
  const text = data.content.find((b) => b.type === "text")?.text ?? "";

  // Be forgiving about any stray wrapping: grab the JSON array.
  const start = text.indexOf("[");
  const end = text.lastIndexOf("]");
  if (start === -1 || end === -1) {
    throw new Error(`Claude returned no JSON array:\n${text}`);
  }
  const parsed = JSON.parse(text.slice(start, end + 1)) as {
    id: string;
    score: number;
    degraded: boolean;
    rationale: string;
  }[];

  // Map back onto our traders by id so order/labels are trustworthy.
  return traders.map((t) => {
    const j = parsed.find((p) => p.id === t.id);
    if (!j) {
      // Model dropped one — fail safe to the heuristic for that trader only.
      return fallbackJudge(t);
    }
    return {
      id: t.id,
      label: t.label,
      score: Math.max(0, Math.min(100, Math.round(j.score))),
      degraded: Boolean(j.degraded),
      rationale: String(j.rationale).slice(0, 140),
    };
  });
}

// --- Public entry point ------------------------------------------------------

export async function scoreTraders(traders: Trader[]): Promise<ScoringResult> {
  const apiKey = process.env.ANTHROPIC_API_KEY;

  let engine: Engine;
  let judged: Omit<TraderScore, "weight">[];

  if (apiKey) {
    try {
      judged = await claudeJudge(traders, apiKey);
      engine = "claude";
    } catch (err) {
      // Don't crash a live demo over an API blip — degrade to the heuristic.
      console.warn(`[scorer] Claude call failed, using fallback: ${(err as Error).message}`);
      judged = traders.map(fallbackJudge);
      engine = "fallback";
    }
  } else {
    judged = traders.map(fallbackJudge);
    engine = "fallback";
  }

  const { scores, cashWeight } = applyWeights(judged);
  return { engine, scores, cashWeight };
}
