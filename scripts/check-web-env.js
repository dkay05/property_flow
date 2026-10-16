/**
 * Guards the web build.
 *
 * Metro inlines `process.env.EXPO_PUBLIC_*` into the bundle at build time, so
 * the API origin is frozen the moment `expo export` runs. If EXPO_PUBLIC_DOMAIN
 * is missing on the build machine (Vercel has no .env file — it is gitignored),
 * the exported app ships with an undefined API base and white-screens in the
 * browser. Failing here with an explanation beats debugging that later.
 */
const fs = require("node:fs");
const path = require("node:path");

// `expo export` reads .env itself, but this guard runs as its own process
// beforehand, so it has to look too. Vercel injects real env vars and ships no
// .env file, so this branch is a local-development convenience only.
if (!process.env.EXPO_PUBLIC_DOMAIN) {
  const envPath = path.resolve(process.cwd(), ".env");
  if (fs.existsSync(envPath)) {
    const lines = fs.readFileSync(envPath, "utf-8").split("\n");
    for (const line of lines) {
      if (line.trimStart().startsWith("#")) continue;
      const match = /^\s*EXPO_PUBLIC_DOMAIN\s*=\s*(.*)$/.exec(line);
      if (!match) continue;
      process.env.EXPO_PUBLIC_DOMAIN = match[1].trim().replace(/^["']|["']$/g, "");
    }
  }
}

const domain = process.env.EXPO_PUBLIC_DOMAIN;

if (!domain || !domain.trim()) {
  console.error(
    [
      "",
      "EXPO_PUBLIC_DOMAIN is not set - refusing to build the web bundle.",
      "",
      "This app's API origin is baked into the bundle at build time. Set it to",
      "the host of your running backend (no trailing slash), for example:",
      "",
      "  EXPO_PUBLIC_DOMAIN=your-backend.replit.app",
      "",
      "On Vercel: Project Settings -> Environment Variables -> add",
      "EXPO_PUBLIC_DOMAIN for Production, Preview and Development, then redeploy.",
      "",
    ].join("\n"),
  );
  process.exit(1);
}

const host = domain.trim().replace(/^https?:\/\//, "");

if (/^(localhost|127\.0\.0\.1)/.test(host)) {
  // Fine locally, fatal in CI: a deployed bundle pointing at localhost is dead.
  if (process.env.VERCEL || process.env.CI) {
    console.error(
      "\nEXPO_PUBLIC_DOMAIN is \"" + domain + "\", which cannot work from a " +
        "deployed site.\nPoint it at your public backend host and redeploy.\n",
    );
    process.exit(1);
  }
  console.warn("[check-web-env] Building against local backend: " + domain);
} else {
  console.log("[check-web-env] API origin for this build: " + domain);
}
