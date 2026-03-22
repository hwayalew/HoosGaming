"use client";

import Link from "next/link";
import { AuthLaunchLink } from "@/components/AuthLaunchLink";

type Props = { current?: "create" | "spec" | "play" };

export function AppNav({ current }: Props) {
  return (
    <nav>
      <Link href="/" className="nav-logo" style={{ textDecoration: "none", color: "inherit" }}>
        <div className="nl-icon">🎮</div>
        <div>
          <div className="nl-name">HOOS GAMING</div>
        </div>
      </Link>
      <div className="nav-links">
        <AuthLaunchLink
          href="/create"
          className="nl"
          style={{ opacity: current === "create" ? 1 : undefined }}
        >
          Create
        </AuthLaunchLink>
        <Link href="/spec" className="nl">
          Spec
        </Link>
        <Link href="/play" className="nl">
          Play
        </Link>
        <Link href="/#how" className="nl">
          How It Works
        </Link>
      </div>
      <AuthLaunchLink href="/create" className="nav-cta">
        Launch App →
      </AuthLaunchLink>
    </nav>
  );
}
