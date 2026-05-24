import { parseUnits } from "viem";
import { USDC_DECIMALS } from "./arc";

export type Policy = {
  perTxCapUsdc: string;
  dailyCapUsdc: string;
  cooldownSeconds: number;
  // Empty allowlist means "any recipient". A populated list means agent
  // can only transact with those addresses. Enforced in code today;
  // intended to move on-chain in a future Solidity policy module.
  allowlist: readonly `0x${string}`[];
  // Transfers strictly above this need a human sign-off (verdict
  // "require_approval"). Must be <= perTxCapUsdc to be reachable.
  approvalThresholdUsdc: string;
  // The kill switch. When true, every transfer is denied. full stop.
  killed: boolean;
};

export const DEFAULT_POLICY: Policy = {
  perTxCapUsdc: "5.00",
  dailyCapUsdc: "25.00",
  cooldownSeconds: 5,
  allowlist: [],
  approvalThresholdUsdc: "4.00",
  killed: false,
};

// --- The policy engine -------------------------------------------------------
// Pure functions over (policy, intent, state). No I/O, no chain calls. so it's
// trivially testable and ports cleanly to a Solidity policy module later. All
// money math is done in USDC base units (6-dec bigint) to avoid float drift.

export type SpendIntent = {
  to: `0x${string}`;
  amountUsdc: string; // human units, e.g. "4.00"
  memo?: string; // e.g. the trader id this allocation copies
};

// A point-in-time view of the agent account the engine reasons over.
export type AccountState = {
  now: number; // unix seconds
  spentTodayUsdc: string; // sum of USDC already sent in the current day
  lastTransferAt: number | null; // unix seconds of the most recent transfer
};

export type Verdict = "allow" | "deny" | "require_approval";

export type Decision = {
  verdict: Verdict;
  reason: string;
};

const usdc = (v: string) => parseUnits(v, USDC_DECIMALS);

export function evaluate(
  policy: Policy,
  intent: SpendIntent,
  state: AccountState,
): Decision {
  if (policy.killed) {
    return { verdict: "deny", reason: "Kill switch engaged. all transfers blocked." };
  }

  const amount = usdc(intent.amountUsdc);
  if (amount <= 0n) {
    return { verdict: "deny", reason: "Transfer amount must be positive." };
  }

  if (policy.allowlist.length > 0 && !policy.allowlist.includes(intent.to)) {
    return { verdict: "deny", reason: `Recipient ${intent.to} is not on the allowlist.` };
  }

  if (
    state.lastTransferAt !== null &&
    state.now - state.lastTransferAt < policy.cooldownSeconds
  ) {
    const wait = policy.cooldownSeconds - (state.now - state.lastTransferAt);
    return { verdict: "deny", reason: `Cooldown active. ${wait}s until next transfer allowed.` };
  }

  if (amount > usdc(policy.perTxCapUsdc)) {
    return {
      verdict: "deny",
      reason: `Exceeds per-tx cap (${intent.amountUsdc} > ${policy.perTxCapUsdc} USDC).`,
    };
  }

  if (usdc(state.spentTodayUsdc) + amount > usdc(policy.dailyCapUsdc)) {
    return {
      verdict: "deny",
      reason: `Would exceed daily cap (${state.spentTodayUsdc} + ${intent.amountUsdc} > ${policy.dailyCapUsdc} USDC).`,
    };
  }

  if (amount > usdc(policy.approvalThresholdUsdc)) {
    return {
      verdict: "require_approval",
      reason: `Above approval threshold (${intent.amountUsdc} > ${policy.approvalThresholdUsdc} USDC). needs human sign-off.`,
    };
  }

  return { verdict: "allow", reason: "Within all policy limits." };
}

// A copy-trade rebalance fires several transfers as ONE event. Cooldown is
// checked once for the whole batch (legs of one rebalance don't block each
// other), but the daily-cap accumulates leg by leg. so an oversized rebalance
// gets truncated rather than blowing the budget.
export type BatchedDecision = Decision & { intent: SpendIntent };

export function evaluateBatch(
  policy: Policy,
  intents: SpendIntent[],
  state: AccountState,
): BatchedDecision[] {
  let runningSpent = usdc(state.spentTodayUsdc);
  // Neutralize per-leg cooldown within the batch: all legs share the batch's
  // single cooldown check by pinning lastTransferAt far enough back.
  const cooldownOkState: AccountState = {
    ...state,
    lastTransferAt:
      state.lastTransferAt !== null &&
      state.now - state.lastTransferAt < policy.cooldownSeconds
        ? state.lastTransferAt // still in cooldown. let evaluate() deny all legs
        : null,
  };

  return intents.map((intent) => {
    const legState: AccountState = {
      ...cooldownOkState,
      spentTodayUsdc: formatUsdcBase(runningSpent),
    };
    const decision = evaluate(policy, intent, legState);
    // Only allowed/approved legs consume budget.
    if (decision.verdict !== "deny") {
      runningSpent += usdc(intent.amountUsdc);
    }
    return { ...decision, intent };
  });
}

// Local base-unit → string helper (avoids importing formatUnits everywhere).
function formatUsdcBase(base: bigint): string {
  const negative = base < 0n;
  const abs = negative ? -base : base;
  const denom = 10n ** BigInt(USDC_DECIMALS);
  const whole = abs / denom;
  const frac = (abs % denom).toString().padStart(USDC_DECIMALS, "0");
  return `${negative ? "-" : ""}${whole}.${frac}`;
}
