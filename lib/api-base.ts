/**
 * Resolves which origin the app sends API requests to.
 *
 * Kept separate from api.ts so it can be exercised directly by a test: this
 * one function decides whether a deployed build talks to the right host, and
 * getting it wrong is invisible until the app is already live.
 */

function normalizeOrigin(value: string): string {
  const trimmed = value.trim().replace(/\/+$/, "");
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  const isLocal = /^(localhost|127\.0\.0\.1|10\.|192\.168\.)/.test(trimmed);
  return `${isLocal ? "http" : "https"}://${trimmed}`;
}

export function isLoopback(origin: string): boolean {
  return /^https?:\/\/(localhost|127\.0\.0\.1)(:|$)/i.test(origin);
}

export type ResolvedBase =
  | { origin: string; source: "configured" | "same-origin"; warning?: string }
  | { origin: null; source: "unset"; warning: string };

/**
 * `configured` is EXPO_PUBLIC_DOMAIN, which Metro inlines at build time, so a
 * deployed bundle carries whatever the build machine had. `pageOrigin` is the
 * browser's own origin, or undefined on native.
 *
 * On web this never fails: a site that renders and reports a failed request is
 * far more diagnosable than a blank screen, and same-origin is correct whenever
 * the API is proxied through the same host.
 */
export function resolveApiBase(
  configured: string | undefined,
  pageOrigin: string | undefined,
): ResolvedBase {
  const domain = configured?.trim();

  if (pageOrigin) {
    if (domain) {
      const base = normalizeOrigin(domain);
      // A bundle built against localhost but served from a real domain is a
      // misconfigured deploy; the page's own origin is the better guess.
      if (isLoopback(base) && !isLoopback(pageOrigin)) {
        return {
          origin: pageOrigin,
          source: "same-origin",
          warning:
            `EXPO_PUBLIC_DOMAIN is "${domain}", which is unreachable from ` +
            `${pageOrigin}. Falling back to same-origin requests. Set ` +
            `EXPO_PUBLIC_DOMAIN to your backend host and redeploy.`,
        };
      }
      return { origin: base, source: "configured" };
    }
    return {
      origin: pageOrigin,
      source: "same-origin",
      warning:
        "EXPO_PUBLIC_DOMAIN is not set, so API requests go to this site's " +
        "own origin. Set it to your backend host and redeploy.",
    };
  }

  if (!domain) {
    return {
      origin: null,
      source: "unset",
      warning:
        "EXPO_PUBLIC_DOMAIN is not set. Add it to .env (for example " +
        "EXPO_PUBLIC_DOMAIN=localhost:5000) and restart the bundler.",
    };
  }
  return { origin: normalizeOrigin(domain), source: "configured" };
}
