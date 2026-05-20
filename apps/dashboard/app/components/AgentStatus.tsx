"use client";

import { createContext, useCallback, useContext, useRef, useState } from "react";

export type AgentPhase = "idle" | "working" | "done";

type AgentStatusValue = {
  phase: AgentPhase;
  label: string;
  // Mark the start of an on-chain action (e.g. "Sending 0.5 USDC").
  begin: (label: string) => void;
  // Mark success; auto-returns to idle after a beat.
  done: (label?: string) => void;
  // Mark failure; auto-returns to idle.
  fail: (label?: string) => void;
};

const Ctx = createContext<AgentStatusValue | null>(null);

export function AgentStatusProvider({ children }: { children: React.ReactNode }) {
  const [phase, setPhase] = useState<AgentPhase>("idle");
  const [label, setLabel] = useState("");
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clear = () => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
  };

  const begin = useCallback((l: string) => {
    clear();
    setPhase("working");
    setLabel(l);
  }, []);

  const done = useCallback((l = "Done") => {
    clear();
    setPhase("done");
    setLabel(l);
    timer.current = setTimeout(() => setPhase("idle"), 2200);
  }, []);

  const fail = useCallback((l = "Rejected") => {
    clear();
    setPhase("done");
    setLabel(l);
    timer.current = setTimeout(() => setPhase("idle"), 2600);
  }, []);

  return <Ctx.Provider value={{ phase, label, begin, done, fail }}>{children}</Ctx.Provider>;
}

export function useAgentStatus(): AgentStatusValue {
  const v = useContext(Ctx);
  // Safe no-op fallback so components work even outside the provider.
  if (!v) {
    return { phase: "idle", label: "", begin: () => {}, done: () => {}, fail: () => {} };
  }
  return v;
}
