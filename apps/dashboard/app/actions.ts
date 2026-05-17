"use server";

import { config as loadEnv } from "dotenv";
import { resolve } from "node:path";
import {
  createPublicClient,
  createWalletClient,
  http,
  formatUnits,
  parseAbiItem,
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

export async function getAgentBalance(): Promise<{ address: string; usdc: string }> {
  const { agentPk } = requireConfig();
  const agent = privateKeyToAccount(agentPk);
  const bal = await publicClient.readContract({
    address: USDC_ADDRESS_ARC_TESTNET,
    abi: erc20Abi,
    functionName: "balanceOf",
    args: [agent.address],
  });
  return { address: agent.address, usdc: formatUnits(bal, USDC_DECIMALS) };
}

const TRANSFER_EVENT = parseAbiItem(
  "event Transfer(address indexed from, address indexed to, uint256 value)",
);

export type ActivityEntry = {
  hash: `0x${string}`;
  blockNumber: string;
  to: `0x${string}`;
  amountFormatted: string;
  timestamp: number;
};

// Reads USDC Transfer events FROM the agent. Arc's RPC caps getLogs at
// 10k blocks per call. We chunk a wider window (default 4 calls = 40k
// blocks ≈ 90 min of agent history) sequentially and combine results.
const LOG_CHUNK = 10_000n;
const LOG_CHUNKS = 4;

export async function getAgentActivity(limit = 10): Promise<{
  agentAddress: `0x${string}`;
  entries: ActivityEntry[];
}> {
  const { agentPk } = requireConfig();
  const agent = privateKeyToAccount(agentPk);
  const latest = await publicClient.getBlockNumber();

  const ranges: Array<[bigint, bigint]> = [];
  let toBlock = latest;
  for (let i = 0; i < LOG_CHUNKS; i++) {
    const fromBlock = toBlock > LOG_CHUNK ? toBlock - LOG_CHUNK + 1n : 0n;
    ranges.push([fromBlock, toBlock]);
    if (fromBlock === 0n) break;
    toBlock = fromBlock - 1n;
  }

  const chunkResults = await Promise.all(
    ranges.map(([from, to]) =>
      publicClient.getLogs({
        address: USDC_ADDRESS_ARC_TESTNET,
        event: TRANSFER_EVENT,
        args: { from: agent.address },
        fromBlock: from,
        toBlock: to,
      }),
    ),
  );
  const logs = chunkResults.flat();

  const sorted = [...logs]
    .sort((a, b) => Number(b.blockNumber - a.blockNumber))
    .slice(0, limit);

  const entries = await Promise.all(
    sorted.map(async (log) => {
      const block = await publicClient.getBlock({ blockNumber: log.blockNumber });
      return {
        hash: log.transactionHash,
        blockNumber: log.blockNumber.toString(),
        to: (log.args.to ?? "0x0") as `0x${string}`,
        amountFormatted: formatUnits(log.args.value ?? 0n, USDC_DECIMALS),
        timestamp: Number(block.timestamp),
      };
    }),
  );

  return { agentAddress: agent.address, entries };
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
