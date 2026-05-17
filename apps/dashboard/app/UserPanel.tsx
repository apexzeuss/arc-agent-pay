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
    const metaMask = connectors.find((c) => c.id === "injected" || c.name.toLowerCase().includes("metamask")) ?? connectors[0];
    return (
      <div className="card">
        <div className="label">Your Wallet</div>
        <div className="balance" style={{ color: "var(--muted)", fontSize: 16, fontWeight: 400 }}>
          Not connected
        </div>
        {metaMask ? (
          <button
            onClick={() => connect({ connector: metaMask })}
            disabled={connecting}
            style={{ marginTop: 16 }}
          >
            {connecting ? "Connecting…" : "Connect MetaMask"}
          </button>
        ) : (
          <div className="addr" style={{ marginTop: 12 }}>No wallet detected. Install MetaMask first.</div>
        )}
      </div>
    );
  }

  if (onWrongChain) {
    return (
      <div className="card">
        <div className="label">Your Wallet</div>
        <div className="balance" style={{ color: "var(--error)", fontSize: 16, fontWeight: 400 }}>
          Wrong network
        </div>
        <div className="addr" style={{ marginTop: 8 }}>You're on {chain?.name ?? "an unknown network"}. Switch to Arc Testnet.</div>
        <button
          onClick={() => switchChain({ chainId: arcTestnet.id })}
          disabled={switching}
          style={{ marginTop: 16 }}
        >
          {switching ? "Switching…" : "Switch to Arc Testnet"}
        </button>
      </div>
    );
  }

  return (
    <div className="card">
      <div className="label">Your Wallet</div>
      <div className="balance">
        {loadingBalance ? "…" : formatUnits(balance ?? 0n, USDC_DECIMALS)}
        <span className="unit">USDC</span>
      </div>
      <div className="addr" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <a href={`${ARC_TESTNET_EXPLORER}/address/${address}`} target="_blank" rel="noreferrer">
          {short(address!)} ↗
        </a>
        <button
          onClick={() => disconnect()}
          style={{ width: "auto", padding: "4px 10px", fontSize: 12, background: "transparent", border: "1px solid var(--border)", color: "var(--muted)" }}
        >
          Disconnect
        </button>
      </div>
    </div>
  );
}
