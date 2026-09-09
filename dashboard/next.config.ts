import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* Hostinger injects output: "standalone". Nested monorepo output is
     flattened by scripts/flatten-standalone.mjs in the build script. */
};

export default nextConfig;
