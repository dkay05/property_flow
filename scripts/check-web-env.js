/**
 * Reports what API origin the web build is about to bake in.
 *
 * Metro inlines `process.env.EXPO_PUBLIC_*` into the bundle at build time, so
 * the API origin is fixed the moment `expo export` runs; changing it later
 * needs a redeploy, not a restart.
 *
 * This only warns. A deployment that renders but cannot reach its API is far
 * easier to diagnose than a red build on Vercel, and the app falls back to its
 * own origin when nothing is configured (see getBaseUrl in lib/api.ts).
 */
const fs = require("node:fs");
const path = require("node:path");

// `expo export` reads .env itself, but this runs as its own process first, so
// it has to look too. Vercel injects real env vars and ships no .env file.
if (!process.env.EXPO_PUBLIC_DOMAIN) {
  const envPath = path.resolve(process.cwd(), ".env");
  if (fs.existsSync(envPath)) {
    for (const line of fs.readFileSync(envPath, "utf-8").split("\n")) {
      if (line.trimStart().startsWith("#")) continue;
      const match = /^\s*EXPO_PUBLIC_DOMAIN\s*=\s*(.*)$/.exec(line);
      if (!match) continue;
      process.env.EXPO_PUBLIC_DOMAIN = match[1].trim().replace(/^["']|["']$/g, "");
    }
  }
}

const banner = (lines) =>
  console.warn(["", "─".repeat(72), ...lines, "─".repeat(72), ""].join("\n"));

const domain = (process.env.EXPO_PUBLIC_DOMAIN || "").trim();
const onCI = !!(process.env.VERCEL || process.env.CI);
const host = domain.replace(/^https?:\/\//, "");
const isLocal = /^(localhost|127\.0\.0\.1)/.test(host);

if (!domain) {
  banner([
    "EXPO_PUBLIC_DOMAIN is not set.",
    "",
    "The app will send API requests to its own origin, which only works if",
    "this site also serves /api (it does not, by default).",
    "",
    "To connect it to your backend, set in Vercel ->",
    "Settings -> Environment Variables (Production, Preview, Development):",
    "",
    "    EXPO_PUBLIC_DOMAIN = your-backend.replit.app",
    "",
    "then redeploy. The site will still build and render without it.",
  ]);
} else if (isLocal && onCI) {
  banner([
    `EXPO_PUBLIC_DOMAIN is "${domain}", which no browser can reach from a`,
    "deployed site. The app will fall back to its own origin instead.",
    "",
    "Set it to your public backend host and redeploy.",
  ]);
} else if (isLocal) {
  console.log(`[check-web-env] Building against local backend: ${domain}`);
} else {
  console.log(`[check-web-env] API origin for this build: ${domain}`);
}
