"use client";

import { useUser } from "@auth0/nextjs-auth0/client";
import Link from "next/link";

export function AuthButton() {
  const { user, isLoading } = useUser();

  if (isLoading) {
    return (
      <span style={{
        fontFamily: "var(--mono)", fontSize: 9, color: "var(--muted)",
        padding: "5px 12px", border: "1px solid var(--bdr)", borderRadius: 5,
        opacity: .5, letterSpacing: ".5px",
      }}>
        ···
      </span>
    );
  }

  if (user) {
    return (
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        {user.picture && (
          <img
            src={user.picture}
            alt={user.name ?? "User"}
            style={{ width: 22, height: 22, borderRadius: "50%", border: "1px solid var(--bdr2)" }}
          />
        )}
        <span style={{ fontFamily: "var(--mono)", fontSize: 9, color: "var(--mid)", maxWidth: 90, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {user.nickname ?? user.name ?? user.email}
        </span>
        <a
          href="/api/auth/logout"
          style={{
            fontFamily: "var(--mono)", fontSize: 9, letterSpacing: ".5px",
            padding: "5px 12px", border: "1px solid var(--bdr)", borderRadius: 5,
            color: "var(--mid)", textDecoration: "none", transition: "all .12s",
          }}
          onMouseOver={e => { (e.currentTarget as HTMLElement).style.color = "var(--txt)"; (e.currentTarget as HTMLElement).style.borderColor = "var(--bdr2)"; }}
          onMouseOut={e => { (e.currentTarget as HTMLElement).style.color = "var(--mid)"; (e.currentTarget as HTMLElement).style.borderColor = "var(--bdr)"; }}
        >
          Logout
        </a>
      </div>
    );
  }

  return (
    <a
      href="/api/auth/login"
      style={{
        fontFamily: "var(--mono)", fontSize: 9, letterSpacing: ".5px",
        padding: "5px 14px", border: "1px solid rgba(229,114,0,.4)", borderRadius: 5,
        color: "var(--c1)", textDecoration: "none", background: "rgba(229,114,0,.07)",
        transition: "all .12s", display: "inline-flex", alignItems: "center", gap: 5,
      }}
      onMouseOver={e => { (e.currentTarget as HTMLElement).style.background = "rgba(229,114,0,.15)"; }}
      onMouseOut={e => { (e.currentTarget as HTMLElement).style.background = "rgba(229,114,0,.07)"; }}
    >
      🔑 Login
    </a>
  );
}
