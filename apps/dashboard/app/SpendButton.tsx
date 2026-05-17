"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { spendFromAgent, type SpendResult } from "./actions";
import { ARC_TESTNET_EXPLORER } from "@arc-agent-pay/shared";

export function SpendButton({ amount }: { amount: string }) {
  const [pending, startTransition] = useTransition();
  const [result, setResult] = useState<SpendResult | null>(null);
  const router = useRouter();

  function go() {
    setResult(null);
    startTransition(async () => {
      const r = await spendFromAgent(amount);
      setResult(r);
      if (r.ok) router.refresh();
    });
  }

  return (
    <>
      <button onClick={go} disabled={pending}>
        {pending ? "Submitting…" : `Send ${amount} USDC from agent → your wallet`}
      </button>
      {result?.ok && (
        <div className="status success">
          <div className="label">Confirmed</div>
          <a href={`${ARC_TESTNET_EXPLORER}/tx/${result.txHash}`} target="_blank" rel="noreferrer">
            {result.txHash}
          </a>
        </div>
      )}
      {result && !result.ok && (
        <div className="status error">
          <div className="label">Failed</div>
          {result.error}
        </div>
      )}
    </>
  );
}
