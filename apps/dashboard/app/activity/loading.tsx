export default function Loading() {
  return (
    <main className="prose">
      <div className="meta">
        <span>Activity Log</span>
        <span className="stamp">Loading…</span>
      </div>
      <h1 style={{ opacity: 0.55 }}>
        Every <span className="amp">payment</span> the agent has made
      </h1>
      <div className="skel skel-line" />
      <div className="skel skel-line" />
      <div className="skel skel-line" />
      <div className="skel skel-line" />
    </main>
  );
}
