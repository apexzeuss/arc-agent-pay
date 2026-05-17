"use client";

import { useAccount, useConnect, useDisconnect, useSwitchChain, useReadContract } from "wagmi";
import { erc20Abi, formatUnits } from "viem";
import {
  arcTestnet,
  USDC_ADDRESS_ARC_TESTNET,
  USDC_DECIMALS,
  ARC_TESTNET_EXPLORER,
} from "@arc-agent-pay/shared";

function short(addr: string) {
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}

export function UserPanel() {
  const { address, isConnected, chain } = useAccount();
  const { connect, connectors, isPending: connecting } = useConnect();
  const { disconnect } = useDisconnect();
  const { switchChain, isPending: switching } = useSwitchChain();

  const onWrongChain = isConnected && chain?.id !== arcTestnet.id;

  const { data: balance, isLoading: loadingBalance } = useReadContract({
    address: USDC_ADDRESS_ARC_TESTNET,
    abi: erc20Abi,
    functionName: "balanceOf",
    args: address ? [address] : undefined,
    chainId: arcTestnet.id,
    query: { enabled: isConnected && !onWrongChain, refetchInterval: 5000 },
  });

  if (!isConnected) {
    const wallet = connectors.find((c) => c.id === "injected" || c.name.toLowerCase().includes("metamask")) ?? connectors[0];
    return (
      <div className="card user">
        <div className="label">The Counterparty</div>
        <div className="balance" style={{ fontStyle: "italic", fontSize: 18, fontWeight: 300, color: "var(--ink-mute)" }}>
          — awaiting signature —
        </div>
        <div className="notice">No wallet connected. Sign in to enter the ledger as a counterparty.</div>
        {wallet ? (
          <button className="ghost" onClick={() => connect({ connector: wallet })} disabled={connecting}>
            {connecting ? "Connecting…" : "Connect wallet"}
          </button>
        ) : (
          <div className="notice">No wallet extension detected. Install MetaMask to continue.</div>
        )}
      </div>
    );
  }

  if (onWrongChain) {
    return (
      <div className="card user">
        <div className="label">The Counterparty</div>
        <div className="balance" style={{ color: "var(--error)", fontSize: 18, fontWeight: 300 }}>wrong network</div>
        <div className="notice">Connected to {chain?.name ?? "unknown chain"}. The ledger settles on Arc Testnet only.</div>
        <button className="ghost" onClick={() => switchChain({ chainId: arcTestnet.id })} disabled={switching}>
          {switching ? "Switching…" : "Switch to Arc Testnet"}
        </button>
      </div>
    );
  }

  return (
    <div className="card user">
      <div className="label">The Counterparty</div>
      <div className="balance">
        {loadingBalance ? "—" : formatUnits(balance ?? 0n, USDC_DECIMALS)}
        <span className="unit">USDC</span>
      </div>
      <div className="addr">
        <a href={`${ARC_TESTNET_EXPLORER}/address/${address}`} target="_blank" rel="noreferrer">
          {short(address!)} ↗
        </a>
        <button className="tiny" onClick={() => disconnect()}>Sign out</button>
      </div>
    </div>
  );
}
