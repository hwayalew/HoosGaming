"use client";

import type { CSSProperties } from "react";
import Link from "next/link";
import { useAuth0 } from "@auth0/auth0-react";
import { useAuth0SpaActive } from "@/components/Auth0SpaContext";

function isAuth0Configured(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_AUTH0_DOMAIN?.trim() &&
      process.env.NEXT_PUBLIC_AUTH0_CLIENT_ID?.trim()
  );
}

type Props = {
  href: string;
  className?: string;
  style?: CSSProperties;
  children: React.ReactNode;
};

/**
 * Primary CTAs ("Launch App", "Build Your Game"): if not logged in, starts Auth0
 * and returns to `href` after login. If Auth0 env is missing, behaves as a normal link.
 */
function AuthLaunchLinkInner({ href, className, style, children }: Props) {
  const { isAuthenticated, isLoading, loginWithRedirect } = useAuth0();

  if (isLoading) {
    return (
      <span className={className} style={{ opacity: 0.65, cursor: "wait", ...style }}>
        {children}
      </span>
    );
  }

  if (isAuthenticated) {
    return (
      <Link href={href} className={className} style={style}>
        {children}
      </Link>
    );
  }

  return (
    <button
      type="button"
      className={className}
      style={style}
      onClick={() =>
        loginWithRedirect({
          appState: { returnTo: href },
        })
      }
    >
      {children}
    </button>
  );
}

export function AuthLaunchLink(props: Props) {
  const spaActive = useAuth0SpaActive();

  if (!isAuth0Configured() || !spaActive) {
    return (
      <Link href={props.href} className={props.className} style={props.style}>
        {props.children}
      </Link>
    );
  }
  return <AuthLaunchLinkInner {...props} />;
}
