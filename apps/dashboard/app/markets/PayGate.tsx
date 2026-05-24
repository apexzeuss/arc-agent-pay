"use client";

import { useEffect, useState } from "react";
import { useAccount, useChainId, useConnect, useSwitchChain, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { erc20Abi, parseUnits } from "viem";
import { arcTestnet, USDC_ADDRESS_ARC_TESTNET, USDC_DECIMALS } from "@arc-agent-pay/shared";

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
        chainId: `0x${arcTestnet.id.toString(16)}`,
        chainName: "Arc Testnet",
        nativeCurrency: { name: "USD Coin", symbol: "USDC", decimals: 18 },
        rpcUrls: ["https://rpc.testnet.arc.network"],
        blockExplorerUrls: ["https://testnet.arcscan.app"],
      },
    ],
  });
}

type Props = {
  agentAddress: `0x${string}` | string;
  priceUsdc?: number;
  onPaid: (txHash?: `0x${string}`) => void;
  marketLabel?: string;
};

export function PayGate({ agentAddress, priceUsdc = 1, onPaid, marketLabel }: Props) {
  const { address, isConnected } = useAccount();
  const chainId = useChainId();
  const { connectAsync, connectors, isPending: connecting, error: connectError, reset: resetConnect } = useConnect();
  const { switchChainAsync, isPending: switching } = useSwitchChain();
  const { writeContract, data: txHash, isPending: paying, error: payError, reset } = useWriteContract();
  const { isLoading: confirming, isSuccess: confirmed } = useWaitForTransactionReceipt({
    hash: txHash,
    chainId: arcTestnet.id,
  });
  const [hasWallet, setHasWallet] = useState<boolean | null>(null);
  const [addingChain, setAddingChain] = useState(false);
  const [walletError, setWalletError] = useState<string | null>(null);

  useEffect(() => {
    setHasWallet(
      typeof window !== "undefined" && !!(window as { ethereum?: unknown }).ethereum,
    );
  }, []);

  useEffect(() => {
    if (confirmed && txHash) {
      onPaid(txHash);
      reset();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [confirmed, txHash]);

  const onArc = chainId === arcTestnet.id;
  const wallet =
    connectors.find((c) => c.id === "injected" || c.name.toLowerCase().includes("metamask")) ??
    connectors[0];

  function payNow() {
    if (!agentAddress) return;
    writeContract({
      address: USDC_ADDRESS_ARC_TESTNET,
      abi: erc20Abi,
      functionName: "transfer",
      args: [agentAddress as `0x${string}`, parseUnits(String(priceUsdc), USDC_DECIMALS)],
      chainId: arcTestnet.id,
    });
  }

  async function handleSwitch() {
    setAddingChain(true);
    setWalletError(null);
    try {
      await switchChainAsync({ chainId: arcTestnet.id });
    } catch (e: unknown) {
      const err = e as { code?: number; message?: string };
      if (err?.code === CHAIN_NOT_ADDED) {
        try {
          await ensureArcAdded();
          await switchChainAsync({ chainId: arcTestnet.id });
        } catch (e2) {
          setWalletError(e2 instanceof Error ? e2.message : String(e2));
        }
      } else {
        setWalletError(err?.message ?? String(e));
      }
    } finally {
      setAddingChain(false);
    }
  }

  async function handleConnect() {
    if (!wallet) return;
    resetConnect();
    setWalletError(null);
    await connectAsync({ connector: wallet, chainId: arcTestnet.id }).catch((e) => {
      setWalletError(e instanceof Error ? e.message : String(e));
    });
  }

  return (
    <div className="pay-gate">
      <div className="pay-gate-head">
        <div className="pay-gate-price">
          <span className="pay-gate-num">{priceUsdc}</span>
          <span className="pay-gate-unit">USDC</span>
        </div>
        <div className="pay-gate-blurb">
          to unlock the AI&apos;s analysis{marketLabel ? ` of "${marketLabel}"` : ""} · paid in USDC on Arc · settles in &lt;1s
        </div>
      </div>

      <div className="pay-gate-actions">
        {hasWallet === false ? (
          <a className="pay-gate-btn" href="https://metamask.io/download/" target="_blank" rel="noreferrer">
            Install a wallet ↗
          </a>
        ) : !isConnected ? (
          <button
            className="pay-gate-btn"
            onClick={handleConnect}
            disabled={connecting || !wallet}
          >
            {connecting ? "Connecting…" : "Connect wallet"}
          </button>
        ) : !onArc ? (
          <button
            className="pay-gate-btn"
            onClick={handleSwitch}
            disabled={switching || addingChain}
          >
            {switching || addingChain ? "Switching…" : "Switch to Arc Testnet"}
          </button>
        ) : (
          <button
            className="pay-gate-btn pay-gate-btn-primary"
            onClick={payNow}
            disabled={paying || confirming}
          >
            {paying ? "Confirm in wallet…" : confirming ? "Settling on Arc…" : `Pay ${priceUsdc} USDC`}
          </button>
        )}

        <button className="pay-gate-demo" onClick={() => onPaid()}>
          Skip payment · demo mode
        </button>
      </div>

      <div className="pay-gate-foot">
        Need testnet USDC?{" "}
        <a href="https://faucet.circle.com" target="_blank" rel="noreferrer">
          Get some from Circle&apos;s faucet ↗
        </a>
      </div>

      {(connectError || walletError || payError) && (
        <div className="pay-gate-error">
          {(connectError?.message ?? walletError ?? payError?.message ?? "").slice(0, 200)}
        </div>
      )}
    </div>
  );
}
