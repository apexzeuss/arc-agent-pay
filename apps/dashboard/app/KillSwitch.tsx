"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { getAgentFrozen, setAgentFrozen } from "./actions";

export function KillSwitch() {
  const [frozen, setFrozen] = useState<boolean | null>(null);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  useEffect(() => {
    getAgentFrozen().then(setFrozen).catch(() => setFrozen(false));
  }, []);

  function toggle() {
    const next = !frozen;
    startTransition(async () => {
      const r = await setAgentFrozen(next);
      setFrozen(r.frozen);
      router.refresh();
    });
  }

  // Don't flash a wrong state before we know the real one.
  if (frozen === null) return null;

  return (
    <button
      type="button"
      className={`kill-switch ${frozen ? "is-frozen" : ""}`}
      onClick={toggle}
      disabled={pending}
      title={frozen ? "Agent is frozen. Click to release" : "Freeze the agent. Halts all payments"}
      aria-pressed={frozen}
    >
      <span className="kill-switch-dot" aria-hidden />
      {pending ? "…" : frozen ? "Frozen · release" : "Freeze agent"}
    </button>
  );
}
