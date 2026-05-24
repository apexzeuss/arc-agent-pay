"use client";

import { useBlockNumber, useGasPrice } from "wagmi";
import { formatUnits } from "viem";
import { arcTestnet } from "@arc-agent-pay/shared";

export function StatusStrip({ lastActivityTs }: { lastActivityTs?: number | null }) {
  const { data: block } = useBlockNumber({ chainId: arcTestnet.id, watch: true });
  const { data: gas } = useGasPrice({ chainId: arcTestnet.id });

  const gasGwei = gas ? (Number(formatUnits(gas, 9)).toFixed(2)) : " ";

  let lastSeen = " ";
  if (lastActivityTs) {
    const diff = Math.floor(Date.now() / 1000 - lastActivityTs);
    if (diff < 60) lastSeen = `${diff}s ago`;
    else if (diff < 3600) lastSeen = `${Math.floor(diff / 60)}m ago`;
    else if (diff < 86400) lastSeen = `${Math.floor(diff / 3600)}h ago`;
    else lastSeen = `${Math.floor(diff / 86400)}d ago`;
  }

  return (
    <div className="status-strip">
      <div className="ss-cell">
        <div className="ss-label">Block</div>
        <div className="ss-val">{block?.toString() ?? " "}</div>
      </div>
      <div className="ss-cell">
        <div className="ss-label">Gas</div>
        <div className="ss-val">{gasGwei} <span className="ss-unit">gwei</span></div>
      </div>
      <div className="ss-cell">
        <div className="ss-label">Last activity</div>
        <div className="ss-val">{lastSeen}</div>
      </div>
      <div className="ss-cell ss-right">
        <div className="ss-label">Agent</div>
        <div className="ss-val agent-online"><span className="dot-online" /> online</div>
      </div>
    </div>
  );
}
