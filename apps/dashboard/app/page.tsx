import Link from "next/link";
import { getAgentBalance, getAgentActivity } from "./actions";
import { ARC_TESTNET_EXPLORER } from "@arc-agent-pay/shared";
import { BetDesk } from "./markets/BetDesk";
import { SpendButton } from "./SpendButton";
import { BatchPay } from "./BatchPay";
import { KillSwitch } from "./KillSwitch";
import { ActivityFeed } from "./components/ActivityFeed";
import { Footer } from "./components/Footer";
import { Reveal } from "./components/Reveal";
import { Spotlight } from "./components/Spotlight";
import { CopyButton } from "./CopyButton";

export const dynamic = "force-dynamic";

function short(addr: string) {
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}

const TICKER: { label: string; key?: boolean }[] = [
  { label: "agentic payments", key: true },
  { label: "usdc native" },
  { label: "live prediction markets", key: true },
  { label: "sub-second clearance" },
  { label: "no volatile gas", key: true },
  { label: "policy-gated" },
  { label: "arc l1", key: true },
  { label: "settled in usdc" },
];

export default async function Landing() {
  const [agent, activity] = await Promise.all([
    getAgentBalance().catch(() => ({ usdc: " ", address: "" })),
    getAgentActivity(12).catch(() => ({ entries: [], agentAddress: "" })),
  ]);

  return (
    <main className="scroller">
      <Spotlight />

      {/* Market ticker at the very top of the page */}
      <div className="page-ticker" aria-hidden>
        <div className="page-ticker-track">
          {[0, 1].map((copy) => (
            <div className="page-ticker-row" key={copy}>
              {TICKER.map((t, i) => (
                <span key={i}>
                  <span className={t.key ? "t-key" : undefined}>{t.label}</span>
                  <span className="t-sep">/</span>
                </span>
              ))}
            </div>
          ))}
        </div>
      </div>

      {/* ============================================================
          HERO
          ============================================================ */}
      <section id="hero" className="snap-section section-hero">
        <div className="hero-aurora" aria-hidden>
          <span className="aurora a1" />
          <span className="aurora a2" />
          <span className="aurora a3" />
        </div>
        <div className="hero-grain" aria-hidden />
        <div className="section-inner section-hero-stack">
          <div className="hero-text">
            <div className="hero-eyebrow">
              <span className="hero-eyebrow-dot" aria-hidden />
              <span>Autonomous · live prediction markets · settled on Arc</span>
            </div>
            <h1 className="hero-lede">
              <span className="hero-lede-line" style={{ animationDelay: "240ms" }}>
                An AI agent that holds money on <span className="lede-accent">Arc.</span>
              </span>
              <span className="hero-lede-line" style={{ animationDelay: "400ms" }}>
                Trades, pays, settles in USDC under rules you set.
              </span>
            </h1>
            <p className="hero-sub">
              It reads live prediction markets, settles payments on Arc, and only acts within the
              per-transaction and daily limits you define.
            </p>
            <div className="hero-meta">
              <div className="hero-meta-item">
                <div className="hero-meta-label">Now holding</div>
                <div className="hero-meta-value">{agent.usdc}<span className="unit">USDC</span></div>
              </div>
              <div className="hero-meta-item">
                <div className="hero-meta-label">Settles in</div>
                <div className="hero-meta-value">&lt; 1<span className="unit">sec</span></div>
              </div>
              <div className="hero-meta-item">
                <div className="hero-meta-label">Live markets from</div>
                <div className="hero-meta-value">Polymarket</div>
              </div>
            </div>
            <a href="#markets" className="hero-enter">
              <span>Watch it read the markets</span>
              <span className="hero-enter-arrow" aria-hidden>↓</span>
            </a>
          </div>
        </div>

      </section>

      {/* ============================================================
          ★ BET DESK. the headline: AI bets real Polymarket markets
          ============================================================ */}
      <section id="markets" className="snap-section">
        <span className="chapter-watermark" aria-hidden>★</span>
        <div className="section-inner">
          <Reveal className="section-head">
            <div className="section-num">LIVE</div>
            <h2 className="section-h">
              An AI that bets <span className="amp">real</span> prediction markets
            </h2>
            <p className="section-sub">
              Reads live Polymarket markets · finds the mispriced ones · settles its bets in USDC on Arc
            </p>
          </Reveal>
          <Reveal delay={160}>
            <BetDesk agentAddress={agent.address} />
          </Reveal>
        </div>
      </section>

      {/* ============================================================
          01 · LEDGER
          ============================================================ */}
      <section id="ledger" className="snap-section">
        <span className="chapter-watermark" aria-hidden>01</span>
        <div className="section-inner">
          <Reveal className="section-head">
            <div className="section-num">№ 01</div>
            <h2 className="section-h">
              The agent&apos;s <span className="amp">wallet</span>
            </h2>
            <p className="section-sub">Live USDC balance on Arc · the principal that signs every settlement</p>
          </Reveal>

          <div className="ledger-grid one-page">
            <Reveal delay={120} className="card agent">
              <div className="label">The Agent</div>
              <div className="balance">
                {agent.usdc}<span className="unit">USDC</span>
              </div>
              {agent.address && (
                <div className="addr">
                  <a href={`${ARC_TESTNET_EXPLORER}/address/${agent.address}`} target="_blank" rel="noreferrer">
                    {short(agent.address)} ↗
                  </a>
                  <span>principal</span>
                </div>
              )}
            </Reveal>
          </div>

          <Reveal delay={360} className="ledger-action">
            <div className="ledger-action-top">
              <h3 className="ledger-action-h">Issue a payment</h3>
              <KillSwitch />
            </div>
            <SpendButton amount="0.5" />
            <BatchPay />
          </Reveal>
        </div>
      </section>

      {/* ============================================================
          02 · ACTIVITY  (dark)
          ============================================================ */}
      <section id="activity" className="snap-section section-activity dark">
        <span className="chapter-watermark" aria-hidden>02</span>
        <div className="section-inner">
          <Reveal className="section-head">
            <div className="section-num">№ 02</div>
            <h2 className="section-h">
              Every USDC transfer the agent has <span className="amp">handled</span>
            </h2>
            <p className="section-sub">
              Read straight from Arc · both earnings (paid in for analysis) and settlements (sent out) ·{" "}
              {activity.entries.length > 0 ? `${activity.entries.length} entries in the recent window` : "no transfers yet"}
            </p>
          </Reveal>
          <Reveal delay={200}>
            <ActivityFeed
              entries={activity.entries}
              emptyText="No transfers yet. Pay for an analysis above to populate this log, or trigger an outbound settlement from the Ledger."
            />
          </Reveal>
          <Reveal delay={320}>
            <Link href="/activity" className="activity-view-all">
              Check full history →
            </Link>
          </Reveal>
        </div>
      </section>

      {/* ============================================================
          03 · PLUG IN. compact MCP teaser, full details on /plug-in
          ============================================================ */}
      <section id="plug-in" className="snap-section">
        <span className="chapter-watermark" aria-hidden>03</span>
        <div className="section-inner">
          <Reveal className="section-head">
            <div className="section-num">№ 03</div>
            <h2 className="section-h">
              Wire your <span className="amp">LLM</span> to it
            </h2>
            <p className="section-sub">
              The agent exposes an MCP endpoint · plug Claude Desktop, Cursor, or any OpenAI tool-calling client in
            </p>
          </Reveal>

          <Reveal delay={200} className="endpoint">
            <div className="ss-label">MCP endpoint</div>
            <div className="endpoint-url">
              <code>https://pay-on-arc.vercel.app/mcp</code>
              <CopyButton text="https://pay-on-arc.vercel.app/mcp" label="Copy URL" />
            </div>
            <div className="endpoint-status">
              <span className="dot-pending" /> Server launching with deploy · stub for now
            </div>
            <p className="plug-in-foot" style={{ marginTop: 16 }}>
              See the full <Link href="/plug-in">Plug In page</Link> for Claude Desktop, Cursor, and OpenAI tool snippets.
            </p>
          </Reveal>
        </div>
      </section>

      {/* ============================================================
          04 · ABOUT  (dark)
          ============================================================ */}
      <section id="about" className="snap-section section-about dark">
        <span className="chapter-watermark" aria-hidden>04</span>
        <div className="section-inner">
          <Reveal className="section-head">
            <div className="section-num">№ 04</div>
            <h2 className="section-h">
              Why this, <span className="amp">why now</span>
            </h2>
          </Reveal>

          <Reveal delay={200} className="about-prose">
            <p>
              Most crypto products are built for traders. This one is built for <em>agents</em>: software that holds money
              and spends it on someone&apos;s behalf, under rules the human sets.
            </p>
            <p>
              Arc is Circle&apos;s Layer-1 where USDC is the native currency. No volatile gas token, sub-second clearance,
              audit-ready by design. The right substrate for programmable money.
            </p>
            <p>
              What you see here is a public testnet demo. No real money, no sign-up. Source on request.
            </p>
          </Reveal>

          <Reveal delay={400}>
            <Footer right="2026 · public testnet" />
          </Reveal>
        </div>
      </section>

    </main>
  );
}
