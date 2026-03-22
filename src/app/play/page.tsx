"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import Link from "next/link";

interface EngineInfo {
  label: string;
  controls: string[];
  color: string;
}

function getEngineInfo(engine: string): EngineInfo {
  if (engine.includes("THREE") || (engine.includes("3D") && !engine.includes("BABYLON"))) {
    return { label: "Three.js · 3D", color: "#06b6d4",
      controls: ["WASD Move", "Mouse Look (click)", "Space Shoot", "R Restart"] };
  }
  if (engine.includes("BABYLON")) {
    return { label: "Babylon.js · 3D", color: "#8b5cf6",
      controls: ["WASD Move", "Mouse Look (click)", "Space Action", "R Restart"] };
  }
  if (engine.includes("PYTHON") || engine.includes("PYODIDE")) {
    return { label: "Python · Pyodide", color: "#10b981",
      controls: ["Arrow Keys Move", "Space Action", "R Restart", "~5s load time"] };
  }
  if (engine.includes("P5")) {
    return { label: "p5.js · 2D", color: "#ec4899",
      controls: ["Mouse / Keys", "Space Action", "R Restart"] };
  }
  if (engine.includes("KABOOM")) {
    return { label: "Kaboom.js · 2D", color: "#f59e0b",
      controls: ["Arrow Keys / WASD", "Space Jump/Shoot", "R Restart"] };
  }
  if (engine.includes("PIXI")) {
    return { label: "PixiJS · 2D", color: "#a855f7",
      controls: ["Arrow Keys / WASD", "Space Shoot", "R Restart"] };
  }
  return { label: "Phaser 3 · 2D", color: "#e57200",
    controls: ["← → Move", "↑ Jump", "Z Shoot", "R Restart"] };
}

export default function PlayPage() {
  const iframeRef              = useRef<HTMLIFrameElement>(null);
  const [blobUrl, setBlobUrl]  = useState<string | null>(null);
  const [gameCode, setGameCode]= useState<string | null>(null);
  const [gameName, setGameName]= useState("Your Game");
  const [engine, setEngine]    = useState("PHASER 3 · 2D");
  const [hasCode, setHasCode]  = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const [clicked, setClicked]  = useState(false);
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    const code   = sessionStorage.getItem("hoos_game_code");
    const prompt = sessionStorage.getItem("hoos_game_prompt");
    const eng    = sessionStorage.getItem("hoos_game_engine");
    if (code) {
      setHasCode(true); setGameCode(code);
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
    if (!document.fullscreenElement) el.requestFullscreen?.().then(() => setFullscreen(true)).catch(() => {});
    else document.exitFullscreen?.().then(() => setFullscreen(false)).catch(() => {});
  };

  useEffect(() => {
    const h = () => setFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", h);
    return () => document.removeEventListener("fullscreenchange", h);
  }, []);

  // F key for fullscreen
  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === "f" || e.key === "F") toggleFullscreen(); };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, []);

  const downloadHtml = useCallback(() => {
    if (!gameCode) return;
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([gameCode], { type: "text/html" }));
    a.download = `${gameName.replace(/[^a-z0-9]/gi, "-").toLowerCase()}.html`;
    a.click();
  }, [gameCode, gameName]);

  const exportZip = useCallback(async () => {
    if (!gameCode) return;
    setDownloading(true);
    try {
      const { zipSync, strToU8 } = await import("fflate");
      const slug = gameName.replace(/[^a-z0-9]/gi, "-").toLowerCase();
      const zip = zipSync({
        "index.html": strToU8(gameCode),
        "README.txt":  strToU8(
`HOOS Gaming — Generated Game
=============================
Game:   ${gameName}
Engine: ${engine}
Built:  ${new Date().toISOString().slice(0,10)}

TO PLAY:
  Open index.html in any modern browser.
  No server required — everything is self-contained.

Controls depend on engine (${engine}):
  Phaser / 2D: Arrow keys move, Z/Space shoot, R restart
  Three.js 3D: WASD move, click for mouse look, Space shoot
  Python:      Arrow keys, depends on game logic

Built with Hoos Gaming — IBM watsonx Orchestrate (78 AI agents)
`)
      });
      const a = document.createElement("a");
      a.href = URL.createObjectURL(new Blob([zip], { type: "application/zip" }));
      a.download = `${slug}-hoos-game.zip`;
      a.click();
    } catch (e) {
      console.error("ZIP export failed:", e);
      downloadHtml();
    }
    setDownloading(false);
  }, [gameCode, gameName, engine, downloadHtml]);

  if (!hasCode) {
    return (
      <div className="play-empty">
        <div className="play-empty-icon">🎮</div>
        <h2 className="play-empty-title">No game loaded</h2>
        <p className="play-empty-sub">
          Build a game first — 78 IBM AI agents generate complete, playable code with sounds.
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
          <button className="play-export-btn" onClick={downloadHtml} title="Download as HTML file">
            ⬇ HTML
          </button>
          <button className="play-export-btn play-export-zip" onClick={exportZip} disabled={downloading} title="Export as ZIP archive">
            {downloading ? "⏳" : "📦"} ZIP
          </button>
          <button className="play-fs-btn" onClick={toggleFullscreen} title="Fullscreen (F)">
            {fullscreen ? "⊠ Exit Full" : "⛶ Full"}
          </button>
          <Link href="/create" className="play-rebuild-btn">🔄 Rebuild</Link>
        </div>
      </div>

      {/* Controls bar */}
      <div className="play-controls-bar">
        {engineInfo.controls.map((c, i) => <span key={i}>{c}</span>)}
        {!clicked && (
          <span style={{ color: engineInfo.color, fontWeight: 600, animation: "pulse 1.5s ease-in-out infinite" }}>
            👆 Click to enable keyboard &amp; sound
          </span>
        )}
        <span style={{ marginLeft: "auto", color: "var(--muted)" }}>
          {gameCode ? `${gameCode.length.toLocaleString()} chars` : ""}
        </span>
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
