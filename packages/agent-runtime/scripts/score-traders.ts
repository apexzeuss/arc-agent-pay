// Watch the brain decide. Pulls traders from the seeded source, scores them
// (Claude if ANTHROPIC_API_KEY is set, heuristic fallback otherwise), and
// prints the resulting copy-allocation plan.
import { config as loadEnv } from "dotenv";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

import { seededTraderSource } from "@arc-agent-pay/shared";
import { scoreTraders } from "../src/scorer";

loadEnv({ path: resolve(dirname(fileURLToPath(import.meta.url)), "../../../.env") });

const traders = await seededTraderSource().getTraders();
const result = await scoreTraders(traders);

console.log(`\n=== Copy-Allocation Plan ===`);
console.log(`brain: ${result.engine}${result.engine === "fallback" ? "  (no ANTHROPIC_API_KEY — using heuristic)" : ""}\n`);

const sorted = [...result.scores].sort((a, b) => b.weight - a.weight);
for (const s of sorted) {
  const bar = "█".repeat(Math.round(s.weight * 30));
  const tag = s.degraded ? " ⚠ CopyProtect: PULLED" : "";
  console.log(`  ${s.label.padEnd(9)} score ${String(s.score).padStart(3)}  weight ${(s.weight * 100).toFixed(0).padStart(3)}%  ${bar}${tag}`);
  console.log(`            ${s.rationale}\n`);
}

if (result.cashWeight > 0.001) {
  console.log(`  ${"Cash".padEnd(9)} weight ${(result.cashWeight * 100).toFixed(0).padStart(3)}%   (unallocated — held back from degraded traders)\n`);
}

const sum = result.scores.reduce((a, b) => a + b.weight, 0) + result.cashWeight;
console.log(`weights sum to ${(sum * 100).toFixed(0)}% ✓`);
