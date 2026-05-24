"use client";

import { useState } from "react";
import type { SingleMarketPick } from "../betActions";

function pct(x: number) {
  return `${Math.round(x * 100)}%`;
}

export function DeepPickPanel({ pick }: { pick: SingleMarketPick }) {
  const betting = pick.side !== "SKIP";
  const [showBackground, setShowBackground] = useState(false);
  const [showEvents, setShowEvents] = useState(false);

  return (
    <div className="deep-pick">
      <div className="deep-pick-head">
        <span className={`bet-side bet-${pick.side.toLowerCase()}`}>{pick.side}</span>
        <span className="deep-pick-meta">
          Crowd: <strong>{pct(pick.marketProb)}</strong> · AI:{" "}
          <strong>{pct(pick.modelProb)}</strong>
          {betting && ` · ${pick.conviction}% conviction`}
        </span>
      </div>

      {pick.recommendation && (
        <p className="deep-pick-rec">{pick.recommendation}</p>
      )}

      {pick.background && pick.background.length > 0 && (
        <details
          className="deep-pick-block"
          open={showBackground}
          onToggle={(e) => setShowBackground((e.target as HTMLDetailsElement).open)}
        >
          <summary className="deep-pick-summary">
            <span className="deep-pick-label">Background</span>
            <span className="deep-pick-count">{pick.background.length} facts</span>
          </summary>
          <ul className="deep-pick-list">
            {pick.background.map((b, i) => (
              <li key={i}>{b}</li>
            ))}
          </ul>
        </details>
      )}

      {pick.recentEvents && pick.recentEvents.length > 0 && (
        <details
          className="deep-pick-block"
          open={showEvents}
          onToggle={(e) => setShowEvents((e.target as HTMLDetailsElement).open)}
        >
          <summary className="deep-pick-summary">
            <span className="deep-pick-label">Recent events</span>
            <span className="deep-pick-count">{pick.recentEvents.length} update{pick.recentEvents.length === 1 ? "" : "s"}</span>
          </summary>
          <ul className="deep-pick-list">
            {pick.recentEvents.map((e, i) => (
              <li key={i}>{e}</li>
            ))}
          </ul>
        </details>
      )}

      {pick.scenarios && pick.scenarios.length > 0 && (
        <div className="deep-pick-block">
          <div className="deep-pick-label">Likely scenarios</div>
          <ul className="deep-pick-scenarios">
            {pick.scenarios.map((s, i) => (
              <li key={i}>
                <div className="deep-pick-scenario-header">
                  <span className={`deep-pick-scenario-tag bet-${s.resolvesTo.toLowerCase()}`}>
                    → {s.resolvesTo}
                  </span>
                  <span className="deep-pick-scenario-likelihood">{pct(s.likelihood)}</span>
                </div>
                <span className="deep-pick-scenario-path">{s.path}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {pick.changeMyMind && pick.changeMyMind !== " " && (
        <div className="deep-pick-block">
          <div className="deep-pick-label">What would change the call</div>
          <p className="deep-pick-cmm">{pick.changeMyMind}</p>
        </div>
      )}

      <a className="bet-act" href={pick.url} target="_blank" rel="noreferrer">
        {betting ? `Bet ${pick.side} on Polymarket ↗` : "View on Polymarket ↗"}
      </a>
    </div>
  );
}
