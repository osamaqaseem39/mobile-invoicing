import type { NextConfig } from "next";
import path from "node:path";

const nextConfig: NextConfig = {
  // Allow Turbopack / file tracing to see workspace-hoisted `next`.
  // `scripts/flatten-standalone.mjs` flattens the nested Hostinger layout after build.
  outputFileTracingRoot: path.join(__dirname, ".."),
};

export default nextConfig;
