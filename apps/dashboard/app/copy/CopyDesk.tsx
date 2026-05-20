"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ARC_TESTNET_EXPLORER } from "@arc-agent-pay/shared";
import type { RebalanceReport } from "@arc-agent-pay/agent-runtime";
import { analyzeTraders, runRebalance, type DeskAnalysis, type DeskRow } from "../copyActions";

type InitialTrader = Pick<DeskRow, "id" | "label" | "address" | "bio" | "asset" | "returns">;

function short(addr: string) {
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}

// Tiny bar sparkline of recent returns: green up, vermillion down.
function Spark({ returns }: { returns: number[] }) {
  const max = Math.max(0.01, ...returns.map((r) => Math.abs(r)));
  return (
    <div className="desk-spark" aria-hidden>
      {returns.map((r, i) => {
        const h = Math.max(6, (Math.abs(r) / max) * 100);
        return (
          <span
            key={i}
            className={`desk-spark-bar ${r >= 0 ? "up" : "down"}`}
            style={{ height: `${h}%` }}
          />
        );
      })}
    </div>
  );
}

export function CopyDesk({
  initialTraders,
  embedded = false,
}: {
  initialTraders: InitialTrader[];
  embedded?: boolean;
}) {
  const [analysis, setAnalysis] = useState<DeskAnalysis | null>(null);
  const [analyzing, startAnalyze] = useTransition();
  const [report, setReport] = useState<RebalanceReport | null>(null);
  const [rebalancing, startRebalance] = useTransition();
  const [pot, setPot] = useState("8");
  const [approve, setApprove] = useState(false);
  const router = useRouter();

  // Merge analysis onto the trader list (analysis is sorted by weight already).
  const rows: (InitialTrader & Partial<DeskRow>)[] = analysis
    ? analysis.rows
    : initialTraders;

  const potNum = Number(pot);
  const potValid = potNum > 0;

  function analyze() {
    setReport(null);
    startAnalyze(async () => setAnalysis(await analyzeTraders()));
  }

  function rebalance() {
    if (!potValid) return;
    startRebalance(async () => {
      const r = await runRebalance(potNum, approve);
      setReport(r);
      router.refresh(); // settled transfers flow into the Activity feed
    });
  }

  const settled = report?.legs.filter((l) => l.executed) ?? [];

  return (
    <div className="desk">
      {!embedded && (
        <>
          <div className="meta">
            <span>Copy Desk · SmartMirror</span>
            <span className="stamp">ARC TESTNET</span>
          </div>
          <h1>
            Copy <span className="amp">&amp;</span> Protect
          </h1>
          <p className="subtitle">
            <span className="pip">●</span>&nbsp;&nbsp;AI scores traders · weights the book · pulls the ones that break
          </p>
        </>
      )}

      <div className="desk-explain">
        <p>
          These are four <strong>example traders</strong>, each trading one crypto market (ETH, BTC, SOL) with a{" "}
          <strong>sample track record</strong>. The little chart shows their last 10 trades
          (<span className="desk-win">green = win</span>,{" "}
          <span className="desk-loss">red = loss</span>). It&apos;s demo data, so you can watch the AI work without
          waiting for real markets. Press <strong>Run analysis</strong> and it reads each track record, gives it a{" "}
          <strong>score</strong>, and decides what share of the pot to mirror, its <strong>weight</strong>. Any
          trader whose recent results are breaking down gets <strong>pulled</strong> to 0% automatically. That&apos;s
          CopyProtect.
        </p>
        <ul className="desk-legend">
          <li><span className="desk-legend-key">Chart</span> the trader&apos;s last 10 trades, green up and red down</li>
          <li><span className="desk-legend-key">Score</span> how much the AI trusts this trader now (0–100)</li>
          <li><span className="desk-legend-key">Weight</span> share of your money mirrored to them</li>
          <li><span className="desk-legend-key desk-legend-pull">Pulled</span> edge degraded, allocation cut to zero</li>
        </ul>
      </div>

      <div className="desk-controls">
        <button className="desk-run" onClick={analyze} disabled={analyzing}>
          {analyzing ? "Analyzing the field…" : analysis ? "Re-run analysis" : "Run analysis"}
        </button>
        {analysis && (
          <span className={`desk-engine ${analysis.engine}`}>
            brain: {analysis.engine === "claude" ? "Claude" : "heuristic fallback"}
          </span>
        )}
      </div>

      <div className="desk-grid">
        {rows.map((t) => {
          const analyzed = t.weight !== undefined;
          return (
            <div
              key={t.id}
              className={`desk-trader ${t.degraded ? "is-degraded" : ""} ${analyzed && t.weight! > 0 ? "is-active" : ""}`}
            >
              <div className="desk-trader-head">
                <div>
                  <div className="desk-trader-name">{t.label}</div>
                  <div className="desk-asset">trades {t.asset}</div>
                </div>
                {analyzed && (
                  <div className="desk-score">
                    {t.degraded ? <span className="desk-pulled">⚠ PULLED</span> : <>{t.score}<span className="desk-score-unit">/100</span></>}
                  </div>
                )}
              </div>

              <Spark returns={t.returns} />
              <div className="desk-spark-cap">track record · last 10 trades</div>

              <div className="desk-bio">{t.bio}</div>

              {analyzed && (
                <>
                  <div className="desk-weight-row">
                    <div className="desk-weight-track">
                      <div
                        className="desk-weight-fill"
                        style={{ width: `${Math.round((t.weight ?? 0) * 100)}%` }}
                      />
                    </div>
                    <div className="desk-weight-pct">{Math.round((t.weight ?? 0) * 100)}%</div>
                  </div>
                  <div className="desk-rationale">{t.rationale}</div>
                </>
              )}

              <a
                className="desk-addr"
                href={`${ARC_TESTNET_EXPLORER}/address/${t.address}`}
                target="_blank"
                rel="noreferrer"
              >
                {short(t.address)} ↗
              </a>
            </div>
          );
        })}
      </div>

      {analysis && analysis.cashWeight > 0.001 && (
        <div className="desk-cash">
          Holding <strong>{Math.round(analysis.cashWeight * 100)}%</strong> in cash, pulled from degraded traders.
        </div>
      )}

      {analysis && (
        <div className="desk-rebalance">
          <h2>Execute rebalance</h2>
          <p className="desk-rebalance-hint">
            Splits the pot across active traders by weight, gated by policy, settled in USDC on Arc.
            Degraded traders get nothing.
          </p>
          <div className="desk-rebalance-controls">
            <label className="desk-pot">
              <span>USDC</span>
              <input
                type="number"
                inputMode="decimal"
                step="1"
                min="1"
                value={pot}
                onChange={(e) => setPot(e.target.value)}
                disabled={rebalancing}
              />
            </label>
            <label className="desk-approve">
              <input
                type="checkbox"
                checked={approve}
                onChange={(e) => setApprove(e.target.checked)}
                disabled={rebalancing}
              />
              <span>Auto-approve legs over threshold</span>
            </label>
            <button className="desk-run" onClick={rebalance} disabled={rebalancing || !potValid}>
              {rebalancing ? "Settling on Arc…" : `Rebalance ${potValid ? potNum : ""} USDC`}
            </button>
          </div>

          {report && (
            <div className="desk-report">
              <div className="desk-report-summary">
                {settled.length} transfer{settled.length === 1 ? "" : "s"} settled on Arc
                {settled.length > 0 && ". Also visible in Activity."}
              </div>
              <ol className="desk-legs">
                {report.legs.map((leg, i) => (
                  <li key={i} className={`desk-leg ${leg.executed ? "ok" : leg.error ? "err" : "held"}`}>
                    <span className="desk-leg-name">{leg.intent.memo?.replace("copy:", "") ?? ""}</span>
                    <span className="desk-leg-amt">{leg.intent.amountUsdc} USDC</span>
                    {leg.executed ? (
                      <a href={leg.explorer} target="_blank" rel="noreferrer">tx {short(leg.txHash!)} ↗</a>
                    ) : (
                      <span className="desk-leg-status">{leg.error ? leg.error : `${leg.verdict}${leg.heldReason ? ` · ${leg.heldReason}` : ""}`}</span>
                    )}
                  </li>
                ))}
              </ol>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
