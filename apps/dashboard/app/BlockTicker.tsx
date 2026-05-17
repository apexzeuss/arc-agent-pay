"use client";

import { useBlockNumber } from "wagmi";
import { arcTestnet } from "@arc-agent-pay/shared";

export function BlockTicker() {
  const { data: block } = useBlockNumber({ chainId: arcTestnet.id, watch: true });
  return (
    <span className="ticker" title="Latest Arc Testnet block">
      <span className="ticker-dot" aria-hidden />
      <span className="ticker-label">BLOCK</span>
      <span className="ticker-num">{block?.toString() ?? "—"}</span>
    </span>
  );
}
