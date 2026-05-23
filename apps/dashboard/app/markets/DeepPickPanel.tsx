import type { SingleMarketPick } from "../betActions";

function pct(x: number) {
  return `${Math.round(x * 100)}%`;
}

export function DeepPickPanel({ pick }: { pick: SingleMarketPick }) {
  const betting = pick.side !== "SKIP";
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
        <div className="deep-pick-block">
          <div className="deep-pick-label">Background</div>
          <ul className="deep-pick-list">
            {pick.background.map((b, i) => (
              <li key={i}>{b}</li>
            ))}
          </ul>
        </div>
      )}

      {pick.recentEvents && pick.recentEvents.length > 0 && (
        <div className="deep-pick-block">
          <div className="deep-pick-label">Recent events</div>
          <ul className="deep-pick-list">
            {pick.recentEvents.map((e, i) => (
              <li key={i}>{e}</li>
            ))}
          </ul>
        </div>
      )}

      {pick.scenarios && pick.scenarios.length > 0 && (
        <div className="deep-pick-block">
          <div className="deep-pick-label">Likely scenarios</div>
          <ul className="deep-pick-scenarios">
            {pick.scenarios.map((s, i) => (
              <li key={i}>
                <span className={`deep-pick-scenario-tag bet-${s.resolvesTo.toLowerCase()}`}>
                  → {s.resolvesTo}
                </span>
                <span className="deep-pick-scenario-likelihood">{pct(s.likelihood)}</span>
                <span className="deep-pick-scenario-path">{s.path}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {pick.changeMyMind && pick.changeMyMind !== "—" && (
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
