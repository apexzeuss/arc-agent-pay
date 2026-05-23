"use client";

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import {
  analyzeByUrlAction,
  analyzeMarketsAction,
  listMarketsAction,
  type BetAnalysis,
  type SingleMarketPick,
} from "../betActions";
import { DeepPickPanel } from "./DeepPickPanel";

function pct(x: number) {
  return `${Math.round(x * 100)}%`;
}

const ANALYZE_COUNT = 16;

export function BetDesk() {
  const [totalCount, setTotalCount] = useState<number | null>(null);
  const [analysis, setAnalysis] = useState<BetAnalysis | null>(null);
  const [analyzing, startAnalyze] = useTransition();
  const [urlInput, setUrlInput] = useState("");
  const [urlPick, setUrlPick] = useState<SingleMarketPick | null>(null);
  const [urlError, setUrlError] = useState<string | null>(null);
  const [urlAnalyzing, startUrlAnalyze] = useTransition();

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
    startAnalyze(async () => setAnalysis(await analyzeMarketsAction(ANALYZE_COUNT)));
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

  return (
    <div className="desk">
      <div className="desk-explain">
        <p>
          <strong>Polymarket</strong> is where people bet on whether real-world things will happen, and the price shows
          the crowd&apos;s odds. The AI here is a <strong>paid analyst</strong>: it reads any market you point at and
          writes a research note — background, recent events, plausible scenarios, and where it would bet, with reasons.
          You read the take and act on Polymarket yourself.
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
            <div className="bet-question" style={{ marginBottom: 12 }}>{urlPick.question}</div>
            <DeepPickPanel pick={urlPick} />
          </div>
        )}
      </div>

      {analysis && (
        <div className="desk-grid">
          {analysis.rows.map((r) => (
            <div key={r.id} className="desk-trader">
              <div className="desk-trader-head">
                <div className="bet-question">{r.question}</div>
              </div>
              <DeepPickPanel pick={r} />
            </div>
          ))}
        </div>
      )}

      {analysis && analysis.cashWeight > 0.001 && (
        <div className="desk-cash">
          Holding <strong>{pct(analysis.cashWeight)}</strong> in cash — no edge in the rest.
        </div>
      )}

    </div>
  );
}
