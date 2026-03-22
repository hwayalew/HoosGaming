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
];

const RECENT_BUILDS = [
  { name: "Ashenveil Chronicles", dim: "2D", agents: 56, time: "4m 22s", bg: "linear-gradient(135deg,#1a1240,#3b1a6e)" },
  { name: "Neon Void Runner",     dim: "3D", agents: 51, time: "5m 58s", bg: "linear-gradient(135deg,#0d1f33,#1a3a5c)" },
  { name: "Crystal Maze",         dim: "2D", agents: 44, time: "3m 15s", bg: "linear-gradient(135deg,#0d2b1a,#0f4a2e)" },
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

interface AgentRow {
  id: string;
  name: string;
  cleanName: string;
  domain: string;
  description: string;
}

type Message = { role: "user" | "agent"; text: string };

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
<script src="https://cdn.jsdelivr.net/npm/phaser@3.60.0/dist/phaser.min.js"></script>
<script>${jsBlock[1]}</script></body></html>`;
  }
  return null;
}

export default function CreatePage() {
  const router = useRouter();
  const [prompt, setPrompt]         = useState("");
  const [messages, setMessages]     = useState<Message[]>([]);
  const [loading, setLoading]       = useState(false);
  const [agents, setAgents]         = useState<AgentRow[]>([]);
  const [runningIdx, setRunningIdx] = useState<number | null>(null);
  const [doneIdxs, setDoneIdxs]    = useState<Set<number>>(new Set());
  const [gameCode, setGameCode]     = useState<string | null>(null);
  const [agentsMock, setAgentsMock] = useState(false);
  const textareaRef                 = useRef<HTMLTextAreaElement>(null);
  const convoRef                    = useRef<HTMLDivElement>(null);
  const sessionIdRef                = useRef<string | null>(null);
  const doneRef                     = useRef<Set<number>>(new Set());

  // Fetch real agents on mount
  useEffect(() => {
    fetch("/api/agents")
      .then(r => r.json())
      .then((d: { agents: AgentRow[]; mock?: boolean }) => {
        setAgents(d.agents ?? []);
        setAgentsMock(d.mock ?? false);
      })
      .catch(() => {});
  }, []);

  // Animate agents during loading
  useEffect(() => {
    if (!loading || agents.length === 0) {
      setRunningIdx(null);
      return;
    }
    doneRef.current = new Set();
    setDoneIdxs(new Set());
    let i = 0;
    const iv = setInterval(() => {
      setRunningIdx(i % agents.length);
      doneRef.current = new Set([...doneRef.current, i % agents.length]);
      setDoneIdxs(new Set(doneRef.current));
      i++;
    }, 350);
    return () => clearInterval(iv);
  }, [loading, agents.length]);

  const scrollBottom = useCallback(() => {
    setTimeout(() => {
      if (convoRef.current) convoRef.current.scrollTop = convoRef.current.scrollHeight;
    }, 40);
  }, []);

  const fillPrompt = useCallback((text: string) => {
    setPrompt(text);
    textareaRef.current?.focus();
  }, []);

  const sendPrompt = useCallback(async () => {
    const text = prompt.trim();
    if (!text || loading) return;

    setMessages(prev => [...prev, { role: "user", text }]);
    setPrompt("");
    setLoading(true);
    setGameCode(null);
    setDoneIdxs(new Set());
    scrollBottom();

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: text, sessionId: sessionIdRef.current }),
      });
      const data = await res.json() as { reply?: string; sessionId?: string; error?: string };
      if (data.sessionId) sessionIdRef.current = data.sessionId;

      const reply = data.reply ?? data.error ?? "No response received.";
      setMessages(prev => [...prev, { role: "agent", text: reply }]);

      // Extract and store game code
      const code = extractGameCode(reply);
      if (code) {
        setGameCode(code);
        sessionStorage.setItem("hoos_game_code", code);
        sessionStorage.setItem("hoos_game_prompt", text);
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Network error";
      setMessages(prev => [...prev, { role: "agent", text: `⚠ ${msg}` }]);
    } finally {
      setLoading(false);
      setRunningIdx(null);
      scrollBottom();
    }
  }, [prompt, loading, scrollBottom]);

  const handleKey = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendPrompt(); }
  };

  const playGame = () => {
    router.push("/play");
  };

  const agentsByDomain = agents.reduce<Record<string, AgentRow[]>>((acc, a) => {
    (acc[a.domain] ??= []).push(a);
    return acc;
  }, {});

  const domainOrder = ["Orchestration","Narrative","Mechanics","Physics","Animation","Art","Rendering","Level","Audio","UI","AI / NPC","QA","Deploy","Bridge"];

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
            56 specialized AI agents fire in parallel — physics, art,
            levels, AI, audio, and code — integrated into a playable game.
          </p>
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

        {/* ── Agent Orchestra Panel ── */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 10 }}>
          <div className="cr-section-label" style={{ margin: 0 }}>ACTIVE AGENTS ({agents.length})</div>
          <div style={{ display: "flex", gap: 6 }}>
            {loading && <span className="cr-pill cr-pill-run">⚡ BUILDING</span>}
            {!loading && doneIdxs.size > 0 && <span className="cr-pill cr-pill-done">✓ COMPLETE</span>}
          </div>
        </div>

        <div className="cr-agent-list" style={{ maxHeight: 200, marginBottom: 8, overflowY: "auto", marginTop: 6 }}>
          {domainOrder.filter(d => agentsByDomain[d]).map(domain => (
            <div key={domain}>
              <div style={{
                padding: "3px 14px", fontSize: 8, fontFamily: "var(--mono)",
                letterSpacing: "1.5px", textTransform: "uppercase",
                color: DOMAIN_COLORS[domain] ?? "var(--muted)",
                borderLeft: `2px solid ${DOMAIN_COLORS[domain] ?? "var(--muted)"}`,
                marginLeft: 14, marginTop: 4,
              }}>
                {domain}
              </div>
              {agentsByDomain[domain].map((agent, _i) => {
                const globalIdx = agents.indexOf(agent);
                const isRunning = loading && runningIdx === globalIdx;
                const isDone    = !loading && doneIdxs.has(globalIdx);
                return (
                  <div key={agent.id} className="cr-agent-row">
                    <div className={`cr-agent-dot ${isRunning ? "cr-dot-running" : isDone ? "cr-dot-done" : "cr-dot-queued"}`} />
                    <span className="cr-agent-name" style={{ fontSize: 9 }} title={agent.description}>
                      {agent.cleanName}
                    </span>
                    <span className="cr-agent-domain" style={{ color: DOMAIN_COLORS[domain] ?? "var(--muted)", fontSize: 7.5 }}>
                      {domain}
                    </span>
                    <div className="cr-agent-bar">
                      <div className="cr-agent-bar-fill" style={{ width: isDone ? "100%" : isRunning ? "60%" : "0%" }} />
                    </div>
                    <span className={`cr-agent-status ${isRunning ? "cr-status-running" : isDone ? "cr-status-done" : "cr-status-queued"}`}>
                      {isRunning ? "running" : isDone ? "done" : "idle"}
                    </span>
                  </div>
                );
              })}
            </div>
          ))}
        </div>

        <div className="cr-footer-stats">
          <span>⚡ {agents.length || 56} agents</span>
          <span>🔗 14 bridges</span>
          <span>🎯 parallel</span>
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
              <button onClick={playGame} className="play-game-btn">
                ▶ Play Game
              </button>
            )}
          </div>
          <div className="cr-chat-sub">
            {gameCode
              ? "✅ Game built — click Play Game to launch it"
              : "Your game code will appear here. 56 agents generate full Phaser 3 HTML5 code."}
          </div>
        </div>

        {/* Conversation */}
        <div className="cr-convo" ref={convoRef}>
          {messages.length === 0 && !loading && (
            <div className="cr-preview-empty">
              <div className="cr-preview-icon">🎮</div>
              <div className="cr-preview-msg">WAITING FOR PROMPT</div>
              <div className="cr-preview-sub">
                Type a game idea on the left — 56 agents will generate full Phaser 3 game code
              </div>
            </div>
          )}

          {messages.map((msg, i) => (
            <div key={i} className={`cr-msg cr-msg-${msg.role}`}>
              <div className="cr-msg-label">
                {msg.role === "user" ? "YOU" : "HOOS AI"}
              </div>
              {msg.role === "agent" && extractGameCode(msg.text) ? (
                <div className="cr-msg-code-wrap">
                  <div className="cr-msg-code-badge">
                    <span>⚙ COMPLETE PHASER 3 GAME CODE</span>
                    <button
                      className="cr-copy-btn"
                      onClick={() => navigator.clipboard.writeText(extractGameCode(msg.text) ?? "")}
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
          ))}

          {loading && (
            <div className="cr-msg cr-msg-agent">
              <div className="cr-msg-label">HOOS AI</div>
              <div className="cr-msg-thinking">
                <span /><span /><span />
                <span style={{ marginLeft: 8, fontSize: 9, fontFamily: "var(--mono)", color: "var(--muted)" }}>
                  {agents.length > 0 && runningIdx !== null
                    ? `${agents[runningIdx]?.cleanName ?? "agents"} running…`
                    : "generating game code…"}
                </span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
