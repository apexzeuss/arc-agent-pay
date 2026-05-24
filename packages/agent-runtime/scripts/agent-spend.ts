import "./polyfill-window.js";

import { config as loadEnv } from "dotenv";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

import {
  createPublicClient,
  formatUnits,
  isAddress,
  parseGwei,
  parseUnits,
  type Hex,
  type Transport,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { createBundlerClient } from "viem/account-abstraction";
import {
  toCircleSmartAccount,
  toModularTransport,
  encodeTransfer,
} from "@circle-fin/modular-wallets-core";

import {
  arcTestnet,
  USDC_ADDRESS_ARC_TESTNET,
  USDC_DECIMALS,
  ARC_TESTNET_EXPLORER,
} from "@arc-agent-pay/shared";

const envPath = resolve(
  dirname(fileURLToPath(import.meta.url)),
  "../../../.env",
);
loadEnv({ path: envPath });

const signerPk = process.env.AGENT_SIGNER_PK as Hex | undefined;
const clientKey = process.env.CIRCLE_CLIENT_KEY;
const recipient = process.env.ARC_TEST_ADDRESS;

if (!signerPk) throw new Error("AGENT_SIGNER_PK missing. run `npm run provision` first.");
if (!clientKey) throw new Error("CIRCLE_CLIENT_KEY missing. add it to .env (from console.circle.com → API & Client Keys).");
if (!recipient || !isAddress(recipient))
  throw new Error("ARC_TEST_ADDRESS missing or invalid. set it to your MetaMask address.");

const CIRCLE_MODULAR_URL = "https://modular-sdk.circle.com/v1/rpc/w3s/buidl";

// Modular transport routes user operations through Circle's bundler service.
const modularTransport = toModularTransport(
  `${CIRCLE_MODULAR_URL}/arcTestnet`,
  clientKey,
);

const publicClient = createPublicClient({
  chain: arcTestnet,
  transport: modularTransport as Transport,
});

const signer = privateKeyToAccount(signerPk);

const smartAccount = await toCircleSmartAccount({
  client: publicClient as Parameters<typeof toCircleSmartAccount>[0]["client"],
  owner: signer,
  name: "agent-1",
});

const bundlerClient = createBundlerClient({
  account: smartAccount,
  chain: arcTestnet,
  transport: modularTransport as Transport,
});

const amount = parseUnits("0.5", USDC_DECIMALS); // agent sends 0.5 USDC

const callData = encodeTransfer(
  recipient as `0x${string}`,
  USDC_ADDRESS_ARC_TESTNET,
  amount,
);

console.log("Sending user operation:");
console.log(`  from (agent)    : ${smartAccount.address}`);
console.log(`  to (your wallet): ${recipient}`);
console.log(`  amount          : 0.5 USDC`);
console.log(`  deployed?       : ${await smartAccount.isDeployed()}`);
console.log("\nSubmitting to Circle bundler...\n");

// Agent pays its own gas in USDC (no paymaster needed. Arc's native gas IS USDC).
// Arc bundler requires maxPriorityFeePerGas >= 1 gwei; setting 2 gwei for safety.
const gasPrice = await publicClient.getGasPrice();
const priorityFee = parseGwei("2");
const gasEstimate = await bundlerClient.estimateUserOperationGas({
  calls: [callData],
});

const userOpHash = await bundlerClient.sendUserOperation({
  calls: [callData],
  callGasLimit: (gasEstimate.callGasLimit * 120n) / 100n,
  verificationGasLimit: (gasEstimate.verificationGasLimit * 120n) / 100n,
  preVerificationGas: (gasEstimate.preVerificationGas * 120n) / 100n,
  maxFeePerGas: (gasPrice * 120n) / 100n + priorityFee,
  maxPriorityFeePerGas: priorityFee,
  paymaster: true, // Circle Paymaster on Arc covers gas in USDC
});

console.log(`UserOp hash: ${userOpHash}`);
console.log("Waiting for on-chain confirmation...");

const { receipt } = await bundlerClient.waitForUserOperationReceipt({
  hash: userOpHash,
});

console.log(`\n✓ Confirmed on Arc Testnet`);
console.log(`  Tx hash      : ${receipt.transactionHash}`);
console.log(`  Block        : ${receipt.blockNumber}`);
console.log(`  Gas used     : ${receipt.gasUsed}`);
console.log(`  Explorer     : ${ARC_TESTNET_EXPLORER}/tx/${receipt.transactionHash}`);

const [agentBalance, userBalance] = await Promise.all([
  publicClient.readContract({
    address: USDC_ADDRESS_ARC_TESTNET,
    abi: [
      {
        type: "function",
        name: "balanceOf",
        stateMutability: "view",
        inputs: [{ name: "owner", type: "address" }],
        outputs: [{ name: "", type: "uint256" }],
      },
    ] as const,
    functionName: "balanceOf",
    args: [smartAccount.address],
  }),
  publicClient.readContract({
    address: USDC_ADDRESS_ARC_TESTNET,
    abi: [
      {
        type: "function",
        name: "balanceOf",
        stateMutability: "view",
        inputs: [{ name: "owner", type: "address" }],
        outputs: [{ name: "", type: "uint256" }],
      },
    ] as const,
    functionName: "balanceOf",
    args: [recipient as `0x${string}`],
  }),
]);

console.log(`\nNew balances:`);
console.log(`  Agent : ${formatUnits(agentBalance, USDC_DECIMALS)} USDC`);
console.log(`  You   : ${formatUnits(userBalance, USDC_DECIMALS)} USDC`);
