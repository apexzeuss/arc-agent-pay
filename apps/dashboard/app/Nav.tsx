"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { href: "/dashboard", label: "Ledger" },
  { href: "/about", label: "About" },
];

export function Nav() {
  const pathname = usePathname();

  return (
    <nav className="nav">
      <Link href="/" className="brand">
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
    </nav>
  );
}
