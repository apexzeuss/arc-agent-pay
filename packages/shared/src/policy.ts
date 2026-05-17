export type Policy = {
  perTxCapUsdc: string;
  dailyCapUsdc: string;
  cooldownSeconds: number;
  // Empty allowlist means "any recipient". A populated list means agent
  // can only transact with those addresses. Enforced in code today;
  // intended to move on-chain in a future Solidity policy module.
  allowlist: readonly `0x${string}`[];
};

export const DEFAULT_POLICY: Policy = {
  perTxCapUsdc: "1.00",
  dailyCapUsdc: "10.00",
  cooldownSeconds: 0,
  allowlist: [],
};
