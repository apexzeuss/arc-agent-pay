import { DEFAULT_POLICY } from "@arc-agent-pay/shared";
import { Footer } from "../components/Footer";

export default function PolicyPage() {
  const p = DEFAULT_POLICY;

  return (
    <main className="prose">
      <div className="watermark" aria-hidden />

      <div className="meta">
        <span>Policy</span>
        <span className="stamp">enforced · in force</span>
      </div>

      <h1>
        The rules <span className="amp">binding</span> the agent
      </h1>
      <p className="subtitle">
        <span className="pip">●</span>&nbsp;&nbsp;Currently enforced in code · planned to move on-chain
      </p>

      <ol className="rules">
        <li className="rule">
          <div className="rule-num">I</div>
          <div className="rule-body">
            <div className="rule-title">Per-transaction ceiling</div>
            <div className="rule-value">{p.perTxCapUsdc} <span className="unit">USDC</span></div>
            <div className="rule-note">
              No single payment from the agent may exceed this amount. Hard stop, no override.
            </div>
          </div>
        </li>
        <li className="rule">
          <div className="rule-num">II</div>
          <div className="rule-body">
            <div className="rule-title">Daily disbursement cap</div>
            <div className="rule-value">{p.dailyCapUsdc} <span className="unit">USDC&nbsp;/&nbsp;24h</span></div>
            <div className="rule-note">
              The agent&apos;s total outflow in any rolling 24-hour window is bound.
            </div>
          </div>
        </li>
        <li className="rule">
          <div className="rule-num">III</div>
          <div className="rule-body">
            <div className="rule-title">Cooldown between payments</div>
            <div className="rule-value">{p.cooldownSeconds}<span className="unit">&nbsp;sec</span></div>
            <div className="rule-note">
              Minimum interval between successive outbound transactions. Currently zero, so the agent fires on demand.
            </div>
          </div>
        </li>
        <li className="rule">
          <div className="rule-num">IV</div>
          <div className="rule-body">
            <div className="rule-title">Recipient allowlist</div>
            <div className="rule-value">
              {p.allowlist.length === 0 ? (
                <em style={{ fontFamily: "var(--display)", fontStyle: "italic", fontWeight: 400 }}>
                  any address
                </em>
              ) : (
                `${p.allowlist.length} addresses`
              )}
            </div>
            <div className="rule-note">
              When populated, the agent may only transact with addresses on the list. Empty means unbounded.
            </div>
          </div>
        </li>
      </ol>

      <div className="rule-future">
        <h2>Future ratifications</h2>
        <p>
          Category limits via memo tags. Multi-sig escape hatch for emergency revocation. Time-of-day windows. Per-counterparty sub-limits. Treaty rules for multi-agent settlement.
        </p>
      </div>

      <Footer left="arc-agent-pay · constitution" right="amendment process · redeploy" />
    </main>
  );
}
