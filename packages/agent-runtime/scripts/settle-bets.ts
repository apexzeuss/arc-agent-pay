// Full prediction-market loop: real markets -> AI bets -> policy -> settle on Arc.
//
//   npm run settle-bets                  # dry-run (no funds needed)
//   npm run settle-bets -- --execute     # real testnet USDC
//   npm run settle-bets -- --execute --approve --pot=6
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
  DEFAULT_POLICY,
  polymarketSource,
  type AccountState,
} from "@arc-agent-pay/shared";
import { settleMarketBets } from "../src/market-executor";

loadEnv({ path: resolve(dirname(fileURLToPath(import.meta.url)), "../../../.env") });

const args = process.argv.slice(2);
const execute = args.includes("--execute");
const autoApprove = args.includes("--approve");
const potArg = args.find((a) => a.startsWith("--pot="));
const potUsdc = potArg ? Number(potArg.split("=")[1]) : 6;

const agentPk = process.env.AGENT_EOA_PK as Hex | undefined;
if (!agentPk) {
  console.error("No AGENT_EOA_PK in .env. Run `npm run simple-agent` once to create the agent wallet.");
  process.exit(1);
}
const agent = privateKeyToAccount(agentPk);

console.log("Fetching live Polymarket markets…");
const markets = await polymarketSource().getMarkets();
const state: AccountState = { now: Math.floor(Date.now() / 1000), spentTodayUsdc: "0.00", lastTransferAt: null };

if (execute) {
  const publicClient = createPublicClient({ chain: arcTestnet, transport: http() });
  const usdc = await publicClient.readContract({
    address: USDC_ADDRESS_ARC_TESTNET, abi: erc20Abi, functionName: "balanceOf", args: [agent.address],
  });
  console.log(`\nAgent ${agent.address}  ·  balance ${formatUnits(usdc, USDC_DECIMALS)} USDC`);
  if (usdc < parseUnits(String(potUsdc), USDC_DECIMALS)) {
    console.log(`⚠ Needs ~${potUsdc} USDC. Fund from MetaMask, then re-run with --execute.\n`);
  }
}

const report = await settleMarketBets({ markets, policy: DEFAULT_POLICY, potUsdc, agentPk, state, dryRun: !execute, autoApprove });

console.log(`\n=== Bet Settlement ${report.dryRun ? "(DRY RUN)" : "(LIVE on Arc)"} — pot ${report.potUsdc} USDC ===`);
console.log(`brain: ${report.engine}\n`);

for (const leg of report.legs) {
  const q = leg.pick.question.slice(0, 56);
  const head = `${leg.pick.side} $${leg.intent.amountUsdc}`;
  if (leg.executed) {
    console.log(`  ✓ ${head}  ${q}`);
    console.log(`      ${leg.explorer}`);
  } else if (leg.error) {
    console.log(`  ✗ ${head}  ${q}\n      ERROR: ${leg.error}`);
  } else {
    console.log(`  ${leg.verdict === "deny" ? "✗" : "⏸"} ${head}  ${q}  (${leg.heldReason ?? leg.verdict})`);
  }
}

const sent = report.legs.filter((l) => l.executed);
console.log(`\n${sent.length} bet(s) settled${report.dryRun ? " — none (dry run)" : ""}.`);
if (report.dryRun) console.log("Re-run with --execute to settle real testnet USDC.\n");
