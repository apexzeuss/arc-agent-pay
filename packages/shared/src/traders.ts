// The agent copies *traders*. This module defines what a trader looks like and
// where they come from. The key design choice: `TraderSource` is an interface,
// so the agent's brain never knows whether it's scoring seeded demo traders or
// a real leaderboard feed. Today we ship `seededTraderSource` (always works,
// demo never breaks). Later we can add a `leaderboardTraderSource` that hits a
// real read-only API — and nothing else in the codebase has to change.

export type TraderId = string;

// One observed move by a trader. `returnPct` is the realized return on that
// move (0.04 = +4%, -0.06 = -6%). The agent scores a trader from the shape of
// their recent returns — consistency, drawdowns, and whether they're degrading.
export type Trade = {
  timestamp: number; // unix seconds; most recent last in `recentTrades`
  asset: string;
  direction: "long" | "short";
  returnPct: number;
};

export type Trader = {
  id: TraderId;
  label: string;
  address: `0x${string}`; // their wallet/vault on Arc testnet (the copy destination)
  bio: string;
  recentTrades: Trade[]; // chronological, oldest first
};

// The one thing the agent's brain depends on. Swap the implementation, keep
// everything downstream identical.
export interface TraderSource {
  getTraders(): Promise<Trader[]>;
}

// --- Seeded demo traders ------------------------------------------------------
// Four distinct profiles, chosen so the demo tells a story:
//   - atlas    : steady, consistent winner            → agent should weight high
//   - mercury  : high variance, net positive          → agent weights moderately
//   - icarus   : was excellent, now DEGRADING          → CopyProtect should fire
//   - tortoise : tiny but extremely consistent gains   → safe, low weight
// Timestamps are generated relative to now so "recent" stays recent.

const DAY = 86_400;

function trades(now: number, returns: number[], asset: string): Trade[] {
  // Spread the given returns across the last `returns.length` days, oldest first.
  return returns.map((returnPct, i) => ({
    timestamp: now - (returns.length - 1 - i) * DAY,
    asset,
    direction: returnPct >= 0 ? "long" : "short",
    returnPct,
  }));
}

function buildSeedTraders(now: number): Trader[] {
  return [
    {
      id: "jay",
      label: "Jay",
      address: "0xa71a500000000000000000000000000000a71a50",
      bio: "Patient trend-follower. Small, steady, repeatable edge.",
      recentTrades: trades(
        now,
        [0.03, 0.02, 0.04, 0.03, 0.05, 0.02, 0.04, 0.03, 0.04, 0.03],
        "ETH",
      ),
    },
    {
      id: "vee",
      label: "Vee",
      address: "0xdecade0000000000000000000000000000decade",
      bio: "Aggressive momentum. Big wins, real drawdowns, net up.",
      recentTrades: trades(
        now,
        [0.12, -0.08, 0.15, -0.05, 0.09, 0.18, -0.11, 0.07, 0.14, -0.04],
        "BTC",
      ),
    },
    {
      id: "rex",
      label: "Rex",
      address: "0x1ca12500000000000000000000000000001ca125",
      bio: "Was the top of the leaderboard last month. Lately... not.",
      // Front half excellent, back half falls apart — this is the degradation
      // signal CopyProtect is built to catch.
      recentTrades: trades(
        now,
        [0.10, 0.12, 0.09, 0.11, 0.08, -0.07, -0.09, -0.12, -0.08, -0.14],
        "SOL",
      ),
    },
    {
      id: "andy",
      label: "Andy",
      address: "0x707015000000000000000000000000000707015a",
      bio: "Almost boring. Never a losing week, never a big one either.",
      recentTrades: trades(
        now,
        [0.01, 0.01, 0.02, 0.01, 0.01, 0.02, 0.01, 0.01, 0.02, 0.01],
        "ETH",
      ),
    },
  ];
}

// Factory so `now` is evaluated at call time (keeps timestamps fresh) and so a
// test can inject a fixed clock.
export function seededTraderSource(now: () => number = () => Math.floor(Date.now() / 1000)): TraderSource {
  return {
    async getTraders() {
      return buildSeedTraders(now());
    },
  };
}
