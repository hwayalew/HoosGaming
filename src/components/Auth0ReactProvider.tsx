"use client";

import { Auth0Provider, useAuth0 } from "@auth0/auth0-react";
import type { AppState } from "@auth0/auth0-react";
import { useRouter } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { getAuth0SpaRedirectUri, hasSubtleCrypto } from "@/lib/auth0-spa-support";
import { Auth0SpaContext } from "@/components/Auth0SpaContext";
import { Auth0TokenFetchProxy } from "@/components/Auth0TokenFetchProxy";

/**
 * Logs actionable guidance when /oauth/token fails (common when the Auth0 app is
 * "Regular Web Application" instead of "Single Page Application").
 */
function Auth0ExchangeErrorLogger() {
  const { error, isAuthenticated, isLoading } = useAuth0();

  useEffect(() => {
    if (isLoading || !error) return;
    if (isAuthenticated) return;
    console.error(
      "[Hoos Gaming] Auth0 login did not finish:",
      error.message,
      "\nIf 401 on /oauth/token: use an Auth0 **Single Page Application**, or keep a Regular Web app and set " +
        "AUTH0_CLIENT_SECRET in .env.local (dev proxies the token request to add the secret). " +
        "Production: set NEXT_PUBLIC_AUTH0_TOKEN_PROXY=true when using the proxy.",
    );
  }, [error, isAuthenticated, isLoading]);

  return null;
}

function Auth0ProviderWithRedirect({
  children,
  domain,
  clientId,
}: {
  children: ReactNode;
  domain: string;
  clientId: string;
}) {
  const router = useRouter();
  const redirectUri = getAuth0SpaRedirectUri();

  if (process.env.NODE_ENV === "development") {
    console.info("[Hoos Gaming] Auth0 redirect_uri (must match Auth0 Callback URLs):", redirectUri);
  }

  return (
    <Auth0Provider
      domain={domain}
      clientId={clientId}
      cacheLocation="localstorage"
      authorizationParams={{
        redirect_uri: redirectUri,
      }}
      onRedirectCallback={(appState?: AppState) => {
        const raw = appState?.returnTo;
        const to =
          typeof raw === "string" && raw.startsWith("/") && !raw.startsWith("//") ? raw : "/";
        router.replace(to);
      }}
    >
      <Auth0ExchangeErrorLogger />
      {children}
    </Auth0Provider>
  );
}

function wrap(children: ReactNode, active: boolean) {
  return (
    <Auth0SpaContext.Provider value={active}>{children}</Auth0SpaContext.Provider>
  );
}

/**
 * Client-side Auth0 for Next.js App Router.
 * Skips Auth0 entirely when `crypto.subtle` is missing (LAN IP / http://0.0.0.0 / etc.)
 * so the app still loads; use http://localhost:&lt;port&gt; for login.
 */
export function Auth0ReactProvider({ children }: { children: ReactNode }) {
  const domain = process.env.NEXT_PUBLIC_AUTH0_DOMAIN?.trim();
  const clientId = process.env.NEXT_PUBLIC_AUTH0_CLIENT_ID?.trim();

  const [clientMounted, setClientMounted] = useState(false);

  useEffect(() => {
    setClientMounted(true);
  }, []);

  if (!domain || !clientId) {
    return wrap(children, false);
  }

  if (!clientMounted) {
    return wrap(children, false);
  }

  if (!hasSubtleCrypto()) {
    if (process.env.NODE_ENV === "development") {
      console.warn(
        "[Hoos Gaming] Auth0 is disabled: this page is not a secure context (no Web Crypto subtle). " +
          "Use http://localhost:<port> (not a LAN IP or 0.0.0.0), or HTTPS. " +
          "See: https://github.com/auth0/auth0-spa-js/blob/main/FAQ.md#why-do-i-get-auth0-spa-js-must-run-on-a-secure-origin"
      );
    }
    return wrap(children, false);
  }

  const tokenProxyEnabled =
    process.env.NODE_ENV === "development" ||
    process.env.NEXT_PUBLIC_AUTH0_TOKEN_PROXY === "true";

  return wrap(
    <Auth0TokenFetchProxy domain={domain} enabled={tokenProxyEnabled}>
      <Auth0ProviderWithRedirect domain={domain} clientId={clientId}>
        {children}
      </Auth0ProviderWithRedirect>
    </Auth0TokenFetchProxy>,
    true
  );
}
