"use client";

import { useAuth0 } from "@auth0/auth0-react";
import { useAuth0SpaActive } from "@/components/Auth0SpaContext";

function isAuth0Configured(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_AUTH0_DOMAIN?.trim() &&
      process.env.NEXT_PUBLIC_AUTH0_CLIENT_ID?.trim()
  );
}

/** Logout + avatar only when signed in — no Sign up / Login on the nav. */
function UserMenuInner() {
  const { isAuthenticated, logout, user } = useAuth0();

  if (!isAuthenticated || !user) return null;

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      {user.picture && (
        <img
          src={user.picture}
          alt=""
          width={22}
          height={22}
          style={{ borderRadius: "50%", border: "1px solid var(--bdr2)" }}
        />
      )}
      <span
        style={{
          fontFamily: "var(--mono)",
          fontSize: 9,
          color: "var(--mid)",
          maxWidth: 100,
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
        }}
      >
        {user.nickname ?? user.name ?? user.email}
      </span>
      <button
        type="button"
        onClick={() =>
          logout({
            logoutParams: {
              returnTo:
                typeof window !== "undefined" ? window.location.origin : undefined,
            },
          })
        }
        style={{
          fontFamily: "var(--mono)",
          fontSize: 9,
          letterSpacing: ".5px",
          padding: "5px 12px",
          border: "1px solid var(--bdr)",
          borderRadius: 5,
          color: "var(--mid)",
          background: "transparent",
          cursor: "pointer",
        }}
      >
        Logout
      </button>
    </div>
  );
}

export function UserMenu() {
  const spaActive = useAuth0SpaActive();
  if (!isAuth0Configured() || !spaActive) return null;
  return <UserMenuInner />;
}
