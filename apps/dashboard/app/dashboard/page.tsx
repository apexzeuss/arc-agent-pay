import { getAgentBalance, getAgentActivity } from "../actions";
import { SpendButton } from "../SpendButton";
import { UserPanel } from "../UserPanel";
import { StatusStrip } from "../components/StatusStrip";
import { ActivityFeed } from "../components/ActivityFeed";
import { PolicySummary } from "../components/PolicySummary";
import { ARC_TESTNET_EXPLORER } from "@arc-agent-pay/shared";

export const dynamic = "force-dynamic";

function short(addr: string) {
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}

const ISSUE = "№ 0001 · ARC TESTNET";

export default async function DashboardPage() {
  const [agent, activity] = await Promise.all([
    getAgentBalance(),
    getAgentActivity(5),
  ]);

  const today = new Date()
    .toLocaleDateString("en-US", { year: "numeric", month: "short", day: "2-digit" })
    .replace(/,/g, "");

  const lastActivityTs = activity.entries[0]?.timestamp ?? null;

  return (
    <main>
      <div className="watermark" aria-hidden />

      <div className="meta">
        <span>Ledger {ISSUE}</span>
        <span className="stamp">Entered · {today}</span>
      </div>

      <h1>
        Agent <span className="amp">&amp;</span> Counterparty
      </h1>
      <p className="subtitle">
        <span className="pip">●</span>&nbsp;&nbsp;AI principal · USDC settlement · sub-second clearance
      </p>

      <StatusStrip lastActivityTs={lastActivityTs} />

      <div className="ledger-grid">
        <section className="ledger-col">
          <h2>Recent activity</h2>
          <ActivityFeed entries={activity.entries} emptyText="No payments yet. Issue one on the right to populate the ledger." />
          {activity.entries.length > 0 && (
            <a className="see-all" href="/activity">See full activity log →</a>
          )}
        </section>

        <aside className="ledger-side">
          <h2>Accounts</h2>
          <div className="grid stacked">
            <div className="card agent">
              <div className="label">The Agent</div>
              <div className="balance">
                {agent.usdc}<span className="unit">USDC</span>
              </div>
              <div className="addr">
                <a href={`${ARC_TESTNET_EXPLORER}/address/${agent.address}`} target="_blank" rel="noreferrer">
                  {short(agent.address)} ↗
                </a>
                <span>principal</span>
              </div>
            </div>
            <UserPanel />
          </div>

          <h2 style={{ marginTop: 36 }}>Issue payment</h2>
          <SpendButton amount="0.5" />
        </aside>
      </div>

      <PolicySummary compact />

      <footer>
        <span>arc-agent-pay · ledger v0.1</span>
        <span>chain · 5042002</span>
      </footer>
    </main>
  );
}
