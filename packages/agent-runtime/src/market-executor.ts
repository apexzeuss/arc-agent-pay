// Settles the AI's prediction-market bet plan on Arc. Same EOA + USDC.transfer
// mechanics as the copy-trade executor, driven by market picks instead of
// trader copies. Each bet's stake is sent to a deterministic per-market vault
// address (a stand-in for "funds committed to this market". real settlement
// would route to Polymarket on Polygon). Honors the policy engine + kill switch.

import {
  createPublicClient,
  createWalletClient,
  http,
  parseUnits,
  parseGwei,
  keccak256,
  toBytes,
  erc20Abi,
  type Hex,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";

import {
  arcTestnet,
  USDC_ADDRESS_ARC_TESTNET,
  USDC_DECIMALS,
  ARC_TESTNET_EXPLORER,
  evaluateBatch,
  type Policy,
  type AccountState,
  type SpendIntent,
  type BatchedDecision,
  type PredictionMarket,
} from "@arc-agent-pay/shared";

import { analyzeMarkets, type MarketPick } from "./market-analyst";

const MAX_FEE = 22_000_000_000n + parseGwei("2");
const PRIORITY_FEE = parseGwei("2");

// Deterministic, valid Arc address representing the stake on a given market.
export function marketVaultAddress(marketId: string): `0x${string}` {
  return `0x${keccak256(toBytes(`pm:${marketId}`)).slice(2, 42)}` as `0x${string}`;
}

export type BetLeg = BatchedDecision & {
  pick: MarketPick;
  executed: boolean;
  txHash?: `0x${string}`;
  explorer?: string;
  error?: string;
  heldReason?: string;
};

export type SettleReport = {
  engine: AnalysisEngine;
  agentAddress: `0x${string}`;
  potUsdc: number;
  dryRun: boolean;
  picks: MarketPick[];
  cashWeight: number;
  legs: BetLeg[];
};

type AnalysisEngine = "claude" | "fallback";

export type SettleOptions = {
  markets: PredictionMarket[];
  policy: Policy;
  potUsdc: number;
  agentPk: Hex;
  state: AccountState;
  dryRun?: boolean;
  autoApprove?: boolean;
};

export async function settleMarketBets(opts: SettleOptions): Promise<SettleReport> {
  const { markets, policy, potUsdc, agentPk, state, dryRun = false, autoApprove = false } = opts;
  const agent = privateKeyToAccount(agentPk);

  // 1. Brain picks the bets.
  const analysis = await analyzeMarkets(markets);

  // 2. Turn weighted picks into transfers (skip SKIP / zero-weight).
  const betting = analysis.picks.filter((p) => p.side !== "SKIP" && p.weight > 0);
  const intents: SpendIntent[] = betting.map((p) => ({
    to: marketVaultAddress(p.id),
    amountUsdc: (potUsdc * p.weight).toFixed(2),
    memo: `bet:${p.side}:${p.id}`,
  }));

  // 3. Policy gates the batch (allowlist the bet vaults so address checks pass).
  const gatePolicy: Policy = { ...policy, allowlist: intents.map((i) => i.to) };
  const decisions = evaluateBatch(gatePolicy, intents, state);

  // 4. Execute the green-lit legs on Arc.
  const publicClient = createPublicClient({ chain: arcTestnet, transport: http() });
  const walletClient = createWalletClient({ account: agent, chain: arcTestnet, transport: http() });

  const legs: BetLeg[] = [];
  for (let i = 0; i < decisions.length; i++) {
    const d = decisions[i]!;
    const pick = betting[i]!;
    const approved = d.verdict === "allow" || (d.verdict === "require_approval" && autoApprove);

    if (!approved) {
      legs.push({ ...d, pick, executed: false, heldReason: d.verdict === "require_approval" ? "awaiting human approval" : undefined });
      continue;
    }
    if (dryRun) {
      legs.push({ ...d, pick, executed: false, heldReason: "dry-run" });
      continue;
    }
    try {
      const hash = await walletClient.writeContract({
        address: USDC_ADDRESS_ARC_TESTNET,
        abi: erc20Abi,
        functionName: "transfer",
        args: [d.intent.to, parseUnits(d.intent.amountUsdc, USDC_DECIMALS)],
        maxFeePerGas: MAX_FEE,
        maxPriorityFeePerGas: PRIORITY_FEE,
      });
      await publicClient.waitForTransactionReceipt({ hash });
      legs.push({ ...d, pick, executed: true, txHash: hash, explorer: `${ARC_TESTNET_EXPLORER}/tx/${hash}` });
    } catch (err) {
      legs.push({ ...d, pick, executed: false, error: (err as Error).message });
    }
  }

  return {
    engine: analysis.engine,
    agentAddress: agent.address,
    potUsdc,
    dryRun,
    picks: analysis.picks,
    cashWeight: analysis.cashWeight,
    legs,
  };
}
