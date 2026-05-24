import { defineChain } from "viem";

export const ARC_TESTNET_CHAIN_ID = 5042002;

export const ARC_TESTNET_RPC_HTTP = "https://rpc.testnet.arc.network";
export const ARC_TESTNET_RPC_WS = "wss://rpc.testnet.arc.network";

export const ARC_TESTNET_EXPLORER = "https://testnet.arcscan.app";

// On Arc, USDC is BOTH the ERC-20 token AND the native gas currency. but the
// two balances use DIFFERENT decimal scales, which is the trap:
//   - getBalance() (native gas)     → 18 decimals (standard EVM wei, for tool compat)
//   - USDC ERC-20 balanceOf()       → 6 decimals  (standard USDC)
// They represent the same underlying USDC; only the on-the-wire representation differs.
// Always format native with NATIVE_DECIMALS and ERC-20 reads with USDC_DECIMALS.
export const USDC_ADDRESS_ARC_TESTNET =
  "0x3600000000000000000000000000000000000000" as const;

export const USDC_DECIMALS = 6;
export const NATIVE_DECIMALS = 18;

export const arcTestnet = defineChain({
  id: ARC_TESTNET_CHAIN_ID,
  name: "Arc Testnet",
  nativeCurrency: {
    name: "USD Coin",
    symbol: "USDC",
    decimals: NATIVE_DECIMALS,
  },
  rpcUrls: {
    default: { http: [ARC_TESTNET_RPC_HTTP], webSocket: [ARC_TESTNET_RPC_WS] },
  },
  blockExplorers: {
    default: { name: "Arcscan", url: ARC_TESTNET_EXPLORER },
  },
  testnet: true,
});
