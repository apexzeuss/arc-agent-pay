import { getAgentBalance } from "./actions";
import { SpendButton } from "./SpendButton";
import { UserPanel } from "./UserPanel";
import { ARC_TESTNET_EXPLORER } from "@arc-agent-pay/shared";

export const dynamic = "force-dynamic";

function short(addr: string) {
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}

const ISSUE = "№ 0001 · ARC TESTNET";

export default async function Page() {
  const agent = await getAgentBalance();
  const today = new Date().toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "2-digit",
  }).replace(/,/g, "");

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

      <div className="grid">
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

      <div className="action">
        <h2>Issue payment</h2>
        <SpendButton amount="0.5" />
      </div>

      <footer>
        <span>arc-agent-pay · ledger v0.1</span>
        <span>chain · 5042002</span>
      </footer>
    </main>
  );
}
