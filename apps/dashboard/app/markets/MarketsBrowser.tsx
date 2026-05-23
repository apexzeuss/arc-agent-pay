"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import {
  listMarketsAction,
  analyzeOneMarketAction,
  type MarketRow,
  type SingleMarketPick,
} from "../betActions";

function pct(x: number) {
  return `${Math.round(x * 100)}%`;
}

function fmtVol(v: number) {
  if (v >= 1_000_000) return `$${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000) return `$${Math.round(v / 1_000)}K`;
  return `$${Math.round(v)}`;
}

const ALL = "All";
const CATEGORY_ORDER = ["Politics", "Crypto", "Sports", "Tech", "Entertainment", "Economy", "World", "Other"];

export function MarketsBrowser() {
  const [markets, setMarkets] = useState<MarketRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [category, setCategory] = useState<string>(ALL);
  const [query, setQuery] = useState("");
  const [picks, setPicks] = useState<Record<string, SingleMarketPick>>({});
  const [analyzingId, setAnalyzingId] = useState<string | null>(null);
  const [, startAnalyze] = useTransition();

  useEffect(() => {
    let cancelled = false;
    listMarketsAction(500)
      .then((m) => {
        if (!cancelled) setMarkets(m);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const categoryCounts = useMemo(() => {
    const map = new Map<string, number>();
    for (const m of markets) map.set(m.category, (map.get(m.category) ?? 0) + 1);
    return map;
  }, [markets]);

  const visibleCategories = useMemo(() => {
    const have = CATEGORY_ORDER.filter((c) => (categoryCounts.get(c) ?? 0) > 0);
    return [ALL, ...have];
  }, [categoryCounts]);

  const filtered = useMemo(() => {
    const base = category === ALL ? markets : markets.filter((m) => m.category === category);
    if (!query.trim()) return base;
    const q = query.toLowerCase();
    return base.filter((m) => m.question.toLowerCase().includes(q));
  }, [markets, category, query]);

  function analyzeOne(id: string) {
    setAnalyzingId(id);
    startAnalyze(async () => {
      try {
        const result = await analyzeOneMarketAction(id);
        if (result) setPicks((prev) => ({ ...prev, [id]: result }));
      } finally {
        setAnalyzingId(null);
      }
    });
  }

  return (
    <div className="desk">
      <div className="desk-summary">
        <span className="desk-summary-n">{loading ? "…" : markets.length}</span>
        <span className="desk-summary-label">live markets · sorted by volume</span>
      </div>

      <div className="desk-cats" role="tablist">
        {visibleCategories.map((c) => {
          const isActive = c === category;
          const count = c === ALL ? markets.length : categoryCounts.get(c) ?? 0;
          return (
            <button
              key={c}
              role="tab"
              aria-selected={isActive}
              className={`desk-cat ${isActive ? "is-active" : ""}`}
              onClick={() => setCategory(c)}
            >
              {c} <span className="desk-cat-n">{count}</span>
            </button>
          );
        })}
      </div>

      <div className="desk-search">
        <input
          type="search"
          placeholder="Search markets…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="desk-search-input"
        />
        {query && (
          <span className="desk-search-count">{filtered.length} match</span>
        )}
      </div>

      {filtered.length > 0 && (
        <ol className="desk-list">
          {filtered.map((m) => {
            const pick = picks[m.id];
            const isAnalyzing = analyzingId === m.id;
            const betting = pick && pick.side !== "SKIP";
            return (
              <li key={m.id} className={`desk-row ${pick ? "has-pick" : ""}`}>
                <div className="desk-row-q">{m.question}</div>
                <div className="desk-row-prices">
                  <span className="desk-row-yes">{pct(m.yesPrice)}</span>
                  <span className="desk-row-sep">/</span>
                  <span className="desk-row-no">{pct(m.noPrice)}</span>
                </div>
                <div className="desk-row-vol">{fmtVol(m.volumeUsd)}</div>
                <div className="desk-row-actions">
                  {!pick && (
                    <button
                      className="desk-row-analyze"
                      onClick={() => analyzeOne(m.id)}
                      disabled={isAnalyzing}
                    >
                      {isAnalyzing ? "Analyzing…" : "Analyze →"}
                    </button>
                  )}
                  <a className="desk-row-link" href={m.url} target="_blank" rel="noreferrer">
                    View ↗
                  </a>
                </div>

                {pick && (
                  <div className="desk-row-pick">
                    <div className="desk-row-pick-head">
                      <span className={`bet-side bet-${pick.side.toLowerCase()}`}>{pick.side}</span>
                      <span className="desk-row-pick-meta">
                        Crowd: <strong>{pct(pick.marketProb)}</strong> · AI:{" "}
                        <strong>{pct(pick.modelProb)}</strong>
                        {betting && ` · ${pick.conviction}% conviction`}
                      </span>
                    </div>
                    <p className="bet-plain">{pick.rationale}</p>
                  </div>
                )}
              </li>
            );
          })}
        </ol>
      )}

      {!loading && filtered.length === 0 && (
        <div className="desk-cash">
          {query ? `No markets match "${query}" in ${category}.` : `No markets in ${category} right now.`}
        </div>
      )}
    </div>
  );
}
