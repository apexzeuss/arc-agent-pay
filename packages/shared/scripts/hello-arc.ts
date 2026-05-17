import { config as loadEnv } from "dotenv";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import {
  createPublicClient,
  http,
  formatUnits,
  isAddress,
  erc20Abi,
} from "viem";

// Load .env from the workspace root (three levels up from this script),
// regardless of where the command was invoked from.
loadEnv({
  path: resolve(dirname(fileURLToPath(import.meta.url)), "../../../.env"),
});
import {
  arcTestnet,
  USDC_ADDRESS_ARC_TESTNET,
  USDC_DECIMALS,
  NATIVE_DECIMALS,
  ARC_TESTNET_EXPLORER,
} from "../src/arc.js";

const address = process.env.ARC_TEST_ADDRESS;

if (!address || !isAddress(address)) {
  console.error(
    "ARC_TEST_ADDRESS missing or invalid. Copy .env.example to .env and set it to a wallet address you control.",
  );
  process.exit(1);
}

const client = createPublicClient({
  chain: arcTestnet,
  transport: http(process.env.ARC_RPC_URL),
});

const [block, nativeBalance, usdcBalance] = await Promise.all([
  client.getBlockNumber(),
  client.getBalance({ address }),
  client.readContract({
    address: USDC_ADDRESS_ARC_TESTNET,
    abi: erc20Abi,
    functionName: "balanceOf",
    args: [address],
  }),
]);

console.log("Arc Testnet — connected");
console.log(`  chain id     : ${arcTestnet.id}`);
console.log(`  latest block : ${block}`);
console.log(`  address      : ${address}`);
console.log(
  `  native USDC  : ${formatUnits(nativeBalance, NATIVE_DECIMALS)} USDC (gas balance, 18-dec wei)`,
);
console.log(
  `  ERC-20 USDC  : ${formatUnits(usdcBalance, USDC_DECIMALS)} USDC (at ${USDC_ADDRESS_ARC_TESTNET}, 6-dec)`,
);
console.log(`  explorer     : ${ARC_TESTNET_EXPLORER}/address/${address}`);

if (nativeBalance === 0n && usdcBalance === 0n) {
  console.log(
    "\nWallet is empty. Fund it at https://faucet.circle.com (select Arc Testnet) and re-run.",
  );
}
