"use client";

import { useEffect, useState } from "react";

// Tracks which section is most visible in the viewport. Returns the
// id of the section the user is "on". Empty string when none qualify.
export function useActiveSection(ids: string[]): string {
  const [active, setActive] = useState<string>("");

  useEffect(() => {
    if (typeof IntersectionObserver === "undefined") return;
    if (ids.length === 0) return;

    // Track ratio of each section so we can pick the most visible
    const ratios = new Map<string, number>();
    const obs = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          ratios.set(e.target.id, e.intersectionRatio);
        }
        let best = "";
        let bestRatio = 0;
        for (const [id, ratio] of ratios) {
          if (ratio > bestRatio) {
            bestRatio = ratio;
            best = id;
          }
        }
        if (best) setActive(best);
      },
      { threshold: [0.25, 0.5, 0.75], rootMargin: "-80px 0px -20% 0px" },
    );

    const observed: Element[] = [];
    for (const id of ids) {
      const el = document.getElementById(id);
      if (el) {
        obs.observe(el);
        observed.push(el);
      }
    }
    return () => obs.disconnect();
  }, [ids]);

  return active;
}
