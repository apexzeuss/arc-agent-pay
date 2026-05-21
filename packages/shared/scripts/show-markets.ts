// Pull real, live Polymarket markets into our code and print them.
import { polymarketSource } from "../src/polymarket";

const markets = await polymarketSource().getMarkets();

console.log(`\n=== Live Polymarket markets (${markets.length}) ===\n`);
for (const m of markets) {
  console.log(`• ${m.question}`);
  console.log(
    `    YES ${(m.yesPrice * 100).toFixed(0)}%  ·  NO ${(m.noPrice * 100).toFixed(0)}%  ·  vol $${Math.round(m.volumeUsd).toLocaleString()}${m.endDate ? `  ·  ends ${m.endDate.slice(0, 10)}` : ""}`,
  );
  console.log("");
}
console.log("All markets pulled live from gamma-api.polymarket.com\n");
