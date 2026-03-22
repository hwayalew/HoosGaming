"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

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
  "Orchestration": "#e57200",
  "Narrative":     "#a855f7",
  "Mechanics":     "#3b82f6",
  "Physics":       "#06b6d4",
  "Animation":     "#10b981",
  "Art":           "#ec4899",
  "Rendering":     "#f59e0b",
  "Level":         "#84cc16",
  "Audio":         "#8b5cf6",
  "UI":            "#6b9fd4",
  "AI / NPC":      "#ef4444",
  "QA":            "#14b8a6",
  "Deploy":        "#f97316",
  "Bridge":        "#6b7280",
};

// Each domain starts running at a given elapsed-time (ms) and finishes at endMs
// Total IBM build ~60 seconds. Domains overlap in realistic pipeline order.
const DOMAIN_TIMELINE: { domain: string; startMs: number; endMs: number }[] = [
  { domain: "Orchestration", startMs: 0,     endMs: 8000  },
  { domain: "Narrative",     startMs: 5000,  endMs: 16000 },
  { domain: "Mechanics",     startMs: 10000, endMs: 22000 },
  { domain: "Physics",       startMs: 14000, endMs: 26000 },
  { domain: "Bridge",        startMs: 16000, endMs: 56000 }, // runs throughout
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
  { value: "js-phaser", label: "Phaser 3",  icon: "🎮", hint: "2D / JavaScript" },
  { value: "js-three",  label: "Three.js",  icon: "🌐", hint: "3D / JavaScript" },
  { value: "python",    label: "Python",    icon: "🐍", hint: "Pyodide / browser" },
];

interface AgentRow {
  id: string;
  name: string;
  cleanName: string;
  domain: string;
  description: string;
}

type Message = { role: "user" | "agent"; text: string; language?: string };

function extractGameCode(text: string): string | null {
  const htmlBlock = text.match(/```html\s*([\s\S]*?)```/i);
  if (htmlBlock) return htmlBlock[1].trim();
  const htmlDirect = text.match(/(<!DOCTYPE html>[\s\S]*?<\/html>)/i);
  if (htmlDirect) return htmlDirect[1].trim();
  const jsBlock = text.match(/```javascript\s*([\s\S]*?)```/) ?? text.match(/```js\s*([\s\S]*?)```/);
  if (jsBlock) {
    return `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>HOOS Game</title>
<style>*{margin:0;padding:0;box-sizing:border-box}body{background:#000;display:flex;align-items:center;justify-content:center;min-height:100vh}</style>
</head><body>
<script src="https://cdnjs.cloudflare.com/ajax/libs/phaser/3.60.0/phaser.min.js"></script>
<script>${jsBlock[1]}</script></body></html>`;
  }
  return null;
}

function detectEngine(code: string): string {
  if (code.includes("three.js") || code.includes("THREE.") || code.includes("three.min.js")) return "THREE.JS 3D";
  if (code.includes("pyodide") || code.includes("text/python")) return "PYTHON / PYODIDE";
  if (code.includes("phaser") || code.includes("Phaser")) return "PHASER 3 · 2D";
  return "HTML5 GAME";
}

export default function CreatePage() {
  const router = useRouter();
  const [prompt, setPrompt]         = useState("");
  const [language, setLanguage]     = useState("js-phaser");
  const [messages, setMessages]     = useState<Message[]>([]);
  const [loading, setLoading]       = useState(false);
  const [agents, setAgents]         = useState<AgentRow[]>([]);
  const [runningDomains, setRunningDomains] = useState<Set<string>>(new Set());
  const [doneDomains, setDoneDomains]       = useState<Set<string>>(new Set());
  const [gameCode, setGameCode]     = useState<string | null>(null);
  const [agentsMock, setAgentsMock] = useState(false);
  const textareaRef                 = useRef<HTMLTextAreaElement>(null);
  const convoRef                    = useRef<HTMLDivElement>(null);
  const sessionIdRef                = useRef<string | null>(null);
  const loadStartRef                = useRef<number>(0);

  // Auto-detect language from prompt
  const effectiveLang = useCallback((p: string, lang: string) => {
    if (/\b3d\b/i.test(p) && lang === "js-phaser") return "js-three";
    if (/\bpython\b/i.test(p)) return "python";
    return lang;
  }, []);

  useEffect(() => {
    fetch("/api/agents")
      .then(r => r.json())
      .then((d: { agents: AgentRow[]; mock?: boolean }) => {
        setAgents(d.agents ?? []);
        setAgentsMock(d.mock ?? false);
      })
      .catch(() => {});
  }, []);

  // Domain-based pipeline animation (time-phased)
  useEffect(() => {
    if (!loading) {
      setRunningDomains(new Set());
      return;
    }
    loadStartRef.current = Date.now();
    setDoneDomains(new Set());
    setRunningDomains(new Set());

    const iv = setInterval(() => {
      const elapsed = Date.now() - loadStartRef.current;
      const running = new Set<string>();
      const done    = new Set<string>();
      DOMAIN_TIMELINE.forEach(({ domain, startMs, endMs }) => {
        if (elapsed >= endMs) done.add(domain);
        else if (elapsed >= startMs) running.add(domain);
      });
      setRunningDomains(running);
      setDoneDomains(done);
    }, 400);

    return () => clearInterval(iv);
  }, [loading]);

  const scrollBottom = useCallback(() => {
    setTimeout(() => {
      if (convoRef.current) convoRef.current.scrollTop = convoRef.current.scrollHeight;
    }, 40);
  }, []);

  const fillPrompt = useCallback((text: string) => {
    setPrompt(text);
    if (/\b3d\b/i.test(text)) setLanguage("js-three");
    else if (/\bpython\b/i.test(text)) setLanguage("python");
    else setLanguage("js-phaser");
    textareaRef.current?.focus();
  }, []);

  const sendPrompt = useCallback(async () => {
    const text = prompt.trim();
    if (!text || loading) return;

    const lang = effectiveLang(text, language);
    setMessages(prev => [...prev, { role: "user", text, language: lang }]);
    setPrompt("");
    setLoading(true);
    setGameCode(null);
    setDoneDomains(new Set());
    setRunningDomains(new Set());
    scrollBottom();

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: text, sessionId: sessionIdRef.current, language: lang }),
      });
      const data = await res.json() as { reply?: string; sessionId?: string; error?: string; demo?: boolean };
      if (data.sessionId) sessionIdRef.current = data.sessionId;

      const reply = data.reply ?? data.error ?? "No response received.";
      setMessages(prev => [...prev, { role: "agent", text: reply, language: lang }]);

      const code = extractGameCode(reply);
      if (code) {
        setGameCode(code);
        sessionStorage.setItem("hoos_game_code", code);
        sessionStorage.setItem("hoos_game_prompt", text);
        sessionStorage.setItem("hoos_game_engine", detectEngine(code));
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Network error";
      setMessages(prev => [...prev, { role: "agent", text: `⚠ ${msg}` }]);
    } finally {
      setLoading(false);
      setRunningDomains(new Set());
      // Mark all domains done
      setDoneDomains(new Set(DOMAIN_TIMELINE.map(d => d.domain)));
      scrollBottom();
    }
  }, [prompt, language, loading, scrollBottom, effectiveLang]);

  const handleKey = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendPrompt(); }
  };

  const agentsByDomain = agents.reduce<Record<string, AgentRow[]>>((acc, a) => {
    (acc[a.domain] ??= []).push(a);
    return acc;
  }, {});

  const domainOrder = ["Orchestration","Narrative","Mechanics","Physics","Animation","Art","Rendering","Level","Audio","UI","AI / NPC","QA","Deploy","Bridge"];

  const activeDomains = [...runningDomains].filter(d => !doneDomains.has(d));
  const currentDomainLabel = activeDomains.length > 0
    ? activeDomains.slice(0, 3).join(", ")
    : doneDomains.size > 0 ? "Finalizing…" : "";

  return (
    <div className="create-shell">

      {/* ══════════════════════ LEFT PANEL ══════════════════════ */}
      <div className="create-left">

        <div className="cr-header">
          <Link href="/" className="cr-logo">
            <div className="nl-icon" style={{ width: 28, height: 28, fontSize: 14 }}>🎮</div>
            <div className="nl-name" style={{ fontSize: 13 }}>HOOS GAMING</div>
          </Link>
          <span className="cr-badge">{agentsMock ? "DEMO" : "LIVE"} — IBM WxO</span>
        </div>

        <div className="cr-hero">
          <h1 className="cr-h1">
            Build a full game<br />
            with <span className="cr-grad">one prompt</span>
          </h1>
          <p className="cr-sub">
            78 specialized AI agents fire in parallel — physics, art,
            levels, AI, audio, and code — integrated into a playable game.
          </p>
        </div>

        <div className="cr-section-label">ENGINE / LANGUAGE</div>
        <div className="cr-lang-row">
          {LANGUAGES.map(l => (
            <button
              key={l.value}
              className={`cr-lang-btn${language === l.value ? " cr-lang-btn-active" : ""}`}
              onClick={() => setLanguage(l.value)}
            >
              <span className="cr-lang-icon">{l.icon}</span>
              <span className="cr-lang-label">{l.label}</span>
              <span className="cr-lang-hint">{l.hint}</span>
            </button>
          ))}
        </div>

        <div className="cr-section-label">EXAMPLE PROMPTS</div>
        <div className="cr-chips">
          {EXAMPLE_PROMPTS.map(p => (
            <button key={p} className="cr-chip cr-chip-btn" onClick={() => fillPrompt(p)}>{p}</button>
          ))}
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

        <div className="cr-section-label">YOUR PROMPT</div>
        <div className="cr-input-wrap" style={{ minHeight: 130 }}>
          <textarea
            ref={textareaRef}
            className="cr-textarea"
            rows={4}
            placeholder="Describe your game… (or click an example above)"
            value={prompt}
            onChange={e => setPrompt(e.target.value)}
            onKeyDown={handleKey}
            style={{ minHeight: 90 }}
          />
          <div className="cr-input-footer">
            <span className="cr-hint">ENTER to send · SHIFT+ENTER for newline</span>
            <button
              className="cr-send-btn"
              onClick={sendPrompt}
              disabled={!prompt.trim() || loading}
              aria-label="Send prompt"
            >
              {loading
                ? <span className="cr-send-spinner" />
                : <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="22" y1="2" x2="11" y2="13"/>
                    <polygon points="22 2 15 22 11 13 2 9 22 2"/>
                  </svg>
              }
            </button>
          </div>
        </div>

        {/* ── Agent Pipeline Panel ── */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 10 }}>
          <div className="cr-section-label" style={{ margin: 0 }}>
            IBM AGENT PIPELINE ({agents.length || 78})
          </div>
          <div style={{ display: "flex", gap: 6 }}>
            {loading && <span className="cr-pill cr-pill-run">⚡ BUILDING</span>}
            {!loading && doneDomains.size > 0 && <span className="cr-pill cr-pill-done">✓ COMPLETE</span>}
          </div>
        </div>

        {loading && currentDomainLabel && (
          <div style={{ padding: "3px 0 2px 14px", fontSize: 9, fontFamily: "var(--mono)", color: "var(--c1)" }}>
            Active: {currentDomainLabel}
          </div>
        )}

        <div className="cr-agent-list" style={{ maxHeight: 220, marginBottom: 8, overflowY: "auto", marginTop: 4 }}>
          {domainOrder.filter(d => agentsByDomain[d]).map(domain => {
            const isRunning = runningDomains.has(domain);
            const isDone    = doneDomains.has(domain);
            const col = DOMAIN_COLORS[domain] ?? "var(--muted)";
            return (
              <div key={domain}>
                <div style={{
                  padding: "3px 8px 3px 14px", fontSize: 8, fontFamily: "var(--mono)",
                  letterSpacing: "1.5px", textTransform: "uppercase",
                  color: col,
                  borderLeft: `2px solid ${col}`,
                  marginLeft: 14, marginTop: 5,
                  display: "flex", alignItems: "center", gap: 6,
                }}>
                  {domain}
                  {isRunning && <span style={{ background: col, color: "#000", fontSize: 7, padding: "1px 5px", borderRadius: 4, fontWeight: 700 }}>RUNNING</span>}
                  {isDone && !isRunning && <span style={{ color: "#10b981", fontSize: 7 }}>✓ done</span>}
                  <span style={{ marginLeft: "auto", color: "var(--muted)", fontSize: 7 }}>
                    {(agentsByDomain[domain] ?? []).length} agents
                  </span>
                </div>
                {(agentsByDomain[domain] ?? []).map((agent) => (
                  <div key={agent.id} className="cr-agent-row">
                    <div className={`cr-agent-dot ${isRunning ? "cr-dot-running" : isDone ? "cr-dot-done" : "cr-dot-queued"}`} />
                    <span className="cr-agent-name" style={{ fontSize: 9 }} title={agent.description}>
                      {agent.cleanName}
                    </span>
                    <div className="cr-agent-bar" style={{ flex: 1 }}>
                      <div
                        className="cr-agent-bar-fill"
                        style={{
                          width: isDone ? "100%" : isRunning ? `${40 + Math.random() * 40}%` : "0%",
                          background: isDone ? "#10b981" : isRunning ? col : undefined,
                          transition: isRunning ? "width 0.6s ease" : "width 0.3s",
                        }}
                      />
                    </div>
                    <span className={`cr-agent-status ${isRunning ? "cr-status-running" : isDone ? "cr-status-done" : "cr-status-queued"}`}
                      style={{ color: isRunning ? col : undefined }}>
                      {isRunning ? "running" : isDone ? "done" : "idle"}
                    </span>
                  </div>
                ))}
              </div>
            );
          })}
        </div>

        <div className="cr-footer-stats">
          <span>⚡ {agents.length || 78} agents</span>
          <span>🔗 14 domains</span>
          <span>🔊 sounds included</span>
          {agentsMock && <span style={{ color: "var(--c3)" }}>⚠ demo mode</span>}
        </div>
      </div>

      {/* ══════════════════════ RIGHT PANEL ══════════════════════ */}
      <div className="create-right" style={{ display: "flex", flexDirection: "column" }}>

        {/* Header */}
        <div className="cr-chat-header">
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div className="cr-chat-title">
              <span style={{ fontSize: 16 }}>🤖</span>
              <span>HOOS AI — IBM watsonx Orchestrate</span>
            </div>
            {gameCode && (
              <button onClick={() => router.push("/play")} className="play-game-btn">
                ▶ Play Game
              </button>
            )}
          </div>
          <div className="cr-chat-sub">
            {gameCode
              ? `✅ ${detectEngine(gameCode)} built — click Play Game to launch in-browser`
              : "Type a prompt → 78 IBM agents generate a complete, playable game with sounds"}
          </div>
        </div>

        {/* Conversation */}
        <div className="cr-convo" ref={convoRef}>
          {messages.length === 0 && !loading && (
            <div className="cr-preview-empty">
              <div className="cr-preview-icon">🎮</div>
              <div className="cr-preview-msg">WAITING FOR PROMPT</div>
              <div className="cr-preview-sub">
                Choose an engine above, type a game idea, and 78 agents will generate full playable game code with sounds
              </div>
            </div>
          )}

          {messages.map((msg, i) => {
            const code = msg.role === "agent" ? extractGameCode(msg.text) : null;
            const engine = code ? detectEngine(code) : null;
            return (
              <div key={i} className={`cr-msg cr-msg-${msg.role}`}>
                <div className="cr-msg-label">
                  {msg.role === "user" ? "YOU" : "HOOS AI"}
                </div>
                {msg.role === "agent" && code ? (
                  <div className="cr-msg-code-wrap">
                    <div className="cr-msg-code-badge">
                      <span>⚙ COMPLETE {engine} CODE ({code.length.toLocaleString()} chars)</span>
                      <button
                        className="cr-copy-btn"
                        onClick={() => navigator.clipboard.writeText(code)}
                      >
                        Copy
                      </button>
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
                <span style={{ marginLeft: 10, fontSize: 9, fontFamily: "var(--mono)", color: "var(--muted)" }}>
                  {currentDomainLabel
                    ? `${currentDomainLabel} agents running…`
                    : "IBM watsonx Orchestrate building your game…"}
                </span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
