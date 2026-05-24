import { config as loadEnv } from "dotenv";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { appendFileSync } from "node:fs";

import {
  createPublicClient,
  createWalletClient,
  http,
  formatUnits,
  isAddress,
  parseUnits,
  parseGwei,
  erc20Abi,
  type Hex,
} from "viem";
import { privateKeyToAccount, generatePrivateKey } from "viem/accounts";

import {
  arcTestnet,
  USDC_ADDRESS_ARC_TESTNET,
  USDC_DECIMALS,
  NATIVE_DECIMALS,
  ARC_TESTNET_EXPLORER,
} from "@arc-agent-pay/shared";

// PIVOT from Phase 3: this is a "simple" agent. a plain EOA wallet, not a
// smart account. We keep the smart-account work for when Circle's testnet
// bundler is reliable; for the demo loop, an EOA is enough to prove the
// agent can hold USDC and spend it under code control.

const envPath = resolve(
  dirname(fileURLToPath(import.meta.url)),
  "../../../.env",
);
loadEnv({ path: envPath });

let agentPk = process.env.AGENT_EOA_PK as Hex | undefined;
if (!agentPk) {
  console.log("No AGENT_EOA_PK found. generating a fresh agent wallet (testnet only).");
  agentPk = generatePrivateKey();
  appendFileSync(
    envPath,
    `\n# Simple EOA agent wallet (testnet only. never reuse on mainnet).\nAGENT_EOA_PK=${agentPk}\n`,
    "utf-8",
  );
  console.log(`Saved AGENT_EOA_PK to ${envPath}`);
}

const agent = privateKeyToAccount(agentPk);
const recipient = process.env.ARC_TEST_ADDRESS;
if (!recipient || !isAddress(recipient)) {
  throw new Error("ARC_TEST_ADDRESS missing or invalid in .env");
}

const publicClient = createPublicClient({ chain: arcTestnet, transport: http() });
const walletClient = createWalletClient({ account: agent, chain: arcTestnet, transport: http() });

const [nativeBalance, usdcBalance] = await Promise.all([
  publicClient.getBalance({ address: agent.address }),
  publicClient.readContract({
    address: USDC_ADDRESS_ARC_TESTNET,
    abi: erc20Abi,
    functionName: "balanceOf",
    args: [agent.address],
  }),
]);

console.log("\n=== Simple Agent (EOA) on Arc Testnet ===\n");
console.log(`  Agent address       : ${agent.address}`);
console.log(`  Native USDC (gas)   : ${formatUnits(nativeBalance, NATIVE_DECIMALS)} USDC`);
console.log(`  ERC-20 USDC balance : ${formatUnits(usdcBalance, USDC_DECIMALS)} USDC`);
console.log(`  Explorer            : ${ARC_TESTNET_EXPLORER}/address/${agent.address}`);

const SPEND_AMOUNT = parseUnits("0.5", USDC_DECIMALS);

if (nativeBalance === 0n) {
  console.log(`
Agent has no funds. Fund it now from your MetaMask:

  1. Open MetaMask (make sure Arc Testnet is selected)
  2. Click Send
  3. Recipient: ${agent.address}
  4. Amount: 2 USDC
  5. Confirm

Then re-run \`npm run simple-agent\` and I'll have the agent send 0.5 USDC back to you.
`);
  process.exit(0);
}

if (usdcBalance < SPEND_AMOUNT) {
  console.log(`\nAgent has gas (${formatUnits(nativeBalance, NATIVE_DECIMALS)} USDC) but not enough ERC-20 USDC to spend ${formatUnits(SPEND_AMOUNT, USDC_DECIMALS)}. Send a bit more.`);
  process.exit(0);
}

console.log(`\nAgent spending ${formatUnits(SPEND_AMOUNT, USDC_DECIMALS)} USDC → ${recipient}`);

const hash = await walletClient.writeContract({
  address: USDC_ADDRESS_ARC_TESTNET,
  abi: erc20Abi,
  functionName: "transfer",
  args: [recipient as `0x${string}`, SPEND_AMOUNT],
  maxFeePerGas: 22_000_000_000n + parseGwei("2"), // ~22 gwei + 2 gwei priority
  maxPriorityFeePerGas: parseGwei("2"),
});

console.log(`  Submitted: ${hash}`);
console.log(`  Waiting for confirmation...`);

const receipt = await publicClient.waitForTransactionReceipt({ hash });

console.log(`\n✓ Confirmed`);
console.log(`  Block    : ${receipt.blockNumber}`);
console.log(`  Status   : ${receipt.status}`);
console.log(`  Gas used : ${receipt.gasUsed}`);
console.log(`  Explorer : ${ARC_TESTNET_EXPLORER}/tx/${hash}`);

const [newAgent, newUser] = await Promise.all([
  publicClient.readContract({
    address: USDC_ADDRESS_ARC_TESTNET,
    abi: erc20Abi,
    functionName: "balanceOf",
    args: [agent.address],
  }),
  publicClient.readContract({
    address: USDC_ADDRESS_ARC_TESTNET,
    abi: erc20Abi,
    functionName: "balanceOf",
    args: [recipient as `0x${string}`],
  }),
]);

console.log(`\nNew balances:`);
console.log(`  Agent    : ${formatUnits(newAgent, USDC_DECIMALS)} USDC`);
console.log(`  You      : ${formatUnits(newUser, USDC_DECIMALS)} USDC`);
console.log(`\nCheck your MetaMask. the 0.5 USDC just arrived.`);
