"use server";

import { config as loadEnv } from "dotenv";
import { resolve } from "node:path";
import {
  createPublicClient,
  createWalletClient,
  http,
  formatUnits,
  parseUnits,
  parseGwei,
  erc20Abi,
  isAddress,
  type Hex,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import {
  arcTestnet,
  USDC_ADDRESS_ARC_TESTNET,
  USDC_DECIMALS,
} from "@arc-agent-pay/shared";

// Workspace root is three levels up from apps/dashboard/app
loadEnv({ path: resolve(process.cwd(), "../../.env") });

function requireConfig() {
  const agentPk = process.env.AGENT_EOA_PK as Hex | undefined;
  const user = process.env.ARC_TEST_ADDRESS;
  if (!agentPk) throw new Error("AGENT_EOA_PK missing — run `npm run simple-agent` once to provision.");
  if (!user || !isAddress(user)) throw new Error("ARC_TEST_ADDRESS missing or invalid in .env.");
  return { agentPk, userAddress: user as `0x${string}` };
}

const publicClient = createPublicClient({ chain: arcTestnet, transport: http() });

export type Balances = {
  agentAddress: string;
  userAddress: string;
  agentUsdc: string;
  userUsdc: string;
};

export async function getBalances(): Promise<Balances> {
  const { agentPk, userAddress } = requireConfig();
  const agent = privateKeyToAccount(agentPk);

  const [agentBal, userBal] = await Promise.all([
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
      args: [userAddress],
    }),
  ]);

  return {
    agentAddress: agent.address,
    userAddress,
    agentUsdc: formatUnits(agentBal, USDC_DECIMALS),
    userUsdc: formatUnits(userBal, USDC_DECIMALS),
  };
}

export type SpendResult = { ok: true; txHash: string } | { ok: false; error: string };

export async function spendFromAgent(amountUsdc: string): Promise<SpendResult> {
  try {
    const { agentPk, userAddress } = requireConfig();
    const agent = privateKeyToAccount(agentPk);
    const walletClient = createWalletClient({ account: agent, chain: arcTestnet, transport: http() });

    const value = parseUnits(amountUsdc, USDC_DECIMALS);

    const hash = await walletClient.writeContract({
      address: USDC_ADDRESS_ARC_TESTNET,
      abi: erc20Abi,
      functionName: "transfer",
      args: [userAddress, value],
      maxFeePerGas: 22_000_000_000n + parseGwei("2"),
      maxPriorityFeePerGas: parseGwei("2"),
    });

    await publicClient.waitForTransactionReceipt({ hash });
    return { ok: true, txHash: hash };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}
