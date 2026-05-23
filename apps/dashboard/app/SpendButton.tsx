"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useAccount } from "wagmi";
import { isAddress, type Hex } from "viem";
import { spendFromAgent, type SpendResult } from "./actions";
import { useAgentStatus } from "./components/AgentStatus";
import { ARC_TESTNET_EXPLORER, DEFAULT_POLICY, arcTestnet } from "@arc-agent-pay/shared";

const PER_TX_CAP = Number(DEFAULT_POLICY.perTxCapUsdc);

function short(addr: string) {
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}

export function SpendButton({ amount: defaultAmount = "0.50" }: { amount?: string }) {
  const [amount, setAmount] = useState(defaultAmount);
  const [recipientInput, setRecipientInput] = useState("");
  const [pending, startTransition] = useTransition();
  const [result, setResult] = useState<SpendResult | null>(null);
  const [subActive, setSubActive] = useState(false);
  const subTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const router = useRouter();
  const { address, isConnected, chain } = useAccount();
  const status = useAgentStatus();

  // Compute the effective recipient: typed override wins, else connected wallet.
  const trimmedInput = recipientInput.trim();
  const customRecipient = trimmedInput.length > 0 ? trimmedInput : null;
  const customRecipientValid = customRecipient ? isAddress(customRecipient) : true;
  const effectiveRecipient: Hex | undefined = (customRecipient && customRecipientValid
    ? (customRecipient as Hex)
    : address) ?? undefined;

  const numeric = Number(amount);
  const tooSmall = !(numeric > 0);
  const overCap = numeric > PER_TX_CAP;
  const onWrongChain = isConnected && chain?.id !== arcTestnet.id;
  const noRecipient = !effectiveRecipient;
  const invalid =
    tooSmall || overCap || Number.isNaN(numeric) || onWrongChain || noRecipient || !customRecipientValid;

  function fire(): Promise<SpendResult> {
    return new Promise((resolve) => {
      startTransition(async () => {
        status.begin(`Sending ${amount} USDC`);
        const r = await spendFromAgent(amount, effectiveRecipient);
        setResult(r);
        if (r.ok) {
          status.done(`Sent ${amount} USDC`);
          router.refresh();
        } else {
          status.fail(r.rule ?? "Rejected");
        }
        resolve(r);
      });
    });
  }

  function go() {
    if (invalid) return;
    setResult(null);
    fire();
  }

  // Subscription mode — auto-fire every cooldown+1 seconds until toggled off
  // or until the agent rejects (e.g. daily cap hit, balance empty).
  useEffect(() => {
    if (!subActive) {
      if (subTimerRef.current) {
        clearInterval(subTimerRef.current);
        subTimerRef.current = null;
      }
      return;
    }
    if (invalid) {
      setSubActive(false);
      return;
    }
    // Fire immediately, then on an interval slightly longer than the cooldown.
    let stopped = false;
    const intervalMs = (DEFAULT_POLICY.cooldownSeconds + 2) * 1000;
    (async () => {
      while (!stopped && subActive) {
        const r = await fire();
        if (!r.ok && r.rejectedByPolicy && (r.rule === "Over daily limit" || r.rule === "Not on allowlist")) {
          // Hard policy stop — daily cap or allowlist — don't keep retrying
          setSubActive(false);
          break;
        }
        await new Promise((res) => setTimeout(res, intervalMs));
      }
    })();
    return () => {
      stopped = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [subActive]);

  return (
    <>
      <div className="spend-form">
        <label className="spend-input-wrap">
          <span className="spend-input-prefix">USDC</span>
          <input
            className="spend-input"
            type="number"
            inputMode="decimal"
            step="0.01"
            min="0.01"
            max={PER_TX_CAP}
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            disabled={pending || subActive}
            aria-label="Payment amount in USDC"
          />
        </label>
        <label className="spend-recipient-wrap">
          <span className="spend-input-prefix">to</span>
          <input
            className="spend-recipient"
            type="text"
            placeholder={address ? `${short(address)} (connected)` : "0x…"}
            value={recipientInput}
            onChange={(e) => setRecipientInput(e.target.value)}
            disabled={pending || subActive}
            aria-label="Recipient address"
            spellCheck={false}
          />
        </label>
        <button onClick={go} disabled={pending || invalid || subActive}>
          {pending
            ? "Stamping the ledger…"
            : overCap
              ? `Above cap (${PER_TX_CAP} USDC max)`
              : tooSmall
                ? "Enter an amount"
                : !customRecipientValid
                  ? "Invalid address"
                  : noRecipient
                    ? "Paste a recipient address"
                    : `Debit Agent · ${amount} USDC`}
        </button>
      </div>

      <div className="spend-sub-row">
        <button
          type="button"
          className={`spend-sub-toggle ${subActive ? "is-on" : ""}`}
          onClick={() => setSubActive((s) => !s)}
          disabled={invalid && !subActive}
          aria-pressed={subActive}
        >
          <span className="spend-sub-dot" aria-hidden />
          {subActive
            ? `Subscription running · ${amount} USDC every ${DEFAULT_POLICY.cooldownSeconds + 2}s · click to stop`
            : `Start subscription · ${amount} USDC every ${DEFAULT_POLICY.cooldownSeconds + 2}s`}
        </button>
      </div>

      <div className="spend-hint">
        {effectiveRecipient ? (
          <>
            Sending to <strong>{short(effectiveRecipient)}</strong>
            {customRecipient ? " (typed)" : " (recipient)"} · cap {PER_TX_CAP} USDC · cooldown{" "}
            {DEFAULT_POLICY.cooldownSeconds}s · daily {DEFAULT_POLICY.dailyCapUsdc} USDC
          </>
        ) : (
          <>Paste a recipient address · cap {PER_TX_CAP} USDC</>
        )}
      </div>

      {result?.ok && (
        <div className="status success">
          <span className="label">Entered</span>
          <div>
            <a href={`${ARC_TESTNET_EXPLORER}/tx/${result.txHash}`} target="_blank" rel="noreferrer">
              {result.txHash}
            </a>
          </div>
        </div>
      )}
      {result && !result.ok && (
        <div className="status error">
          <span className="label">{result.rule ?? "Rejected"}</span>
          <div>{result.error}</div>
        </div>
      )}
    </>
  );
}
