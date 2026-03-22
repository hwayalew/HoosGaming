"use client";

import Link from "next/link";
import { AppNav } from "@/components/AppNav";

export default function PlayPage() {
  return (
    <>
      <AppNav current="play" />
      <main className="app-page">
        <div className="app-page-inner">
          <h1 className="sh-h2" style={{ marginBottom: 8, textAlign: "left" }}>
            Play
          </h1>
          <p className="sh-p" style={{ textAlign: "left", marginBottom: 24, maxWidth: "100%" }}>
            Live game preview will hook up here (e.g. Phaser) once your API returns a
            spec the renderer understands. For now, use{" "}
            <strong style={{ color: "var(--c1)" }}>Create</strong> to generate and{" "}
            <strong style={{ color: "var(--c1)" }}>Spec</strong> to inspect JSON.
          </p>

          <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
            <Link href="/create" className="btn-primary">
              Build Your Game →
            </Link>
            <Link href="/spec" className="btn-ghost">
              View spec →
            </Link>
            <Link href="/" className="btn-ghost">
              Home
            </Link>
          </div>
        </div>
      </main>
    </>
  );
}
