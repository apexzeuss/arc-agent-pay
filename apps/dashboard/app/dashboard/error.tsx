"use client";

export default function Error({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <main>
      <div className="meta">
        <span>Ledger</span>
        <span className="stamp" style={{ color: "var(--error)", borderColor: "var(--error)" }}>Error</span>
      </div>
      <h1>
        The ledger <span className="amp">stalled</span>
      </h1>
      <p className="subtitle">
        <span className="pip">●</span>&nbsp;&nbsp;Arc RPC didn&apos;t respond, usually transient
      </p>
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
