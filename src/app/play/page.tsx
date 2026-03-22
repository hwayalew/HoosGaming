"use client";

import { useEffect, useRef, useState, useCallback, type KeyboardEvent as ReactKeyboardEvent } from "react";
import Link from "next/link";
import { AuthButton } from "@/components/AuthButton";
import {
  LANGUAGE_CDNS,
  extractGameCode,
  detectEngine,
  extractPrimarySource,
  validateGeneratedOutput,
  stripEngineScriptDeferAsync,
} from "@/lib/agent-game-code";
import { isWxOPersistableThreadId } from "@/lib/wxo-session";

interface EngineInfo { label: string; controls: string[]; color: string; }
interface VoiceOption { id: string; name: string; category: string; accent?: string; description?: string; }

/** Injected into generated games — polls for canvas + exposes global API bridges. */
function hoosHeadBridge(): string {
  return `
<style id="hoos-runtime-shell">
html,body{width:100%;height:100%;margin:0;padding:0;background:#05070d;color:#f4f7fb;overflow:hidden}
body{position:relative}
canvas{display:block;max-width:100%;max-height:100%}
</style>
<script>
(function(){
  var readySent = false;
  function send(type, detail){
    try { parent.postMessage(Object.assign({ type: type }, detail || {}), '*'); } catch (e) {}
  }
  function progress(pct, label){
    var n = Math.max(0, Math.min(100, Math.round(pct)));
    send('hoos_render_progress', { percent: n, label: label || '' });
  }
  function markReady(){
    if (readySent) return;
    readySent = true;
    send('hoos_render_ready');
  }
  window.addEventListener('error', function(event){
    send('hoos_render_error', { message: event.message || 'Runtime error' });
  });
  window.addEventListener('unhandledrejection', function(event){
    var reason = event.reason;
    send('hoos_render_error', { message: reason && reason.message ? reason.message : String(reason || 'Promise rejection') });
  });
  window.addEventListener('load', function(){
    progress(16, 'Document loaded');
    var n = 0;
    var maxN = 220;
    var t = setInterval(function(){
      n++;
      var cv = document.querySelector('canvas');
      if (cv && cv.width >= 2 && cv.height >= 2) {
        clearInterval(t);
        progress(100, 'Canvas ready');
        markReady();
        return;
      }
      var pct = Math.min(16 + Math.floor(n * 0.4), 93);
      var lbl = n < 12 ? 'Loading runtime…' : n < 48 ? 'Booting game…' : n < 110 ? 'Mounting scene…' : 'Almost ready…';
      progress(pct, lbl);
      if (n >= maxN) {
        clearInterval(t);
        progress(100, 'Player ready');
        markReady();
      }
    }, 200);
  });

  /* HOOS SPEECH: ElevenLabs character voice
   * Usage: window.hoosSpeech('Bow before me!', 'villain', 'sinister')
   * Characters: hero | villain | boss | npc | narrator | enemy | ally
   * Emotions:   neutral | angry | sinister | fearful | excited | confident | sad
   */
  var _speechCache = {};
  window.hoosSpeech = function(text, character, emotion) {
    if (!text) return;
    var key = (text + '|' + (character||'') + '|' + (emotion||'')).slice(0,120);
    if (_speechCache[key]) return;
    try {
      fetch('/api/voice', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: text, character: character || 'narrator', emotion: emotion || 'neutral' })
      }).then(function(r){ return r.ok ? r.blob() : null; })
        .then(function(blob){
          if (!blob) return;
          var url = URL.createObjectURL(blob);
          var audio = new Audio(url);
          audio.volume = 0.85;
          audio.play().catch(function(){});
          _speechCache[key] = audio;
        }).catch(function(){});
    } catch(e) {}
  };

  /* HOOS MATH: Wolfram procedural physics
   * Call ONCE at init with your game theme, use callback to apply physics constants.
   * window.hoosMath('cyberpunk city', function(physics) {
   *   GRAVITY = physics.gameGravityPxS2;
   *   PLAYER_SPEED = physics.walkSpeedPxS;
   *   JUMP_VEL = physics.jumpVelocityPxS;
   * });
   */
  window.hoosMath = function(theme, callback) {
    try {
      fetch('/api/wolfram', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ theme: theme || 'action adventure' })
      }).then(function(r){ return r.json(); })
        .then(function(d){ if (callback) callback(d.physics || {}); })
        .catch(function(){ if (callback) callback({}); });
    } catch(e) { if (callback) callback({}); }
  };
  window.hoosMathQuery = function(query, callback) {
    try {
      fetch('/api/wolfram?q=' + encodeURIComponent(query))
        .then(function(r){ return r.json(); })
        .then(function(d){ if (callback) callback(d.result || null); })
        .catch(function(){ if (callback) callback(null); });
    } catch(e) { if (callback) callback(null); }
  };

  /* HOOS ANALYTICS: Fire Snowflake game events
   * window.hoosAnalytics('kill', { enemy: 'boss', score: 500, level: 3 })
   * Events: kill | death | level_up | score | boss_killed | game_over | win
   */
  window.hoosAnalytics = function(event, data) {
    try {
      fetch('/api/analytics/ingest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(Object.assign({ event: event, ts: Date.now() }, data || {}))
      }).catch(function(){});
    } catch(e) {}
  };

})();
</script>`;
}
function hoosEngineHook(): string {
  return `<script>
(function(){
  var el = document.getElementById("hoos-engine-cdn");
  if (!el) return;
  function send(type, detail){
    try { parent.postMessage(Object.assign({ type: type }, detail || {}), "*"); } catch (e) {}
  }
  el.addEventListener("load", function(){
    send("hoos_render_progress", { percent: 36, label: "Engine library loaded" });
  });
  el.addEventListener("error", function(){
    send("hoos_render_error", { message: "Failed to load engine from CDN (network or blocker)" });
  });
})();
</script>`;
}

function toPlayableHtml(code: string, language: string): string {
  const trimmed = stripEngineScriptDeferAsync(code.trim());
  const bridge = hoosHeadBridge();

  if (/<html[\s>]|<!DOCTYPE html>/i.test(trimmed)) {
    const withHead = /<\/head>/i.test(trimmed)
      ? trimmed.replace(/<\/head>/i, `${bridge}</head>`)
      : trimmed.replace(/<html[^>]*>/i, (match) => `${match}<head>${bridge}</head>`);
    if (/<\/body>/i.test(withHead)) return withHead;
    return `${withHead}<body></body>`;
  }

  if (language === "python") {
    return `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>HOOS Game</title>${bridge}</head><body><script id="hoos-engine-cdn" src="${LANGUAGE_CDNS.python}"></script>${hoosEngineHook()}<script type="text/python">${trimmed}</script></body></html>`;
  }

  const cdn = LANGUAGE_CDNS[language] ?? LANGUAGE_CDNS["js-phaser"];
  return `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>HOOS Game</title>${bridge}</head><body><script id="hoos-engine-cdn" src="${cdn}"></script>${hoosEngineHook()}<script>${trimmed}</script></body></html>`;
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

type PlayChatMsg = { role: "user" | "agent"; text: string; language?: string; passes?: number };

interface PlaySseEvent {
  type: "progress" | "complete" | "demo";
  pass?: number; chars?: number; status?: string;
  reply?: string; sessionId?: string; demo?: boolean; passes?: number;
  gemini?: boolean;
}

export default function PlayPage() {
  const iframeRef              = useRef<HTMLIFrameElement>(null);
  /** Full HTML for the game iframe — srcDoc avoids blob: revoke races (e.g. React Strict Mode). */
  const [iframeSrcDoc, setIframeSrcDoc] = useState<string | null>(null);
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
  const [renderProgress, setRenderProgress] = useState(0);
  const [renderLabel, setRenderLabel] = useState("Preparing player…");

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

  // Play-side assistant (same /api/chat stream as Create — visible while iframe render overlay runs)
  const chatSessionRef = useRef<string | null>(null);
  const playConvoRef = useRef<HTMLDivElement>(null);
  const chatGenStartRef = useRef<number>(Date.now());
  const [playChatMessages, setPlayChatMessages] = useState<PlayChatMsg[]>([]);
  const [playChatPrompt, setPlayChatPrompt] = useState("");
  const [playChatLoading, setPlayChatLoading] = useState(false);
  const [playPassInfo, setPlayPassInfo] = useState<{ pass: number; chars: number; status: string } | null>(null);

  useEffect(() => {
    try {
      const s = sessionStorage.getItem("hoos_chat_session_id");
      if (s && isWxOPersistableThreadId(s)) chatSessionRef.current = s;
    } catch {
      /* ignore */
    }
  }, []);

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
      setRenderProgress(4);
      setRenderLabel("Preparing player…");
      setIframeSrcDoc(toPlayableHtml(code, lang ?? "js-phaser"));
    }
  }, []);

  useEffect(() => {
    const handler = (event: MessageEvent) => {
      const data = event.data as { type?: string; message?: string; percent?: number; label?: string };
      const t = data?.type;
      if (!t) return;

      if (t === "hoos_render_ready") {
        setRenderLoading(false);
        setRenderError(null);
        setRenderProgress(100);
        setRenderLabel("Ready");
        return;
      }
      if (t === "hoos_render_progress") {
        const p = typeof data.percent === "number" ? data.percent : 0;
        setRenderProgress((prev) => Math.max(prev, p));
        if (data.label) setRenderLabel(data.label);
        return;
      }
      if (t === "hoos_render_error") {
        setRenderLoading(false);
        setRenderError(data.message ?? "The generated game crashed during startup.");
        return;
      }

      if (t === "hoos_win" || t === "hoos_gameover") {
        const reached_win = t === "hoos_win";
        fetch("/api/analytics/ingest", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            type: "session", game_id: gameIdRef.current, engine,
            duration_ms: Date.now() - sessionStartRef.current, reached_win,
          }),
        }).catch(() => {});

        if (marketOpen && marketId) {
          resolveMarket(reached_win ? "win" : "lose");
        }
      }
    };
    window.addEventListener("message", handler);
    return () => window.removeEventListener("message", handler);
  }, [engine, marketOpen, marketId, resolveMarket]);

  useEffect(() => {
    if (!renderLoading) return;
    const id = window.setInterval(() => {
      setRenderProgress((p) => (p < 12 ? p + 1 : p));
    }, 450);
    return () => clearInterval(id);
  }, [renderLoading]);

  useEffect(() => {
    if (!iframeSrcDoc || !renderLoading) return;
    const timeout = window.setTimeout(() => {
      setRenderLoading(false);
      setRenderError(
        "The player is taking unusually long (Pyodide or heavy 3D can need 60s+). Try ↻ Render, a different engine, or Rebuild.",
      );
    }, 55000);
    return () => window.clearTimeout(timeout);
  }, [iframeSrcDoc, renderLoading, renderNonce]);

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
        const payload = JSON.stringify({
          type: "session", game_id: gameIdRef.current, engine,
          duration_ms: duration, reached_win: false,
        });
        navigator.sendBeacon?.(
          "/api/analytics/ingest",
          new Blob([payload], { type: "application/json" }),
        );
      }
    };
    window.addEventListener("beforeunload", logSession);
    return () => window.removeEventListener("beforeunload", logSession);
  }, [engine]);

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
    setRenderProgress(0);
    setRenderLabel("Reloading…");
    setIframeSrcDoc(toPlayableHtml(gameCode, sourceLanguage));
    setRenderNonce((value) => value + 1);
  }, [gameCode, sourceLanguage]);

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

  const scrollPlayChatBottom = useCallback(() => {
    setTimeout(() => {
      const el = playConvoRef.current;
      if (el) el.scrollTop = el.scrollHeight;
    }, 40);
  }, []);

  const sendPlayChat = useCallback(async () => {
    const text = playChatPrompt.trim();
    if (!text || playChatLoading || !gameCode) return;

    let lang = sourceLanguage;
    if (/\b3d\b/i.test(text) && lang === "js-phaser") lang = "js-three";
    if (/\bpython\b/i.test(text)) lang = "python";

    setPlayChatMessages((prev) => [...prev, { role: "user", text, language: lang }]);
    setPlayChatPrompt("");
    setPlayChatLoading(true);
    setPlayPassInfo(null);
    chatGenStartRef.current = Date.now();
    scrollPlayChatBottom();

    const contextual =
      `Current game (${engine}, ${lang}): the player is refining this build while it runs in the sandbox. ` +
      `Return a full single-file playable game (same output rules as a new build).\n\nUser request: ${text}`;

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: contextual,
          sessionId: chatSessionRef.current,
          language: lang,
        }),
      });

      if (!res.body) throw new Error("No response stream");
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const parts = buffer.split("\n\n");
        buffer = parts.pop() ?? "";

        for (const part of parts) {
          if (!part.startsWith("data: ")) continue;
          let evt: PlaySseEvent;
          try {
            evt = JSON.parse(part.slice(6));
          } catch {
            continue;
          }

          if (evt.type === "progress") {
            setPlayPassInfo({
              pass: evt.pass ?? 1,
              chars: evt.chars ?? 0,
              status: evt.status ?? "",
            });
          } else if (evt.type === "complete") {
            if (evt.sessionId) {
              chatSessionRef.current = evt.sessionId;
              try {
                sessionStorage.setItem("hoos_chat_session_id", evt.sessionId);
              } catch {
                /* ignore */
              }
            }
            const reply = evt.reply ?? "";
            setPlayChatMessages((prev) => [...prev, { role: "agent", text: reply, language: lang, passes: evt.passes }]);

            const extracted = extractGameCode(reply, lang);
            const primary = extractPrimarySource(reply, lang, extracted);
            const validationError = primary ? validateGeneratedOutput(primary, lang) : "The model did not return runnable code.";
            const detectedEng = extracted ? detectEngine(extracted) : "";

            if (extracted && primary && !validationError) {
              setGameCode(extracted);
              setSourceCode(primary);
              setSourceLanguage(lang);
              setEngine(detectedEng);
              setGameName(text.slice(0, 60));
              try {
                sessionStorage.setItem("hoos_game_code", extracted);
                sessionStorage.setItem("hoos_game_source", primary);
                sessionStorage.setItem("hoos_game_language", lang);
                sessionStorage.setItem("hoos_game_prompt", text);
                sessionStorage.setItem("hoos_game_engine", detectedEng);
              } catch {
                /* ignore */
              }

              setRenderLoading(true);
              setRenderError(null);
              setRenderProgress(4);
              setRenderLabel("Preparing player…");
              setIframeSrcDoc(toPlayableHtml(extracted, lang));
              setRenderNonce((n) => n + 1);

              fetch("/api/analytics/ingest", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  type: "modification",
                  game_id: gameIdRef.current,
                  modification: text.slice(0, 500),
                }),
              }).catch(() => {});
            } else {
              setPlayChatMessages((prev) => [
                ...prev,
                {
                  role: "agent",
                  text: `⚠ Could not swap in new code: ${validationError ?? "Incomplete output."} Ask for a complete single-file game.`,
                },
              ]);
            }
          }
        }
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Network error";
      setPlayChatMessages((prev) => [...prev, { role: "agent", text: `⚠ ${msg}` }]);
    } finally {
      setPlayChatLoading(false);
      setPlayPassInfo(null);
      scrollPlayChatBottom();
    }
  }, [playChatLoading, playChatPrompt, gameCode, sourceLanguage, engine, scrollPlayChatBottom]);

  const handlePlayChatKey = (e: ReactKeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void sendPlayChat();
    }
  };

  if (!hasCode) {
    return (
      <div className="play-empty">
        <div className="play-empty-icon">🎮</div>
        <h2 className="play-empty-title">No game loaded</h2>
        <p className="play-empty-sub">Build a game first — 78 IBM AI agents generate complete, playable code with sounds.</p>
        <div style={{ display: "flex", gap: 12, marginTop: 24, alignItems: "center", flexWrap: "wrap" }}>
          <Link href="/create" className="btn-primary">Build Your Game →</Link>
          <Link href="/" className="btn-ghost">Home</Link>
          <AuthButton />
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
          <AuthButton />
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
          <button className="play-export-btn" onClick={() => setShowMint(s => !s)} title="Upload game HTML to IPFS (NFT.storage)" style={{ color: "#a855f7", borderColor: "#a855f744" }}>
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
          <div className="play-panel-title">🔮 IPFS upload · NFT.storage</div>
          <p style={{ margin: "0 0 8px", fontFamily: "var(--mono)", fontSize: 9, color: "var(--muted)", lineHeight: 1.5 }}>
            Uploads HTML + metadata to IPFS. No on-chain mint is performed by this API.
          </p>
          <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
            {!wallet ? (
              <button onClick={connectWallet} className="btn-primary" style={{ fontSize: 11, padding: "6px 14px" }}>Connect Phantom Wallet</button>
            ) : (
              <span style={{ fontFamily: "var(--mono)", fontSize: 10, color: "#10b981" }}>✓ {wallet.slice(0,6)}…{wallet.slice(-4)}</span>
            )}
            <button onClick={mintGame} disabled={minting} className="btn-primary" style={{ fontSize: 11, padding: "6px 14px", background: "#a855f7", borderColor: "#a855f7" }}>
              {minting ? "⏳ Uploading…" : "Upload to IPFS"}
            </button>
          </div>
          {mintResult && (
            <div style={{ marginTop: 8, fontFamily: "var(--mono)", fontSize: 10 }}>
              {mintResult.error ? (
                <span style={{ color: "#ef4444" }}>✗ {mintResult.error}</span>
              ) : (
                <span style={{ color: "#10b981" }}>
                  ✓ IPFS upload #{mintResult.gameId}
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

      <div className="play-body">
        <div className="play-main">
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
                <span className="play-render-status-text">
                  Render · {Math.round(renderProgress)}% — {renderLabel}
                </span>
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

          {/* Game iframe — overlay covers only this region; assistant stays visible */}
          <div className="play-frame-wrap" onClick={() => setClicked(true)}>
            {renderLoading && (
              <div className="play-loading-overlay">
                <div className="play-loading-spinner" />
                <div className="play-loading-copy">
                  <strong>Rendering your game · {Math.round(renderProgress)}%</strong>
                  <span>{renderLabel}</span>
                  <div className="play-render-progress" aria-hidden>
                    <div className="play-render-progress-fill" style={{ width: `${Math.min(100, renderProgress)}%` }} />
                  </div>
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
            {iframeSrcDoc ? (
              <iframe
                key={renderNonce}
                ref={iframeRef}
                srcDoc={iframeSrcDoc}
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

        <aside className="play-assistant" aria-label="Refine game with AI">
          <div className="cr-chat-header play-assistant-header">
            <div className="cr-chat-title">
              <span style={{ fontSize: 14 }}>🤖</span>
              <span>Refine · HOOS AI — IBM watsonx Orchestrate</span>
            </div>
            <div className="cr-chat-sub">
              Chat stays open while the preview renders. Describe tweaks or fixes; a new build replaces the player when ready.
            </div>
          </div>

          <div className="cr-convo play-assistant-convo" ref={playConvoRef}>
            {playChatMessages.length === 0 && !playChatLoading && (
              <p className="play-assistant-hint">
                Example: “Make the player jump higher” or “Add a second enemy type.” Enter to send.
              </p>
            )}
            {playChatMessages.map((msg, i) => {
              const lang = msg.language ?? sourceLanguage;
              const code = msg.role === "agent" ? extractGameCode(msg.text, lang) : null;
              const engineLabel = code ? detectEngine(code) : null;
              return (
                <div key={i} className={`cr-msg cr-msg-${msg.role}`}>
                  <div className="cr-msg-label">{msg.role === "user" ? "YOU" : "HOOS AI"}</div>
                  {msg.role === "agent" && code ? (
                    <div className="cr-msg-code-wrap">
                      <div className="cr-msg-code-badge">
                        <span>
                          ⚙ {engineLabel} · {code.length.toLocaleString()} chars
                          {msg.passes && msg.passes > 1 ? ` · ${msg.passes} passes` : ""}
                        </span>
                        <button type="button" className="cr-copy-btn" onClick={() => navigator.clipboard.writeText(code)}>Copy</button>
                      </div>
                      <div className="cr-msg-text cr-msg-code">{msg.text}</div>
                    </div>
                  ) : (
                    <div className="cr-msg-text">{msg.text}</div>
                  )}
                </div>
              );
            })}
            {playChatLoading && (
              <div className="cr-msg cr-msg-agent">
                <div className="cr-msg-label">HOOS AI</div>
                <div className="cr-msg-thinking">
                  <span /><span /><span />
                  <span style={{ marginLeft: 10, fontSize: 9, fontFamily: "var(--mono)", color: "var(--muted)" }}>
                    {playPassInfo?.status ?? "Generating…"}
                  </span>
                </div>
                {playPassInfo && playPassInfo.chars > 0 && (
                  <div className="cr-pass-info">
                    <span className="cr-pass-badge">Pass {playPassInfo.pass}</span>
                    <span className="cr-pass-bar">
                      <span className="cr-pass-bar-fill" style={{ width: `${Math.min(100, (playPassInfo.pass / 20) * 100)}%` }} />
                    </span>
                    <span className="cr-pass-chars">{playPassInfo.chars.toLocaleString()} chars</span>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="play-assistant-input">
            <div className="cr-input-wrap" style={{ marginBottom: 0 }}>
              <textarea
                className="cr-textarea"
                rows={3}
                placeholder="Refine your game while it loads…"
                value={playChatPrompt}
                onChange={(e) => setPlayChatPrompt(e.target.value)}
                onKeyDown={handlePlayChatKey}
                disabled={playChatLoading}
                style={{ minHeight: 64, fontSize: 12 }}
              />
              <div className="cr-input-footer">
                <span className="cr-hint">ENTER send · SHIFT+ENTER newline</span>
                <button
                  type="button"
                  className="cr-send-btn"
                  onClick={() => void sendPlayChat()}
                  disabled={!playChatPrompt.trim() || playChatLoading}
                  aria-label="Send refinement"
                >
                  {playChatLoading ? <span className="cr-send-spinner" /> : (
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <line x1="22" y1="2" x2="11" y2="13" /><polygon points="22 2 15 22 11 13 2 9 22 2" />
                    </svg>
                  )}
                </button>
              </div>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
