import { Auth0Client } from "@auth0/nextjs-auth0/server";
import { AUTH0_BASE_URL, AUTH0_ROUTES, DEFAULT_PUBLIC_APP_URL } from "@/lib/app-config";

/**
 * Base URL(s) for OAuth redirect_uri / post-logout redirects.
 * Comma-separated APP_BASE_URL / AUTH0_BASE_URL values become an allow-list (SDK-supported).
 */
function resolveAuth0AppBaseUrl(): string | string[] | undefined {
  const base = (AUTH0_BASE_URL || DEFAULT_PUBLIC_APP_URL).trim();
  if (!base) return undefined;
  if (base.includes(",")) {
    return base.split(",").map((u) => u.trim()).filter(Boolean);
  }
  return base;
}

export const auth0 = new Auth0Client({
  domain: process.env.AUTH0_DOMAIN,
  clientId: process.env.AUTH0_CLIENT_ID,
  clientSecret: process.env.AUTH0_CLIENT_SECRET,
  appBaseUrl: resolveAuth0AppBaseUrl(),
  secret: process.env.AUTH0_SECRET,
  routes: AUTH0_ROUTES,
  /** Matches useUser() + our profile routes (204 when logged out). */
  noContentProfileResponseWhenUnauthenticated: true,
  /** We do not expose /api/auth/access-token in this app. */
  enableAccessTokenEndpoint: false,
});
