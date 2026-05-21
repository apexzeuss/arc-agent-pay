// Real prediction markets from Polymarket's public Gamma API (no auth needed
// to READ). This is the live data the agent reasons over. Same swappable shape
// as the trader source: the brain depends on `MarketSource`, not on Polymarket
// specifically, so it can be mocked or replaced.

export type PredictionMarket = {
  id: string;
  slug: string;
  question: string;
  yesPrice: number; // 0..1 — the market's implied probability of YES
  noPrice: number; // 0..1
  volumeUsd: number;
  endDate?: string;
  url: string; // public Polymarket page — where a user (or builder-fee attribution) acts
};

export interface MarketSource {
  getMarkets(): Promise<PredictionMarket[]>;
}

const GAMMA = "https://gamma-api.polymarket.com/markets";

// Gamma returns `outcomes` / `outcomePrices` sometimes as arrays, sometimes as
// JSON-encoded strings. Normalize both.
function parseArr(v: unknown): string[] {
  if (Array.isArray(v)) return v as string[];
  if (typeof v === "string") {
    try {
      const p = JSON.parse(v);
      return Array.isArray(p) ? p : [];
    } catch {
      return [];
    }
  }
  return [];
}

export function polymarketSource(opts?: {
  limit?: number; // how many markets to return
  minYes?: number; // skip near-certain markets (boring to analyze)
  maxYes?: number;
}): MarketSource {
  const limit = opts?.limit ?? 6;
  const minYes = opts?.minYes ?? 0.1;
  const maxYes = opts?.maxYes ?? 0.9;

  return {
    async getMarkets() {
      // Pull the most-traded open markets, then keep binary YES/NO ones whose
      // price is genuinely uncertain — those are where an edge can exist.
      const url = `${GAMMA}?closed=false&active=true&order=volumeNum&ascending=false&limit=500`;
      const res = await fetch(url, { headers: { Accept: "application/json" } });
      if (!res.ok) throw new Error(`Polymarket Gamma API ${res.status}: ${await res.text()}`);

      const raw = (await res.json()) as unknown;
      const rows = Array.isArray(raw) ? raw : ((raw as { data?: unknown[] }).data ?? []);

      const out: PredictionMarket[] = [];
      for (const m of rows as Record<string, unknown>[]) {
        const outcomes = parseArr(m.outcomes);
        const prices = parseArr(m.outcomePrices).map(Number);
        if (outcomes.length !== 2 || prices.length !== 2) continue; // binary only

        const yesIdx = outcomes.findIndex((o) => /^yes$/i.test(o.trim()));
        if (yesIdx === -1) continue;
        const yesPrice = prices[yesIdx];
        const noPrice = prices[1 - yesIdx];
        if (yesPrice === undefined || noPrice === undefined) continue;
        if (!(yesPrice >= minYes && yesPrice <= maxYes)) continue; // uncertain only

        out.push({
          id: String(m.id ?? m.conditionId ?? m.slug ?? out.length),
          slug: String(m.slug ?? ""),
          question: String(m.question ?? "?"),
          yesPrice,
          noPrice,
          volumeUsd: Number(m.volumeNum ?? m.volume ?? 0),
          endDate: m.endDate ? String(m.endDate) : undefined,
          url: m.slug ? `https://polymarket.com/event/${m.slug}` : "https://polymarket.com",
        });
      }
      // Shuffle the eligible pool so each run surfaces a different mix of
      // markets, rather than always the same top-by-volume handful.
      for (let i = out.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        const tmp = out[i]!;
        out[i] = out[j]!;
        out[j] = tmp;
      }
      return out.slice(0, limit);
    },
  };
}
