"use client";

import { useEffect, useState } from "react";

// Visible signal that the page is auto-refreshing. The dot pulses once
// per refresh interval (synced manually with the AutoRefresh component
// that drives the actual data fetch). Hover for the interval, click is
// inert. it's an indicator, not a button.
export function LiveBadge({
  intervalMs = 12_000,
  label = "Live",
}: {
  intervalMs?: number;
  label?: string;
}) {
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);

  const seconds = Math.round(intervalMs / 1000);
  return (
    <span className="live-badge" title={`Auto-refresh every ${seconds}s`}>
      <span key={tick} className="live-badge-dot" />
      <span className="live-badge-label">
        {label} · {seconds}s
      </span>
    </span>
  );
}
