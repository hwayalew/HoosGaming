"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";

interface EngineInfo {
  label: string;
  controls: string[];
  color: string;
}

function getEngineInfo(engine: string): EngineInfo {
  if (engine.includes("THREE") || engine.includes("3D")) {
    return {
      label: "Three.js · 3D",
      color: "#06b6d4",
      controls: ["WASD Move", "Mouse Look (click first)", "Space Shoot / Jump", "R Restart"],
    };
  }
  if (engine.includes("PYTHON") || engine.includes("PYODIDE")) {
    return {
      label: "Python · Pyodide",
      color: "#10b981",
      controls: ["Arrow Keys Move", "Space Action", "R Restart", "Loading may take ~5s"],
    };
  }
  // Default: Phaser 3
  return {
    label: "Phaser 3 · 2D",
    color: "#e57200",
    controls: ["← → Move", "↑ Jump", "Z / Space Shoot", "R Restart"],
  };
}

export default function PlayPage() {
  const iframeRef                = useRef<HTMLIFrameElement>(null);
  const [blobUrl, setBlobUrl]    = useState<string | null>(null);
  const [gameName, setGameName]  = useState<string>("Your Game");
  const [engine, setEngine]      = useState<string>("PHASER 3 · 2D");
  const [hasCode, setHasCode]    = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const [clicked, setClicked]    = useState(false);

  useEffect(() => {
    const code    = sessionStorage.getItem("hoos_game_code");
    const prompt  = sessionStorage.getItem("hoos_game_prompt");
    const eng     = sessionStorage.getItem("hoos_game_engine");
    if (code) {
      setHasCode(true);
      if (prompt) setGameName(prompt.slice(0, 60));
      if (eng)   setEngine(eng);
      const blob = new Blob([code], { type: "text/html" });
      const url  = URL.createObjectURL(blob);
      setBlobUrl(url);
      return () => URL.revokeObjectURL(url);
    }
  }, []);

  const toggleFullscreen = () => {
    const el = iframeRef.current;
    if (!el) return;
    if (!document.fullscreenElement) {
      el.requestFullscreen?.().then(() => setFullscreen(true)).catch(() => {});
    } else {
      document.exitFullscreen?.().then(() => setFullscreen(false)).catch(() => {});
    }
  };

  useEffect(() => {
    const handler = () => setFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", handler);
    return () => document.removeEventListener("fullscreenchange", handler);
  }, []);

  if (!hasCode) {
    return (
      <div className="play-empty">
        <div className="play-empty-icon">🎮</div>
        <h2 className="play-empty-title">No game loaded</h2>
        <p className="play-empty-sub">
          Build a game first — 78 IBM AI agents will generate complete, playable game code with sounds.
        </p>
        <div style={{ display: "flex", gap: 12, marginTop: 24 }}>
          <Link href="/create" className="btn-primary">Build Your Game →</Link>
          <Link href="/" className="btn-ghost">Home</Link>
        </div>
      </div>
    );
  }

  const engineInfo = getEngineInfo(engine);

  return (
    <div className="play-shell">
      {/* Top bar */}
      <div className="play-topbar">
        <div className="play-topbar-left">
          <Link href="/create" className="play-back-btn">← Back</Link>
          <span className="play-game-name" title={gameName}>{gameName}</span>
        </div>
        <div className="play-topbar-right">
          <span className="play-badge" style={{ color: engineInfo.color, borderColor: engineInfo.color + "44" }}>
            ⚡ {engineInfo.label}
          </span>
          <button className="play-fs-btn" onClick={toggleFullscreen} title="Fullscreen (F)">
            {fullscreen ? "⊠ Exit Full" : "⛶ Fullscreen"}
          </button>
          <Link href="/create" className="play-rebuild-btn">🔄 Rebuild</Link>
        </div>
      </div>

      {/* Controls bar */}
      <div className="play-controls-bar">
        {engineInfo.controls.map((c, i) => (
          <span key={i}>{c}</span>
        ))}
        {!clicked && (
          <span style={{ color: engineInfo.color, fontWeight: 600, animation: "pulse 1.5s ease-in-out infinite" }}>
            👆 Click the game to enable keyboard &amp; sound
          </span>
        )}
      </div>

      {/* Game iframe */}
      <div className="play-frame-wrap" onClick={() => setClicked(true)}>
        {blobUrl ? (
          <iframe
            ref={iframeRef}
            src={blobUrl}
            className="play-iframe"
            sandbox="allow-scripts allow-same-origin allow-pointer-lock"
            title={gameName}
            allow="fullscreen; pointer-lock"
          />
        ) : (
          <div className="play-loading">
            <div className="play-loading-spinner" />
            <span>Loading game…</span>
          </div>
        )}
      </div>
    </div>
  );
}
