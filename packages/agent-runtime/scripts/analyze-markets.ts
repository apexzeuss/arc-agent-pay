// Watch the brain analyze real Polymarket markets and decide bets.
import { config as loadEnv } from "dotenv";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

import { polymarketSource } from "@arc-agent-pay/shared";
import { analyzeMarkets } from "../src/market-analyst";

loadEnv({ path: resolve(dirname(fileURLToPath(import.meta.url)), "../../../.env") });

const markets = await polymarketSource().getMarkets();
const result = await analyzeMarkets(markets);

console.log(`\n=== Prediction-Market Bet Plan ===`);
console.log(`brain: ${result.engine}${result.engine === "fallback" ? "  (no ANTHROPIC_API_KEY. heuristic)" : ""}\n`);

const ranked = [...result.picks].sort((a, b) => b.weight - a.weight);
for (const p of ranked) {
  const tag =
    p.side === "SKIP"
      ? "  skip"
      : `${p.side}  weight ${(p.weight * 100).toFixed(0)}%  edge ${(p.edge * 100).toFixed(0)}pts  conv ${p.conviction}`;
  console.log(`• ${p.question}`);
  console.log(`    market YES ${(p.marketProb * 100).toFixed(0)}%  |  AI thinks ${(p.modelProb * 100).toFixed(0)}%  →  ${tag}`);
  console.log(`    ${p.rationale}\n`);
}

if (result.cashWeight > 0.001) {
  console.log(`Holding ${(result.cashWeight * 100).toFixed(0)}% in cash (no edge found there).`);
}
const sum = result.picks.reduce((a, p) => a + p.weight, 0) + result.cashWeight;
console.log(`\nweights sum to ${(sum * 100).toFixed(0)}% ✓`);
