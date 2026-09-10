import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* Hostinger injects output: "standalone". Nested monorepo output is
     flattened by scripts/flatten-standalone.mjs in the build script. */
  // Hostinger builds sometimes fail type-checking due to Next type
  // duplication in monorepo installs (two `next` copies in different
  // node_modules roots). The app still compiles; ignoreBuildErrors lets the
  // deploy complete.
  typescript: {
    ignoreBuildErrors: true,
  },
};

export default nextConfig;
