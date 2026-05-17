import { config as loadEnv } from "dotenv";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { appendFileSync } from "node:fs";

import {
  createPublicClient,
  http,
  formatUnits,
  erc20Abi,
  type Hex,
} from "viem";
import { privateKeyToAccount, generatePrivateKey } from "viem/accounts";
import { toCircleSmartAccount } from "@circle-fin/modular-wallets-core";

import {
  arcTestnet,
  USDC_ADDRESS_ARC_TESTNET,
  USDC_DECIMALS,
  NATIVE_DECIMALS,
  ARC_TESTNET_EXPLORER,
} from "@arc-agent-pay/shared";

// Load .env from the workspace root.
const envPath = resolve(
  dirname(fileURLToPath(import.meta.url)),
  "../../../.env",
);
loadEnv({ path: envPath });

// 1) Get or auto-generate the agent's signer key.
//    The signer is a plain Ethereum private key — separate from the user's
//    MetaMask wallet. It "owns" the smart account and is what signs operations
//    on the agent's behalf. TESTNET ONLY: storing a private key in .env is
//    fine for local development; production would use a KMS / HSM / passkey.
let signerPk = process.env.AGENT_SIGNER_PK as Hex | undefined;

if (!signerPk) {
  console.log(
    "No AGENT_SIGNER_PK found — generating a fresh signer key (testnet only).",
  );
  signerPk = generatePrivateKey();
  appendFileSync(
    envPath,
    `\n# Auto-generated agent signer key (testnet only — never reuse on mainnet).\nAGENT_SIGNER_PK=${signerPk}\n`,
    "utf-8",
  );
  console.log(`Saved AGENT_SIGNER_PK to ${envPath}`);
}

const signer = privateKeyToAccount(signerPk);

// 2) Public client connected to Arc testnet RPC.
const publicClient = createPublicClient({
  chain: arcTestnet,
  transport: http(process.env.ARC_RPC_URL),
});

// 3) Derive the Circle smart account. Address is deterministic from
//    owner + factory; the contract isn't deployed on-chain until the
//    first user operation runs (lazy deployment).
const smartAccount = await toCircleSmartAccount({
  // The Circle SDK's client type is narrower than viem's PublicClient; cast is safe.
  client: publicClient as Parameters<typeof toCircleSmartAccount>[0]["client"],
  owner: signer,
  name: "agent-1",
});

const accountAddress = smartAccount.address;

// 4) Read on-chain state about the (not-yet-deployed) account.
const [isDeployed, nativeBalance, usdcBalance] = await Promise.all([
  smartAccount.isDeployed(),
  publicClient.getBalance({ address: accountAddress }),
  publicClient.readContract({
    address: USDC_ADDRESS_ARC_TESTNET,
    abi: erc20Abi,
    functionName: "balanceOf",
    args: [accountAddress],
  }),
]);

console.log("\n=== AI Agent Smart Account on Arc Testnet ===\n");
console.log(`  Smart account address : ${accountAddress}`);
console.log(`  Signer (owner) address: ${signer.address}`);
console.log(
  `  Deployed on-chain     : ${isDeployed ? "yes" : "no (deploys lazily on first user operation)"}`,
);
console.log(
  `  Native USDC balance   : ${formatUnits(nativeBalance, NATIVE_DECIMALS)} USDC`,
);
console.log(
  `  ERC-20 USDC balance   : ${formatUnits(usdcBalance, USDC_DECIMALS)} USDC`,
);
console.log(`  Explorer              : ${ARC_TESTNET_EXPLORER}/address/${accountAddress}`);
console.log(
  "\nThis is the address your AI agent will spend FROM. To make it usable, send USDC to it from your MetaMask wallet — that's the next step.",
);
