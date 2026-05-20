"use client";

import { useState } from "react";
import { useAccount, useConnect, useDisconnect, useSwitchChain, useReadContract } from "wagmi";
import { erc20Abi, formatUnits } from "viem";
import {
  arcTestnet,
  ARC_TESTNET_CHAIN_ID,
  ARC_TESTNET_RPC_HTTP,
  ARC_TESTNET_EXPLORER,
  USDC_ADDRESS_ARC_TESTNET,
  USDC_DECIMALS,
  NATIVE_DECIMALS,
} from "@arc-agent-pay/shared";

function short(addr: string) {
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}

// MetaMask error code when the requested chain isn't yet known to the wallet.
const CHAIN_NOT_ADDED = 4902;

type EthereumProvider = {
  request: (args: { method: string; params?: unknown[] }) => Promise<unknown>;
};

async function ensureArcAdded() {
  const eth = (typeof window !== "undefined" ? (window as { ethereum?: EthereumProvider }).ethereum : undefined);
  if (!eth) return;
  await eth.request({
    method: "wallet_addEthereumChain",
    params: [
      {
        chainId: `0x${ARC_TESTNET_CHAIN_ID.toString(16)}`,
        chainName: "Arc Testnet",
        nativeCurrency: { name: "USD Coin", symbol: "USDC", decimals: NATIVE_DECIMALS },
        rpcUrls: [ARC_TESTNET_RPC_HTTP],
        blockExplorerUrls: [ARC_TESTNET_EXPLORER],
      },
    ],
  });
}

export function UserPanel() {
  const { address, isConnected, chain } = useAccount();
  const { connect, connectors, isPending: connecting } = useConnect();
  const { disconnect } = useDisconnect();
  const { switchChain, isPending: switching } = useSwitchChain();
  const [switchErr, setSwitchErr] = useState<string | null>(null);

  const onWrongChain = isConnected && chain?.id !== arcTestnet.id;

  const { data: balance, isLoading: loadingBalance } = useReadContract({
    address: USDC_ADDRESS_ARC_TESTNET,
    abi: erc20Abi,
    functionName: "balanceOf",
    args: address ? [address] : undefined,
    chainId: arcTestnet.id,
    query: { enabled: isConnected && !onWrongChain, refetchInterval: 5000 },
  });

  async function handleSwitch() {
    setSwitchErr(null);
    try {
      switchChain({ chainId: arcTestnet.id });
    } catch (e: unknown) {
      const err = e as { code?: number; message?: string };
      // If MetaMask doesn't yet know Arc Testnet, add it then switch.
      if (err?.code === CHAIN_NOT_ADDED) {
        try {
          await ensureArcAdded();
          switchChain({ chainId: arcTestnet.id });
        } catch (e2) {
          setSwitchErr(e2 instanceof Error ? e2.message : String(e2));
        }
      } else {
        setSwitchErr(err?.message ?? String(e));
      }
    }
  }

  async function handleAddAndSwitch() {
    setSwitchErr(null);
    try {
      await ensureArcAdded();
    } catch (e) {
      setSwitchErr(e instanceof Error ? e.message : String(e));
    }
  }

  if (!isConnected) {
    const wallet = connectors.find((c) => c.id === "injected" || c.name.toLowerCase().includes("metamask")) ?? connectors[0];
    return (
      <div className="card user">
        <div className="label">The Counterparty</div>
        <div className="balance" style={{ fontStyle: "italic", fontSize: 18, fontWeight: 300, color: "var(--ink-mute)" }}>
          awaiting signature
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
        <div className="notice">
          Connected to {chain?.name ?? "unknown chain"}. The ledger settles on Arc Testnet only.
        </div>
        <div className="user-actions">
          <button className="ghost" onClick={handleSwitch} disabled={switching}>
            {switching ? "Switching…" : "Switch to Arc Testnet"}
          </button>
          <button className="tiny" onClick={handleAddAndSwitch}>Add Arc to wallet</button>
        </div>
        {switchErr && <div className="notice" style={{ color: "var(--error)" }}>{switchErr}</div>}
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
