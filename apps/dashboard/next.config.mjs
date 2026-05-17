/** @type {import('next').NextConfig} */
const nextConfig = {
  // Allow Next to transpile our workspace package.
  transpilePackages: ["@arc-agent-pay/shared"],
  webpack: (config, { webpack }) => {
    // wagmi v2's connectors module star-exports every wallet (Safe,
    // WalletConnect, Porto, Tempo, MetaMask SDK, Coinbase, etc.) at
    // load time. We only use the `injected` connector and don't want
    // to install peer deps for the rest. IgnorePlugin replaces each
    // matched module with an empty stub — unreachable code paths
    // never execute, so the stubs never run.
    config.plugins.push(
      new webpack.IgnorePlugin({
        resourceRegExp:
          /^(porto(\/.*)?|@safe-global\/safe-apps-(sdk|provider)|@walletconnect\/.*|@coinbase\/wallet-sdk|@metamask\/(sdk|connect-evm)|@base-org\/account)$/,
      }),
    );
    config.externals.push("pino-pretty", "lokijs", "encoding", "accounts");
    return config;
  },
};

export default nextConfig;
