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
        {pending ? "Stamping the ledger…" : `Debit Agent · Credit Counterparty · ${amount} USDC`}
      </button>
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
          <span className="label">Rejected</span>
          <div>{result.error}</div>
        </div>
      )}
    </>
  );
}
