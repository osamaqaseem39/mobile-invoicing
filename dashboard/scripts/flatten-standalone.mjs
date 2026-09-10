import fs from "node:fs";
import path from "node:path";

/**
 * Hostinger expects `.next/standalone/server.js`. In this monorepo Next nests
 * the server under `.next/standalone/dashboard/`, which leaves Passenger with a
 * fallback `server.js` that cannot resolve `next`.
 */
const standaloneDir = path.join(process.cwd(), ".next", "standalone");
const nestedDir = path.join(standaloneDir, "dashboard");

if (!fs.existsSync(nestedDir)) {
  process.exit(0);
}

for (const entry of fs.readdirSync(nestedDir)) {
  const from = path.join(nestedDir, entry);
  const to = path.join(standaloneDir, entry);
  fs.rmSync(to, { recursive: true, force: true });
  fs.renameSync(from, to);
}

fs.rmSync(nestedDir, { recursive: true, force: true });
console.log("Flattened Next standalone output for Hostinger.");
