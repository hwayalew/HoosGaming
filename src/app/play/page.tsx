"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import Link from "next/link";
import { AuthButton } from "@/components/AuthButton";

interface EngineInfo { label: string; controls: string[]; color: string; }

function getEngineInfo(engine: string): EngineInfo {
  if (engine.includes("THREE") || (engine.includes("3D") && !engine.includes("BABYLON")))
    return { label: "Three.js · 3D", color: "#06b6d4", controls: ["WASD Move", "Mouse Look (click)", "Space Shoot", "R Restart"] };
  if (engine.includes("BABYLON"))
    return { label: "Babylon.js · 3D", color: "#8b5cf6", controls: ["WASD Move", "Mouse Look (click)", "Space Action", "R Restart"] };
  if (engine.includes("PYTHON") || engine.includes("PYODIDE"))
    return { label: "Python · Pyodide", color: "#10b981", controls: ["Arrow Keys Move", "Space Action", "R Restart", "~5s load time"] };
  if (engine.includes("P5"))
    return { label: "p5.js · 2D", color: "#ec4899", controls: ["Mouse / Keys", "Space Action", "R Restart"] };
  if (engine.includes("KABOOM"))
    return { label: "Kaboom.js · 2D", color: "#f59e0b", controls: ["Arrow Keys / WASD", "Space Jump/Shoot", "R Restart"] };
  if (engine.includes("PIXI"))
    return { label: "PixiJS · 2D", color: "#a855f7", controls: ["Arrow Keys / WASD", "Space Shoot", "R Restart"] };
  return { label: "Phaser 3 · 2D", color: "#e57200", controls: ["← → Move", "↑ Jump", "Z Shoot", "R Restart"] };
}

const CHALLENGES = ["Beat the boss", "Score over 500", "Survive 2 minutes", "Reach 1000 points"];

const RENDER_STAGES = [
  { pct: 0,  label: "Parsing game HTML…" },
  { pct: 18, label: "Loading game engine…" },
  { pct: 36, label: "Initializing renderer…" },
  { pct: 54, label: "Building game world…" },
  { pct: 72, label: "Starting game loop…" },
  { pct: 90, label: "Launching game…" },
  { pct: 100, label: "Game ready!" },
];

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

  // Render progress
  const [iframeReady, setIframeReady]   = useState(false);
  const [renderPct, setRenderPct]       = useState(0);
  const [renderStage, setRenderStage]   = useState(RENDER_STAGES[0].label);
  const progressIntervalRef             = useRef<ReturnType<typeof setInterval> | null>(null);

  // NFT Mint
  const [wallet, setWallet]    = useState<string | null>(null);
  const [minting, setMinting]  = useState(false);
  const [mintResult, setMintResult] = useState<{ ipfsUrl?: string; gameId?: string; error?: string } | null>(null);
  const [showMint, setShowMint] = useState(false);

  // Prediction market
  const [showMarket, setShowMarket] = useState(false);
  const [selectedChallenge, setSelectedChallenge] = useState(CHALLENGES[0]);
  const [marketOpen, setMarketOpen] = useState(false);
  const [marketId, setMarketId] = useState<string | null>(null);
  const [marketResult, setMarketResult] = useState<string | null>(null);

  // Session tracking
  const sessionStartRef = useRef<number>(Date.now());
  const gameIdRef = useRef<string>(Math.random().toString(36).slice(2, 10).toUpperCase());

  const resolveMarket = useCallback(async (outcome: "win" | "lose") => {
    if (!marketId) return;
    try {
      const res = await fetch("/api/presage/resolve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ marketId, outcome, gameId: gameIdRef.current, challenge: selectedChallenge }),
      });
      const data = await res.json() as { ok?: boolean; message?: string };
      setMarketResult(`${outcome === "win" ? "🏆 YOU WON" : "❌ LOST"} — ${data.message ?? ""}`);
      setMarketOpen(false);
    } catch { /* ignore */ }
  }, [marketId, selectedChallenge]);

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

  // Animate render progress when blobUrl is set
  useEffect(() => {
    if (!blobUrl) return;
    setIframeReady(false);
    setRenderPct(0);
    setRenderStage(RENDER_STAGES[0].label);

    let current = 0;
    progressIntervalRef.current = setInterval(() => {
      current += Math.random() * 2.8 + 0.5;
      if (current >= 93) {
        current = 93;
        clearInterval(progressIntervalRef.current!);
      }
      const pct = Math.floor(current);
      setRenderPct(pct);
      const stage = [...RENDER_STAGES].reverse().find(s => s.pct <= pct);
      if (stage) setRenderStage(stage.label);
    }, 70);

    return () => {
      if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
    };
  }, [blobUrl]);

  const handleIframeLoad = useCallback(() => {
    if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
    setRenderPct(100);
    setRenderStage("Game ready!");
    setTimeout(() => setIframeReady(true), 700);
  }, []);

  // Log session on unload
  useEffect(() => {
    const logSession = () => {
      const duration = Date.now() - sessionStartRef.current;
      if (duration > 3000) {
        navigator.sendBeacon?.("/api/analytics/ingest", JSON.stringify({
          type: "session", game_id: gameIdRef.current, engine,
          duration_ms: duration, reached_win: false,
        }));
      }
    };
    window.addEventListener("beforeunload", logSession);
    return () => window.removeEventListener("beforeunload", logSession);
  }, [engine]);

  // Listen for win/gameover from iframe postMessage
  useEffect(() => {
    const handler = (e: MessageEvent) => {
      const d = e.data as { type?: string };
      if (d?.type === "hoos_win" || d?.type === "hoos_gameover") {
        const reached_win = d.type === "hoos_win";
        fetch("/api/analytics/ingest", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            type: "session", game_id: gameIdRef.current, engine,
            duration_ms: Date.now() - sessionStartRef.current, reached_win,
          }),
        }).catch(() => {});
        if (marketOpen && marketId) resolveMarket(reached_win ? "win" : "lose");
      }
    };
    window.addEventListener("message", handler);
    return () => window.removeEventListener("message", handler);
  }, [engine, marketOpen, marketId, resolveMarket]);

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
        "README.txt": strToU8(
`HOOS Gaming — Generated Game
=============================
Game:   ${gameName}
Engine: ${engine}
Built:  ${new Date().toISOString().slice(0,10)}

TO PLAY: Open index.html in any modern browser. No server required.
Controls (${engine}):
  Phaser / 2D: Arrow keys move, Z/Space shoot, R restart
  Three.js 3D: WASD move, click for mouse look, Space shoot
  Python:      Arrow keys, depends on game logic

Built with Hoos Gaming — IBM watsonx Orchestrate (78 AI agents)
`)
      });
      const a = document.createElement("a");
      a.href = URL.createObjectURL(new Blob([zip.buffer as ArrayBuffer], { type: "application/zip" }));
      a.download = `${slug}-hoos-game.zip`;
      a.click();
    } catch { downloadHtml(); }
    setDownloading(false);
  }, [gameCode, gameName, engine, downloadHtml]);

  const connectWallet = async () => {
    const phantom = (window as { solana?: { isPhantom?: boolean; connect?: () => Promise<{ publicKey: { toBase58: () => string } }> } }).solana;
    if (!phantom?.isPhantom) { window.open("https://phantom.app/", "_blank"); return; }
    try { const r = await phantom.connect!(); setWallet(r.publicKey.toBase58()); } catch { /* rejected */ }
  };

  const mintGame = async () => {
    if (!gameCode) return;
    if (!wallet) { await connectWallet(); return; }
    setMinting(true); setMintResult(null);
    try {
      const res = await fetch("/api/mint", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ gameCode, title: gameName, engine, prompt: gameName, walletAddress: wallet }),
      });
      const data = await res.json() as { ok?: boolean; ipfsUrl?: string; gameId?: string; error?: string };
      setMintResult(data.ok ? { ipfsUrl: data.ipfsUrl, gameId: data.gameId } : { error: data.error });
    } catch (e) { setMintResult({ error: String(e) }); }
    setMinting(false);
  };

  const openMarket = async () => {
    const id = `MKT-${gameIdRef.current}-${Date.now()}`;
    setMarketId(id);
    setMarketOpen(true);
    setMarketResult(null);
  };

  if (!hasCode) {
    return (
      <div className="play-empty">
        <div className="play-empty-icon">🎮</div>
        <h2 className="play-empty-title">No game loaded</h2>
        <p className="play-empty-sub">Build a game first — 78 IBM AI agents generate complete, playable code with sounds.</p>
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
          <button className="play-export-btn" onClick={downloadHtml} title="Download as HTML file">⬇ HTML</button>
          <button className="play-export-btn play-export-zip" onClick={exportZip} disabled={downloading} title="Export ZIP">
            {downloading ? "⏳" : "📦"} ZIP
          </button>
          <button className="play-export-btn" onClick={() => setShowMint(s => !s)} title="Mint as NFT" style={{ color: "#a855f7", borderColor: "#a855f744" }}>
            🔮 NFT
          </button>
          <button className="play-export-btn" onClick={() => setShowMarket(s => !s)} title="Prediction Market" style={{ color: "#f59e0b", borderColor: "#f59e0b44" }}>
            🎲 Bet
          </button>
          <button className="play-fs-btn" onClick={toggleFullscreen} title="Fullscreen (F)">
            {fullscreen ? "⊠ Exit Full" : "⛶ Full"}
          </button>
          <AuthButton />
          <Link href="/create" className="play-rebuild-btn">🔄 Rebuild</Link>
        </div>
      </div>

      {/* NFT mint panel */}
      {showMint && (
        <div className="play-panel play-nft-panel">
          <div className="play-panel-title">🔮 Mint Game as NFT · Solana Devnet</div>
          <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
            {!wallet ? (
              <button onClick={connectWallet} className="btn-primary" style={{ fontSize: 11, padding: "6px 14px" }}>Connect Phantom Wallet</button>
            ) : (
              <span style={{ fontFamily: "var(--mono)", fontSize: 10, color: "#10b981" }}>✓ {wallet.slice(0,6)}…{wallet.slice(-4)}</span>
            )}
            <button onClick={mintGame} disabled={minting} className="btn-primary" style={{ fontSize: 11, padding: "6px 14px", background: "#a855f7", borderColor: "#a855f7" }}>
              {minting ? "⏳ Uploading…" : "Mint to IPFS + Solana"}
            </button>
          </div>
          {mintResult && (
            <div style={{ marginTop: 8, fontFamily: "var(--mono)", fontSize: 10 }}>
              {mintResult.error ? (
                <span style={{ color: "#ef4444" }}>✗ {mintResult.error}</span>
              ) : (
                <span style={{ color: "#10b981" }}>
                  ✓ Minted #{mintResult.gameId}
                  {mintResult.ipfsUrl && mintResult.ipfsUrl !== "#" && (
                    <> · <a href={mintResult.ipfsUrl} target="_blank" rel="noreferrer" style={{ color: "var(--c1)" }}>View on IPFS →</a></>
                  )}
                </span>
              )}
            </div>
          )}
        </div>
      )}

      {/* Prediction market panel */}
      {showMarket && (
        <div className="play-panel play-market-panel">
          <div className="play-panel-title">🎲 Prediction Market · Presage Protocol</div>
          {!marketOpen ? (
            <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
              <select
                value={selectedChallenge}
                onChange={e => setSelectedChallenge(e.target.value)}
                style={{ background: "var(--s2)", border: "1px solid var(--bdr)", color: "var(--txt)", borderRadius: 6, padding: "5px 10px", fontFamily: "var(--mono)", fontSize: 11 }}
              >
                {CHALLENGES.map(c => <option key={c}>{c}</option>)}
              </select>
              <button onClick={openMarket} className="btn-primary" style={{ fontSize: 11, padding: "6px 14px", background: "#f59e0b", borderColor: "#f59e0b" }}>
                Open Market
              </button>
            </div>
          ) : (
            <div>
              <div style={{ fontFamily: "var(--mono)", fontSize: 11, color: "#f59e0b", marginBottom: 8 }}>
                ⚡ Market OPEN — Challenge: <strong>{selectedChallenge}</strong>
              </div>
              <div style={{ fontFamily: "var(--mono)", fontSize: 10, color: "var(--muted)", marginBottom: 10 }}>
                Market ID: {marketId} · Resolves when game ends
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <button onClick={() => resolveMarket("win")} className="btn-primary" style={{ fontSize: 11, padding: "6px 14px", background: "#10b981", borderColor: "#10b981" }}>✓ I Won</button>
                <button onClick={() => resolveMarket("lose")} className="btn-ghost" style={{ fontSize: 11, padding: "6px 14px" }}>✗ I Lost</button>
              </div>
            </div>
          )}
          {marketResult && (
            <div style={{ marginTop: 8, fontFamily: "var(--mono)", fontSize: 11, color: "#f59e0b" }}>{marketResult}</div>
          )}
        </div>
      )}

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

      {/* Game iframe + render overlay */}
      <div className="play-frame-wrap" onClick={() => setClicked(true)}>
        {blobUrl ? (
          <>
            <iframe
              ref={iframeRef}
              src={blobUrl}
              className="play-iframe"
              sandbox="allow-scripts allow-same-origin allow-pointer-lock"
              title={gameName}
              allow="fullscreen; pointer-lock"
              onLoad={handleIframeLoad}
            />
            {/* Render progress overlay — fades out when iframe is ready */}
            {!iframeReady && (
              <div className="render-overlay">
                <div className="render-overlay-inner">
                  {/* Engine badge */}
                  <div className="render-engine-badge" style={{ color: engineInfo.color, borderColor: engineInfo.color + "44", background: engineInfo.color + "11" }}>
                    ⚡ {engineInfo.label}
                  </div>

                  {/* Circular progress ring */}
                  <div className="render-ring-wrap">
                    <svg className="render-ring-svg" viewBox="0 0 100 100">
                      <circle cx="50" cy="50" r="42" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="6" />
                      <circle
                        cx="50" cy="50" r="42" fill="none"
                        stroke={engineInfo.color}
                        strokeWidth="6"
                        strokeLinecap="round"
                        strokeDasharray={`${2 * Math.PI * 42}`}
                        strokeDashoffset={`${2 * Math.PI * 42 * (1 - renderPct / 100)}`}
                        transform="rotate(-90 50 50)"
                        style={{ transition: "stroke-dashoffset 0.12s ease" }}
                      />
                    </svg>
                    <div className="render-ring-pct">{renderPct}</div>
                    <div className="render-ring-sym">%</div>
                  </div>

                  {/* Stage label */}
                  <div className="render-stage">{renderStage}</div>

                  {/* Stage progress bar */}
                  <div className="render-bar-wrap">
                    <div className="render-bar-track">
                      <div
                        className="render-bar-fill"
                        style={{ width: `${renderPct}%`, background: `linear-gradient(90deg, ${engineInfo.color}88, ${engineInfo.color})` }}
                      />
                    </div>
                  </div>

                  {/* Stage steps */}
                  <div className="render-steps">
                    {RENDER_STAGES.filter(s => s.pct < 100).map((s, i) => (
                      <div key={i} className="render-step" style={{ opacity: renderPct >= s.pct ? 1 : 0.3 }}>
                        <div className="render-step-dot" style={{ background: renderPct >= s.pct ? engineInfo.color : "var(--s3)", boxShadow: renderPct >= s.pct ? `0 0 6px ${engineInfo.color}` : "none" }} />
                        <span style={{ color: renderPct >= s.pct ? "var(--txt)" : "var(--muted)" }}>{s.label.replace("…","")}</span>
                      </div>
                    ))}
                  </div>

                  <div className="render-footer">
                    powered by 78 IBM watsonx agents
                  </div>
                </div>
              </div>
            )}
          </>
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
