"use client";

import { http, createConfig } from "wagmi";
import {
  mainnet,
  base,
  polygon,
  arbitrum,
  optimism,
  avalanche,
  bsc,
  linea,
  zksync,
  celo,
  sepolia,
  baseSepolia,
  arbitrumSepolia,
  polygonAmoy,
} from "wagmi/chains";
import { injected } from "wagmi/connectors";
import { arcTestnet } from "@arc-agent-pay/shared";

// Arc Testnet is the default for the agent demo. The other testnets give the
// (currently testnet-only) Send page variety; the EVM mainnets are listed so
// real-money sending works once the safety flag is flipped. wagmi requires
// every chain we read/write on to be listed up-front. (Non-EVM chains like
// Solana are NOT supported here — they need a separate wallet adapter + SDK.)
export const wagmiConfig = createConfig({
  chains: [
    arcTestnet,
    sepolia,
    baseSepolia,
    arbitrumSepolia,
    polygonAmoy,
    mainnet,
    base,
    polygon,
    arbitrum,
    optimism,
    avalanche,
    bsc,
    linea,
    zksync,
    celo,
  ],
  connectors: [injected({ unstable_shimAsyncInject: 1_000 })],
  transports: {
    [arcTestnet.id]: http(),
    [sepolia.id]: http(),
    [baseSepolia.id]: http(),
    [arbitrumSepolia.id]: http(),
    [polygonAmoy.id]: http(),
    [mainnet.id]: http(),
    [base.id]: http(),
    [polygon.id]: http(),
    [arbitrum.id]: http(),
    [optimism.id]: http(),
    [avalanche.id]: http(),
    [bsc.id]: http(),
    [linea.id]: http(),
    [zksync.id]: http(),
    [celo.id]: http(),
  },
  ssr: true,
});

declare module "wagmi" {
  interface Register {
    config: typeof wagmiConfig;
  }
}
