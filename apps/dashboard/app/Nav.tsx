"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useActiveSection } from "./components/ScrollSpy";

// Primary bar — the product + the things people actually come to do.
const PRIMARY = [
  { id: "markets", label: "Bet Desk", accent: true },
  { id: "ledger", label: "Ledger" },
  { id: "activity", label: "Activity" },
  { id: "plug-in", label: "Plug In" },
  { id: "about", label: "About" },
];

const SECONDARY: { id: string; label: string }[] = [];

const SECTION_IDS = ["hero", ...PRIMARY.map((t) => t.id), ...SECONDARY.map((t) => t.id)];

export function Nav() {
  const pathname = usePathname();
  const isLanding = pathname === "/";
  const active = useActiveSection(isLanding ? SECTION_IDS : []);

  // The secondary bar stays tucked away over the hero (so it doesn't crowd the
  // rolling ticker) and slides open once you scroll into the body. On non-landing
  // pages there's no hero, so it's always open.
  const [revealed, setRevealed] = useState(!isLanding);
  useEffect(() => {
    if (!isLanding) {
      setRevealed(true);
      return;
    }
    const onScroll = () => setRevealed(window.scrollY > window.innerHeight * 0.5);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [isLanding]);

  function renderTab(t: { id: string; label: string; accent?: boolean }, secondary = false) {
    const href = isLanding ? `#${t.id}` : `/#${t.id}`;
    const isActive = isLanding && active === t.id;
    return (
      <li key={t.id}>
        <Link
          href={href}
          className={`tab ${secondary ? "tab-sm" : ""} ${t.accent ? "tab-accent" : ""} ${isActive ? "active" : ""}`}
          aria-current={isActive ? "page" : undefined}
        >
          {t.label}
        </Link>
      </li>
    );
  }

  return (
    <nav className="nav">
      <div className="nav-row nav-row-primary">
        <Link href="/" className="brand">
          <span className="agent-pulse" aria-hidden />
          <span className="brand-mark">◜◝</span>
          <span>arc-agent-pay</span>
        </Link>

        <ul className="tabs">{PRIMARY.map((t) => renderTab(t))}</ul>

        <div className="nav-right" />
      </div>

      <div className={`nav-row nav-row-secondary ${revealed ? "is-revealed" : ""}`}>
        <ul className="tabs tabs-secondary">{SECONDARY.map((t) => renderTab(t, true))}</ul>
      </div>
    </nav>
  );
}
