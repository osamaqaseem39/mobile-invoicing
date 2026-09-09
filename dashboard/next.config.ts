import type { NextConfig } from "next";
import path from "node:path";

const nextConfig: NextConfig = {
  // Hostinger injects output: "standalone" and expects a flat
  // .next/standalone/server.js. Pin tracing to this app directory so a parent
  // lockfile does not nest output under standalone/dashboard/ (which breaks
  // runtime with "Cannot find module 'next'"). Dashboard is not an npm
  // workspace member so dependencies stay in dashboard/node_modules.
  outputFileTracingRoot: path.join(process.cwd()),
};

export default nextConfig;
