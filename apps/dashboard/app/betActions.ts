"use server";

import { config as loadEnv } from "dotenv";
import { resolve } from "node:path";
import { type Hex } from "viem";

import {
  DEFAULT_POLICY,
  polymarketSource,
  type Policy,
  type AccountState,
} from "@arc-agent-pay/shared";
import { analyzeMarkets, analyzeMarketDeep, settleMarketBets, type SettleReport } from "@arc-agent-pay/agent-runtime";
import { readFrozen } from "./agentState";

loadEnv({ path: resolve(process.cwd(), "../../.env") });

export type BetRow = {
  id: string;
  question: string;
  marketProb: number; // market's YES price
  modelProb: number; // AI's estimate of true YES probability
  side: "YES" | "NO" | "SKIP";
  edge: number;
  conviction: number;
  rationale: string;
  weight: number;
  volumeUsd: number;
  url: string;
};

export type BetAnalysis = {
  engine: "claude" | "fallback";
  cashWeight: number;
  rows: BetRow[];
};

// Browse the full list of eligible Polymarket markets (no AI judgment).
export type MarketRow = {
  id: string;
  question: string;
  yesPrice: number;
  noPrice: number;
  volumeUsd: number;
  endDate?: string;
  url: string;
  category: string;
};

export async function listMarketsAction(limit = 500): Promise<MarketRow[]> {
  // Broadest filter — show all binary YES/NO markets, including near-certain
  // ones, so users see the full breadth of what's live on Polymarket.
  const markets = await polymarketSource({ limit, minYes: 0, maxYes: 1 }).getMarkets();
  return markets.map((m) => ({
    id: m.id,
    question: m.question,
    yesPrice: m.yesPrice,
    noPrice: m.noPrice,
    volumeUsd: m.volumeUsd,
    endDate: m.endDate,
    url: m.url,
    category: m.category,
  }));
}

// Deep analysis of a single specific market — the paid product. Returns
// background, recent events, scenarios, recommendation, and what would
// change the call.
export type SingleMarketPick = {
  id: string;
  question: string;
  marketProb: number;
  modelProb: number;
  side: "YES" | "NO" | "SKIP";
  edge: number;
  conviction: number;
  rationale: string;
  url: string;
  background: string[];
  recentEvents: string[];
  scenarios: { path: string; resolvesTo: "YES" | "NO"; likelihood: number }[];
  recommendation: string;
  changeMyMind: string;
};

export async function analyzeOneMarketAction(marketId: string): Promise<SingleMarketPick | null> {
  // Pull a wide pool so we can find the requested market by id.
  const pool = await polymarketSource({ limit: 500, minYes: 0, maxYes: 1 }).getMarkets();
  const market = pool.find((m) => m.id === marketId);
  if (!market) return null;
  const pick = await analyzeMarketDeep(market);
  return {
    id: pick.id,
    question: pick.question,
    marketProb: pick.marketProb,
    modelProb: pick.modelProb,
    side: pick.side,
    edge: pick.edge,
    conviction: pick.conviction,
    rationale: pick.rationale,
    url: market.url,
    background: pick.background,
    recentEvents: pick.recentEvents,
    scenarios: pick.scenarios,
    recommendation: pick.recommendation,
    changeMyMind: pick.changeMyMind,
  };
}

// Parse a polymarket.com URL (or bare slug) and analyze that market with Claude.
// Accepts forms:
//   https://polymarket.com/event/SLUG
//   https://polymarket.com/market/SLUG
//   https://polymarket.com/event/PARENT/CHILD
//   bare slug like "will-trump-pardon-himself"
export async function analyzeByUrlAction(input: string): Promise<
  | { ok: true; pick: SingleMarketPick }
  | { ok: false; error: string }
> {
  const trimmed = input.trim();
  if (!trimmed) return { ok: false, error: "Paste a Polymarket market URL or slug." };

  // Extract slug from input
  let slug = trimmed;
  try {
    if (/^https?:\/\//i.test(trimmed)) {
      const u = new URL(trimmed);
      const parts = u.pathname.split("/").filter(Boolean);
      // /event/SLUG or /market/SLUG → take the LAST segment as the slug
      slug = parts[parts.length - 1] ?? "";
    }
  } catch {
    // Not a URL, treat as slug
  }
  slug = slug.replace(/[^a-z0-9-]/gi, "").toLowerCase();
  if (!slug) return { ok: false, error: "Couldn't read a market slug from that input." };

  // Try fetching by market slug first, then by event slug
  const tryFetch = async (param: string) => {
    const url = `https://gamma-api.polymarket.com/markets?${param}=${encodeURIComponent(slug)}`;
    const res = await fetch(url, { headers: { Accept: "application/json" } });
    if (!res.ok) return [];
    const raw = (await res.json()) as unknown;
    const rows = Array.isArray(raw) ? raw : ((raw as { data?: unknown[] }).data ?? []);
    return rows as Record<string, unknown>[];
  };

  let rows = await tryFetch("slug");
  if (rows.length === 0) rows = await tryFetch("event_slug");
  if (rows.length === 0) {
    return { ok: false, error: `No live market found for "${slug}".` };
  }

  // Normalize to PredictionMarket shape (lift the parse logic inline rather
  // than re-importing the package's internal helpers).
  const parseArr = (v: unknown): string[] => {
    if (Array.isArray(v)) return v as string[];
    if (typeof v === "string") {
      try {
        const p = JSON.parse(v);
        return Array.isArray(p) ? p : [];
      } catch {
        return [];
      }
    }
    return [];
  };

  // Prefer the first binary YES/NO market in the result set.
  let chosen: Record<string, unknown> | null = null;
  let yesPrice = 0.5;
  let noPrice = 0.5;
  for (const m of rows) {
    const outcomes = parseArr(m.outcomes);
    const prices = parseArr(m.outcomePrices).map(Number);
    if (outcomes.length !== 2 || prices.length !== 2) continue;
    const yesIdx = outcomes.findIndex((o) => /^yes$/i.test(o.trim()));
    if (yesIdx === -1) continue;
    chosen = m;
    yesPrice = prices[yesIdx]!;
    noPrice = prices[1 - yesIdx]!;
    break;
  }

  if (!chosen) {
    return { ok: false, error: "That market isn't a binary YES/NO — we can only analyze binary markets right now." };
  }

  const market = {
    id: String(chosen.id ?? chosen.conditionId ?? slug),
    slug,
    question: String(chosen.question ?? "?"),
    yesPrice,
    noPrice,
    volumeUsd: Number(chosen.volumeNum ?? chosen.volume ?? 0),
    endDate: chosen.endDate ? String(chosen.endDate) : undefined,
    url: `https://polymarket.com/event/${slug}`,
    category: "Other",
  };

  const pick = await analyzeMarketDeep(market);
  if (!pick) return { ok: false, error: "Couldn't analyze that market." };

  return {
    ok: true,
    pick: {
      id: pick.id,
      question: pick.question,
      marketProb: pick.marketProb,
      modelProb: pick.modelProb,
      side: pick.side,
      edge: pick.edge,
      conviction: pick.conviction,
      rationale: pick.rationale,
      url: market.url,
      background: pick.background,
      recentEvents: pick.recentEvents,
      scenarios: pick.scenarios,
      recommendation: pick.recommendation,
      changeMyMind: pick.changeMyMind,
    },
  };
}

// Pull live Polymarket markets and run the brain over them.
// Tighter price band: skip near-certain markets where no real edge can exist.
// If `category` is given, only analyze markets in that category.
export async function analyzeMarketsAction(count = 20, category?: string): Promise<BetAnalysis> {
  // Pull more than `count` so the category filter has room to find enough hits.
  const pool = await polymarketSource({ limit: 300, minYes: 0.1, maxYes: 0.9 }).getMarkets();
  const filtered = category && category !== "All"
    ? pool.filter((m) => m.category === category)
    : pool;
  const markets = filtered.slice(0, count);
  const result = await analyzeMarkets(markets);
  const volById = new Map(markets.map((m) => [m.id, m.volumeUsd]));
  const urlById = new Map(markets.map((m) => [m.id, m.url]));

  const rows: BetRow[] = result.picks.map((p) => ({
    id: p.id,
    question: p.question,
    marketProb: p.marketProb,
    modelProb: p.modelProb,
    side: p.side,
    edge: p.edge,
    conviction: p.conviction,
    rationale: p.rationale,
    weight: p.weight,
    volumeUsd: volById.get(p.id) ?? 0,
    url: urlById.get(p.id) ?? "https://polymarket.com",
  }));
  // Bets first (by weight), then skips.
  rows.sort((a, b) => b.weight - a.weight || b.conviction - a.conviction);

  return { engine: result.engine, cashWeight: result.cashWeight, rows };
}

// Settle a fresh bet plan on Arc. Honors the kill switch.
export async function settleBetsAction(potUsdc: number, autoApprove = false, category?: string): Promise<SettleReport> {
  const agentPk = process.env.AGENT_EOA_PK as Hex | undefined;
  if (!agentPk) throw new Error("AGENT_EOA_PK missing — provision the agent wallet first.");

  const pool = await polymarketSource({ limit: 300, minYes: 0.1, maxYes: 0.9 }).getMarkets();
  const filtered = category && category !== "All"
    ? pool.filter((m) => m.category === category)
    : pool;
  const markets = filtered.slice(0, 20);
  const frozen = await readFrozen();
  const policy: Policy = { ...DEFAULT_POLICY, killed: frozen };
  const state: AccountState = {
    now: Math.floor(Date.now() / 1000),
    spentTodayUsdc: "0.00",
    lastTransferAt: null,
  };

  return settleMarketBets({ markets, policy, potUsdc, agentPk, state, autoApprove });
}
