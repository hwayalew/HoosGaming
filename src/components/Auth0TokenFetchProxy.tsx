"use client";

import { useLayoutEffect, type ReactNode } from "react";

type Props = {
  domain: string;
  enabled: boolean;
  children: ReactNode;
};

/**
 * Routes browser POSTs to Auth0 /oauth/token through /api/auth0/token so the server can add
 * client_secret (Regular Web Application). useLayoutEffect runs before Auth0Provider's useEffect
 * that exchanges the authorization code.
 */
export function Auth0TokenFetchProxy({ domain, enabled, children }: Props) {
  useLayoutEffect(() => {
    if (!enabled) return;
    const host = domain.replace(/^https?:\/\//, "").split("/")[0];
    const orig = window.fetch.bind(window);

    window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
      const url =
        typeof input === "string"
          ? input
          : input instanceof URL
            ? input.href
            : input.url;

      const isAuth0Token = url.includes("/oauth/token") && url.includes(host);

      if (!isAuth0Token) {
        return orig(input as RequestInfo, init);
      }

      let bodyText: string;
      let ct: string;

      if (input instanceof Request) {
        ct = input.headers.get("content-type") || "application/x-www-form-urlencoded";
        bodyText = await input.clone().text();
      } else {
        ct =
          (init?.headers && new Headers(init.headers).get("content-type")) ||
          "application/x-www-form-urlencoded";
        const b = init?.body;
        if (typeof b === "string") bodyText = b;
        else if (b instanceof URLSearchParams) bodyText = b.toString();
        else if (b == null) bodyText = "";
        else bodyText = await new Response(b).text();
      }

      return orig(`${window.location.origin}/api/auth0/token`, {
        method: "POST",
        headers: { "Content-Type": ct },
        body: bodyText,
      });
    };

    return () => {
      window.fetch = orig;
    };
  }, [domain, enabled]);

  return <>{children}</>;
}
