import Link from "next/link";
import { getAgentBalance, getAgentActivity } from "./actions";
import { DEFAULT_POLICY, ARC_TESTNET_EXPLORER } from "@arc-agent-pay/shared";
import { SpendButton } from "./SpendButton";
import { UserPanel } from "./UserPanel";
import { ActivityFeed } from "./components/ActivityFeed";
import { Footer } from "./components/Footer";
import { HeroSeal } from "./components/HeroSeal";
import { Reveal } from "./components/Reveal";
import { CopyButton } from "./CopyButton";
import { ScenarioRunner } from "./try/ScenarioRunner";

export const dynamic = "force-dynamic";

function short(addr: string) {
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}

const LEDE_LINES = [
  { text: "A ledger", accent: false },
  { text: "for AI agents", accent: true },
  { text: "that hold money", accent: false },
  { text: "on Arc.", accent: false },
];

const SCENARIOS = [
  { id: "tip",  title: "Tip the writer",       amount: "0.10", blurb: "Under the per-tx ceiling — agent fires immediately." },
  { id: "inv",  title: "Pay a vendor invoice", amount: "0.50", blurb: "Still under the ceiling — agent fires." },
  { id: "sub",  title: "Subscribe at $2.00",   amount: "2.00", blurb: "Above the cap. Rejected by Article I.", overCap: true },
];

const MCP_URL = "https://arc-agent-pay.vercel.app/mcp";
const CLAUDE_CFG = `{
  "mcpServers": {
    "arc-agent": {
      "url": "${MCP_URL}",
      "transport": "sse"
    }
  }
}`;

export default async function Landing() {
  const [agent, activity] = await Promise.all([
    getAgentBalance().catch(() => ({ usdc: "—", address: "" })),
    getAgentActivity(8).catch(() => ({ entries: [], agentAddress: "" })),
  ]);

  return (
    <main className="scroller">
      {/* ============================================================
          HERO
          ============================================================ */}
      <section id="hero" className="snap-section section-hero">
        <div className="section-inner section-hero-grid">
          <div className="hero-text">
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
            <a href="#ledger" className="hero-enter">
              <span>Begin the ledger</span>
              <span className="hero-enter-arrow" aria-hidden>↓</span>
            </a>
          </div>
          <div className="hero-seal-wrap">
            <HeroSeal />
          </div>
        </div>

        <a href="#ledger" className="scroll-hint" aria-label="Scroll for more">
          <span className="scroll-hint-mark" aria-hidden>↓</span>
          <span className="scroll-hint-label">Scroll · or click a tab</span>
        </a>
      </section>

      {/* ============================================================
          01 · LEDGER
          ============================================================ */}
      <section id="ledger" className="snap-section">
        <div className="section-inner">
          <Reveal className="section-head">
            <div className="section-num">№ 01</div>
            <h2 className="section-h">
              The agent <span className="amp">&amp;</span> the counterparty
            </h2>
            <p className="section-sub">Live balances on Arc · principal and human side-by-side</p>
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
            <Reveal delay={220}>
              <UserPanel />
            </Reveal>
          </div>

          <Reveal delay={360} className="ledger-action">
            <h3 className="ledger-action-h">Issue a payment</h3>
            <SpendButton amount="0.5" />
          </Reveal>
        </div>
      </section>

      {/* ============================================================
          02 · ACTIVITY
          ============================================================ */}
      <section id="activity" className="snap-section section-activity">
        <div className="section-inner">
          <Reveal className="section-head">
            <div className="section-num">№ 02</div>
            <h2 className="section-h">
              Every payment <span className="amp">made</span>
            </h2>
            <p className="section-sub">
              Read straight from Arc · numbered as they posted ·{" "}
              {activity.entries.length > 0 ? `${activity.entries.length} entries in the recent window` : "no activity yet"}
            </p>
          </Reveal>
          <Reveal delay={200}>
            <ActivityFeed
              entries={activity.entries}
              emptyText="No payments yet. Use Issue payment on the Ledger above to populate this log."
            />
          </Reveal>
        </div>
      </section>

      {/* ============================================================
          03 · TRY IT
          ============================================================ */}
      <section id="try" className="snap-section">
        <div className="section-inner">
          <Reveal className="section-head">
            <div className="section-num">№ 03</div>
            <h2 className="section-h">
              Three things the agent <span className="amp">might</span> be asked to pay
            </h2>
            <p className="section-sub">Real on-chain payments · the third should be rejected by Article I</p>
          </Reveal>

          <ol className="scenarios">
            {SCENARIOS.map((s, i) => (
              <Reveal key={s.id} delay={200 + i * 120} as="li" className="scenario">
                <div className="scenario-num">{String(i + 1).padStart(2, "0")}</div>
                <div className="scenario-body">
                  <div className="scenario-title">{s.title}</div>
                  <div className="scenario-amount">
                    {s.amount}<span className="unit">&nbsp;USDC</span>
                    {s.overCap && <span className="over-cap">over cap</span>}
                  </div>
                  <div className="scenario-note">{s.blurb}</div>
                  <ScenarioRunner amount={s.amount} id={s.id} />
                </div>
              </Reveal>
            ))}
          </ol>
        </div>
      </section>

      {/* ============================================================
          04 · POLICY
          ============================================================ */}
      <section id="policy" className="snap-section">
        <div className="section-inner">
          <Reveal className="section-head">
            <div className="section-num">№ 04</div>
            <h2 className="section-h">
              The rules <span className="amp">binding</span> the agent
            </h2>
            <p className="section-sub">Enforced in code · planned to move on-chain</p>
          </Reveal>

          <ol className="rules one-page">
            <Reveal as="li" className="rule" delay={200}>
              <div className="rule-num">I</div>
              <div className="rule-body">
                <div className="rule-title">Per-transaction ceiling</div>
                <div className="rule-value">{DEFAULT_POLICY.perTxCapUsdc} <span className="unit">USDC</span></div>
                <div className="rule-note">No single payment from the agent may exceed this amount.</div>
              </div>
            </Reveal>
            <Reveal as="li" className="rule" delay={300}>
              <div className="rule-num">II</div>
              <div className="rule-body">
                <div className="rule-title">Daily disbursement cap</div>
                <div className="rule-value">{DEFAULT_POLICY.dailyCapUsdc} <span className="unit">USDC&nbsp;/&nbsp;24h</span></div>
                <div className="rule-note">Rolling 24-hour outflow is bound.</div>
              </div>
            </Reveal>
            <Reveal as="li" className="rule" delay={400}>
              <div className="rule-num">III</div>
              <div className="rule-body">
                <div className="rule-title">Cooldown between payments</div>
                <div className="rule-value">{DEFAULT_POLICY.cooldownSeconds}<span className="unit">&nbsp;sec</span></div>
                <div className="rule-note">Minimum interval between successive outbound transactions.</div>
              </div>
            </Reveal>
            <Reveal as="li" className="rule" delay={500}>
              <div className="rule-num">IV</div>
              <div className="rule-body">
                <div className="rule-title">Recipient allowlist</div>
                <div className="rule-value">
                  {DEFAULT_POLICY.allowlist.length === 0 ? (
                    <em style={{ fontFamily: "var(--display)", fontWeight: 400 }}>any address</em>
                  ) : (
                    `${DEFAULT_POLICY.allowlist.length} addresses`
                  )}
                </div>
                <div className="rule-note">When populated, agent may only transact with addresses on the list.</div>
              </div>
            </Reveal>
          </ol>
        </div>
      </section>

      {/* ============================================================
          05 · PLUG IN
          ============================================================ */}
      <section id="plug-in" className="snap-section">
        <div className="section-inner">
          <Reveal className="section-head">
            <div className="section-num">№ 05</div>
            <h2 className="section-h">
              Wire your <span className="amp">LLM</span> in one paste
            </h2>
            <p className="section-sub">MCP endpoint · drop-in config for Claude Desktop, Cursor, OpenAI tool calls</p>
          </Reveal>

          <Reveal delay={200} className="endpoint">
            <div className="ss-label">MCP endpoint</div>
            <div className="endpoint-url">
              <code>{MCP_URL}</code>
              <CopyButton text={MCP_URL} label="Copy URL" />
            </div>
            <div className="endpoint-status">
              <span className="dot-pending" /> Server launching with Vercel deploy · stub for now
            </div>
          </Reveal>

          <Reveal delay={320} className="snippet">
            <pre>{CLAUDE_CFG}</pre>
            <CopyButton text={CLAUDE_CFG} label="Copy" />
          </Reveal>

          <Reveal delay={420}>
            <p className="plug-in-foot">
              See the full <Link href="/plug-in">Plug In page</Link> for Cursor + OpenAI tool snippets and notes on
              how the agent rejects out-of-policy requests.
            </p>
          </Reveal>
        </div>
      </section>

      {/* ============================================================
          06 · ABOUT
          ============================================================ */}
      <section id="about" className="snap-section section-about">
        <div className="section-inner">
          <Reveal className="section-head">
            <div className="section-num">№ 06</div>
            <h2 className="section-h">
              Why this, <span className="amp">why now</span>
            </h2>
          </Reveal>

          <Reveal delay={200} className="about-prose">
            <p>
              Most crypto products are built for traders. This one is built for <em>agents</em> — software that holds money
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
