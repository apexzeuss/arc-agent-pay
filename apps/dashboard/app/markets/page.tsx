import Link from "next/link";
import { MarketsBrowser } from "./MarketsBrowser";

export const metadata = {
  title: "All live markets",
};

export default function MarketsPage() {
  return (
    <main className="scroller">
      <section className="snap-section">
        <div className="section-inner">
          <div className="section-head">
            <div className="section-num">All markets</div>
            <h2 className="section-h">
              Every live market we&apos;re tracking
            </h2>
            <p className="section-sub">
              Pulled from Polymarket · binary YES/NO only · sorted by 24h volume
            </p>
            <p style={{ marginTop: 16 }}>
              <Link href="/#markets" className="hero-enter">
                <span>← Back to the AI&apos;s top picks</span>
              </Link>
            </p>
          </div>
          <MarketsBrowser />
        </div>
      </section>
    </main>
  );
}
