// Run the full agent loop: traders → score → policy → execute on Arc.
//
//   npm run rebalance                    # dry-run (default, no funds needed)
//   npm run rebalance -- --execute       # real testnet transfers
//   npm run rebalance -- --execute --approve   # also auto-sign approval legs
//   npm run rebalance -- --pot=8 --execute     # set the pot size
import { config as loadEnv } from "dotenv";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

import {
  createPublicClient,
  http,
  formatUnits,
  parseUnits,
  erc20Abi,
  type Hex,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";

import {
  arcTestnet,
  USDC_ADDRESS_ARC_TESTNET,
  USDC_DECIMALS,
  ARC_TESTNET_EXPLORER,
  DEFAULT_POLICY,
  seededTraderSource,
  type Policy,
  type AccountState,
} from "@arc-agent-pay/shared";
import { rebalance } from "../src/executor";

loadEnv({ path: resolve(dirname(fileURLToPath(import.meta.url)), "../../../.env") });

const args = process.argv.slice(2);
const execute = args.includes("--execute");
const autoApprove = args.includes("--approve");
const potArg = args.find((a) => a.startsWith("--pot="));
const potUsdc = potArg ? Number(potArg.split("=")[1]) : 12;

const agentPk = process.env.AGENT_EOA_PK as Hex | undefined;
if (!agentPk) {
  console.error("No AGENT_EOA_PK in .env. Run `npm run simple-agent` once to create the agent wallet, then fund it.");
  process.exit(1);
}
const agent = privateKeyToAccount(agentPk);

const traders = await seededTraderSource().getTraders();
const policy: Policy = { ...DEFAULT_POLICY, allowlist: traders.map((t) => t.address) };
const state: AccountState = { now: Math.floor(Date.now() / 1000), spentTodayUsdc: "0.00", lastTransferAt: null };

// Pre-flight: if we intend to execute, make sure the agent can pay.
if (execute) {
  const publicClient = createPublicClient({ chain: arcTestnet, transport: http() });
  const [usdc, gas] = await Promise.all([
    publicClient.readContract({ address: USDC_ADDRESS_ARC_TESTNET, abi: erc20Abi, functionName: "balanceOf", args: [agent.address] }),
    publicClient.getBalance({ address: agent.address }),
  ]);
  const needed = parseUnits(String(potUsdc), USDC_DECIMALS);
  console.log(`\nAgent ${agent.address}`);
  console.log(`  USDC balance : ${formatUnits(usdc, USDC_DECIMALS)}`);
  if (gas === 0n || usdc < needed) {
    console.log(`\n⚠ Agent needs ~${potUsdc} USDC (it has ${formatUnits(usdc, USDC_DECIMALS)}). Fund it from MetaMask:`);
    console.log(`  Send ${potUsdc} USDC on Arc Testnet to ${agent.address}, then re-run with --execute.`);
    console.log(`  (Running a dry-run instead so you can see the plan.)\n`);
  }
}

const report = await rebalance({ traders, policy, potUsdc, agentPk, state, dryRun: !execute, autoApprove });

console.log(`\n=== Rebalance ${report.dryRun ? "(DRY RUN)" : "(LIVE on Arc testnet)"} — pot ${report.potUsdc} USDC ===`);
console.log(`brain: ${report.engine}\n`);

for (const leg of report.legs) {
  const id = (leg.intent.memo ?? "").padEnd(14);
  const amt = leg.intent.amountUsdc.padStart(6);
  if (leg.executed) {
    console.log(`  ✓ ${id} ${amt} USDC  SENT`);
    console.log(`      ${leg.explorer}`);
  } else if (leg.error) {
    console.log(`  ✗ ${id} ${amt} USDC  ERROR: ${leg.error}`);
  } else {
    console.log(`  ${leg.verdict === "deny" ? "✗" : "⏸"} ${id} ${amt} USDC  ${leg.verdict}${leg.heldReason ? ` (${leg.heldReason})` : ""}`);
    console.log(`      ${leg.reason}`);
  }
}

const sent = report.legs.filter((l) => l.executed);
console.log(`\n${sent.length} transfer(s) settled${report.dryRun ? " — none (dry run)" : ""}.`);
if (report.dryRun) console.log("Re-run with --execute to send real testnet USDC.\n");
else console.log("");
