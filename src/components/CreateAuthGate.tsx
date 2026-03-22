"use client";

import { useEffect } from "react";
import { useAuth0 } from "@auth0/auth0-react";
import { useAuth0SpaActive } from "@/components/Auth0SpaContext";

function isAuth0Configured(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_AUTH0_DOMAIN?.trim() &&
      process.env.NEXT_PUBLIC_AUTH0_CLIENT_ID?.trim()
  );
}

/**
 * If Auth0 is configured and the user opens /create without a session, start login
 * and return here after (same as clicking "Build Your Game" first).
 */
function CreateAuthGateInner() {
  const { isLoading, isAuthenticated, loginWithRedirect } = useAuth0();

  useEffect(() => {
    if (isLoading) return;
    if (!isAuthenticated) {
      loginWithRedirect({ appState: { returnTo: "/create" } });
    }
  }, [isLoading, isAuthenticated, loginWithRedirect]);

  return null;
}

export function CreateAuthGate() {
  const spaActive = useAuth0SpaActive();
  if (!isAuth0Configured() || !spaActive) return null;
  return <CreateAuthGateInner />;
}
