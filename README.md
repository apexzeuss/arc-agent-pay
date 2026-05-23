# arc-agent-pay SmartMirror / CopyProtect

An AI **copy-trading agent** on Circle's **Arc** L1. It reads a set of traders, has **Claude** decide how much of each to mirror, gates every allocation through an on-chain-style **policy engine**, and settles the copies in **USDC on Arc** automatically pulling any trader whose edge is breaking down (**CopyProtect**).

Built for the Agora Agents Hackathon (RFB 06 Social Trading Intelligence).

> **Honest scope:** the traders in this demo (Jay, Vee, Rex, Andy) are **seeded example personas with sample track records**, behind a swappable `TraderSource` interface. The *intelligence* (Claude's scoring/weighting) and the *settlement* (real USDC transfers on Arc testnet) are real; the traders are demo data. Swapping in a live leaderboard (Hyperliquid/Nansen) is a drop-in replacement see `getTraders()`.

## The loop

```
traders  →  Claude scores & weights  →  policy gates each copy  →  executor settles USDC on Arc
 (seed)      (trust 0–100 + CopyProtect)   (caps, allowlist,           (real testnet transfers)
                                            cooldown, approval,
                                            kill switch)
```

1. **Traders** each has a recent track record (last 10 trades). `packages/shared/src/traders.ts`.
2. **Scorer (the brain)** Claude reads each record and returns a trust score, a one-line rationale, and a `degraded` flag; weights are derived deterministically from the scores. Falls back to a transparent heuristic if no API key. `packages/agent-runtime/src/scorer.ts`.
3. **Policy engine** pure functions over `(policy, intent, state)` returning `allow | deny | require_approval`: per-tx cap, daily cap, cooldown, recipient allowlist, human-approval threshold, and a kill switch. `packages/shared/src/policy.ts`.
4. **Executor** turns weights into USDC transfers and settles the allowed ones on Arc. `packages/agent-runtime/src/executor.ts`.

**CopyProtect:** when a trader's recent results break down (e.g. Rex), the brain flags it `degraded` and its weight goes to 0% allocation is pulled automatically and redistributed to the healthy traders.

## Why it's agentic

The AI *decides*, it doesn't just automate. It weighs risk-adjusted performance (a high-return but volatile trader gets a *smaller* slice than a steady one), states its reasoning per trader, and protectively pulls degrading traders. Every decision is gated by a policy layer a human controls.

## Built on Circle / Arc

- **USDC on Arc** native settlement currency; the agent never holds a volatile gas token.
- **Sub-second finality, ~$0.01 fees** makes per-copy, retail-size allocation economical on-chain.
- Chain config in `packages/shared/src/arc.ts` (chain id `5042002`, USDC `0x3600…0000`).

> **Developer feedback:** we first built on Circle **Modular Wallets + Paymaster** (ERC-4337). On Arc testnet the bundler accepted userops and returned valid hashes, but `eth_getUserOperationReceipt` stayed `null` indefinitely inclusion never happened. We pivoted to a plain EOA + `USDC.transfer` to ship the demo loop. Details in the smart-account scripts under `packages/agent-runtime/scripts/`.

## Live on-chain proof

A real rebalance of 8 USDC on Arc testnet, decided by Claude and gated by policy:

| Trader | Copied | Transaction |
|--------|--------|-------------|
| Jay | 3.33 USDC | [`0xc870e24d…0328535d`](https://testnet.arcscan.app/tx/0xc870e24d6b956785770fea0731c837e830dcf75b5760dea2857d217b0328535d) |
| Vee | 1.79 USDC | [`0xd4530694…01e4ad13`](https://testnet.arcscan.app/tx/0xd4530694e5032a3a54f4fd051f85ad2f27dce6e32dd97630d33b2c8001e4ad13) |
| Andy | 2.88 USDC | [`0x4d031cb3…dc16fa4e`](https://testnet.arcscan.app/tx/0x4d031cb3981a737432bfd65bbe6362ef12eb38546c544a0183cbfee8dc16fa4e) |
| Rex | — | **pulled by CopyProtect** |

## Run it

```bash
npm install
cp .env.example .env          # set ARC_TEST_ADDRESS; optionally ANTHROPIC_API_KEY for the real brain

# the agent, from the command line:
npm run score    -w @arc-agent-pay/agent-runtime   # watch the brain score traders + assign weights
npm run policy   -w @arc-agent-pay/agent-runtime   # policy-engine assertions + a gated rebalance
npm run rebalance -w @arc-agent-pay/agent-runtime  # dry-run; add `-- --execute` to settle real testnet USDC

# the dashboard (Copy Desk):
npm run dev -w @arc-agent-pay/dashboard            # http://localhost:3030
```

Without `ANTHROPIC_API_KEY` the scorer uses a transparent heuristic so everything still runs; set the key and the brain becomes Claude.

## Architecture

```
apps/
  dashboard/      Next.js the Copy Desk: traders, scores, weights, CopyProtect, live rebalance
packages/
  shared/         Arc chain config + Trader/Policy types + the policy engine
  agent-runtime/  the scorer (Claude) + the executor (USDC settlement on Arc)
```

## Arc testnet reference

| | |
|--|--|
| Chain ID | `5042002` |
| RPC | `https://rpc.testnet.arc.network` |
| Explorer | `https://testnet.arcscan.app` |
| USDC | `0x3600000000000000000000000000000000000000` |
| Faucet | `https://faucet.circle.com` |
