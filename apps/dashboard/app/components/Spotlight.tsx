"use client";

import { useEffect } from "react";

// Mouse-tracked vermillion glow on the hero. Subtle. felt rather than
// seen. Updates two CSS variables on the documentElement; the hero
// section's ::before reads them in a radial-gradient.
export function Spotlight() {
  useEffect(() => {
    let raf = 0;
    function onMove(e: MouseEvent) {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        document.documentElement.style.setProperty("--spot-x", `${e.clientX}px`);
        document.documentElement.style.setProperty("--spot-y", `${e.clientY}px`);
      });
    }
    window.addEventListener("mousemove", onMove, { passive: true });
    return () => {
      window.removeEventListener("mousemove", onMove);
      cancelAnimationFrame(raf);
    };
  }, []);
  return null;
}
