"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";

export default function PlayPage() {
  const iframeRef              = useRef<HTMLIFrameElement>(null);
  const [blobUrl, setBlobUrl]  = useState<string | null>(null);
  const [gameName, setGameName] = useState<string>("Your Game");
  const [hasCode, setHasCode]  = useState(false);
  const [fullscreen, setFullscreen] = useState(false);

  useEffect(() => {
    const code   = sessionStorage.getItem("hoos_game_code");
    const prompt = sessionStorage.getItem("hoos_game_prompt");
    if (code) {
      setHasCode(true);
      if (prompt) setGameName(prompt.slice(0, 50));
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

  if (!hasCode) {
    return (
      <div className="play-empty">
        <div className="play-empty-icon">🎮</div>
        <h2 className="play-empty-title">No game loaded</h2>
        <p className="play-empty-sub">Build a game first — 56 AI agents will generate complete, playable Phaser 3 code.</p>
        <div style={{ display: "flex", gap: 12, marginTop: 24 }}>
          <Link href="/create" className="btn-primary">Build Your Game →</Link>
          <Link href="/" className="btn-ghost">Home</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="play-shell">
      {/* Top bar */}
      <div className="play-topbar">
        <div className="play-topbar-left">
          <Link href="/create" className="play-back-btn">← Back</Link>
          <span className="play-game-name" title={gameName}>{gameName}</span>
        </div>
        <div className="play-topbar-right">
          <span className="play-badge">⚡ Phaser 3 · HTML5</span>
          <button className="play-fs-btn" onClick={toggleFullscreen} title="Fullscreen">
            {fullscreen ? "⊠ Exit" : "⛶ Fullscreen"}
          </button>
          <Link href="/create" className="play-rebuild-btn">🔄 Rebuild</Link>
        </div>
      </div>

      {/* Controls hint */}
      <div className="play-controls-bar">
        <span>← → Move</span>
        <span>↑ Jump</span>
        <span>Space / Z Shoot</span>
        <span>R Restart</span>
        <span style={{ color: "var(--c1)" }}>Click the game first to enable keyboard input</span>
      </div>

      {/* Game iframe */}
      <div className="play-frame-wrap">
        <iframe
          ref={iframeRef}
          src={blobUrl ?? undefined}
          className="play-iframe"
          sandbox="allow-scripts allow-same-origin"
          title={gameName}
          allow="fullscreen"
        />
      </div>
    </div>
  );
}
