import { getAgentActivity } from "../actions";
import { ActivityFeed } from "../components/ActivityFeed";
import { AutoRefresh } from "../components/AutoRefresh";
import { LiveBadge } from "../components/LiveBadge";
import { Footer } from "../components/Footer";
import { ARC_TESTNET_EXPLORER } from "@arc-agent-pay/shared";

export const dynamic = "force-dynamic";

function short(addr: string) {
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}

export default async function ActivityPage() {
  const { agentAddress, entries } = await getAgentActivity(25);

  const totalUsdc = entries.reduce((acc, e) => acc + Number(e.amountFormatted), 0);

  return (
    <main className="prose">
      <AutoRefresh intervalMs={15_000} />
      <div className="watermark" aria-hidden />

      <div className="meta">
        <span>Activity Log</span>
        <span className="stamp">№ {String(entries.length).padStart(4, "0")} ENTRIES</span>
      </div>

      <h1>
        Every <span className="amp">payment</span> the agent has made
      </h1>
      <p className="subtitle">
        <span className="pip">●</span>&nbsp;&nbsp;
        Read directly from Arc · last ~4 hours · agent&nbsp;
        <a href={`${ARC_TESTNET_EXPLORER}/address/${agentAddress}`} target="_blank" rel="noreferrer" style={{ color: "var(--ink)", borderBottom: "1px dotted var(--ink-mute)" }}>
          {short(agentAddress)} ↗
        </a>
      </p>

      <div className="activity-totals">
        <div>
          <div className="ss-label">Entries</div>
          <div className="ss-val big">{entries.length}</div>
        </div>
        <div>
          <div className="ss-label">Total disbursed</div>
          <div className="ss-val big">{totalUsdc.toFixed(2)} <span className="ss-unit">USDC</span></div>
        </div>
      </div>

      <h2>
        Recent entries
        <LiveBadge intervalMs={15_000} />
      </h2>
      <ActivityFeed entries={entries} emptyText="The agent has made no transactions in the recent window. Issue a payment from the Ledger to populate this log." />

      <Footer left="arc-agent-pay · activity log" right="auto-refresh · 15s" />
    </main>
  );
}
