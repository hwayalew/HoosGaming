"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import Link from "next/link";

interface EngineInfo { label: string; controls: string[]; color: string; }
interface VoiceOption { id: string; name: string; category: string; accent?: string; description?: string; }

const LANGUAGE_CDNS: Record<string, string> = {
  "js-phaser": "https://cdnjs.cloudflare.com/ajax/libs/phaser/3.60.0/phaser.min.js",
  "js-three": "https://cdnjs.cloudflare.com/ajax/libs/three.js/r134/three.min.js",
  "js-babylon": "https://cdn.babylonjs.com/babylon.js",
  "js-p5": "https://cdnjs.cloudflare.com/ajax/libs/p5.js/1.9.0/p5.min.js",
  "js-kaboom": "https://unpkg.com/kaboom@3000.0.1/dist/kaboom.js",
  "js-pixi": "https://cdnjs.cloudflare.com/ajax/libs/pixi.js/7.2.4/pixi.min.js",
  "python": "https://cdn.jsdelivr.net/pyodide/v0.23.4/full/pyodide.js",
};

function toPlayableHtml(code: string, language: string): string {
  const trimmed = code.trim();
  const runtimeBridge = `
<style id="hoos-runtime-shell">
html,body{width:100%;height:100%;margin:0;padding:0;background:#05070d;color:#f4f7fb;overflow:hidden}
body{position:relative}
canvas{display:block;max-width:100%;max-height:100%}
</style>
<script>
(function(){
  var sent = false;
  function send(type, detail){
    try { parent.postMessage(Object.assign({ type: type }, detail || {}), "*"); } catch (_) {}
  }
  function ready(){
    if (sent) return;
    sent = true;
    send("hoos_render_ready");
  }
  window.addEventListener("load", function(){ setTimeout(ready, 80); });
  window.addEventListener("error", function(event){
    send("hoos_render_error", { message: event.message || "Runtime error" });
  });
  window.addEventListener("unhandledrejection", function(event){
    var reason = event.reason;
    send("hoos_render_error", { message: reason && reason.message ? reason.message : String(reason || "Promise rejection") });
  });
  setTimeout(function(){ if (!sent) ready(); }, 2400);
})();
</script>`;

  if (/<html[\s>]|<!DOCTYPE html>/i.test(trimmed)) {
    const withHead = /<\/head>/i.test(trimmed)
      ? trimmed.replace(/<\/head>/i, `${runtimeBridge}</head>`)
      : trimmed.replace(/<html[^>]*>/i, (match) => `${match}<head>${runtimeBridge}</head>`);
    if (/<\/body>/i.test(withHead)) return withHead;
    return `${withHead}<body></body>`;
  }

  if (language === "python") {
    return `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>HOOS Game</title>${runtimeBridge}</head><body><script src="${LANGUAGE_CDNS.python}"></script><script type="text/python">${trimmed}</script></body></html>`;
  }

  const cdn = LANGUAGE_CDNS[language] ?? LANGUAGE_CDNS["js-phaser"];
  return `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>HOOS Game</title>${runtimeBridge}</head><body><script src="${cdn}"></script><script>${trimmed}</script></body></html>`;
}

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

export default function PlayPage() {
  const iframeRef              = useRef<HTMLIFrameElement>(null);
  const [blobUrl, setBlobUrl]  = useState<string | null>(null);
  const [gameCode, setGameCode]= useState<string | null>(null);
  const [sourceCode, setSourceCode] = useState<string | null>(null);
  const [sourceLanguage, setSourceLanguage] = useState("js-phaser");
  const [gameName, setGameName]= useState("Your Game");
  const [engine, setEngine]    = useState("PHASER 3 · 2D");
  const [hasCode, setHasCode]  = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const [clicked, setClicked]  = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [renderNonce, setRenderNonce] = useState(0);
  const [renderLoading, setRenderLoading] = useState(true);
  const [renderError, setRenderError] = useState<string | null>(null);

  // NFT Mint
  const [wallet, setWallet]    = useState<string | null>(null);
  const [minting, setMinting]  = useState(false);
  const [mintResult, setMintResult] = useState<{ ipfsUrl?: string; gameId?: string; error?: string } | null>(null);
  const [showMint, setShowMint] = useState(false);
  const [showVoice, setShowVoice] = useState(false);
  const [voiceOptions, setVoiceOptions] = useState<VoiceOption[]>([]);
  const [selectedVoice, setSelectedVoice] = useState("");
  const [voiceLoading, setVoiceLoading] = useState(false);
  const [voiceBusy, setVoiceBusy] = useState(false);
  const [voiceError, setVoiceError] = useState<string | null>(null);
  const [voiceStatus, setVoiceStatus] = useState<string | null>(null);
  const [voiceAudioUrl, setVoiceAudioUrl] = useState<string | null>(null);

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
    const source = sessionStorage.getItem("hoos_game_source");
    const lang   = sessionStorage.getItem("hoos_game_language");
    const prompt = sessionStorage.getItem("hoos_game_prompt");
    const eng    = sessionStorage.getItem("hoos_game_engine");
    if (code) {
      setHasCode(true); setGameCode(code);
      if (source) setSourceCode(source);
      if (lang) setSourceLanguage(lang);
      if (prompt) setGameName(prompt.slice(0, 60));
      if (eng)   setEngine(eng);
      setRenderLoading(true);
      setRenderError(null);
      const blob = new Blob([toPlayableHtml(code, lang ?? "js-phaser")], { type: "text/html" });
      const url  = URL.createObjectURL(blob);
      setBlobUrl(url);
      return () => URL.revokeObjectURL(url);
    }
  }, []);

  useEffect(() => {
    const handler = (event: MessageEvent) => {
      const data = event.data as { type?: string; message?: string };
      if (data?.type === "hoos_render_ready") {
        setRenderLoading(false);
        setRenderError(null);
      }
      if (data?.type === "hoos_render_error") {
        setRenderLoading(false);
        setRenderError(data.message ?? "The generated game crashed during startup.");
      }
    };
    window.addEventListener("message", handler);
    return () => window.removeEventListener("message", handler);
  }, []);

  useEffect(() => {
    if (!blobUrl || !renderLoading) return;
    const timeout = window.setTimeout(() => {
      setRenderLoading(false);
      setRenderError("The game frame loaded, but no playable scene mounted. Try rerendering or rebuilding.");
    }, 12000);
    return () => window.clearTimeout(timeout);
  }, [blobUrl, renderLoading, renderNonce]);

  useEffect(() => {
    let cancelled = false;
    if (!showVoice) return;

    setVoiceLoading(true);
    setVoiceError(null);

    fetch("/api/voice")
      .then(async (res) => {
        const data = await res.json() as { voices?: VoiceOption[]; error?: string };
        if (!res.ok) throw new Error(data.error ?? `HTTP ${res.status}`);
        if (cancelled) return;
        const voices = data.voices ?? [];
        setVoiceOptions(voices);
        setSelectedVoice((current) => current || voices[0]?.id || "");
      })
      .catch((error) => {
        if (!cancelled) setVoiceError(error instanceof Error ? error.message : String(error));
      })
      .finally(() => {
        if (!cancelled) setVoiceLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [showVoice]);

  useEffect(() => {
    return () => {
      if (voiceAudioUrl) URL.revokeObjectURL(voiceAudioUrl);
    };
  }, [voiceAudioUrl]);

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

        // Resolve market if open
        if (marketOpen && marketId) {
          resolveMarket(reached_win ? "win" : "lose");
        }
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

  const downloadSource = useCallback(() => {
    const content = sourceCode ?? gameCode;
    if (!content) return;
    const ext = sourceLanguage === "python" ? "py" : "js";
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([content], { type: "text/plain" }));
    a.download = `${gameName.replace(/[^a-z0-9]/gi, "-").toLowerCase()}.${ext}`;
    a.click();
  }, [gameCode, gameName, sourceCode, sourceLanguage]);

  const rerenderGame = useCallback(() => {
    if (!gameCode) return;
    setRenderLoading(true);
    setRenderError(null);
    if (blobUrl) URL.revokeObjectURL(blobUrl);
    const url = URL.createObjectURL(new Blob([toPlayableHtml(gameCode, sourceLanguage)], { type: "text/html" }));
    setBlobUrl(url);
    setRenderNonce((value) => value + 1);
  }, [blobUrl, gameCode, sourceLanguage]);

  const exportZip = useCallback(async () => {
    if (!gameCode) return;
    setDownloading(true);
    try {
      const { zipSync, strToU8 } = await import("fflate");
      const slug = gameName.replace(/[^a-z0-9]/gi, "-").toLowerCase();
      const ext = sourceLanguage === "python" ? "py" : "js";
      const sourceContent = sourceCode ?? gameCode ?? "";
      const zip = zipSync({
        "index.html": strToU8(gameCode),
        [`source.${ext}`]: strToU8(sourceContent),
        "README.txt": strToU8(
`HOOS Gaming — Generated Game
=============================
Game:   ${gameName}
Engine: ${engine}
Built:  ${new Date().toISOString().slice(0,10)}

TO PLAY: Open index.html in any modern browser. No server required.
SOURCE:  source.${ext}
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
  }, [gameCode, gameName, engine, downloadHtml, sourceCode, sourceLanguage]);

  // Wallet connect
  const connectWallet = async () => {
    const phantom = (window as { solana?: { isPhantom?: boolean; connect?: () => Promise<{ publicKey: { toBase58: () => string } }> } }).solana;
    if (!phantom?.isPhantom) { window.open("https://phantom.app/", "_blank"); return; }
    try { const r = await phantom.connect!(); setWallet(r.publicKey.toBase58()); } catch { /* rejected */ }
  };

  // NFT mint
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

  // Prediction market
  const openMarket = async () => {
    const id = `MKT-${gameIdRef.current}-${Date.now()}`;
    setMarketId(id);
    setMarketOpen(true);
    setMarketResult(null);
  };

  const generateVoiceIntro = useCallback(async () => {
    setVoiceBusy(true);
    setVoiceError(null);
    setVoiceStatus("Generating intro...");

    try {
      const prompt = sessionStorage.getItem("hoos_game_prompt") ?? gameName;
      const res = await fetch("/api/voice", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          voiceId: selectedVoice || undefined,
          title: gameName,
          engine,
          prompt,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null) as { error?: string } | null;
        throw new Error(data?.error ?? `HTTP ${res.status}`);
      }

      const audio = await res.blob();
      if (voiceAudioUrl) URL.revokeObjectURL(voiceAudioUrl);
      const url = URL.createObjectURL(audio);
      setVoiceAudioUrl(url);
      setVoiceStatus(`Ready with ${res.headers.get("X-Voice-Name") ?? "selected voice"}.`);
    } catch (error) {
      setVoiceError(error instanceof Error ? error.message : String(error));
      setVoiceStatus(null);
    } finally {
      setVoiceBusy(false);
    }
  }, [engine, gameName, selectedVoice, voiceAudioUrl]);

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
          <button className="play-export-btn" onClick={() => navigator.clipboard.writeText(sourceCode ?? gameCode ?? "")} title="Copy engine source code">
            ⧉ Code
          </button>
          <button className="play-export-btn" onClick={downloadSource} title="Download engine source code">
            SRC
          </button>
          <button className="play-export-btn play-export-zip" onClick={exportZip} disabled={downloading} title="Export ZIP">
            {downloading ? "⏳" : "📦"} ZIP
          </button>
          <button className="play-export-btn" onClick={rerenderGame} title="Reload iframe render">
            ↻ Render
          </button>
          <button className="play-export-btn" onClick={() => setShowMint(s => !s)} title="Mint as NFT" style={{ color: "#a855f7", borderColor: "#a855f744" }}>
            🔮 NFT
          </button>
          <button className="play-export-btn" onClick={() => setShowVoice(s => !s)} title="Narrate intro" style={{ color: "#22c55e", borderColor: "#22c55e44" }}>
            🎙 Voice
          </button>
          <button className="play-export-btn" onClick={() => setShowMarket(s => !s)} title="Prediction Market" style={{ color: "#f59e0b", borderColor: "#f59e0b44" }}>
            🎲 Bet
          </button>
          <button className="play-fs-btn" onClick={toggleFullscreen} title="Fullscreen (F)">
            {fullscreen ? "⊠ Exit Full" : "⛶ Full"}
          </button>
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

      {showVoice && (
        <div className="play-panel play-voice-panel">
          <div className="play-panel-title">🎙 ElevenLabs Intro Voiceover</div>
          <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
            <select
              value={selectedVoice}
              onChange={(e) => setSelectedVoice(e.target.value)}
              disabled={voiceLoading || voiceBusy || voiceOptions.length === 0}
              style={{ background: "var(--s2)", border: "1px solid var(--bdr)", color: "var(--txt)", borderRadius: 6, padding: "5px 10px", fontFamily: "var(--mono)", fontSize: 11, minWidth: 220 }}
            >
              {voiceOptions.length === 0 ? (
                <option>{voiceLoading ? "Loading voices..." : "No voices available"}</option>
              ) : (
                voiceOptions.map((voice) => (
                  <option key={voice.id} value={voice.id}>
                    {voice.name} · {voice.category}
                  </option>
                ))
              )}
            </select>
            <button
              onClick={generateVoiceIntro}
              disabled={voiceBusy || voiceLoading || !selectedVoice}
              className="btn-primary"
              style={{ fontSize: 11, padding: "6px 14px", background: "#22c55e", borderColor: "#22c55e" }}
            >
              {voiceBusy ? "⏳ Narrating..." : "Generate Intro"}
            </button>
          </div>
          {voiceOptions.length > 0 && (
            <div style={{ marginTop: 8, fontFamily: "var(--mono)", fontSize: 10, color: "var(--muted)" }}>
              {voiceOptions.find((voice) => voice.id === selectedVoice)?.description || "A short spoken intro for the current game prompt."}
            </div>
          )}
          {voiceStatus && (
            <div style={{ marginTop: 8, fontFamily: "var(--mono)", fontSize: 10, color: "#22c55e" }}>{voiceStatus}</div>
          )}
          {voiceError && (
            <div style={{ marginTop: 8, fontFamily: "var(--mono)", fontSize: 10, color: "#ef4444" }}>{voiceError}</div>
          )}
          {voiceAudioUrl && (
            <audio controls src={voiceAudioUrl} style={{ marginTop: 12, width: "100%" }} />
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
        {renderLoading && (
          <span className="play-render-status">
            <span className="play-render-dot" />
            Rendering scene...
          </span>
        )}
        {renderError && (
          <span style={{ color: "#ef4444", fontWeight: 700 }}>
            Render failed
          </span>
        )}
        <span style={{ marginLeft: "auto", color: "var(--muted)" }}>
          {gameCode ? `${gameCode.length.toLocaleString()} chars` : ""}
        </span>
      </div>

      {/* Game iframe */}
      <div className="play-frame-wrap" onClick={() => setClicked(true)}>
        {renderLoading && (
          <div className="play-loading-overlay">
            <div className="play-loading-spinner" />
            <div className="play-loading-copy">
              <strong>Rendering your game</strong>
              <span>Booting runtime, attaching assets, and mounting the canvas.</span>
            </div>
          </div>
        )}
        {renderError && !renderLoading && (
          <div className="play-error-overlay">
            <div className="play-error-card">
              <div className="play-error-title">Render failed</div>
              <div className="play-error-copy">{renderError}</div>
              <div className="play-error-actions">
                <button className="play-export-btn" onClick={rerenderGame}>↻ Try Again</button>
                <button className="play-export-btn" onClick={() => navigator.clipboard.writeText(sourceCode ?? gameCode ?? "")}>⧉ Copy Code</button>
                <Link href="/create" className="play-export-btn">🔄 Rebuild</Link>
              </div>
            </div>
          </div>
        )}
        {blobUrl ? (
          <iframe
            key={renderNonce}
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
