# arc-agent-pay

**An AI agent that holds money on Arc. Trades, pays, settles in USDC under rules you set.**

The product is a **prediction-markets Bet Desk**: the agent reads live Polymarket, Claude reasons about which markets the crowd has mispriced, and the agent settles its bets in USDC on Circle's **Arc** L1 every settlement gated by a policy layer (per-tx cap, daily cap, cooldown, kill switch).

Built for the Agora Agents Hackathon.

> **Honest scope:** Polymarket markets are **real and live** (their public Gamma API). Claude's per-market judgment is real. Settlement fires real USDC transfers on Arc testnet to deterministic per-market vault addresses (not into Polymarket itself, which requires their order-book/matching system). The MCP endpoint is a stub that ships with the deploy.

## The product loop

```
live polymarket  →  Claude judges each market  →  policy gates each bet  →  executor settles USDC on Arc
 (Gamma API)        (true-prob estimate + side    (caps, allowlist,            (real testnet transfers)
                     + conviction + rationale)     cooldown, kill switch)
```

1. **Markets** pulled from Polymarket Gamma API, filtered to binary YES/NO, sorted by 24h volume. `packages/shared/src/polymarket.ts`
2. **Market analyst (the brain)** — Claude estimates the *true* probability of YES for each market, picks YES / NO / SKIP, gives a one-line rationale + conviction. Falls back to a transparent heuristic if no API key. `packages/agent-runtime/src/market-analyst.ts`
3. **Policy engine** — pure functions over `(policy, intent, state)` returning `allow | deny | require_approval`: per-tx cap, daily cap, cooldown, recipient allowlist, human-approval threshold, kill switch. `packages/shared/src/policy.ts`
4. **Market executor** — turns weighted picks into USDC transfers, settles the allowed ones on Arc. `packages/agent-runtime/src/market-executor.ts`

The agent can also be plugged into **any LLM** (Claude Desktop, Cursor, OpenAI tool calls) via an **MCP endpoint** the LLM acts as the user, the agent holds the money and enforces policy.

## Why it's agentic

The AI *decides*, it doesn't just trigger. For each market it states its estimated true probability, picks a side only when it has a real disagreement with the market, gives reasoning per pick, and a deterministic sizer weights the book by edge × conviction. Every settlement is gated by a policy layer a human controls — and there's a kill switch that freezes the agent instantly.

## Built on Circle / Arc

- **USDC on Arc** — native settlement currency; the agent never holds a volatile gas token.
- **Sub-second finality, ~$0.01 fees** — makes per-bet, retail-size allocation economical on-chain.
- Chain config in `packages/shared/src/arc.ts` (chain id `5042002`, USDC `0x3600…0000`).

> **Developer feedback (Circle):** we first built on Circle **Modular Wallets + Paymaster** (ERC-4337). On Arc testnet the bundler accepted userops and returned valid hashes, but `eth_getUserOperationReceipt` stayed `null` indefinitely — inclusion never happened. We pivoted to a plain EOA + `USDC.transfer` to ship the demo loop. Repro scripts under `packages/agent-runtime/scripts/`.

## Live on-chain proof

The agent's settlement path is live on Arc testnet. Sample USDC transfers, decided by Claude and gated by policy:

| Amount | Transaction |
|--------|-------------|
| 3.33 USDC | [`0xc870e24d…0328535d`](https://testnet.arcscan.app/tx/0xc870e24d6b956785770fea0731c837e830dcf75b5760dea2857d217b0328535d) |
| 1.79 USDC | [`0xd4530694…01e4ad13`](https://testnet.arcscan.app/tx/0xd4530694e5032a3a54f4fd051f85ad2f27dce6e32dd97630d33b2c8001e4ad13) |
| 2.88 USDC | [`0x4d031cb3…dc16fa4e`](https://testnet.arcscan.app/tx/0x4d031cb3981a737432bfd65bbe6362ef12eb38546c544a0183cbfee8dc16fa4e) |

## Run it

```bash
npm install
cp .env.example .env          # set ARC_TEST_ADDRESS, AGENT_EOA_PK, ANTHROPIC_API_KEY

# dashboard (Bet Desk + Ledger + Activity + Plug In):
npm run dev -w @arc-agent-pay/dashboard             # http://localhost:3030

# CLI tools for the policy engine + settlement:
npm run policy    -w @arc-agent-pay/agent-runtime   # policy-engine assertions + a gated rebalance
npm run rebalance -w @arc-agent-pay/agent-runtime   # dry-run; add `-- --execute` to settle real USDC
```

Without `ANTHROPIC_API_KEY` the brain falls back to a transparent heuristic so the pipeline still runs; set the key and Claude does the reasoning.

## Architecture

```
apps/
  dashboard/      Next.js — Bet Desk, Ledger, Activity, Plug In, About
  mcp-server/     MCP endpoint for plug-in clients (stub; ships with deploy)
packages/
  shared/         Arc chain config + Polymarket source + policy engine
  agent-runtime/  Market analyst (Claude) + executor (USDC settlement on Arc)
```

> The repo also includes a second AI module **CopyProtect**, a copy-trading scorer that pulls degrading traders under `packages/agent-runtime/src/scorer.ts`. It uses the same policy engine and executor. Not the headline product; see the source if you're curious.

## Arc testnet reference

| | |
|--|--|
| Chain ID | `5042002` |
| RPC | `https://rpc.testnet.arc.network` |
| Explorer | `https://testnet.arcscan.app` |
| USDC | `0x3600000000000000000000000000000000000000` |
| Faucet | `https://faucet.circle.com` |
