"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useActiveSection } from "./components/ScrollSpy";

const TABS = [
  { id: "ledger", label: "Ledger" },
  { id: "activity", label: "Activity" },
  { id: "try", label: "Try It" },
  { id: "policy", label: "Policy" },
  { id: "plug-in", label: "Plug In" },
  { id: "about", label: "About" },
];

const SECTION_IDS = ["hero", ...TABS.map((t) => t.id)];

export function Nav() {
  const pathname = usePathname();
  const isLanding = pathname === "/";
  const active = useActiveSection(isLanding ? SECTION_IDS : []);

  return (
    <nav className="nav">
      <Link href="/" className="brand">
        <span className="agent-pulse" aria-hidden />
        <span className="brand-mark">◜◝</span>
        <span>arc-agent-pay</span>
      </Link>

      <ul className="tabs">
        {TABS.map((t) => {
          const href = isLanding ? `#${t.id}` : `/#${t.id}`;
          const isActive = isLanding && active === t.id;
          return (
            <li key={t.id}>
              <Link
                href={href}
                className={`tab ${isActive ? "active" : ""}`}
                aria-current={isActive ? "page" : undefined}
              >
                {t.label}
              </Link>
            </li>
          );
        })}
      </ul>

      <div className="nav-right" />
    </nav>
  );
}
