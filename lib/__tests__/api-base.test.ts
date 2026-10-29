import assert from "node:assert/strict";
import { resolveApiBase } from "../api-base";

const VERCEL = "https://property-flow.vercel.app";
const cases: Array<[string, string | undefined, string | undefined, string | null, string]> = [
  // label, EXPO_PUBLIC_DOMAIN, page origin, expected origin, expected source
  ["deployed, backend configured", "api.replit.app", VERCEL, "https://api.replit.app", "configured"],
  ["deployed, scheme included", "https://api.replit.app", VERCEL, "https://api.replit.app", "configured"],
  ["deployed, trailing slash", "https://api.replit.app/", VERCEL, "https://api.replit.app", "configured"],
  ["deployed, padded whitespace", "  api.replit.app  ", VERCEL, "https://api.replit.app", "configured"],
  // The regression that makes a deploy look broken: a bundle built from a
  // developer's .env, or by CI with no env at all.
  ["deployed, stale localhost build", "localhost:5000", VERCEL, VERCEL, "same-origin"],
  ["deployed, 127.0.0.1 build", "127.0.0.1:5000", VERCEL, VERCEL, "same-origin"],
  ["deployed, nothing configured", undefined, VERCEL, VERCEL, "same-origin"],
  ["deployed, empty string", "   ", VERCEL, VERCEL, "same-origin"],
  // Local web development must keep pointing at the local backend.
  ["local dev", "localhost:5000", "http://localhost:8081", "http://localhost:5000", "configured"],
  // Native has no page origin to fall back on.
  ["native, configured", "api.replit.app", undefined, "https://api.replit.app", "configured"],
  ["native, LAN host", "192.168.1.5:5000", undefined, "http://192.168.1.5:5000", "configured"],
  ["native, unset", undefined, undefined, null, "unset"],
];

let failures = 0;
for (const [label, configured, page, expected, source] of cases) {
  const result = resolveApiBase(configured, page);
  try {
    assert.equal(result.origin, expected, "origin");
    assert.equal(result.source, source, "source");
    console.log(`  PASS  ${label.padEnd(32)} -> ${result.origin ?? "(throws)"} [${result.source}]`);
  } catch (e) {
    failures++;
    console.error(`  FAIL  ${label}: expected ${expected} [${source}], got ${result.origin} [${result.source}]`);
  }
}

// Every fallback must explain itself; a silent fallback is the thing that
// makes a broken deployment hard to diagnose.
for (const [label, configured, page] of cases) {
  const result = resolveApiBase(configured, page);
  if (result.source !== "configured" && !result.warning) {
    failures++;
    console.error(`  FAIL  ${label}: fell back with no warning`);
  }
}

console.log(failures === 0 ? "\nAll api-base cases passed." : `\n${failures} case(s) failed.`);
process.exit(failures === 0 ? 0 : 1);
