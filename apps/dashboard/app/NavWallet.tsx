"use client";

import { useEffect, useState } from "react";
import { useAccount, useConnect, useDisconnect, useSwitchChain } from "wagmi";
import {
  arcTestnet,
  ARC_TESTNET_CHAIN_ID,
  ARC_TESTNET_RPC_HTTP,
  ARC_TESTNET_EXPLORER,
  NATIVE_DECIMALS,
} from "@arc-agent-pay/shared";

const CHAIN_NOT_ADDED = 4902;

type EthereumProvider = {
  request: (args: { method: string; params?: unknown[] }) => Promise<unknown>;
};

async function ensureArcAdded() {
  const eth =
    typeof window !== "undefined"
      ? (window as { ethereum?: EthereumProvider }).ethereum
      : undefined;
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

function short(addr: string) {
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}

export function NavWallet() {
  const { address, isConnected, chain } = useAccount();
  const { connect, connectors, isPending: connecting } = useConnect();
  const { disconnect } = useDisconnect();
  const { switchChain, isPending: switching } = useSwitchChain();
  const [busy, setBusy] = useState(false);
  const [hasWallet, setHasWallet] = useState<boolean | null>(null);

  // Detect a browser wallet (window.ethereum) once after mount.
  useEffect(() => {
    const present =
      typeof window !== "undefined" &&
      !!(window as { ethereum?: unknown }).ethereum;
    setHasWallet(present);
  }, []);

  const onWrongChain = isConnected && chain?.id !== arcTestnet.id;

  async function handleSwitchToArc() {
    setBusy(true);
    try {
      switchChain({ chainId: arcTestnet.id });
    } catch (e: unknown) {
      const err = e as { code?: number };
      if (err?.code === CHAIN_NOT_ADDED) {
        try {
          await ensureArcAdded();
          switchChain({ chainId: arcTestnet.id });
        } catch {
          /* user dismissed the prompt — leave button in place */
        }
      }
    } finally {
      setBusy(false);
    }
  }

  if (!isConnected) {
    // No browser wallet detected → don't show a connect button that will
    // hang forever on "connecting…". Link to install instead.
    if (hasWallet === false) {
      return (
        <a
          className="nav-wallet nav-wallet-muted"
          href="https://metamask.io/download/"
          target="_blank"
          rel="noreferrer"
          title="No browser wallet detected. Install MetaMask to connect."
        >
          install wallet ↗
        </a>
      );
    }
    // Still detecting on first render → render nothing rather than flicker
    if (hasWallet === null) {
      return <span className="nav-wallet nav-wallet-muted">&nbsp;</span>;
    }
    const wallet =
      connectors.find((c) => c.id === "injected" || c.name.toLowerCase().includes("metamask")) ??
      connectors[0];
    if (!wallet) {
      return <span className="nav-wallet nav-wallet-muted">no wallet</span>;
    }
    return (
      <button
        className="nav-wallet nav-wallet-cta"
        onClick={() => connect({ connector: wallet })}
        disabled={connecting}
      >
        <span className="nav-wallet-dot" aria-hidden />
        {connecting ? "connecting…" : "connect wallet"}
      </button>
    );
  }

  if (onWrongChain) {
    return (
      <button
        className="nav-wallet nav-wallet-warn"
        onClick={handleSwitchToArc}
        disabled={switching || busy}
        title="Adds Arc Testnet to your wallet if needed, then switches"
      >
        <span className="nav-wallet-dot is-warn" aria-hidden />
        {switching || busy ? "switching…" : "add + switch to arc"}
      </button>
    );
  }

  return (
    <button
      className="nav-wallet nav-wallet-on"
      onClick={() => disconnect()}
      title="Click to disconnect"
    >
      <span className="nav-wallet-dot is-on" aria-hidden />
      <span className="nav-wallet-addr">{short(address!)}</span>
    </button>
  );
}
