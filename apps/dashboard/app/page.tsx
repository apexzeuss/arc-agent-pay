import { getBalances } from "./actions";
import { SpendButton } from "./SpendButton";
import { ARC_TESTNET_EXPLORER } from "@arc-agent-pay/shared";

export const dynamic = "force-dynamic";

function short(addr: string) {
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}

export default async function Page() {
  const balances = await getBalances();

  return (
    <main>
      <h1>arc-agent-pay</h1>
      <p className="subtitle">AI agent payments on Arc testnet · live on-chain balances</p>

      <div className="grid">
        <div className="card">
          <div className="label">AI Agent</div>
          <div className="balance">
            {balances.agentUsdc}<span className="unit">USDC</span>
          </div>
          <div className="addr">
            <a href={`${ARC_TESTNET_EXPLORER}/address/${balances.agentAddress}`} target="_blank" rel="noreferrer">
              {short(balances.agentAddress)} ↗
            </a>
          </div>
        </div>
        <div className="card">
          <div className="label">Your Wallet</div>
          <div className="balance">
            {balances.userUsdc}<span className="unit">USDC</span>
          </div>
          <div className="addr">
            <a href={`${ARC_TESTNET_EXPLORER}/address/${balances.userAddress}`} target="_blank" rel="noreferrer">
              {short(balances.userAddress)} ↗
            </a>
          </div>
        </div>
      </div>

      <div className="action">
        <h2>Send</h2>
        <SpendButton amount="0.5" />
      </div>
    </main>
  );
}
