"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { batchSpendFromAgent, type BatchResult } from "./actions";
import { useAgentStatus } from "./components/AgentStatus";
import { ARC_TESTNET_EXPLORER, DEFAULT_POLICY } from "@arc-agent-pay/shared";

type Row = { recipient: string; amount: string };

const EMPTY: Row = { recipient: "", amount: "" };

function short(a: string) {
  return a.length > 12 ? `${a.slice(0, 6)}…${a.slice(-4)}` : a;
}

export function BatchPay() {
  const [open, setOpen] = useState(false);
  const [rows, setRows] = useState<Row[]>([{ ...EMPTY }, { ...EMPTY }]);
  const [result, setResult] = useState<BatchResult | null>(null);
  const [pending, startTransition] = useTransition();
  const router = useRouter();
  const status = useAgentStatus();

  function update(i: number, patch: Partial<Row>) {
    setRows((rs) => rs.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));
  }
  function addRow() {
    setRows((rs) => [...rs, { ...EMPTY }]);
  }
  function removeRow(i: number) {
    setRows((rs) => (rs.length > 1 ? rs.filter((_, idx) => idx !== i) : rs));
  }

  const filled = rows.filter((r) => r.recipient.trim() && Number(r.amount) > 0);
  const total = filled.reduce((acc, r) => acc + Number(r.amount), 0);

  function run() {
    if (filled.length === 0) return;
    setResult(null);
    startTransition(async () => {
      status.begin(`Batch · ${filled.length} payment${filled.length === 1 ? "" : "s"}`);
      const r = await batchSpendFromAgent(filled);
      setResult(r);
      if (r.error) status.fail("Batch rejected");
      else status.done(`Batch sent · ${r.rows.filter((x) => x.ok).length}/${r.rows.length}`);
      router.refresh();
    });
  }

  if (!open) {
    return (
      <button type="button" className="batch-open" onClick={() => setOpen(true)}>
        + Pay multiple recipients at once
      </button>
    );
  }

  return (
    <div className="batch-panel">
      <div className="batch-head">
        <span className="batch-title">Batch payment</span>
        <button type="button" className="batch-close" onClick={() => setOpen(false)}>
          close
        </button>
      </div>

      <div className="batch-rows">
        {rows.map((r, i) => (
          <div className="batch-row" key={i}>
            <span className="batch-row-num">{String(i + 1).padStart(2, "0")}</span>
            <input
              className="batch-input batch-input-addr"
              placeholder="0x… recipient"
              value={r.recipient}
              onChange={(e) => update(i, { recipient: e.target.value })}
              spellCheck={false}
              disabled={pending}
            />
            <input
              className="batch-input batch-input-amt"
              type="number"
              inputMode="decimal"
              step="0.01"
              min="0"
              placeholder="0.00"
              value={r.amount}
              onChange={(e) => update(i, { amount: e.target.value })}
              disabled={pending}
            />
            <span className="batch-row-sym">USDC</span>
            <button
              type="button"
              className="batch-row-del"
              onClick={() => removeRow(i)}
              disabled={pending || rows.length <= 1}
              aria-label="Remove row"
            >
              ×
            </button>
          </div>
        ))}
      </div>

      <div className="batch-actions">
        <button type="button" className="batch-add" onClick={addRow} disabled={pending}>
          + add recipient
        </button>
        <div className="batch-total">
          {filled.length} payment{filled.length === 1 ? "" : "s"} · {total.toFixed(2)} USDC total
        </div>
      </div>

      <button className="batch-send" onClick={run} disabled={pending || filled.length === 0}>
        {pending
          ? `Sending ${filled.length} payment${filled.length === 1 ? "" : "s"}…`
          : `Send batch · ${filled.length} payment${filled.length === 1 ? "" : "s"}`}
      </button>

      <div className="batch-note">
        Per-tx cap {DEFAULT_POLICY.perTxCapUsdc} · daily cap {DEFAULT_POLICY.dailyCapUsdc} USDC · cooldown
        skipped within a batch
      </div>

      {result?.error && <div className="batch-result err">{result.error}</div>}
      {result && result.rows.length > 0 && (
        <ol className="batch-result-list">
          {result.rows.map((row, i) => (
            <li key={i} className={row.ok ? "ok" : "err"}>
              <span>{short(row.recipient)}</span>
              <span>{row.amount} USDC</span>
              {row.ok ? (
                <a href={`${ARC_TESTNET_EXPLORER}/tx/${row.txHash}`} target="_blank" rel="noreferrer">
                  sent ↗
                </a>
              ) : (
                <span className="batch-result-err">{row.error}</span>
              )}
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
