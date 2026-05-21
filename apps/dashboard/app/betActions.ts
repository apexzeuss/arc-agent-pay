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
import { analyzeMarkets, settleMarketBets, type SettleReport } from "@arc-agent-pay/agent-runtime";
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

// Pull live Polymarket markets and run the brain over them.
export async function analyzeMarketsAction(): Promise<BetAnalysis> {
  const markets = await polymarketSource().getMarkets();
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
export async function settleBetsAction(potUsdc: number, autoApprove = false): Promise<SettleReport> {
  const agentPk = process.env.AGENT_EOA_PK as Hex | undefined;
  if (!agentPk) throw new Error("AGENT_EOA_PK missing — provision the agent wallet first.");

  const markets = await polymarketSource().getMarkets();
  const frozen = await readFrozen();
  const policy: Policy = { ...DEFAULT_POLICY, killed: frozen };
  const state: AccountState = {
    now: Math.floor(Date.now() / 1000),
    spentTodayUsdc: "0.00",
    lastTransferAt: null,
  };

  return settleMarketBets({ markets, policy, potUsdc, agentPk, state, autoApprove });
}
