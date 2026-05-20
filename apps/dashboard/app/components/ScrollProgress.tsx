"use client";

import { useEffect, useState } from "react";

// Thin vermillion progress bar at the very top of the viewport that
// tracks scroll position. Gives the page a sense of cinematic chaptering.
export function ScrollProgress() {
  const [pct, setPct] = useState(0);

  useEffect(() => {
    function onScroll() {
      const h = document.documentElement;
      const max = h.scrollHeight - h.clientHeight;
      setPct(max > 0 ? Math.min(100, (h.scrollTop / max) * 100) : 0);
    }
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <div className="scroll-progress" aria-hidden>
      <div className="scroll-progress-fill" style={{ transform: `scaleX(${pct / 100})` }} />
    </div>
  );
}
