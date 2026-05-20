"use server";

import { config as loadEnv } from "dotenv";
import { resolve } from "node:path";
import { type Hex } from "viem";

import {
  DEFAULT_POLICY,
  seededTraderSource,
  type Policy,
  type AccountState,
} from "@arc-agent-pay/shared";
import { scoreTraders, rebalance, type RebalanceReport } from "@arc-agent-pay/agent-runtime";
import { readFrozen } from "./agentState";

loadEnv({ path: resolve(process.cwd(), "../../.env") });

// One row the Copy Desk renders: trader identity + Claude's verdict + weight.
export type DeskRow = {
  id: string;
  label: string;
  address: string;
  bio: string;
  asset: string; // the market this trader trades (ETH, BTC, SOL…)
  score: number;
  degraded: boolean;
  rationale: string;
  weight: number; // 0..1
  returns: number[]; // recent trade returns, for the sparkline
};

export type DeskAnalysis = {
  engine: "claude" | "fallback";
  cashWeight: number;
  rows: DeskRow[];
};

// Run the brain over the seeded traders and return everything the UI needs.
export async function analyzeTraders(): Promise<DeskAnalysis> {
  const traders = await seededTraderSource().getTraders();
  const result = await scoreTraders(traders);
  const byId = new Map(traders.map((t) => [t.id, t]));

  const rows: DeskRow[] = result.scores.map((s) => {
    const t = byId.get(s.id)!;
    return {
      id: s.id,
      label: s.label,
      address: t.address,
      bio: t.bio,
      asset: t.recentTrades[0]?.asset ?? "—",
      score: s.score,
      degraded: s.degraded,
      rationale: s.rationale,
      weight: s.weight,
      returns: t.recentTrades.map((x) => x.returnPct),
    };
  });

  // Highest weight first; pulled (degraded) traders sink to the bottom.
  rows.sort((a, b) => b.weight - a.weight || b.score - a.score);

  return { engine: result.engine, cashWeight: result.cashWeight, rows };
}

// Execute a real copy rebalance on Arc. Honors the kill switch (sets
// policy.killed), allowlists the trader addresses, and runs the same executor
// the CLI uses. Returns the per-leg report (tx hashes for settled legs).
export async function runRebalance(
  potUsdc: number,
  autoApprove = false,
): Promise<RebalanceReport> {
  const agentPk = process.env.AGENT_EOA_PK as Hex | undefined;
  if (!agentPk) throw new Error("AGENT_EOA_PK missing — provision the agent wallet first.");

  const traders = await seededTraderSource().getTraders();
  const frozen = await readFrozen();

  const policy: Policy = {
    ...DEFAULT_POLICY,
    allowlist: traders.map((t) => t.address),
    killed: frozen, // kill switch → policy denies every leg
  };

  const state: AccountState = {
    now: Math.floor(Date.now() / 1000),
    spentTodayUsdc: "0.00",
    lastTransferAt: null,
  };

  return rebalance({ traders, policy, potUsdc, agentPk, state, autoApprove });
}
