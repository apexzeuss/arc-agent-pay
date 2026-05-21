"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { SettleReport } from "@arc-agent-pay/agent-runtime";
import { analyzeMarketsAction, settleBetsAction, type BetAnalysis } from "../betActions";

function pct(x: number) {
  return `${Math.round(x * 100)}%`;
}

export function BetDesk() {
  const [analysis, setAnalysis] = useState<BetAnalysis | null>(null);
  const [analyzing, startAnalyze] = useTransition();
  const [report, setReport] = useState<SettleReport | null>(null);
  const [settling, startSettle] = useTransition();
  const [pot, setPot] = useState("6");
  const [approve, setApprove] = useState(true);
  const router = useRouter();

  const potNum = Number(pot);
  const potValid = potNum > 0;

  function analyze() {
    setReport(null);
    startAnalyze(async () => setAnalysis(await analyzeMarketsAction()));
  }

  function settle() {
    if (!potValid) return;
    startSettle(async () => {
      const r = await settleBetsAction(potNum, approve);
      setReport(r);
      router.refresh();
    });
  }

  const settled = report?.legs.filter((l) => l.executed) ?? [];

  return (
    <div className="desk">
      <div className="desk-explain">
        <p>
          <strong>Polymarket</strong> is a site where people bet on whether real-world things will happen, and the
          price shows the crowd&apos;s odds. Press <strong>Run analysis</strong>: your AI reads real, live markets and,
          for each one, decides whether the crowd is wrong. When it disagrees enough it bets <strong>YES</strong> or{" "}
          <strong>NO</strong>; when it agrees, it skips. The bets settle in USDC on Arc.
        </p>
      </div>

      <div className="desk-controls">
        <button className="desk-run" onClick={analyze} disabled={analyzing}>
          {analyzing ? "Reading live markets…" : analysis ? "Re-run analysis" : "Run analysis"}
        </button>
      </div>

      {analysis && (
        <div className="desk-grid">
          {analysis.rows.map((r) => {
            const betting = r.side !== "SKIP" && r.weight > 0;
            return (
              <div key={r.id} className={`desk-trader ${betting ? "is-active" : "is-degraded"}`}>
                <div className="desk-trader-head">
                  <div className="bet-question">{r.question}</div>
                  <span className={`bet-side bet-${r.side.toLowerCase()}`}>{r.side}</span>
                </div>

                <p className="bet-plain">
                  The crowd says <strong>{pct(r.marketProb)}</strong>. Your AI thinks{" "}
                  <strong>{pct(r.modelProb)}</strong>
                  {betting
                    ? `, so it's betting ${r.side}.`
                    : ", about the same, so it skips this one."}
                </p>

                {betting && (
                  <div className="bet-stake-row">
                    <div className="desk-weight-track">
                      <div className="desk-weight-fill" style={{ width: pct(r.weight) }} />
                    </div>
                    <div className="bet-stake-label">{pct(r.weight)} of the money</div>
                  </div>
                )}

                <div className="desk-rationale">{r.rationale}</div>
                <a className="bet-act" href={r.url} target="_blank" rel="noreferrer">
                  {betting ? `Bet ${r.side} on Polymarket ↗` : "View on Polymarket ↗"}
                </a>
              </div>
            );
          })}
        </div>
      )}

      {analysis && analysis.cashWeight > 0.001 && (
        <div className="desk-cash">
          Holding <strong>{pct(analysis.cashWeight)}</strong> in cash — no edge in the rest.
        </div>
      )}

      {analysis && (
        <div className="desk-rebalance">
          <h2>Place the bets</h2>
          <p className="desk-rebalance-hint">
            Splits the pot across the bets above by edge and conviction, gated by policy, settled in USDC on Arc.
          </p>
          <div className="desk-rebalance-controls">
            <label className="desk-pot">
              <span>USDC</span>
              <input type="number" inputMode="decimal" step="1" min="1" value={pot}
                onChange={(e) => setPot(e.target.value)} disabled={settling} />
            </label>
            <label className="desk-approve">
              <input type="checkbox" checked={approve} onChange={(e) => setApprove(e.target.checked)} disabled={settling} />
              <span>Auto-approve larger bets</span>
            </label>
            <button className="desk-run" onClick={settle} disabled={settling || !potValid}>
              {settling ? "Settling on Arc…" : `Place bets · ${potValid ? potNum : ""} USDC`}
            </button>
          </div>

          {report && (
            <div className="desk-report">
              <div className="desk-report-summary">
                {settled.length} bet{settled.length === 1 ? "" : "s"} settled on Arc
              </div>
              <ol className="desk-legs">
                {report.legs.map((leg, i) => (
                  <li key={i} className={`desk-leg ${leg.executed ? "ok" : leg.error ? "err" : "held"}`}>
                    <span className={`bet-side bet-${leg.pick.side.toLowerCase()}`}>{leg.pick.side}</span>
                    <span className="desk-leg-amt">{leg.intent.amountUsdc} USDC</span>
                    <span className="bet-leg-q">{leg.pick.question.slice(0, 48)}</span>
                    {leg.executed && <a href={leg.explorer} target="_blank" rel="noreferrer">tx ↗</a>}
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
