// The hands. Takes the policy-gated rebalance and actually moves USDC on Arc,
// reusing the same EOA + viem transfer mechanics proven in simple-agent.ts.
//
// Only `allow` legs execute. `require_approval` legs are held back unless
// `autoApprove` is set (i.e. a human has signed off). `deny` legs never run.
// `dryRun` plans and gates everything but writes nothing on-chain — so the
// whole pipeline is testable with zero funds.

import {
  createPublicClient,
  createWalletClient,
  http,
  parseUnits,
  parseGwei,
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
  type Trader,
} from "@arc-agent-pay/shared";

import { scoreTraders, type Engine, type TraderScore } from "./scorer";

export type ExecutionLeg = BatchedDecision & {
  executed: boolean;
  txHash?: `0x${string}`;
  explorer?: string;
  error?: string;
  heldReason?: string; // why a non-denied leg didn't execute (approval / dry-run)
};

export type RebalanceReport = {
  engine: Engine;
  agentAddress: `0x${string}`;
  potUsdc: number;
  dryRun: boolean;
  scores: TraderScore[];
  cashWeight: number;
  legs: ExecutionLeg[];
};

export type RebalanceOptions = {
  traders: Trader[];
  policy: Policy;
  potUsdc: number;
  agentPk: Hex;
  state: AccountState;
  dryRun?: boolean;
  autoApprove?: boolean; // human signed off → execute require_approval legs too
};

// Same gas shape as simple-agent.ts: Arc base fee ~22 gwei + 2 gwei priority.
const MAX_FEE = 22_000_000_000n + parseGwei("2");
const PRIORITY_FEE = parseGwei("2");

export async function rebalance(opts: RebalanceOptions): Promise<RebalanceReport> {
  const { traders, policy, potUsdc, agentPk, state, dryRun = false, autoApprove = false } = opts;

  const agent = privateKeyToAccount(agentPk);

  // 1. Brain decides weights.
  const scoring = await scoreTraders(traders);

  // 2. Turn weights into concrete transfers (skip zero-weight / pulled traders).
  const addressById = new Map(traders.map((t) => [t.id, t.address]));
  const intents: SpendIntent[] = scoring.scores
    .filter((s) => s.weight > 0)
    .map((s) => ({
      to: addressById.get(s.id)!,
      amountUsdc: (potUsdc * s.weight).toFixed(2),
      memo: `copy:${s.id}`,
    }));

  // 3. Policy gates the batch.
  const decisions = evaluateBatch(policy, intents, state);

  // 4. Execute the green-lit legs on-chain.
  const publicClient = createPublicClient({ chain: arcTestnet, transport: http() });
  const walletClient = createWalletClient({ account: agent, chain: arcTestnet, transport: http() });

  const legs: ExecutionLeg[] = [];
  for (const d of decisions) {
    const approved = d.verdict === "allow" || (d.verdict === "require_approval" && autoApprove);

    if (!approved) {
      legs.push({
        ...d,
        executed: false,
        heldReason: d.verdict === "require_approval" ? "awaiting human approval" : undefined,
      });
      continue;
    }

    if (dryRun) {
      legs.push({ ...d, executed: false, heldReason: "dry-run" });
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
      // Await each receipt so nonces stay ordered across legs.
      await publicClient.waitForTransactionReceipt({ hash });
      legs.push({
        ...d,
        executed: true,
        txHash: hash,
        explorer: `${ARC_TESTNET_EXPLORER}/tx/${hash}`,
      });
    } catch (err) {
      legs.push({ ...d, executed: false, error: (err as Error).message });
    }
  }

  return {
    engine: scoring.engine,
    agentAddress: agent.address,
    potUsdc,
    dryRun,
    scores: scoring.scores,
    cashWeight: scoring.cashWeight,
    legs,
  };
}
