import type { NextConfig } from "next";

// Enable bundle analyzer when ANALYZE=true. Guard require so build still works
// when the analyzer package isn't installed.
let withBundleAnalyzer: (c: any) => any = (c) => c;
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const ba = require("@next/bundle-analyzer");
  withBundleAnalyzer = ba({ enabled: process.env.ANALYZE === "true" });
} catch (e) {
  // bundle-analyzer not installed; continue without it
}

// Deployment trigger: 2026-03-30T01:48:00Z
const nextConfig: NextConfig = {
  output: "standalone",
  reactStrictMode: true,
};

export default withBundleAnalyzer(nextConfig);
