// Quick look at the seeded traders the agent will score. Also asserts every
// trader address is a valid Arc address, so a typo can't slip into a transfer.
import { isAddress } from "viem";
import { seededTraderSource } from "../src/traders";

const traders = await seededTraderSource().getTraders();

console.log(`\n=== Seeded Traders (${traders.length}) ===\n`);

for (const t of traders) {
  const valid = isAddress(t.address);
  const rets = t.recentTrades.map((x) => x.returnPct);
  const total = rets.reduce((a, b) => a + b, 0);
  const recent3 = rets.slice(-3).reduce((a, b) => a + b, 0);

  console.log(`  ${t.label}  (${t.id})`);
  console.log(`    address     : ${t.address}  ${valid ? "✓ valid" : "✗ INVALID ADDRESS"}`);
  console.log(`    bio         : ${t.bio}`);
  console.log(`    trades      : ${t.recentTrades.length}`);
  console.log(`    total return: ${(total * 100).toFixed(0)}%`);
  console.log(`    last 3      : ${(recent3 * 100).toFixed(0)}%  ${recent3 < 0 ? "← degrading" : ""}`);
  console.log("");
}

const bad = traders.filter((t) => !isAddress(t.address));
if (bad.length > 0) {
  console.error(`✗ ${bad.length} trader(s) have invalid addresses: ${bad.map((t) => t.id).join(", ")}`);
  process.exit(1);
}
console.log("All trader addresses valid.\n");
