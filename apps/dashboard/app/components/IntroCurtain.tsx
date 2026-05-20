"use client";

import { useEffect, useState } from "react";

// Cinematic entry: split curtain peels open (top + bottom) revealing the page,
// with a centered editorial mark flashing at the seam. Plays once per session.
export function IntroCurtain() {
  const [mounted, setMounted] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    // Skip on repeat navigations within the session so it doesn't get old.
    if (sessionStorage.getItem("arc-intro-played") === "1") {
      setDone(true);
      return;
    }
    sessionStorage.setItem("arc-intro-played", "1");
    setMounted(true);
    // Total choreography is ~1200ms; unmount shortly after.
    const t = setTimeout(() => setDone(true), 1400);
    return () => clearTimeout(t);
  }, []);

  if (done) return null;

  return (
    <div className={`intro-curtain ${mounted ? "is-playing" : ""}`} aria-hidden>
      <div className="intro-curtain-half intro-curtain-top" />
      <div className="intro-curtain-half intro-curtain-bottom" />
      <div className="intro-curtain-mark">
        <span className="intro-curtain-monogram">a/p</span>
        <span className="intro-curtain-rule" />
        <span className="intro-curtain-caption">arc · ledger</span>
      </div>
    </div>
  );
}
