import type { NextConfig } from "next";
import path from "node:path";

const nextConfig: NextConfig = {
  // Hostinger injects output: "standalone". Pin tracing to this app so the
  // monorepo root lockfile does not nest the server under standalone/dashboard/
  // (which leaves Passenger's server.js unable to resolve `next`).
  outputFileTracingRoot: path.join(process.cwd()),
};

export default nextConfig;
