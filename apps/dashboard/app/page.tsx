import Link from "next/link";
import { getAgentBalance, getAgentActivity } from "./actions";
import { DEFAULT_POLICY } from "@arc-agent-pay/shared";
import { Footer } from "./components/Footer";

export const dynamic = "force-dynamic";

const LEDE_LINES = [
  { text: "A ledger", accent: false },
  { text: "for AI agents", accent: true },
  { text: "that hold money", accent: false },
  { text: "on Arc.", accent: false },
];

export default async function Landing() {
  const [agent, activity] = await Promise.all([
    getAgentBalance().catch(() => ({ usdc: "—", address: "" })),
    getAgentActivity(3).catch(() => ({ entries: [], agentAddress: "" })),
  ]);

  return (
    <main className="landing-next">
      <section className="hero">
        <span className="landing-pill">
          <span className="pulse-dot" /> Public testnet · Arc № 5042002
        </span>

        <h1 className="hero-headline">
          {LEDE_LINES.map((l, i) => (
            <span
              key={i}
              className={`hero-line ${l.accent ? "is-accent" : ""}`}
              style={{ animationDelay: `${260 + i * 140}ms` }}
            >
              {l.text}
            </span>
          ))}
        </h1>

        <Link href="/dashboard" className="hero-enter">
          <span>Enter the ledger</span>
          <span className="hero-enter-arrow" aria-hidden>→</span>
        </Link>
      </section>

      <section className="bento" aria-label="What's in the ledger">
        <Link href="/dashboard" className="tile span-2">
          <div className="tile-tag">№ 01 · Ledger</div>
          <div className="tile-big">
            {agent.usdc}<span className="tile-unit"> USDC</span>
          </div>
          <div className="tile-hook">The agent's live balance, read straight from Arc.</div>
          <div className="tile-foot">
            <span>Open the ledger</span>
            <span className="tile-arrow" aria-hidden>→</span>
          </div>
        </Link>

        <Link href="/activity" className="tile">
          <div className="tile-tag">№ 02 · Activity</div>
          <div className="tile-big">
            {activity.entries.length || "—"}
            <span className="tile-unit"> txs</span>
          </div>
          <div className="tile-hook">Every payment the agent has made.</div>
          <div className="tile-foot">
            <span>Read the log</span>
            <span className="tile-arrow" aria-hidden>→</span>
          </div>
        </Link>

        <Link href="/try" className="tile">
          <div className="tile-tag">№ 03 · Try It</div>
          <div className="tile-big">03<span className="tile-unit"> scenarios</span></div>
          <div className="tile-hook">Three live payments. One the agent must refuse.</div>
          <div className="tile-foot">
            <span>Issue a test</span>
            <span className="tile-arrow" aria-hidden>→</span>
          </div>
        </Link>

        <Link href="/policy" className="tile">
          <div className="tile-tag">№ 04 · Policy</div>
          <div className="tile-big">
            {DEFAULT_POLICY.perTxCapUsdc}
            <span className="tile-unit"> USDC / tx</span>
          </div>
          <div className="tile-hook">The constitution that binds the agent.</div>
          <div className="tile-foot">
            <span>Read the articles</span>
            <span className="tile-arrow" aria-hidden>→</span>
          </div>
        </Link>

        <Link href="/plug-in" className="tile span-2 tile-code-host">
          <div className="tile-tag">№ 05 · Plug In</div>
          <pre className="tile-code">{`{
  "mcpServers": {
    "arc-agent": {
      "url": "…/mcp"
    }
  }
}`}</pre>
          <div className="tile-hook">Wire any LLM into the agent in one paste — Claude, Cursor, OpenAI.</div>
          <div className="tile-foot">
            <span>Get the config</span>
            <span className="tile-arrow" aria-hidden>→</span>
          </div>
        </Link>

        <Link href="/about" className="tile tile-quote">
          <div className="tile-tag">№ 06 · About</div>
          <div className="tile-big quote-mark" aria-hidden>&ldquo;</div>
          <div className="tile-hook">Why this, why now, why Arc.</div>
          <div className="tile-foot">
            <span>Read the colophon</span>
            <span className="tile-arrow" aria-hidden>→</span>
          </div>
        </Link>
      </section>

      <Footer />
    </main>
  );
}
