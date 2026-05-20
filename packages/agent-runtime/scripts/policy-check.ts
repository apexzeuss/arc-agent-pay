// Two jobs: (1) assert the policy engine returns the right verdict in each
// case, and (2) show it gating a real copy-trade rebalance built from the
// scorer's plan.
import { config as loadEnv } from "dotenv";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

import {
  evaluate,
  evaluateBatch,
  DEFAULT_POLICY,
  seededTraderSource,
  type Policy,
  type AccountState,
  type SpendIntent,
  type Verdict,
} from "@arc-agent-pay/shared";
import { scoreTraders } from "../src/scorer";

loadEnv({ path: resolve(dirname(fileURLToPath(import.meta.url)), "../../../.env") });

// --- (1) Verdict assertions --------------------------------------------------

const baseState: AccountState = { now: 1_000_000, spentTodayUsdc: "0.00", lastTransferAt: null };
const to = "0xa71a500000000000000000000000000000a71a50" as const;

let pass = 0;
let fail = 0;
function expect(name: string, got: Verdict, want: Verdict) {
  const ok = got === want;
  console.log(`  ${ok ? "✓" : "✗"} ${name.padEnd(40)} → ${got}${ok ? "" : `  (expected ${want})`}`);
  ok ? pass++ : fail++;
}

console.log("\n=== Policy engine assertions ===\n");

expect("within limits → allow", evaluate(DEFAULT_POLICY, { to, amountUsdc: "2.00" }, baseState).verdict, "allow");
expect("over per-tx cap → deny", evaluate(DEFAULT_POLICY, { to, amountUsdc: "9.00" }, baseState).verdict, "deny");
expect("over approval threshold → require_approval", evaluate(DEFAULT_POLICY, { to, amountUsdc: "4.50" }, baseState).verdict, "require_approval");
expect("zero amount → deny", evaluate(DEFAULT_POLICY, { to, amountUsdc: "0" }, baseState).verdict, "deny");

const allowlisted: Policy = { ...DEFAULT_POLICY, allowlist: [to] };
expect("recipient on allowlist → allow", evaluate(allowlisted, { to, amountUsdc: "2.00" }, baseState).verdict, "allow");
expect("recipient off allowlist → deny", evaluate(allowlisted, { to: "0xdecade0000000000000000000000000000decade", amountUsdc: "2.00" }, baseState).verdict, "deny");

const nearDailyCap: AccountState = { ...baseState, spentTodayUsdc: "24.00" };
expect("would exceed daily cap → deny", evaluate(DEFAULT_POLICY, { to, amountUsdc: "2.00" }, nearDailyCap).verdict, "deny");

const inCooldown: AccountState = { now: 1_000_003, spentTodayUsdc: "0.00", lastTransferAt: 1_000_000 };
expect("inside cooldown window → deny", evaluate(DEFAULT_POLICY, { to, amountUsdc: "2.00" }, inCooldown).verdict, "deny");

const killed: Policy = { ...DEFAULT_POLICY, killed: true };
expect("kill switch engaged → deny", evaluate(killed, { to, amountUsdc: "2.00" }, baseState).verdict, "deny");

console.log(`\n${pass} passed, ${fail} failed.\n`);

// --- (2) Gate a real rebalance ----------------------------------------------

const POT_USDC = 12; // size of this rebalance
const traders = await seededTraderSource().getTraders();
const plan = await scoreTraders(traders);
const addressById = new Map(traders.map((t) => [t.id, t.address]));

// Turn copy weights into concrete transfers; skip zero-weight (pulled) traders.
const intents: SpendIntent[] = plan.scores
  .filter((s) => s.weight > 0)
  .map((s) => ({
    to: addressById.get(s.id)!,
    amountUsdc: (POT_USDC * s.weight).toFixed(2),
    memo: `copy:${s.id}`,
  }));

// Allowlist the traders so address checks pass; everything else is DEFAULT_POLICY.
const policy: Policy = { ...DEFAULT_POLICY, allowlist: traders.map((t) => t.address) };
const state: AccountState = { now: Math.floor(Date.now() / 1000), spentTodayUsdc: "0.00", lastTransferAt: null };

console.log(`=== Rebalance of ${POT_USDC} USDC through policy (brain: ${plan.engine}) ===\n`);
for (const d of evaluateBatch(policy, intents, state)) {
  const icon = d.verdict === "allow" ? "✓" : d.verdict === "require_approval" ? "⏸" : "✗";
  console.log(`  ${icon} ${(d.intent.memo ?? "").padEnd(14)} ${d.intent.amountUsdc.padStart(6)} USDC  → ${d.verdict}`);
  console.log(`      ${d.reason}`);
}
console.log("");

if (fail > 0) process.exit(1);
