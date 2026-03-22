/**
 * Auth0 SPA SDK requires Web Crypto `subtle`, which browsers only expose in a
 * "secure context" (HTTPS, or http://localhost / http://127.0.0.1 with some ports).
 * Opening the dev server via LAN IP (e.g. http://192.168.1.5:5001) breaks auth.
 */

/**
 * PKCE redirect_uri must match Auth0 "Allowed Callback URLs" exactly (including port).
 * Prefer the live browser origin so dev works on any port (e.g. 5001 vs 3000).
 * Set NEXT_PUBLIC_AUTH0_REDIRECT_URI only if you need a fixed URL (e.g. custom path).
 */
export function getAuth0SpaRedirectUri(): string {
  const explicit = process.env.NEXT_PUBLIC_AUTH0_REDIRECT_URI?.trim();
  if (explicit) {
    return explicit.replace(/\/$/, "");
  }
  if (typeof window !== "undefined") {
    return window.location.origin;
  }
  return (
    process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ||
    process.env.NEXT_PUBLIC_AUTH0_BASE_URL?.replace(/\/$/, "") ||
    "http://localhost:5001"
  );
}

export function hasSubtleCrypto(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return (
      typeof window.crypto !== "undefined" &&
      typeof window.crypto.subtle !== "undefined"
    );
  } catch {
    return false;
  }
}
