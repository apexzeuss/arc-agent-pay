import type { ActivityEntry } from "../actions";
import { ARC_TESTNET_EXPLORER } from "@arc-agent-pay/shared";

function short(addr: string) {
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}

function relTime(ts: number) {
  const diff = Math.floor(Date.now() / 1000 - ts);
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

export function ActivityFeed({
  entries,
  emptyText = "No activity recorded in the recent window.",
}: {
  entries: ActivityEntry[];
  emptyText?: string;
}) {
  if (entries.length === 0) {
    return <div className="empty">{emptyText}</div>;
  }

  return (
    <ol className="activity">
      {entries.map((e, i) => (
        <li key={e.hash} className="entry" style={{ animationDelay: `${i * 60}ms` }}>
          <div className="entry-num">№ {String(entries.length - i).padStart(4, "0")}</div>
          <div className="entry-main">
            <div className="entry-line">
              <span className="entry-amount">{e.amountFormatted}<span className="unit">&nbsp;USDC</span></span>
              <span className="entry-arrow">→</span>
              <a
                className="entry-to"
                href={`${ARC_TESTNET_EXPLORER}/address/${e.to}`}
                target="_blank"
                rel="noreferrer"
              >
                {short(e.to)}
              </a>
            </div>
            <div className="entry-meta">
              <span>{relTime(e.timestamp)}</span>
              <span className="dot">·</span>
              <span>block {e.blockNumber}</span>
              <span className="dot">·</span>
              <a
                href={`${ARC_TESTNET_EXPLORER}/tx/${e.hash}`}
                target="_blank"
                rel="noreferrer"
              >
                tx {short(e.hash)}
              </a>
            </div>
          </div>
        </li>
      ))}
    </ol>
  );
}
