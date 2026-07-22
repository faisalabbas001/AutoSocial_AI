/**
 * Shared OAuth helpers used by every social integration (YouTube has its own
 * copy for historical reasons; new platforms use these).
 *
 * Each provider's "Authorized redirect URI" must exactly match the value
 * returned by redirectUriFor(<platform callback path>), so set NEXT_PUBLIC_APP_URL
 * to your public origin in production.
 */

/** The app's public origin, without a trailing slash. */
export function appBaseUrl(): string {
  return (process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000").replace(/\/$/, "");
}

/** Absolute redirect URI for an OAuth callback route, e.g. "/api/social/tiktok/callback". */
export function redirectUriFor(callbackPath: string): string {
  return `${appBaseUrl()}${callbackPath}`;
}

/** Standard, short-lived, httpOnly cookie options for storing the CSRF `state`. */
export const STATE_COOKIE = {
  httpOnly: true as const,
  sameSite: "lax" as const,
  maxAge: 600,
  path: "/",
};

/** A neutral zero-metrics object for platforms whose analytics aren't wired yet. */
export function zeroMetrics() {
  return { views: 0, likes: 0, comments: 0, shares: 0, reach: 0 };
}
