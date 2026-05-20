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
  DEFAULT_POLICY,
  USDC_ADDRESS_ARC_TESTNET,
  USDC_DECIMALS,
} from "@arc-agent-pay/shared";
import { readFrozen, writeFrozen } from "./agentState";

// Workspace root is three levels up from apps/dashboard/app
loadEnv({ path: resolve(process.cwd(), "../../.env") });

// ─── Kill switch ─────────────────────────────────────────────────
export async function getAgentFrozen(): Promise<boolean> {
  return readFrozen();
}

export async function setAgentFrozen(frozen: boolean): Promise<{ frozen: boolean }> {
  await writeFrozen(frozen);
  return { frozen };
}

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

export type SpendResult =
  | { ok: true; txHash: string }
  | { ok: false; error: string; rejectedByPolicy?: boolean; rule?: string };

// Pulls recent Transfer events from the agent within the last 24h so we
// can derive both the daily total and the most-recent-tx timestamp without
// any off-chain storage. Reads the chain straight, so every browser tab
// sees the same policy state.
async function getRecentAgentTransfers(agentAddress: `0x${string}`): Promise<
  Array<{ value: bigint; timestamp: number }>
> {
  const latest = await publicClient.getBlockNumber();
  // ~24h on Arc (~1s blocks) → up to 90k blocks. We chunk like getAgentActivity does.
  const CHUNK = 10_000n;
  const MAX_CHUNKS = 9; // 90k blocks ≈ 24h ceiling
  const ranges: Array<[bigint, bigint]> = [];
  let toBlock = latest;
  for (let i = 0; i < MAX_CHUNKS; i++) {
    const fromBlock = toBlock > CHUNK ? toBlock - CHUNK + 1n : 0n;
    ranges.push([fromBlock, toBlock]);
    if (fromBlock === 0n) break;
    toBlock = fromBlock - 1n;
  }
  const chunkResults = await Promise.all(
    ranges.map(([from, to]) =>
      publicClient.getLogs({
        address: USDC_ADDRESS_ARC_TESTNET,
        event: TRANSFER_EVENT,
        args: { from: agentAddress },
        fromBlock: from,
        toBlock: to,
      }),
    ),
  );
  const logs = chunkResults.flat();
  const cutoff = Math.floor(Date.now() / 1000) - 24 * 60 * 60;
  const withTime = await Promise.all(
    logs.map(async (log) => {
      const block = await publicClient.getBlock({ blockNumber: log.blockNumber });
      return { value: log.args.value ?? 0n, timestamp: Number(block.timestamp) };
    }),
  );
  return withTime.filter((t) => t.timestamp >= cutoff);
}

export async function spendFromAgent(
  amountUsdc: string,
  recipient?: `0x${string}`,
): Promise<SpendResult> {
  try {
    const { agentPk, userAddress } = requireConfig();
    const to = recipient ?? userAddress;
    const value = parseUnits(amountUsdc, USDC_DECIMALS);

    // ─── Kill switch · overrides every rule ────────────────────────
    if (await readFrozen()) {
      return {
        ok: false,
        rejectedByPolicy: true,
        error: "Agent is frozen — the kill switch is engaged. No payments will execute until it's released.",
      };
    }

    // ─── Per-transaction limit ─────────────────────────────────────
    const capValue = parseUnits(DEFAULT_POLICY.perTxCapUsdc, USDC_DECIMALS);
    if (value > capValue) {
      return {
        ok: false,
        rejectedByPolicy: true,
        rule: "Over per-tx limit",
        error: `Over the per-transaction limit — max ${DEFAULT_POLICY.perTxCapUsdc} USDC, you requested ${amountUsdc} USDC.`,
      };
    }

    // ─── Recipient allowlist ───────────────────────────────────────
    if (DEFAULT_POLICY.allowlist.length > 0) {
      const allowed = DEFAULT_POLICY.allowlist.map((a) => a.toLowerCase());
      if (!allowed.includes(to.toLowerCase())) {
        return {
          ok: false,
          rejectedByPolicy: true,
          rule: "Not on allowlist",
          error: `Recipient ${to.slice(0, 6)}…${to.slice(-4)} isn't on the agent's approved allowlist.`,
        };
      }
    }

    // ─── Cooldown and daily limit ──────────────────────────────────
    const agent = privateKeyToAccount(agentPk);
    const recent = await getRecentAgentTransfers(agent.address);

    if (DEFAULT_POLICY.cooldownSeconds > 0 && recent.length > 0) {
      const lastTs = Math.max(...recent.map((r) => r.timestamp));
      const now = Math.floor(Date.now() / 1000);
      const since = now - lastTs;
      if (since < DEFAULT_POLICY.cooldownSeconds) {
        const waitFor = DEFAULT_POLICY.cooldownSeconds - since;
        return {
          ok: false,
          rejectedByPolicy: true,
          rule: "Cooldown active",
          error: `Cooldown active — wait ${waitFor}s before the next payment.`,
        };
      }
    }

    const dailyCap = parseUnits(DEFAULT_POLICY.dailyCapUsdc, USDC_DECIMALS);
    const spent24h = recent.reduce((acc, r) => acc + r.value, 0n);
    if (spent24h + value > dailyCap) {
      const usedStr = formatUnits(spent24h, USDC_DECIMALS);
      return {
        ok: false,
        rejectedByPolicy: true,
        rule: "Over daily limit",
        error: `Over the daily limit — ${DEFAULT_POLICY.dailyCapUsdc} USDC max, already spent ${usedStr} in the last 24h.`,
      };
    }

    // ─── Execute ───────────────────────────────────────────────────
    const walletClient = createWalletClient({ account: agent, chain: arcTestnet, transport: http() });

    const hash = await walletClient.writeContract({
      address: USDC_ADDRESS_ARC_TESTNET,
      abi: erc20Abi,
      functionName: "transfer",
      args: [to, value],
      maxFeePerGas: 22_000_000_000n + parseGwei("2"),
      maxPriorityFeePerGas: parseGwei("2"),
    });

    await publicClient.waitForTransactionReceipt({ hash });
    return { ok: true, txHash: hash };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}

export type BatchRow = { recipient: string; amount: string };
export type BatchRowResult =
  | { recipient: string; amount: string; ok: true; txHash: string }
  | { recipient: string; amount: string; ok: false; error: string };
export type BatchResult = { ok: boolean; rows: BatchRowResult[]; error?: string };

// Pays a list of recipients in one authorized operation. The cooldown rule is
// intentionally skipped between rows — the human approved the whole batch at
// once. Per-tx cap, allowlist, daily cap (against the batch total), and the
// kill switch are all still enforced.
export async function batchSpendFromAgent(rows: BatchRow[]): Promise<BatchResult> {
  try {
    const { agentPk } = requireConfig();

    if (await readFrozen()) {
      return { ok: false, rows: [], error: "Agent is frozen — release the kill switch to run a batch." };
    }
    if (rows.length === 0) return { ok: false, rows: [], error: "No payments in the batch." };

    const capValue = parseUnits(DEFAULT_POLICY.perTxCapUsdc, USDC_DECIMALS);
    const allowed =
      DEFAULT_POLICY.allowlist.length > 0
        ? DEFAULT_POLICY.allowlist.map((a) => a.toLowerCase())
        : null;

    // Validate every row up-front; reject the whole batch if any is bad.
    const parsed: Array<{ to: `0x${string}`; value: bigint; amount: string }> = [];
    for (const r of rows) {
      const to = r.recipient.trim();
      if (!isAddress(to)) return { ok: false, rows: [], error: `Invalid address: ${to || "(empty)"}` };
      const num = Number(r.amount);
      if (!(num > 0)) return { ok: false, rows: [], error: `Invalid amount for ${to.slice(0, 8)}…` };
      const value = parseUnits(r.amount, USDC_DECIMALS);
      if (value > capValue) {
        return { ok: false, rows: [], error: `${r.amount} USDC exceeds per-tx cap ${DEFAULT_POLICY.perTxCapUsdc}.` };
      }
      if (allowed && !allowed.includes(to.toLowerCase())) {
        return { ok: false, rows: [], error: `${to.slice(0, 8)}… is not on the allowlist.` };
      }
      parsed.push({ to: to as `0x${string}`, value, amount: r.amount });
    }

    // Daily cap against existing 24h spend + the whole batch.
    const agent = privateKeyToAccount(agentPk);
    const recent = await getRecentAgentTransfers(agent.address);
    const spent24h = recent.reduce((acc, r) => acc + r.value, 0n);
    const batchTotal = parsed.reduce((acc, p) => acc + p.value, 0n);
    const dailyCap = parseUnits(DEFAULT_POLICY.dailyCapUsdc, USDC_DECIMALS);
    if (spent24h + batchTotal > dailyCap) {
      return {
        ok: false,
        rows: [],
        error: `Batch total ${formatUnits(batchTotal, USDC_DECIMALS)} USDC would exceed daily cap ${DEFAULT_POLICY.dailyCapUsdc} (already spent ${formatUnits(spent24h, USDC_DECIMALS)}).`,
      };
    }

    // Send sequentially so nonces don't collide.
    const walletClient = createWalletClient({ account: agent, chain: arcTestnet, transport: http() });
    const results: BatchRowResult[] = [];
    for (const p of parsed) {
      try {
        const hash = await walletClient.writeContract({
          address: USDC_ADDRESS_ARC_TESTNET,
          abi: erc20Abi,
          functionName: "transfer",
          args: [p.to, p.value],
          maxFeePerGas: 22_000_000_000n + parseGwei("2"),
          maxPriorityFeePerGas: parseGwei("2"),
        });
        await publicClient.waitForTransactionReceipt({ hash });
        results.push({ recipient: p.to, amount: p.amount, ok: true, txHash: hash });
      } catch (e) {
        results.push({
          recipient: p.to,
          amount: p.amount,
          ok: false,
          error: e instanceof Error ? (e.message.split("\n")[0] ?? e.message) : String(e),
        });
      }
    }
    return { ok: results.every((r) => r.ok), rows: results };
  } catch (e) {
    return { ok: false, rows: [], error: e instanceof Error ? e.message : String(e) };
  }
}
