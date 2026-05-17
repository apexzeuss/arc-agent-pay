"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { spendFromAgent, type SpendResult } from "../actions";
import { ARC_TESTNET_EXPLORER } from "@arc-agent-pay/shared";

export function ScenarioRunner({ amount, id }: { amount: string; id: string }) {
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
    <div className="scenario-runner">
      <button onClick={go} disabled={pending}>
        {pending ? "Submitting…" : `Issue payment · ${amount} USDC`}
      </button>
      {result?.ok && (
        <div className="status success">
          <span className="label">Cleared</span>
          <div>
            <a href={`${ARC_TESTNET_EXPLORER}/tx/${result.txHash}`} target="_blank" rel="noreferrer">
              {result.txHash}
            </a>
          </div>
        </div>
      )}
      {result && !result.ok && result.rejectedByPolicy && (
        <div className="status policy-reject">
          <span className="label">Rejected by Article I</span>
          <div>{result.error}</div>
        </div>
      )}
      {result && !result.ok && !result.rejectedByPolicy && (
        <div className="status error">
          <span className="label">Failed</span>
          <div>{result.error}</div>
        </div>
      )}
    </div>
  );
}
