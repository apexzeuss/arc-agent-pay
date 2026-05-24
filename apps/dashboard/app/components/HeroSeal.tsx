// A vermillion ink-stamp seal. concentric rings + crosshairs + arcing
// text that slowly rotates, a pulsing center monogram. Replaces the
// plain decorative circle on the hero's right side with something
// cohesive with the ledger/notary aesthetic the rest of the site uses.
export function HeroSeal() {
  return (
    <div className="hero-seal" aria-hidden>
      <svg viewBox="0 0 240 240" xmlns="http://www.w3.org/2000/svg">
        <defs>
          {/* Two semicircular paths so text can arc top + bottom */}
          <path id="seal-arc-top" d="M 30 120 A 90 90 0 0 1 210 120" fill="none" />
          <path id="seal-arc-bottom" d="M 30 120 A 90 90 0 0 0 210 120" fill="none" />
        </defs>

        {/* Outer + inner ring */}
        <circle cx="120" cy="120" r="110" fill="none" stroke="var(--agent)" strokeWidth="1.4" />
        <circle cx="120" cy="120" r="100" fill="none" stroke="var(--agent)" strokeWidth="0.5" strokeDasharray="2 3" />
        <circle cx="120" cy="120" r="68" fill="none" stroke="var(--agent)" strokeWidth="0.8" />
        <circle cx="120" cy="120" r="60" fill="none" stroke="var(--agent)" strokeWidth="0.4" strokeDasharray="1 4" />

        {/* Cardinal crosshair markers */}
        <line x1="120" y1="8"   x2="120" y2="22"  stroke="var(--agent)" strokeWidth="1" />
        <line x1="120" y1="218" x2="120" y2="232" stroke="var(--agent)" strokeWidth="1" />
        <line x1="8"   y1="120" x2="22"  y2="120" stroke="var(--agent)" strokeWidth="1" />
        <line x1="218" y1="120" x2="232" y2="120" stroke="var(--agent)" strokeWidth="1" />

        {/* Diagonal tick marks at 45° */}
        <g stroke="var(--agent)" strokeWidth="0.6">
          <line x1="42" y1="42" x2="50" y2="50" />
          <line x1="198" y1="42" x2="190" y2="50" />
          <line x1="42" y1="198" x2="50" y2="190" />
          <line x1="198" y1="198" x2="190" y2="190" />
        </g>

        {/* Slowly rotating arcing text */}
        <g className="seal-rotate">
          <text fontSize="9.5" letterSpacing="3.5" fill="var(--agent)" fontFamily="var(--mono)">
            <textPath href="#seal-arc-top" startOffset="50%" textAnchor="middle">
              ARC TESTNET · LEDGER № 0001 · IN GOOD ORDER
            </textPath>
          </text>
          <text fontSize="9.5" letterSpacing="3.5" fill="var(--agent)" fontFamily="var(--mono)">
            <textPath href="#seal-arc-bottom" startOffset="50%" textAnchor="middle">
              CHAIN 5042002 · USDC NATIVE GAS · v0.1
            </textPath>
          </text>
        </g>

        {/* Center monogram with breath animation */}
        <g className="seal-breath">
          <circle cx="120" cy="120" r="36" fill="none" stroke="var(--agent)" strokeWidth="0.8" />
          <text
            x="120"
            y="132"
            textAnchor="middle"
            fontSize="32"
            fill="var(--agent)"
            fontFamily="var(--display)"
            fontStyle="italic"
            fontWeight="300"
          >
            a/p
          </text>
        </g>

        {/* Pulsing center dot */}
        <circle cx="120" cy="120" r="3" fill="var(--agent)">
          <animate attributeName="r" values="3;5;3" dur="2.6s" repeatCount="indefinite" />
          <animate attributeName="opacity" values="0.55;1;0.55" dur="2.6s" repeatCount="indefinite" />
        </circle>
      </svg>
    </div>
  );
}
