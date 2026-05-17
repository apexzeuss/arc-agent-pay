# arc-agent-pay

Agentic payments infrastructure on Circle's **Arc** L1. AI agents hold programmable USDC sub-accounts with on-chain spending policies; humans get a dashboard and a kill switch.

## Why Arc

Arc's three properties unlock something other L1s can't ship cleanly:

1. **USDC is the native currency** — agents never hold a volatile gas token.
2. **Sub-second deterministic finality** — receipts feel like a card auth, not a blockchain confirmation.
3. **Compliance-aware** — privacy + audit primitives baked in, so enterprises can adopt without a legal review marathon.

## Architecture (hybrid)

```
apps/
  dashboard/      Next.js — humans create agents, set policies, watch spend, kill switch
  mcp-server/     TS MCP server — exposes agent spending as structured LLM tool calls
packages/
  agent-runtime/  Wraps Circle Modular Wallets + Paymaster on Arc; one smart account per agent
  policy/         TS policy engine (caps, allowlist, cooldowns) — hoistable to Solidity later
  shared/         Arc chain config, addresses, viem chain object
```

**Phase 1 (current):** monorepo skeleton + `shared` package + `hello-arc` connectivity script.
**Phase 2:** wire Circle Modular Wallets — create a smart account on Arc testnet.
**Phase 3:** policy engine + dashboard.
**Phase 4:** MCP server.

## Setup

```bash
npm install
cp .env.example .env
# Edit .env: set ARC_TEST_ADDRESS to a wallet address you control.
# Fund it with Arc testnet USDC at https://faucet.circle.com
npm run hello
```

Expected output: the USDC balance of `ARC_TEST_ADDRESS` on Arc testnet, plus the latest block number.

## Arc testnet reference

| | |
|--|--|
| Chain ID | `5042002` |
| RPC | `https://rpc.testnet.arc.network` |
| Explorer | `https://testnet.arcscan.app` |
| USDC | `0x3600000000000000000000000000000000000000` (also the native gas token) |
| Faucet | `https://faucet.circle.com` |
