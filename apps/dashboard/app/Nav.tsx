"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BlockTicker } from "./BlockTicker";

const TABS = [
  { href: "/dashboard", label: "Ledger" },
  { href: "/activity", label: "Activity" },
  { href: "/try", label: "Try It" },
  { href: "/policy", label: "Policy" },
  { href: "/plug-in", label: "Plug In" },
  { href: "/about", label: "About" },
];

export function Nav() {
  const pathname = usePathname();

  return (
    <nav className="nav">
      <Link href="/" className="brand">
        <span className="agent-pulse" aria-hidden />
        <span className="brand-mark">◜◝</span>
        <span>arc-agent-pay</span>
      </Link>

      <ul className="tabs">
        {TABS.map((t) => {
          const active = pathname === t.href || (t.href === "/dashboard" && pathname.startsWith("/dashboard"));
          return (
            <li key={t.href}>
              <Link
                href={t.href}
                className={`tab ${active ? "active" : ""}`}
                aria-current={active ? "page" : undefined}
              >
                {t.label}
              </Link>
            </li>
          );
        })}
      </ul>

      <div className="nav-right">
        <BlockTicker />
      </div>
    </nav>
  );
}
