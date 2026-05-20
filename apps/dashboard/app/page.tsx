import Link from "next/link";
import { getAgentBalance, getAgentActivity } from "./actions";
import { DEFAULT_POLICY, ARC_TESTNET_EXPLORER, seededTraderSource } from "@arc-agent-pay/shared";
import { CopyDesk } from "./copy/CopyDesk";
import { SendForm } from "./send/SendForm";
import { SpendButton } from "./SpendButton";
import { BatchPay } from "./BatchPay";
import { KillSwitch } from "./KillSwitch";
import { UserPanel } from "./UserPanel";
import { ActivityFeed } from "./components/ActivityFeed";
import { Footer } from "./components/Footer";
import { Reveal } from "./components/Reveal";
import { Spotlight } from "./components/Spotlight";
import { CopyButton } from "./CopyButton";
import { ScenarioRunner } from "./try/ScenarioRunner";

export const dynamic = "force-dynamic";

function short(addr: string) {
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}

const SCENARIOS = [
  { id: "tip",  title: "Tip the writer",       amount: "0.25", blurb: "Well under the per-tx ceiling, so the agent fires immediately." },
  { id: "inv",  title: "Pay a vendor invoice", amount: "3.00", blurb: "Still under the 5 USDC ceiling, so the agent fires." },
  { id: "sub",  title: "Buy a year of SaaS",   amount: "7.50", blurb: "Above the 5 USDC per-tx limit, so it's rejected automatically.", overCap: true },
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

const TICKER: { label: string; key?: boolean }[] = [
  { label: "agentic payments", key: true },
  { label: "usdc native" },
  { label: "copy-trading intelligence", key: true },
  { label: "sub-second clearance" },
  { label: "no volatile gas", key: true },
  { label: "policy-gated" },
  { label: "arc l1", key: true },
  { label: "settled in usdc" },
];

export default async function Landing() {
  const [agent, activity, traders] = await Promise.all([
    getAgentBalance().catch(() => ({ usdc: "—", address: "" })),
    getAgentActivity(8).catch(() => ({ entries: [], agentAddress: "" })),
    seededTraderSource().getTraders(),
  ]);

  const initialTraders = traders.map((t) => ({
    id: t.id,
    label: t.label,
    address: t.address,
    bio: t.bio,
    asset: t.recentTrades[0]?.asset ?? "—",
    returns: t.recentTrades.map((x) => x.returnPct),
  }));

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
        <span className="chapter-watermark" aria-hidden>00</span>
        <div className="section-inner section-hero-stack">
          <div className="hero-text">
            <div className="hero-eyebrow">
              <span className="hero-eyebrow-rule" aria-hidden />
              <span>Volume I · Edition 0001</span>
            </div>
            <h1 className="hero-lede">
              <span className="hero-lede-line" style={{ animationDelay: "260ms" }}>
                A ledger for <span className="lede-accent">AI&nbsp;agents</span> that hold money
              </span>
              <span className="hero-lede-line" style={{ animationDelay: "420ms" }}>
                on Arc.
              </span>
            </h1>

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
                <div className="hero-meta-label">Gas paid in</div>
                <div className="hero-meta-value">USDC</div>
              </div>
            </div>
            <a href="#ledger" className="hero-enter">
              <span>Begin the ledger</span>
              <span className="hero-enter-arrow" aria-hidden>↓</span>
            </a>
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
        <span className="chapter-watermark" aria-hidden>01</span>
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
        <span className="chapter-watermark" aria-hidden>03</span>
        <div className="section-inner">
          <Reveal className="section-head">
            <div className="section-num">№ 03</div>
            <h2 className="section-h">
              Three things the agent <span className="amp">might</span> be asked to pay
            </h2>
            <p className="section-sub">Real on-chain payments · the third is rejected for exceeding the per-tx limit</p>
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
          04 · POLICY  (dark)
          ============================================================ */}
      <section id="policy" className="snap-section dark">
        <span className="chapter-watermark" aria-hidden>04</span>
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
              <div className="rule-num">01</div>
              <div className="rule-body">
                <div className="rule-title">Per-transaction ceiling</div>
                <div className="rule-value">{DEFAULT_POLICY.perTxCapUsdc} <span className="unit">USDC</span></div>
                <div className="rule-note">No single payment from the agent may exceed this amount.</div>
              </div>
            </Reveal>
            <Reveal as="li" className="rule" delay={300}>
              <div className="rule-num">02</div>
              <div className="rule-body">
                <div className="rule-title">Daily disbursement cap</div>
                <div className="rule-value">{DEFAULT_POLICY.dailyCapUsdc} <span className="unit">USDC&nbsp;/&nbsp;24h</span></div>
                <div className="rule-note">Rolling 24-hour outflow is bound.</div>
              </div>
            </Reveal>
            <Reveal as="li" className="rule" delay={400}>
              <div className="rule-num">03</div>
              <div className="rule-body">
                <div className="rule-title">Cooldown between payments</div>
                <div className="rule-value">{DEFAULT_POLICY.cooldownSeconds}<span className="unit">&nbsp;sec</span></div>
                <div className="rule-note">Minimum interval between successive outbound transactions.</div>
              </div>
            </Reveal>
            <Reveal as="li" className="rule" delay={500}>
              <div className="rule-num">04</div>
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
        <span className="chapter-watermark" aria-hidden>05</span>
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
          06 · COPY DESK  (the product)
          ============================================================ */}
      <section id="copy" className="snap-section">
        <span className="chapter-watermark" aria-hidden>06</span>
        <div className="section-inner">
          <Reveal className="section-head">
            <div className="section-num">№ 06</div>
            <h2 className="section-h">
              Copy <span className="amp">&amp;</span> protect
            </h2>
            <p className="section-sub">AI scores traders, weights the book, and pulls the ones whose edge breaks</p>
          </Reveal>
          <Reveal delay={160}>
            <CopyDesk initialTraders={initialTraders} embedded />
          </Reveal>
        </div>
      </section>

      {/* ============================================================
          07 · SEND
          ============================================================ */}
      <section id="send" className="snap-section">
        <span className="chapter-watermark" aria-hidden>07</span>
        <div className="section-inner">
          <Reveal className="section-head">
            <div className="section-num">№ 07</div>
            <h2 className="section-h">
              Send from <span className="amp">your</span> wallet
            </h2>
            <p className="section-sub">Your wallet · your funds · pick a network, a token, and a destination</p>
          </Reveal>
          <Reveal delay={160}>
            <SendForm />
          </Reveal>
        </div>
      </section>

      {/* ============================================================
          08 · ABOUT  (dark)
          ============================================================ */}
      <section id="about" className="snap-section section-about dark">
        <span className="chapter-watermark" aria-hidden>08</span>
        <div className="section-inner">
          <Reveal className="section-head">
            <div className="section-num">№ 08</div>
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
