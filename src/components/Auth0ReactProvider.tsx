"use client";

import { Auth0Provider } from "@auth0/auth0-react";
import type { AppState } from "@auth0/auth0-react";
import { useRouter } from "next/navigation";
import type { ReactNode } from "react";

function Auth0ProviderWithRedirect({
  children,
  domain,
  clientId,
  redirectUri,
}: {
  children: ReactNode;
  domain: string;
  clientId: string;
  redirectUri: string;
}) {
  const router = useRouter();
  return (
    <Auth0Provider
      domain={domain}
      clientId={clientId}
      authorizationParams={{
        redirect_uri: redirectUri,
      }}
      onRedirectCallback={(appState?: AppState) => {
        const to = appState?.returnTo ?? "/";
        router.push(to);
      }}
    >
      {children}
    </Auth0Provider>
  );
}

/**
 * Client-side Auth0 for Next.js App Router.
 * Auth state and PKCE login run in the browser only (no `window` on the server).
 */
export function Auth0ReactProvider({ children }: { children: ReactNode }) {
  const domain = process.env.NEXT_PUBLIC_AUTH0_DOMAIN?.trim();
  const clientId = process.env.NEXT_PUBLIC_AUTH0_CLIENT_ID?.trim();
  /** Must match Auth0 “Allowed Callback URLs” exactly (no trailing slash). */
  const redirectUri =
    process.env.NEXT_PUBLIC_AUTH0_REDIRECT_URI?.trim() ||
    process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ||
    "http://localhost:3000";

  if (!domain || !clientId) {
    return <>{children}</>;
  }

  return (
    <Auth0ProviderWithRedirect
      domain={domain}
      clientId={clientId}
      redirectUri={redirectUri}
    >
      {children}
    </Auth0ProviderWithRedirect>
  );
}
