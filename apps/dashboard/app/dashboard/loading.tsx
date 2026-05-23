export default function Loading() {
  return (
    <main>
      <div className="meta">
        <span>Ledger №&nbsp;…</span>
        <span className="stamp">Loading…</span>
      </div>
      <h1 style={{ opacity: 0.55 }}>
        Agent <span className="amp">and</span> Counterparty
      </h1>
      <div className="skel-strip" />
      <div className="ledger-grid">
        <section className="ledger-col">
          <h2>Recent activity</h2>
          <div className="skel skel-line" />
          <div className="skel skel-line" />
          <div className="skel skel-line" />
        </section>
        <aside className="ledger-side">
          <h2>Accounts</h2>
          <div className="skel skel-card" />
          <div className="skel skel-card" />
        </aside>
      </div>
    </main>
  );
}
