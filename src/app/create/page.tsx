"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AuthButton } from "@/components/AuthButton";

const EXAMPLE_PROMPTS = [
  "2D dark fantasy side-scroller with boss fights",
  "3D space shooter with roguelike progression",
  "Pixel art puzzle platformer, cute aesthetic",
  "Top-down gothic RPG with procedural dungeons",
  "Endless runner, neon cyberpunk, mobile",
  "Python: maze puzzle with timer",
  "3D first-person dungeon crawler",
  "2D bullet-hell shooter with synth music",
];

const RECENT_BUILDS = [
  { name: "Ashenveil Chronicles", dim: "2D", agents: 78, time: "4m 22s", bg: "linear-gradient(135deg,#1a1240,#3b1a6e)" },
  { name: "Neon Void Runner",     dim: "3D", agents: 78, time: "5m 58s", bg: "linear-gradient(135deg,#0d1f33,#1a3a5c)" },
  { name: "Crystal Maze",         dim: "PY", agents: 78, time: "3m 15s", bg: "linear-gradient(135deg,#0d2b1a,#0f4a2e)" },
];

const DOMAIN_COLORS: Record<string, string> = {
  "Orchestration": "#e57200", "Narrative": "#a855f7", "Mechanics": "#3b82f6",
  "Physics": "#06b6d4", "Animation": "#10b981", "Art": "#ec4899",
  "Rendering": "#f59e0b", "Level": "#84cc16", "Audio": "#8b5cf6",
  "UI": "#6b9fd4", "AI / NPC": "#ef4444", "QA": "#14b8a6",
  "Deploy": "#f97316", "Bridge": "#6b7280",
};

const DOMAIN_TIMELINE = [
  { domain: "Orchestration", startMs: 0,     endMs: 8000  },
  { domain: "Narrative",     startMs: 5000,  endMs: 16000 },
  { domain: "Mechanics",     startMs: 10000, endMs: 22000 },
  { domain: "Physics",       startMs: 14000, endMs: 26000 },
  { domain: "Bridge",        startMs: 16000, endMs: 180000 },
  { domain: "Animation",     startMs: 20000, endMs: 32000 },
  { domain: "Art",           startMs: 22000, endMs: 35000 },
  { domain: "Rendering",     startMs: 28000, endMs: 40000 },
  { domain: "Level",         startMs: 32000, endMs: 44000 },
  { domain: "Audio",         startMs: 36000, endMs: 48000 },
  { domain: "UI",            startMs: 40000, endMs: 52000 },
  { domain: "AI / NPC",      startMs: 42000, endMs: 54000 },
  { domain: "QA",            startMs: 50000, endMs: 60000 },
  { domain: "Deploy",        startMs: 55000, endMs: 65000 },
];

const LANGUAGES = [
  { value: "js-phaser",  label: "Phaser 3",   icon: "🎮", hint: "2D / JavaScript" },
  { value: "js-three",   label: "Three.js",   icon: "🌐", hint: "3D / JavaScript" },
  { value: "js-babylon", label: "Babylon.js", icon: "🔮", hint: "3D / advanced"    },
  { value: "js-p5",      label: "p5.js",      icon: "🎨", hint: "creative / 2D"   },
  { value: "js-kaboom",  label: "Kaboom.js",  icon: "💥", hint: "casual / 2D"     },
  { value: "js-pixi",    label: "PixiJS",     icon: "⚡", hint: "fast 2D WebGL"   },
  { value: "python",     label: "Python",     icon: "🐍", hint: "Pyodide / WASM"  },
];

interface AgentRow { id: string; name: string; cleanName: string; domain: string; description: string; }
type Message = { role: "user" | "agent"; text: string; language?: string; passes?: number };
interface PassInfo { pass: number; chars: number; status: string }
interface SseEvent {
  type: "progress" | "complete" | "demo";
  pass?: number; chars?: number; status?: string;
  reply?: string; sessionId?: string; demo?: boolean; passes?: number;
}
interface WolframResult { constants?: Record<string, string>; rule?: number; injected?: boolean; physicsValue?: string; }

const PHYSICAL_KEYWORDS = ["moon","mars","jupiter","saturn","underwater","ocean","space","earth","gravity","vacuum","arctic","desert","volcano"];
function detectPhysicalSetting(prompt: string): string | null {
  const lower = prompt.toLowerCase();
  return PHYSICAL_KEYWORDS.find(k => lower.includes(k)) ?? null;
}

function extractGameCode(text: string): string | null {
  const htmlBlock = text.match(/```html\s*([\s\S]*?)(?:```\s*$|```\s*\n|$)/i);
  if (htmlBlock) return htmlBlock[1].trim();
  const htmlDirect = text.match(/(<!DOCTYPE html>[\s\S]*?<\/html>)/i);
  if (htmlDirect) return htmlDirect[1].trim();
  const jsBlock = text.match(/```(?:javascript|js)\s*([\s\S]*?)(?:```|$)/i);
  if (jsBlock) return `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>HOOS Game</title>
<style>*{margin:0;padding:0}body{background:#000;display:flex;align-items:center;justify-content:center;min-height:100vh}</style>
</head><body><script src="https://cdnjs.cloudflare.com/ajax/libs/phaser/3.60.0/phaser.min.js"></script>
<script>${jsBlock[1]}</script></body></html>`;
  return null;
}

function detectEngine(code: string): string {
  if (/BABYLON\.|babylon\.js/i.test(code)) return "BABYLON.JS 3D";
  if (/THREE\.|three\.min\.js/i.test(code)) return "THREE.JS 3D";
  if (/pyodide|text\/python/i.test(code)) return "PYTHON / PYODIDE";
  if (/kaboom\s*\(/i.test(code)) return "KABOOM.JS 2D";
  if (/PIXI\./i.test(code)) return "PIXI.JS 2D";
  if (/createCanvas|p5\.min\.js/i.test(code)) return "P5.JS 2D";
  if (/phaser|Phaser/i.test(code)) return "PHASER 3 · 2D";
  return "HTML5 GAME";
}

export default function CreatePage() {
  const router = useRouter();
  const [prompt, setPrompt]       = useState("");
  const [language, setLanguage]   = useState("js-phaser");
  const [messages, setMessages]   = useState<Message[]>([]);
  const [loading, setLoading]     = useState(false);
  const [agents, setAgents]       = useState<AgentRow[]>([]);
  const [runningDomains, setRunningDomains] = useState<Set<string>>(new Set());
  const [doneDomains, setDoneDomains]       = useState<Set<string>>(new Set());
  const [gameCode, setGameCode]   = useState<string | null>(null);
  const [agentsMock, setAgentsMock] = useState(false);
  const [passInfo, setPassInfo]   = useState<PassInfo | null>(null);
  const [wolframMode, setWolframMode] = useState(false);
  const [wolframInfo, setWolframInfo] = useState<WolframResult | null>(null);
  const genStartRef = useRef<number>(0);

  const textareaRef  = useRef<HTMLTextAreaElement>(null);
  const convoRef     = useRef<HTMLDivElement>(null);
  const sessionIdRef = useRef<string | null>(null);
  const loadStartRef = useRef<number>(0);

  useEffect(() => {
    fetch("/api/agents")
      .then(r => r.json())
      .then((d: { agents: AgentRow[]; mock?: boolean }) => {
        setAgents(d.agents ?? []); setAgentsMock(d.mock ?? false);
      }).catch(() => {});
  }, []);

  // Domain-based pipeline animation
  useEffect(() => {
    if (!loading) { setRunningDomains(new Set()); return; }
    loadStartRef.current = Date.now();
    setDoneDomains(new Set()); setRunningDomains(new Set());
    const iv = setInterval(() => {
      const elapsed = Date.now() - loadStartRef.current;
      const running = new Set<string>(), done = new Set<string>();
      DOMAIN_TIMELINE.forEach(({ domain, startMs, endMs }) => {
        if (elapsed >= endMs) done.add(domain);
        else if (elapsed >= startMs) running.add(domain);
      });
      setRunningDomains(running); setDoneDomains(done);
    }, 400);
    return () => clearInterval(iv);
  }, [loading]);

  const scrollBottom = useCallback(() => {
    setTimeout(() => { if (convoRef.current) convoRef.current.scrollTop = convoRef.current.scrollHeight; }, 40);
  }, []);

  const fillPrompt = useCallback((text: string) => {
    setPrompt(text);
    if (/\b3d\b/i.test(text)) setLanguage("js-three");
    else if (/\bpython\b/i.test(text)) setLanguage("python");
    else if (/\bbabylon\b/i.test(text)) setLanguage("js-babylon");
    else if (/\bp5\b/i.test(text)) setLanguage("js-p5");
    else setLanguage("js-phaser");
    textareaRef.current?.focus();
  }, []);

  const sendPrompt = useCallback(async () => {
    const text = prompt.trim();
    if (!text || loading) return;

    // Auto-detect language from prompt
    let lang = language;
    if (/\b3d\b/i.test(text) && lang === "js-phaser") lang = "js-three";
    if (/\bpython\b/i.test(text)) lang = "python";

    setMessages(prev => [...prev, { role: "user", text, language: lang }]);
    setPrompt(""); setLoading(true); setGameCode(null);
    setDoneDomains(new Set()); setRunningDomains(new Set()); setPassInfo(null);
    setWolframInfo(null);
    genStartRef.current = Date.now();
    scrollBottom();

    // Wolfram mode: fetch physics constants + automaton seeds for physical settings
    let wolframEnrichment = "";
    const physSetting = detectPhysicalSetting(text);
    if (wolframMode && physSetting) {
      try {
        const rule = physSetting === "moon" ? 30 : physSetting === "mars" ? 90 : physSetting === "underwater" ? 110 : 150;

        const physicsQueries: Record<string, string> = {
          moon: "gravitational acceleration on the moon in m/s2",
          mars: "gravitational acceleration on mars in m/s2",
          jupiter: "gravitational acceleration on jupiter in m/s2",
          saturn: "gravitational acceleration on saturn in m/s2",
          underwater: "drag coefficient of a sphere in water",
          ocean: "drag coefficient of a sphere in water",
          space: "gravitational acceleration in low earth orbit",
          earth: "gravitational acceleration on earth in m/s2",
          gravity: "gravitational acceleration on earth in m/s2",
          vacuum: "speed of light in m/s",
          arctic: "ice friction coefficient",
          desert: "sand friction coefficient",
          volcano: "lava density kg per m3",
        };

        const physQuery = physicsQueries[physSetting];
        const [autoRes, physRes] = await Promise.all([
          fetch(`/api/wolfram/automaton?rule=${rule}&width=64&rows=32`),
          physQuery ? fetch(`/api/wolfram?q=${encodeURIComponent(physQuery)}`) : Promise.resolve(null),
        ]);

        const autoData = await autoRes.json() as { platforms?: Array<{x:number;y:number;w:number}> };
        const physData = physRes ? await physRes.json() as { result?: Record<string, string> } : null;

        const parts: string[] = [];

        // Physics constants
        if (physData?.result) {
          const resultEntry = physData.result["Result"] ?? Object.values(physData.result)[0] ?? "";
          if (resultEntry) {
            parts.push(`[WOLFRAM Physics] ${physSetting} setting: ${resultEntry}. Use this as the game's gravity/physics constant.`);
          }
        }

        // Automaton level seeds
        if (autoData.platforms?.length) {
          const platformStr = autoData.platforms.slice(0,8).map(p => `{x:${p.x},y:${p.y},w:${p.w}}`).join(",");
          parts.push(`[WOLFRAM Rule ${rule}] Platform layout from cellular automaton: [${platformStr}].`);
        }

        if (parts.length) {
          wolframEnrichment = " " + parts.join(" ");
          const physicsValue = physData?.result?.["Result"] ?? Object.values(physData?.result ?? {})[0];
          setWolframInfo({ rule, injected: true, constants: physData?.result, physicsValue });
        }
      } catch { /* ignore wolfram errors — never block generation */ }
    }

    const enrichedPrompt = wolframEnrichment ? text + wolframEnrichment : text;

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: enrichedPrompt, sessionId: sessionIdRef.current, language: lang }),
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
          let evt: SseEvent;
          try { evt = JSON.parse(part.slice(6)); } catch { continue; }

          if (evt.type === "progress") {
            setPassInfo({ pass: evt.pass ?? 1, chars: evt.chars ?? 0, status: evt.status ?? "" });

          } else if (evt.type === "complete" || evt.type === "demo") {
            if (evt.sessionId) sessionIdRef.current = evt.sessionId;
            const reply = evt.reply ?? "";
            setMessages(prev => [...prev, { role: "agent", text: reply, language: lang, passes: evt.passes }]);
            const code = extractGameCode(reply);
            const detectedEng = code ? detectEngine(code) : "";
            if (code) {
              setGameCode(code);
              sessionStorage.setItem("hoos_game_code", code);
              sessionStorage.setItem("hoos_game_prompt", text);
              sessionStorage.setItem("hoos_game_engine", detectedEng);
            }
            try {
              const spec = JSON.stringify({
                prompt: text,
                language: lang,
                engine: detectedEng || lang,
                passes: evt.passes ?? 1,
                chars: code?.length ?? 0,
                demo: evt.type === "demo",
                ts: new Date().toISOString(),
                wolfram: wolframInfo ?? null,
              }, null, 2);
              sessionStorage.setItem("hoos_gaming_last_spec", spec);
            } catch { /* ignore */ }
            // Analytics ingest
            const duration = Date.now() - genStartRef.current;
            fetch("/api/analytics/ingest", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                type: "generation",
                prompt: text,
                engine: detectedEng || lang,
                duration_ms: duration,
                char_count: code?.length ?? 0,
                pass_count: evt.passes ?? 1,
                success: !!code,
                wolfram: !!wolframInfo?.injected,
              }),
            }).catch(() => {});
            setLoading(false); setPassInfo(null); setRunningDomains(new Set());
            setDoneDomains(new Set(DOMAIN_TIMELINE.map(d => d.domain)));
            scrollBottom();
          }
        }
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Network error";
      setMessages(prev => [...prev, { role: "agent", text: `⚠ ${msg}` }]);
      setLoading(false); setPassInfo(null);
    }
  }, [prompt, language, loading, scrollBottom, wolframMode, wolframInfo]);

  const handleKey = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendPrompt(); }
  };

  const agentsByDomain = agents.reduce<Record<string, AgentRow[]>>((acc, a) => {
    (acc[a.domain] ??= []).push(a); return acc;
  }, {});
  const domainOrder = ["Orchestration","Narrative","Mechanics","Physics","Animation","Art","Rendering","Level","Audio","UI","AI / NPC","QA","Deploy","Bridge"];
  const activeDomains = [...runningDomains].filter(d => !doneDomains.has(d));

  return (
    <div className="create-shell">

      {/* ═══ LEFT PANEL ═══ */}
      <div className="create-left">

        {/* Scrollable top section */}
        <div className="cr-left-scroll">
          <div className="cr-header">
            <Link href="/" className="cr-logo">
              <div className="nl-icon" style={{ width: 28, height: 28, fontSize: 14 }}>🎮</div>
              <div className="nl-name" style={{ fontSize: 13 }}>HOOS GAMING</div>
            </Link>
            <span className="cr-badge">{agentsMock ? "DEMO" : "LIVE"} — IBM WxO</span>
          </div>

          <div className="cr-hero">
            <h1 className="cr-h1">Build a full game<br />with <span className="cr-grad">one prompt</span></h1>
            <p className="cr-sub">78 IBM AI agents — physics, art, levels, audio, code — assembled into a playable game.</p>
          </div>

          {/* Nav links */}
          <div style={{ display: "flex", gap: 8, marginBottom: 8, flexWrap: "wrap", alignItems: "center" }}>
            <Link href="/analytics" style={{ fontFamily: "var(--mono)", fontSize: 9, color: "var(--muted)", padding: "3px 8px", border: "1px solid var(--bdr)", borderRadius: 4 }}>📊 Analytics</Link>
            <Link href="/marketplace" style={{ fontFamily: "var(--mono)", fontSize: 9, color: "var(--muted)", padding: "3px 8px", border: "1px solid var(--bdr)", borderRadius: 4 }}>🔮 Marketplace</Link>
            <AuthButton />
          </div>

          <div className="cr-section-label">ENGINE</div>
          <div className="cr-lang-row">
            {LANGUAGES.map(l => (
              <button key={l.value} className={`cr-lang-btn${language === l.value ? " cr-lang-btn-active" : ""}`} onClick={() => setLanguage(l.value)}>
                <span className="cr-lang-icon">{l.icon}</span>
                <span className="cr-lang-label">{l.label}</span>
                <span className="cr-lang-hint">{l.hint}</span>
              </button>
            ))}
          </div>

          <div className="cr-section-label">EXAMPLES</div>
          <div className="cr-chips">
            {EXAMPLE_PROMPTS.map(p => (
              <button key={p} className="cr-chip cr-chip-btn" onClick={() => fillPrompt(p)}>{p}</button>
            ))}
          </div>

          {/* Wolfram mode toggle */}
          <div style={{ display:"flex",alignItems:"center",gap:10,margin:"8px 0",padding:"8px 12px",background:"rgba(6,182,212,.07)",border:"1px solid rgba(6,182,212,.2)",borderRadius:8 }}>
            <button
              onClick={() => setWolframMode(m => !m)}
              style={{ background:wolframMode?"#06b6d4":"transparent",border:"1px solid #06b6d44",borderRadius:4,padding:"3px 10px",fontFamily:"var(--mono)",fontSize:9,color:wolframMode?"#000":"#06b6d4",cursor:"pointer",transition:"all .2s" }}
            >
              {wolframMode ? "⚛ WOLFRAM ON" : "⚛ WOLFRAM OFF"}
            </button>
            <span style={{ fontSize:9,fontFamily:"var(--mono)",color:"var(--muted)",flex:1 }}>
              {wolframMode ? "Cellular automaton seeds physical game levels" : "Enable Wolfram procedural level generation"}
            </span>
            {wolframInfo?.injected && (
              <span style={{ color:"#06b6d4",fontSize:8,fontFamily:"var(--mono)" }}>
                ✓ Rule {wolframInfo.rule}{wolframInfo.physicsValue ? ` · ${wolframInfo.physicsValue}` : ""}
              </span>
            )}
          </div>

          <div className="cr-section-label">RECENT BUILDS</div>
          <div className="cr-builds">
            {RECENT_BUILDS.map(b => (
              <div key={b.name} className="cr-build-card">
                <div className="cr-build-thumb" style={{ background: b.bg }}>
                  <span className="cr-build-dim">{b.dim}</span>
                </div>
                <div className="cr-build-info">
                  <div className="cr-build-name">{b.name}</div>
                  <div className="cr-build-meta">{b.dim} · {b.agents} agents · {b.time}</div>
                </div>
              </div>
            ))}
          </div>

          {/* Agent pipeline */}
          <div style={{ display:"flex",alignItems:"center",justifyContent:"space-between",margin:"10px 0 4px" }}>
            <div className="cr-section-label" style={{ margin:0 }}>IBM PIPELINE ({agents.length || 78})</div>
            <div style={{ display:"flex",gap:6 }}>
              {loading && <span className="cr-pill cr-pill-run">⚡ {passInfo?.pass ? `PASS ${passInfo.pass}` : "BUILDING"}</span>}
              {!loading && doneDomains.size > 0 && <span className="cr-pill cr-pill-done">✓ DONE</span>}
            </div>
          </div>

          {passInfo && passInfo.chars > 0 && (
            <div style={{ padding:"2px 0 4px",fontSize:9,fontFamily:"var(--mono)",color:"var(--c1)",display:"flex",gap:12 }}>
              <span>Pass {passInfo.pass}</span>
              <span style={{ color:"var(--mid)" }}>{passInfo.chars.toLocaleString()} chars</span>
            </div>
          )}

          <div className="cr-agent-list">
            {domainOrder.filter(d => agentsByDomain[d]).map(domain => {
              const isRunning = runningDomains.has(domain);
              const isDone    = doneDomains.has(domain);
              const col = DOMAIN_COLORS[domain] ?? "var(--muted)";
              return (
                <div key={domain}>
                  <div style={{ padding:"3px 8px 2px 14px",fontSize:8,fontFamily:"var(--mono)",letterSpacing:"1.5px",textTransform:"uppercase",color:col,borderLeft:`2px solid ${col}`,marginLeft:14,marginTop:5,display:"flex",alignItems:"center",gap:6 }}>
                    {domain}
                    {isRunning && <span style={{ background:col,color:"#000",fontSize:7,padding:"1px 5px",borderRadius:4,fontWeight:700 }}>RUNNING</span>}
                    {isDone && !isRunning && <span style={{ color:"#10b981",fontSize:7 }}>✓</span>}
                    <span style={{ marginLeft:"auto",color:"var(--muted)",fontSize:7 }}>{(agentsByDomain[domain]??[]).length}</span>
                  </div>
                  {(agentsByDomain[domain]??[]).map(agent => (
                    <div key={agent.id} className="cr-agent-row">
                      <div className={`cr-agent-dot ${isRunning?"cr-dot-running":isDone?"cr-dot-done":"cr-dot-queued"}`} />
                      <span className="cr-agent-name" title={agent.description}>{agent.cleanName}</span>
                      <div className="cr-agent-bar">
                        <div className="cr-agent-bar-fill" style={{ width:isDone?"100%":isRunning?"65%":"0%", background:isDone?"#10b981":isRunning?col:undefined, transition:"width 0.8s ease" }} />
                      </div>
                      <span className={`cr-agent-status ${isRunning?"cr-status-running":isDone?"cr-status-done":"cr-status-queued"}`} style={{ color:isRunning?col:undefined }}>
                        {isRunning?"run":isDone?"✓":"idle"}
                      </span>
                    </div>
                  ))}
                </div>
              );
            })}
          </div>
        </div>

        {/* Fixed bottom: prompt input */}
        <div className="cr-left-bottom">
          <div style={{ display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:6 }}>
            <div className="cr-section-label" style={{ margin:0 }}>YOUR PROMPT</div>
            <span style={{ fontFamily:"var(--mono)",fontSize:8,color:"var(--muted)" }}>
              {LANGUAGES.find(l => l.value === language)?.icon} {LANGUAGES.find(l => l.value === language)?.label}
            </span>
          </div>
          <div className="cr-input-wrap" style={{ marginBottom:8 }}>
            <textarea ref={textareaRef} className="cr-textarea" rows={3} placeholder="Describe your game…" value={prompt} onChange={e => setPrompt(e.target.value)} onKeyDown={handleKey} style={{ minHeight:70 }} />
            <div className="cr-input-footer">
              <span className="cr-hint">ENTER send · SHIFT+ENTER newline</span>
              <button className="cr-send-btn" onClick={sendPrompt} disabled={!prompt.trim() || loading} aria-label="Send">
                {loading ? <span className="cr-send-spinner" /> :
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/>
                  </svg>}
              </button>
            </div>
          </div>
          <div className="cr-footer-stats">
            <span>⚡ {agents.length || 78} agents</span>
            <span>🔊 sounds built-in</span>
            <span>📦 up to 20 passes</span>
            {wolframMode && <span style={{ color:"#06b6d4" }}>⚛ Wolfram</span>}
            {agentsMock && <span style={{ color:"var(--c3)" }}>⚠ demo</span>}
          </div>
        </div>
      </div>

      {/* ═══ RIGHT PANEL ═══ */}
      <div className="create-right">
        <div className="cr-chat-header">
          <div style={{ display:"flex",alignItems:"center",justifyContent:"space-between" }}>
            <div className="cr-chat-title">
              <span style={{ fontSize:16 }}>🤖</span>
              <span>HOOS AI — IBM watsonx Orchestrate</span>
            </div>
            {gameCode && (
              <button onClick={() => router.push("/play")} className="play-game-btn">▶ Play Game</button>
            )}
          </div>
          <div className="cr-chat-sub">
            {gameCode
              ? `✅ ${detectEngine(gameCode)} ready — click Play Game`
              : "Type a prompt → 78 IBM agents generate a complete game with sounds"}
          </div>
        </div>

        <div className="cr-convo" ref={convoRef}>
          {messages.length === 0 && !loading && (
            <div className="cr-preview-empty">
              <div className="cr-preview-icon">🎮</div>
              <div className="cr-preview-msg">WAITING FOR PROMPT</div>
              <div className="cr-preview-sub">Choose an engine, type a game idea, and 78 IBM agents will build it with sounds</div>
            </div>
          )}

          {messages.map((msg, i) => {
            const code = msg.role === "agent" ? extractGameCode(msg.text) : null;
            const engine = code ? detectEngine(code) : null;
            return (
              <div key={i} className={`cr-msg cr-msg-${msg.role}`}>
                <div className="cr-msg-label">{msg.role === "user" ? "YOU" : "HOOS AI"}</div>
                {msg.role === "agent" && code ? (
                  <div className="cr-msg-code-wrap">
                    <div className="cr-msg-code-badge">
                      <span>⚙ {engine} · {code.length.toLocaleString()} chars{msg.passes && msg.passes > 1 ? ` · ${msg.passes} passes` : ""}</span>
                      <button className="cr-copy-btn" onClick={() => navigator.clipboard.writeText(code)}>Copy</button>
                    </div>
                    <div className="cr-msg-text cr-msg-code">{msg.text}</div>
                  </div>
                ) : (
                  <div className="cr-msg-text">{msg.text}</div>
                )}
              </div>
            );
          })}

          {loading && (
            <div className="cr-msg cr-msg-agent">
              <div className="cr-msg-label">HOOS AI</div>
              <div className="cr-msg-thinking">
                <span /><span /><span />
                <span style={{ marginLeft:10,fontSize:9,fontFamily:"var(--mono)",color:"var(--muted)" }}>
                  {passInfo?.status ?? (activeDomains.length > 0 ? `${activeDomains.slice(0,2).join(", ")} running…` : "IBM watsonx Orchestrate generating…")}
                </span>
              </div>
              {passInfo && passInfo.chars > 0 && (
                <div className="cr-pass-info">
                  <span className="cr-pass-badge">Pass {passInfo.pass}</span>
                  <span className="cr-pass-bar">
                    <span className="cr-pass-bar-fill" style={{ width:`${Math.min(100, (passInfo.pass / 20) * 100)}%` }} />
                  </span>
                  <span className="cr-pass-chars">{passInfo.chars.toLocaleString()} chars</span>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
