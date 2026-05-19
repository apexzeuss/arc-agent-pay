"use client";

export default function Error({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <main className="prose">
      <div className="meta">
        <span>Activity Log</span>
        <span className="stamp" style={{ color: "var(--error)", borderColor: "var(--error)" }}>Error</span>
      </div>
      <h1>
        The log <span className="amp">stalled</span>
      </h1>
      <div className="status error" style={{ maxWidth: 520 }}>
        <span className="label">Detail</span>
        <div>{error.message}</div>
      </div>
      <div style={{ marginTop: 20 }}>
        <button className="ghost" onClick={reset}>Try again</button>
      </div>
    </main>
  );
}
