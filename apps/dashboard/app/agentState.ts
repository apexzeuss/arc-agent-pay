import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { tmpdir } from "node:os";

// Kill-switch state. Persisted to a temp file so it holds across requests
// and dev hot-reloads. For production this would live in a shared store
// (Redis/DB) so it's consistent across serverless instances.
const STATE_FILE = resolve(tmpdir(), "arc-agent-state.json");

export async function readFrozen(): Promise<boolean> {
  try {
    const raw = await readFile(STATE_FILE, "utf8");
    return JSON.parse(raw)?.frozen === true;
  } catch {
    return false;
  }
}

export async function writeFrozen(frozen: boolean): Promise<void> {
  await writeFile(STATE_FILE, JSON.stringify({ frozen, at: Date.now() }), "utf8");
}
