"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AppNav } from "@/components/AppNav";

const STORAGE_KEY = "hoos_gaming_last_spec";

export default function SpecPage() {
  const [raw, setRaw] = useState<string | null>(null);

  useEffect(() => {
    try {
      const s = sessionStorage.getItem(STORAGE_KEY);
      setRaw(s);
    } catch {
      setRaw(null);
    }
  }, []);

  return (
    <>
      <AppNav current="spec" />
      <main className="app-page">
        <div className="app-page-inner">
          <h1 className="sh-h2" style={{ marginBottom: 8, textAlign: "left" }}>
            Game spec
          </h1>
          <p className="sh-p" style={{ textAlign: "left", marginBottom: 24, maxWidth: "100%" }}>
            Shows the last successful JSON from the{" "}
            <strong style={{ color: "var(--c1)" }}>Create</strong> page (stored in
            your browser). Run a generate first, then come back here.
          </p>

          <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 24 }}>
            <Link href="/create" className="btn-primary">
              Build Your Game →
            </Link>
            <Link href="/play" className="btn-ghost">
              Play →
            </Link>
          </div>

          {!raw && (
            <p className="app-error" style={{ color: "var(--mid)" }}>
              No spec saved yet. Go to Create, run <strong>Build Your Game</strong>, then
              return here.
            </p>
          )}

          {raw && <pre className="app-pre" style={{ maxHeight: "70vh" }}>{raw}</pre>}
        </div>
      </main>
    </>
  );
}
