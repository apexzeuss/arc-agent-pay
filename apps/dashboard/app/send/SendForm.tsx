"use client";

import { useMemo, useState } from "react";
import {
  useAccount,
  useConnect,
  useSwitchChain,
  useBalance,
  useReadContract,
  useSendTransaction,
  useWriteContract,
  useWaitForTransactionReceipt,
} from "wagmi";
import {
  mainnet, base, polygon, arbitrum, optimism, avalanche, bsc, linea, zksync, celo,
  sepolia, baseSepolia, arbitrumSepolia, polygonAmoy,
} from "wagmi/chains";
import { erc20Abi, formatUnits, isAddress, parseEther, parseUnits, type Hex } from "viem";
import { arcTestnet, ARC_TESTNET_CHAIN_ID } from "@arc-agent-pay/shared";
import { wagmiConfig } from "../wagmi";
import { useAgentStatus } from "../components/AgentStatus";

// The union of chain ids configured in wagmi — what its hooks expect.
type ChainId = (typeof wagmiConfig)["chains"][number]["id"];

type Net = {
  id: number;
  name: string;
  nativeSymbol: string;
  usdc: Hex;
  usdcDecimals: number;
  explorer: string;
  testnet?: boolean;
};

// USDC contract per chain + native symbol + explorer. usdcDecimals is 6 on
// every chain here (native USDC); kept explicit so adding an 18-decimal
// bridged-USDC chain later is a one-field change, not a silent bug.
const NETWORKS: Net[] = [
  {
    id: ARC_TESTNET_CHAIN_ID,
    name: "Arc Testnet",
    nativeSymbol: "USDC",
    usdc: "0x3600000000000000000000000000000000000000",
    usdcDecimals: 6,
    explorer: "https://testnet.arcscan.app",
    testnet: true,
  },
  {
    id: sepolia.id,
    name: "Ethereum Sepolia",
    nativeSymbol: "ETH",
    usdc: "0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238",
    usdcDecimals: 6,
    explorer: "https://sepolia.etherscan.io",
    testnet: true,
  },
  {
    id: baseSepolia.id,
    name: "Base Sepolia",
    nativeSymbol: "ETH",
    usdc: "0x036CbD53842c5426634e7929541eC2318f3dCF7e",
    usdcDecimals: 6,
    explorer: "https://sepolia.basescan.org",
    testnet: true,
  },
  {
    id: arbitrumSepolia.id,
    name: "Arbitrum Sepolia",
    nativeSymbol: "ETH",
    usdc: "0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d",
    usdcDecimals: 6,
    explorer: "https://sepolia.arbiscan.io",
    testnet: true,
  },
  {
    id: polygonAmoy.id,
    name: "Polygon Amoy",
    nativeSymbol: "POL",
    usdc: "0x41E94Eb019C0762f9Bfcf9Fb1E58725BfB0e7582",
    usdcDecimals: 6,
    explorer: "https://amoy.polygonscan.com",
    testnet: true,
  },
  {
    id: mainnet.id,
    name: "Ethereum",
    nativeSymbol: "ETH",
    usdc: "0xA0b86991c6218b36c1D19D4a2e9Eb0cE3606eB48",
    usdcDecimals: 6,
    explorer: "https://etherscan.io",
  },
  {
    id: base.id,
    name: "Base",
    nativeSymbol: "ETH",
    usdc: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
    usdcDecimals: 6,
    explorer: "https://basescan.org",
  },
  {
    id: polygon.id,
    name: "Polygon",
    nativeSymbol: "POL",
    usdc: "0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359",
    usdcDecimals: 6,
    explorer: "https://polygonscan.com",
  },
  {
    id: arbitrum.id,
    name: "Arbitrum",
    nativeSymbol: "ETH",
    usdc: "0xaf88d065e77c8cC2239327C5EDb3A432268e5831",
    usdcDecimals: 6,
    explorer: "https://arbiscan.io",
  },
  {
    id: optimism.id,
    name: "Optimism",
    nativeSymbol: "ETH",
    usdc: "0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85",
    usdcDecimals: 6,
    explorer: "https://optimistic.etherscan.io",
  },
  {
    id: avalanche.id,
    name: "Avalanche",
    nativeSymbol: "AVAX",
    usdc: "0xB97EF9Ef8734C71904D8002F8b6Bc66Dd9c48a6E",
    usdcDecimals: 6,
    explorer: "https://snowtrace.io",
  },
  {
    id: bsc.id,
    name: "BNB Chain",
    nativeSymbol: "BNB",
    // Binance-Peg USD Coin — note this is an 18-decimal token, unlike
    // Circle-native USDC which is 6 decimals everywhere else.
    usdc: "0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d",
    usdcDecimals: 18,
    explorer: "https://bscscan.com",
  },
  {
    id: linea.id,
    name: "Linea",
    nativeSymbol: "ETH",
    usdc: "0x176211869cA2b568f2A7D4EE941E073a821EE1ff",
    usdcDecimals: 6,
    explorer: "https://lineascan.build",
  },
  {
    id: zksync.id,
    name: "zkSync Era",
    nativeSymbol: "ETH",
    usdc: "0x1d17CBcF0D6D143135aE902365D2E5e2A16538D4",
    usdcDecimals: 6,
    explorer: "https://explorer.zksync.io",
  },
  {
    id: celo.id,
    name: "Celo",
    nativeSymbol: "CELO",
    usdc: "0xcebA9300f2b948710d2653dD7B07f33A8B32118C",
    usdcDecimals: 6,
    explorer: "https://celoscan.io",
  },
];

function short(a: string) {
  return `${a.slice(0, 6)}…${a.slice(-4)}`;
}

// Safety gate: while true, the Send page only offers testnet networks so an
// unfinished UI can't move real funds. Flip to false once the flow is
// hardened (tx simulation, spend limits, audit) to re-enable mainnets.
const TESTNET_ONLY = true;

const SELECTABLE_NETWORKS = TESTNET_ONLY ? NETWORKS.filter((n) => n.testnet) : NETWORKS;

export function SendForm() {
  const { address, isConnected, chain } = useAccount();
  const { connectAsync, connectors, isPending: connecting } = useConnect();
  const { switchChainAsync, isPending: switching } = useSwitchChain();
  const status = useAgentStatus();

  const [netId, setNetId] = useState<number>(SELECTABLE_NETWORKS[0]!.id);
  const [asset, setAsset] = useState<"native" | "usdc">("usdc");
  const [recipient, setRecipient] = useState("");
  const [amount, setAmount] = useState("");

  const net = NETWORKS.find((n) => n.id === netId)!;
  const onSelectedChain = chain?.id === netId;

  // Balance of the chosen asset on the chosen network. useBalance covers the
  // native token; ERC-20 (USDC) needs a balanceOf read.
  const { data: nativeBal } = useBalance({
    address,
    chainId: netId as ChainId,
    query: { enabled: isConnected && asset === "native" },
  });
  const { data: tokenBal } = useReadContract({
    address: net.usdc,
    abi: erc20Abi,
    functionName: "balanceOf",
    args: address ? [address] : undefined,
    chainId: netId as ChainId,
    query: { enabled: isConnected && asset === "usdc" },
  });
  const balFormatted =
    asset === "native"
      ? nativeBal
        ? formatUnits(nativeBal.value, nativeBal.decimals)
        : null
      : tokenBal !== undefined
        ? formatUnits(tokenBal as bigint, net.usdcDecimals)
        : null;

  const recipientValid = isAddress(recipient.trim());
  const numeric = Number(amount);
  const amountValid = numeric > 0 && !Number.isNaN(numeric);

  // Native send
  const { sendTransactionAsync, isPending: sendingNative } = useSendTransaction();
  // ERC-20 send
  const { writeContractAsync, isPending: sendingToken } = useWriteContract();

  const [txHash, setTxHash] = useState<Hex | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const { isLoading: confirming, isSuccess: confirmed } = useWaitForTransactionReceipt({
    hash: txHash ?? undefined,
    chainId: netId as ChainId,
  });

  const sending = sendingNative || sendingToken;
  const decimals = asset === "usdc" ? net.usdcDecimals : 18;
  const canSend = isConnected && onSelectedChain && recipientValid && amountValid && !sending;

  const symbol = asset === "usdc" ? "USDC" : net.nativeSymbol;

  async function handleSend() {
    setErr(null);
    setTxHash(null);
    status.begin(`Sending ${amount} ${symbol}`);
    try {
      const to = recipient.trim() as Hex;
      if (asset === "native") {
        const hash = await sendTransactionAsync({ to, value: parseEther(amount), chainId: netId as ChainId });
        setTxHash(hash);
      } else {
        const hash = await writeContractAsync({
          address: net.usdc,
          abi: erc20Abi,
          functionName: "transfer",
          args: [to, parseUnits(amount, decimals)],
          chainId: netId as ChainId,
        });
        setTxHash(hash);
      }
      status.done(`Sent ${amount} ${symbol}`);
    } catch (e) {
      status.fail("Send failed");
      setErr(e instanceof Error ? (e.message.split("\n")[0] ?? e.message) : String(e));
    }
  }

  const injected = useMemo(
    () =>
      connectors.find((c) => c.id === "injected" || c.name.toLowerCase().includes("metamask")) ??
      connectors[0],
    [connectors],
  );

  if (!isConnected) {
    return (
      <div className="send-card">
        <p className="send-empty">Connect a wallet to send funds.</p>
        {injected && (
          <button
            className="send-btn"
            onClick={() =>
              connectAsync({ connector: injected, chainId: netId as ChainId }).catch((e) => {
                setErr(e instanceof Error ? (e.message.split("\n")[0] ?? e.message) : String(e));
              })
            }
            disabled={connecting}
          >
            {connecting ? "Connecting..." : "Connect wallet"}
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="send-card">
      {TESTNET_ONLY && (
        <div className="send-banner">
          Testnet only · moves test funds, not real money. Mainnet sending is disabled until the flow is
          hardened.
        </div>
      )}

      {/* NETWORK */}
      <label className="send-field">
        <span className="send-label">Network</span>
        <select
          className="send-select"
          value={netId}
          onChange={(e) => setNetId(Number(e.target.value))}
        >
          {SELECTABLE_NETWORKS.map((n) => (
            <option key={n.id} value={n.id}>
              {n.name}
            </option>
          ))}
        </select>
      </label>

      {/* TOKEN */}
      <label className="send-field">
        <span className="send-label">Token</span>
        <select
          className="send-select"
          value={asset}
          onChange={(e) => setAsset(e.target.value as "native" | "usdc")}
        >
          <option value="usdc">USDC</option>
          <option value="native">{net.nativeSymbol} (native)</option>
        </select>
      </label>

      {/* AMOUNT */}
      <label className="send-field">
        <span className="send-label">
          Amount
          {balFormatted && (
            <button
              type="button"
              className="send-max"
              onClick={() => setAmount(balFormatted)}
              title="Use full balance"
            >
              balance: {Number(balFormatted).toFixed(4)} {symbol}
            </button>
          )}
        </span>
        <div className="send-amount-wrap">
          <input
            className="send-input"
            type="number"
            inputMode="decimal"
            placeholder="0.00"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            min="0"
            step="any"
          />
          <span className="send-amount-sym">{symbol}</span>
        </div>
      </label>

      {/* RECIPIENT */}
      <label className="send-field">
        <span className="send-label">Recipient address</span>
        <input
          className="send-input send-input-addr"
          type="text"
          placeholder="0x…"
          value={recipient}
          onChange={(e) => setRecipient(e.target.value)}
          spellCheck={false}
        />
      </label>

      {/* CONFIRMATION MESSAGE */}
      <div className={`send-confirm ${recipientValid ? "is-valid" : recipient ? "is-invalid" : ""}`}>
        {recipient.trim() === "" ? (
          <>Enter the destination address above.</>
        ) : !recipientValid ? (
          <>⚠ That isn&apos;t a valid wallet address. Double-check it.</>
        ) : (
          <>
            You are sending{" "}
            <strong>
              {amount || "0"} {symbol}
            </strong>{" "}
            to <strong>{short(recipient.trim())}</strong> on <strong>{net.name}</strong>. This transfer
            cannot be reversed, so confirm the address is correct before sending.
          </>
        )}
      </div>

      {/* WRONG NETWORK */}
      {!onSelectedChain && (
        <div className="send-switch">
          Your wallet is on {chain?.name ?? "another network"}. Switch to {net.name} to send.
          <button
            className="send-btn send-btn-ghost"
            onClick={() =>
              switchChainAsync({ chainId: netId as ChainId }).catch((e) => {
                setErr(e instanceof Error ? (e.message.split("\n")[0] ?? e.message) : String(e));
              })
            }
            disabled={switching}
          >
            {switching ? "Switching…" : `Switch to ${net.name}`}
          </button>
        </div>
      )}

      {/* SEND */}
      <button className="send-btn" onClick={handleSend} disabled={!canSend}>
        {sending
          ? "Confirm in your wallet…"
          : confirming
            ? "Sending…"
            : `Send ${amount || ""} ${symbol}`}
      </button>

      {/* RESULT */}
      {txHash && (
        <div className={`send-status ${confirmed ? "ok" : ""}`}>
          {confirmed ? "Sent ✓" : "Submitted, waiting for confirmation…"}{" "}
          <a href={`${net.explorer}/tx/${txHash}`} target="_blank" rel="noreferrer">
            {short(txHash)} ↗
          </a>
        </div>
      )}
      {err && <div className="send-status err">{err}</div>}
    </div>
  );
}
