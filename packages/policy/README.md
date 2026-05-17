# @arc-agent-pay/policy

**Phase 3.** TypeScript policy engine — the differentiated logic the platform owns.

Designed to be **hoistable to Solidity**: every rule is a pure function over `(intent, accountState)` returning `Allow | Deny | RequireApproval`. When we promote the engine into an on-chain policy module, the spec ports directly.

Initial rule set:

- per-tx cap, daily cap, weekly cap
- recipient allowlist / denylist
- cooldown between large transfers
- category limits (via memo tag)
- human-approval threshold (over $X requires signed approval from owner key)
