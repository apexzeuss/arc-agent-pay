import { Footer } from "../components/Footer";

export default function AboutPage() {
  return (
    <main className="prose">
      <div className="meta">
        <span>About</span>
        <span className="stamp">Colophon · v0.1</span>
      </div>

      <h1>
        Notes <span className="amp">on</span> the project
      </h1>
      <p className="subtitle">
        <span className="pip">●</span>&nbsp;&nbsp;What this is, and why
      </p>

      <section className="prose-body">
        <h2>The premise</h2>
        <p>
          Most crypto products are built for traders. This one is built for <em>agents</em> — software that holds money and spends it on someone&apos;s behalf, under rules the human sets.
        </p>

        <h2>Why Arc</h2>
        <p>
          Arc is Circle&apos;s Layer-1 where USDC is the native currency. No volatile gas token, sub-second clearance, audit-ready by design. The right substrate for programmable money.
        </p>

        <h2>What you can do here</h2>
        <p>
          Visit the <a href="/dashboard">Ledger</a>, connect your MetaMask, and watch an AI agent transact USDC end-to-end on Arc testnet. No real money. No sign-up.
        </p>

        <h2>Status</h2>
        <p>
          Public testnet demo. Source on request. The dashboard you see is the first of several views — <span style={{ color: "var(--ink-mute)" }}>policy engine, agent activity, MCP endpoint coming next.</span>
        </p>
      </section>

      <Footer right="2026 · public testnet" />
    </main>
  );
}
