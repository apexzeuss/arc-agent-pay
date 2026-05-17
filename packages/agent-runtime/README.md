# @arc-agent-pay/agent-runtime

**Phase 2.** Wraps Circle Modular Wallets + Paymaster to give each AI agent a smart account on Arc with USDC-denominated gas.

Public surface (planned):

- `createAgent({ owner, policy })` — provisions an ERC-4337 smart account on Arc testnet.
- `agent.pay({ to, amount, memo })` — sends USDC via the modular wallet, gas paid through Circle Paymaster.
- `agent.batch([...ops])` — atomic multi-op user operation.
- `agent.receipts()` — typed stream of on-chain events for the agent's account.

Will depend on `@circle-fin/modular-wallets-core` once the SDK names are confirmed via the Circle MCP.
