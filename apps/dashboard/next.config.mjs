/** @type {import('next').NextConfig} */
const nextConfig = {
  // Allow Next to transpile our workspace package.
  transpilePackages: ["@arc-agent-pay/shared"],
};

export default nextConfig;
