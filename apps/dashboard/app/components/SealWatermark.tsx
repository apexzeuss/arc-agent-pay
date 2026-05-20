"use client";

import { usePathname } from "next/navigation";
import { HeroSeal } from "./HeroSeal";
import { useAgentStatus } from "./AgentStatus";
import { useActiveSection } from "./ScrollSpy";

// Section ids on the one-page landing, with the caption shown when each is active.
const SECTION_LABELS: Record<string, string> = {
  hero: "Ledger № 0001",
  ledger: "01 · The Ledger",
  activity: "02 · Activity",
  try: "03 · Try It",
  policy: "04 · Policy",
  "plug-in": "05 · Plug In",
  about: "06 · About",
};

const LANDING_IDS = Object.keys(SECTION_LABELS);

// Captions for non-landing routes.
const ROUTE_LABELS: Record<string, string> = {
  "/send": "Send",
  "/activity": "Activity",
  "/dashboard": "Dashboard",
  "/policy": "Policy",
  "/plug-in": "Plug In",
  "/about": "About",
  "/try": "Try It",
};

export function SealWatermark() {
  const pathname = usePathname();
  const isLanding = pathname === "/";
  const { phase, label } = useAgentStatus();
  const active = useActiveSection(isLanding ? LANDING_IDS : []);

  // Caption priority: live action label > current section/route.
  let caption: string;
  if (phase !== "idle") {
    caption = label;
  } else if (isLanding) {
    caption = SECTION_LABELS[active] ?? "Ledger № 0001";
  } else {
    caption = ROUTE_LABELS[pathname] ?? "arc · ledger";
  }

  return (
    <div className={`seal-watermark phase-${phase}`} aria-hidden>
      <div className="seal-watermark-ring">
        <HeroSeal />
        {phase === "done" && <span className="seal-check">✓</span>}
      </div>
      <div className="seal-caption">{caption}</div>
    </div>
  );
}
