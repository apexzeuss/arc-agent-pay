import { DEFAULT_POLICY } from "@arc-agent-pay/shared";

export function PolicySummary({ compact = false }: { compact?: boolean }) {
  const p = DEFAULT_POLICY;
  if (compact) {
    return (
      <div className="policy-strip">
        <span className="policy-strip-label">Bound by</span>
        <span>max {p.perTxCapUsdc} USDC/tx</span>
        <span className="dot">·</span>
        <span>daily ceiling {p.dailyCapUsdc} USDC</span>
        <span className="dot">·</span>
        <span>cooldown {p.cooldownSeconds}s</span>
      </div>
    );
  }
  return null;
}
