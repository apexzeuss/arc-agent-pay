"use client";

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { SettleReport } from "@arc-agent-pay/agent-runtime";
import {
  analyzeByUrlAction,
  analyzeMarketsAction,
  listMarketsAction,
  settleBetsAction,
  type BetAnalysis,
  type SingleMarketPick,
} from "../betActions";

function pct(x: number) {
  return `${Math.round(x * 100)}%`;
}

const ANALYZE_COUNT = 16;

export function BetDesk() {
  const [totalCount, setTotalCount] = useState<number | null>(null);
  const [analysis, setAnalysis] = useState<BetAnalysis | null>(null);
  const [analyzing, startAnalyze] = useTransition();
  const [report, setReport] = useState<SettleReport | null>(null);
  const [settling, startSettle] = useTransition();
  const [pot, setPot] = useState("6");
  const [approve, setApprove] = useState(true);
  const [urlInput, setUrlInput] = useState("");
  const [urlPick, setUrlPick] = useState<SingleMarketPick | null>(null);
  const [urlError, setUrlError] = useState<string | null>(null);
  const [urlAnalyzing, startUrlAnalyze] = useTransition();
  const router = useRouter();

  const potNum = Number(pot);
  const potValid = potNum > 0;

  useEffect(() => {
    let cancelled = false;
    listMarketsAction(500)
      .then((m) => {
        if (!cancelled) setTotalCount(m.length);
      })
      .catch(() => {
        if (!cancelled) setTotalCount(0);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  function analyze() {
    setReport(null);
    startAnalyze(async () => setAnalysis(await analyzeMarketsAction(ANALYZE_COUNT)));
  }

  function settle() {
    if (!potValid) return;
    startSettle(async () => {
      const r = await settleBetsAction(potNum, approve);
      setReport(r);
      router.refresh();
    });
  }

  function analyzeUrl() {
    if (!urlInput.trim() || urlAnalyzing) return;
    setUrlError(null);
    setUrlPick(null);
    startUrlAnalyze(async () => {
      const result = await analyzeByUrlAction(urlInput);
      if (result.ok) setUrlPick(result.pick);
      else setUrlError(result.error);
    });
  }

  const settled = report?.legs.filter((l) => l.executed) ?? [];

  return (
    <div className="desk">
      <div className="desk-explain">
        <p>
          <strong>Polymarket</strong> is where people bet on whether real-world things will happen, and the price shows
          the crowd&apos;s odds. Press <strong>Analyze {ANALYZE_COUNT} best</strong>: your AI reads the markets we&apos;ve
          picked as most worth analyzing and, for each one, decides whether the crowd is wrong. When it disagrees enough
          it bets <strong>YES</strong> or <strong>NO</strong>; when it agrees, it skips. The bets settle in USDC on Arc.
        </p>
      </div>

      <div className="desk-stats">
        <div className="desk-stat">
          <div className="desk-stat-n">{ANALYZE_COUNT}</div>
          <div className="desk-stat-k">best for analysis</div>
        </div>
        <div className="desk-stat">
          <div className="desk-stat-n">{totalCount === null ? "…" : totalCount}</div>
          <div className="desk-stat-k">total live markets</div>
        </div>
        <Link href="/markets" className="desk-browse-link">
          Browse all {totalCount ?? "300"} by category →
        </Link>
      </div>

      <div className="desk-controls">
        <button className="desk-run" onClick={analyze} disabled={analyzing}>
          {analyzing
            ? "Reading live markets…"
            : analysis
            ? `Re-analyze ${ANALYZE_COUNT} best`
            : `Analyze ${ANALYZE_COUNT} best`}
        </button>
      </div>

      <div className="desk-url">
        <div className="desk-url-label">Or paste a Polymarket URL to analyze it</div>
        <div className="desk-url-row">
          <input
            type="url"
            inputMode="url"
            placeholder="https://polymarket.com/event/…"
            value={urlInput}
            onChange={(e) => setUrlInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && analyzeUrl()}
            disabled={urlAnalyzing}
            className="desk-url-input"
          />
          <button
            className="desk-run desk-run-sm"
            onClick={analyzeUrl}
            disabled={urlAnalyzing || !urlInput.trim()}
          >
            {urlAnalyzing ? "Analyzing…" : "Analyze →"}
          </button>
        </div>
        {urlError && <div className="desk-url-error">{urlError}</div>}
        {urlPick && (
          <div className="desk-url-pick">
            <div className="desk-row-pick-head">
              <span className={`bet-side bet-${urlPick.side.toLowerCase()}`}>{urlPick.side}</span>
              <span className="desk-row-pick-meta">
                Crowd: <strong>{pct(urlPick.marketProb)}</strong> · AI:{" "}
                <strong>{pct(urlPick.modelProb)}</strong>
                {urlPick.side !== "SKIP" && ` · ${urlPick.conviction}% conviction`}
              </span>
            </div>
            <div className="bet-question">{urlPick.question}</div>
            <p className="bet-plain">{urlPick.rationale}</p>
            <a className="bet-act" href={urlPick.url} target="_blank" rel="noreferrer">
              {urlPick.side !== "SKIP" ? `Bet ${urlPick.side} on Polymarket ↗` : "View on Polymarket ↗"}
            </a>
          </div>
        )}
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
