/** @type {import('next').NextConfig} */
const nextConfig = {
  // Allow Next to transpile our workspace package.
  transpilePackages: ["@arc-agent-pay/shared"],
  webpack: (config) => {
    // wagmi v2's tempo connector + various wallet libs have optional deps
    // we don't use server-side. Mark them external so webpack stops trying
    // to resolve them.
    config.externals.push("pino-pretty", "lokijs", "encoding", "accounts");
    return config;
  },
};

export default nextConfig;
