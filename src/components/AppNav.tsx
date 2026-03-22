"use client";

import Link from "next/link";
import { AuthButton } from "@/components/AuthButton";

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
        <Link href="/create" className="nl" style={{ opacity: current === "create" ? 1 : undefined }}>
          Create
        </Link>
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
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <AuthButton />
        <Link href="/create" className="nav-cta">
          Launch App →
        </Link>
      </div>
    </nav>
  );
}
