# arc-agent-pay

**An AI agent that holds money on Arc. Trades, pays, settles in USDC — under rules you set.**

The headline product is a **prediction-markets Bet Desk**: the agent reads live Polymarket, Claude reasons about which markets the crowd has mispriced, and the agent settles its bets in USDC on Circle's **Arc** L1 — all gated by a policy layer (per-tx cap, daily cap, cooldown, kill switch).

Also bundled: **CopyProtect**, a copy-trading module that scores 4 traders, weights its book by trust, and pulls any trader whose edge is breaking down.

Built for the Agora Agents Hackathon.

> **Honest scope:**
> - **Polymarket Bet Desk** — markets are **real and live** (Polymarket's public Gamma API). Claude's per-market judgment is real. Settlement fires real USDC transfers on Arc testnet to deterministic per-market vault addresses (not into Polymarket itself, which requires their order-book/matching system).
> - **CopyProtect** — the 4 traders (Jay, Vee, Rex, Andy) are **seeded personas** behind a swappable `TraderSource` interface. The intelligence and the settlement are real; the trader data is demo. A live leaderboard (Hyperliquid/Nansen) is a drop-in replacement — see `getTraders()`.

## The product loop (Bet Desk)

```
live polymarket  →  Claude judges each market  →  policy gates each bet  →  executor settles USDC on Arc
 (Gamma API)        (true-prob estimate + side    (caps, allowlist,            (real testnet transfers)
                     + conviction + rationale)     cooldown, kill switch)
```

1. **Markets** — pulled from Polymarket Gamma API, filtered to binary YES/NO, sorted by 24h volume. `packages/shared/src/polymarket.ts`
2. **Market analyst (the brain)** — Claude estimates the *true* probability of YES for each market, picks YES / NO / SKIP, and gives a one-line rationale + conviction. Falls back to a transparent heuristic if no API key. `packages/agent-runtime/src/market-analyst.ts`
3. **Policy engine** — pure functions over `(policy, intent, state)` returning `allow | deny | require_approval`: per-tx cap, daily cap, cooldown, recipient allowlist, human-approval threshold, kill switch. `packages/shared/src/policy.ts`
4. **Market executor** — turns weighted picks into USDC transfers, settles the allowed ones on Arc. `packages/agent-runtime/src/market-executor.ts`

The agent can also be plugged into **any LLM** (Claude Desktop, Cursor, OpenAI tool calls) via an **MCP endpoint** — the LLM acts as the user, the agent holds the money and enforces policy.

## Why it's agentic

The AI *decides*, it doesn't just trigger. For each market it states its estimated true probability, picks a side only when it has a real disagreement with the market, gives reasoning per pick, and a deterministic sizer weights the book by edge × conviction. Every settlement is gated by a policy layer a human controls — and there's a kill switch that freezes the agent instantly.

## Built on Circle / Arc

- **USDC on Arc** — native settlement currency; the agent never holds a volatile gas token.
- **Sub-second finality, ~$0.01 fees** — makes per-bet, retail-size allocation economical on-chain.
- Chain config in `packages/shared/src/arc.ts` (chain id `5042002`, USDC `0x3600…0000`).

> **Developer feedback (Circle):** we first built on Circle **Modular Wallets + Paymaster** (ERC-4337). On Arc testnet the bundler accepted userops and returned valid hashes, but `eth_getUserOperationReceipt` stayed `null` indefinitely — inclusion never happened. We pivoted to a plain EOA + `USDC.transfer` to ship the demo loop. Repro scripts under `packages/agent-runtime/scripts/`.

## Live on-chain proof

A real CopyProtect rebalance of 8 USDC on Arc testnet, decided by Claude and gated by policy:

| Trader | Copied | Transaction |
|--------|--------|-------------|
| Jay | 3.33 USDC | [`0xc870e24d…0328535d`](https://testnet.arcscan.app/tx/0xc870e24d6b956785770fea0731c837e830dcf75b5760dea2857d217b0328535d) |
| Vee | 1.79 USDC | [`0xd4530694…01e4ad13`](https://testnet.arcscan.app/tx/0xd4530694e5032a3a54f4fd051f85ad2f27dce6e32dd97630d33b2c8001e4ad13) |
| Andy | 2.88 USDC | [`0x4d031cb3…dc16fa4e`](https://testnet.arcscan.app/tx/0x4d031cb3981a737432bfd65bbe6362ef12eb38546c544a0183cbfee8dc16fa4e) |
| Rex | — | **pulled by CopyProtect** |

The same settlement path is used by the Bet Desk — each placed bet is a real USDC transfer to a deterministic per-market vault on Arc.

## CopyProtect (second module)

When a trader's recent results break down (e.g. Rex), the scorer flags it `degraded` and its weight goes to 0% — allocation is pulled automatically and redistributed to the healthy traders.

- **Scorer** — `packages/agent-runtime/src/scorer.ts` (226 lines). Claude reads each trader's last 10 trades, returns trust 0–100, rationale, and a `degraded` flag. Weights derived deterministically.
- **Same policy + executor** as the Bet Desk.

## Run it

```bash
npm install
cp .env.example .env          # set ARC_TEST_ADDRESS; optionally ANTHROPIC_API_KEY for the real brain

# CLI agents:
npm run score     -w @arc-agent-pay/agent-runtime   # CopyProtect: score + weight traders
npm run policy    -w @arc-agent-pay/agent-runtime   # policy-engine assertions + a gated rebalance
npm run rebalance -w @arc-agent-pay/agent-runtime   # dry-run; add `-- --execute` to settle real USDC

# dashboard (Bet Desk + Ledger + Activity + Plug In):
npm run dev -w @arc-agent-pay/dashboard             # http://localhost:3030
```

Without `ANTHROPIC_API_KEY` the brains fall back to transparent heuristics so the pipeline still runs; set the key and Claude does the reasoning.

## Architecture

```
apps/
  dashboard/      Next.js — Bet Desk, Ledger, Activity, Plug In, About
  mcp-server/     MCP endpoint for plug-in (stub; ships with deploy)
packages/
  shared/         Arc chain config + Polymarket source + policy engine + trader types
  agent-runtime/  Two brains (market-analyst, scorer) + two executors (market, trader)
```

## Arc testnet reference

| | |
|--|--|
| Chain ID | `5042002` |
| RPC | `https://rpc.testnet.arc.network` |
| Explorer | `https://testnet.arcscan.app` |
| USDC | `0x3600000000000000000000000000000000000000` |
| Faucet | `https://faucet.circle.com` |
