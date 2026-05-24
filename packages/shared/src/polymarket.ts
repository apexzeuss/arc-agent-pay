// Real prediction markets from Polymarket's public Gamma API (no auth needed
// to READ). This is the live data the agent reasons over. Same swappable shape
// as the trader source: the brain depends on `MarketSource`, not on Polymarket
// specifically, so it can be mocked or replaced.

export type PredictionMarket = {
  id: string;
  slug: string;
  question: string;
  yesPrice: number; // 0..1. the market's implied probability of YES
  noPrice: number; // 0..1
  volumeUsd: number;
  endDate?: string;
  url: string; // public Polymarket page. where a user (or builder-fee attribution) acts
  category: string; // top-level group: Politics / Crypto / Sports / Tech / Other
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

// Normalize Polymarket's free-form category/tag soup into a small set of
// top-level buckets so the UI can show category tabs.
function normalizeCategory(raw: Record<string, unknown>): string {
  const candidates: string[] = [];
  if (typeof raw.category === "string") candidates.push(raw.category);
  const events = raw.events;
  if (Array.isArray(events) && events[0] && typeof events[0] === "object") {
    const e = events[0] as Record<string, unknown>;
    if (typeof e.category === "string") candidates.push(e.category);
  }
  const tags = raw.tags;
  if (Array.isArray(tags)) {
    for (const t of tags) {
      if (t && typeof t === "object") {
        const tag = t as Record<string, unknown>;
        if (typeof tag.label === "string") candidates.push(tag.label);
        if (typeof tag.slug === "string") candidates.push(tag.slug);
      } else if (typeof t === "string") candidates.push(t);
    }
  }
  const question = String(raw.question ?? "").toLowerCase();
  const blob = (candidates.join(" ") + " " + question).toLowerCase();

  if (/\b(politic|election|trump|biden|harris|congress|senate|president|governor|vot|impeach|supreme court)\b/.test(blob)) return "Politics";
  if (/\b(crypto|bitcoin|btc|ethereum|eth|solana|sol|coin|defi|nft|stablecoin|altcoin)\b/.test(blob)) return "Crypto";
  if (/\b(nfl|nba|mlb|nhl|soccer|football|basketball|baseball|tennis|golf|f1|formula|ufc|boxing|olympic|world cup|super bowl|champion|sport)\b/.test(blob)) return "Sports";
  if (/\b(ai|gpt|openai|anthropic|claude|llm|tech|apple|google|tesla|spacex|meta|microsoft|nvidia|chip)\b/.test(blob)) return "Tech";
  if (/\b(movie|film|oscar|grammy|emmy|kardashian|taylor swift|drake|kendrick|celebrity|netflix|entertainment|music|song|album)\b/.test(blob)) return "Entertainment";
  if (/\b(weather|hurricane|storm|earthquake|climate|temperature|recession|gdp|inflation|fed|interest rate|stock|s&p|nasdaq|dow|economy|jobs|unemployment)\b/.test(blob)) return "Economy";
  if (/\b(israel|ukraine|russia|china|iran|gaza|war|nato|treaty|nuclear|missile|geopolit)\b/.test(blob)) return "World";

  return "Other";
}

export function polymarketSource(opts?: {
  limit?: number; // how many markets to return
  minYes?: number; // skip near-certain markets (boring to analyze)
  maxYes?: number;
}): MarketSource {
  const limit = opts?.limit ?? 12;
  const minYes = opts?.minYes ?? 0.02;
  const maxYes = opts?.maxYes ?? 0.98;

  return {
    async getMarkets() {
      // Polymarket's Gamma API caps each request at 100 rows, so we paginate
      // to build a big enough pool that the binary + price-band filter still
      // leaves a useful number of markets.
      const pageSize = 100;
      const maxPages = 8; // up to 800 raw markets
      const allRows: Record<string, unknown>[] = [];
      const pages = await Promise.all(
        Array.from({ length: maxPages }, (_, i) => {
          const offset = i * pageSize;
          const url = `${GAMMA}?closed=false&active=true&order=volumeNum&ascending=false&limit=${pageSize}&offset=${offset}`;
          return fetch(url, { headers: { Accept: "application/json" } }).then(async (res) => {
            if (!res.ok) return [] as Record<string, unknown>[];
            const raw = (await res.json()) as unknown;
            const rows = Array.isArray(raw) ? raw : ((raw as { data?: unknown[] }).data ?? []);
            return rows as Record<string, unknown>[];
          }).catch(() => [] as Record<string, unknown>[]);
        }),
      );
      for (const p of pages) allRows.push(...p);

      const out: PredictionMarket[] = [];
      for (const m of allRows) {
        const outcomes = parseArr(m.outcomes);
        const prices = parseArr(m.outcomePrices).map(Number);
        if (outcomes.length !== 2 || prices.length !== 2) continue; // binary only

        // Map outcomes to YES/NO. If literal "Yes"/"No" exist, use them.
        // Otherwise treat outcomes[0] as the "YES" side (Up, Team A, etc.).
        let yesIdx = outcomes.findIndex((o) => /^yes$/i.test(o.trim()));
        if (yesIdx === -1) yesIdx = 0;
        const yesPrice = prices[yesIdx];
        const noPrice = prices[1 - yesIdx];
        if (yesPrice === undefined || noPrice === undefined) continue;
        if (!(yesPrice >= minYes && yesPrice <= maxYes)) continue; // uncertain only

        // Polymarket URLs work off the parent EVENT slug. The market slug
        // alone 404s for sub-markets (e.g. "spain win" inside "world cup
        // winner"). Use events[0].slug when present, else fall back to the
        // market's own slug.
        const events = Array.isArray(m.events) ? m.events : [];
        const firstEvent = (events[0] && typeof events[0] === "object")
          ? (events[0] as Record<string, unknown>)
          : null;
        const eventSlug = firstEvent && typeof firstEvent.slug === "string" ? firstEvent.slug : "";
        const urlSlug = eventSlug || String(m.slug ?? "");
        out.push({
          id: String(m.id ?? m.conditionId ?? m.slug ?? out.length),
          slug: String(m.slug ?? ""),
          question: String(m.question ?? "?"),
          yesPrice,
          noPrice,
          volumeUsd: Number(m.volumeNum ?? m.volume ?? 0),
          endDate: m.endDate ? String(m.endDate) : undefined,
          url: urlSlug ? `https://polymarket.com/event/${urlSlug}` : "https://polymarket.com",
          category: normalizeCategory(m),
        });
      }
      // Sort by volume descending so the highest-traded markets show first.
      out.sort((a, b) => b.volumeUsd - a.volumeUsd);
      return out.slice(0, limit);
    },
  };
}
