"use client";

import { useState, useRef } from "react";
import Link from "next/link";

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

const MOCK_AGENTS = [
  { name: "game_director",            domain: "Orchestration" },
  { name: "story_architect",          domain: "Narrative" },
  { name: "level_layout",             domain: "World" },
  { name: "color_palette",            domain: "Art" },
  { name: "physics_constants",        domain: "Physics" },
  { name: "core_mechanics",           domain: "Gameplay" },
  { name: "npc_behavior_tree",        domain: "AI / NPC" },
  { name: "music_composition",        domain: "Audio" },
  { name: "hud_design",               domain: "UI / UX" },
  { name: "build_pipeline",           domain: "Deploy" },
];

type Message = { role: "user" | "agent"; text: string };

export default function CreatePage() {
  const [prompt, setPrompt]           = useState("");
  const [messages, setMessages]       = useState<Message[]>([]);
  const [loading, setLoading]         = useState(false);
  const [error, setError]             = useState<string | null>(null);
  const [sessionId, setSessionId]     = useState<string | null>(null);
  const [agentPct, setAgentPct]       = useState<number[]>([]);
  const textareaRef                   = useRef<HTMLTextAreaElement>(null);
  const intervalRef                   = useRef<ReturnType<typeof setInterval> | null>(null);
  const responseRef                   = useRef<HTMLDivElement>(null);

  function fillPrompt(text: string) {
    setPrompt(text);
    textareaRef.current?.focus();
  }

  function startAgentAnim() {
    if (intervalRef.current) clearInterval(intervalRef.current);
    setAgentPct(MOCK_AGENTS.map(() => Math.floor(Math.random() * 15)));
    intervalRef.current = setInterval(() => {
      setAgentPct((prev) => {
        const next = prev.map((p) => Math.min(100, p + Math.floor(Math.random() * 10 + 3)));
        if (next.every((p) => p >= 100)) clearInterval(intervalRef.current!);
        return next;
      });
    }, 500);
  }

  async function handleSend() {
    const text = prompt.trim();
    if (!text || loading) return;

    setError(null);
    setLoading(true);
    setPrompt("");
    startAgentAnim();

    const userMsg: Message = { role: "user", text };
    setMessages((prev) => [...prev, userMsg]);

    // Scroll response panel into view
    setTimeout(() => responseRef.current?.scrollIntoView({ behavior: "smooth" }), 100);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: text, sessionId }),
      });

      const data = await res.json();

      if (!res.ok || data.error) {
        setError(data.error ?? `Request failed (${res.status})`);
        setMessages((prev) => [...prev, { role: "agent", text: `⚠ ${data.error ?? "Unknown error"}` }]);
      } else {
        setSessionId(data.sessionId);
        setMessages((prev) => [...prev, { role: "agent", text: data.reply }]);
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setError(msg);
      setMessages((prev) => [...prev, { role: "agent", text: `⚠ ${msg}` }]);
    } finally {
      setLoading(false);
    }
  }

  const runningCount = agentPct.filter((p) => p > 0 && p < 100).length;
  const doneCount    = agentPct.filter((p) => p >= 100).length;
  const queuedCount  = MOCK_AGENTS.length - runningCount - doneCount;
  const hasConvo     = messages.length > 0;

  return (
    <div className="create-shell">

      {/* ══════════════════════ LEFT PANEL ══════════════════════ */}
      <div className="create-left">

        {/* Header */}
        <div className="cr-header">
          <Link href="/" className="cr-logo">
            <div className="nl-icon" style={{ width: 28, height: 28, fontSize: 14 }}>🎮</div>
            <div className="nl-name" style={{ fontSize: 13 }}>HOOS GAMING</div>
          </Link>
        </div>

        {/* Hero */}
        <div className="cr-hero">
          <h1 className="cr-h1">
            Build a full game<br />
            with <span className="cr-grad">one prompt</span>
          </h1>
          <p className="cr-sub">
            56 specialized AI agents fire in parallel — handling physics, art,
            levels, AI, audio, and code — then integrate everything into a
            deployable game.
          </p>
        </div>

        {/* Example chips */}
        <div className="cr-section-label">TRY ONE OF THESE</div>
        <div className="cr-chips">
          {EXAMPLE_PROMPTS.map((p) => (
            <button key={p} className="cr-chip" onClick={() => fillPrompt(p)}>
              {p}
            </button>
          ))}
        </div>

        {/* Recent builds */}
        <div className="cr-section-label">RECENT BUILDS</div>
        <div className="cr-builds">
          {RECENT_BUILDS.map((b) => (
            <button key={b.name} className="cr-build-card" onClick={() => fillPrompt(b.name)}>
              <div className="cr-build-thumb" style={{ background: b.bg }}>
                <span className="cr-build-dim">{b.dim}</span>
              </div>
              <div className="cr-build-info">
                <div className="cr-build-name">{b.name}</div>
                <div className="cr-build-meta">{b.dim} · {b.agents} agents · {b.time}</div>
              </div>
            </button>
          ))}
        </div>

        {/* Input */}
        <div className="cr-section-label">DESCRIBE YOUR GAME</div>
        <div className="cr-input-wrap">
          <textarea
            ref={textareaRef}
            className="cr-textarea"
            placeholder="e.g. A dark fantasy 2D side-scroller with pixel art, rogue-like dungeons, and epic boss fights..."
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) handleSend(); }}
            rows={4}
          />
          <div className="cr-input-footer">
            <span className="cr-hint">⌘↵ to send</span>
            <button
              className="cr-send-btn"
              onClick={handleSend}
              disabled={!prompt.trim() || loading}
              title="Build Game"
            >
              {loading ? (
                <span className="cr-send-spinner" />
              ) : (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="22" y1="2" x2="11" y2="13" /><polygon points="22 2 15 22 11 13 2 9 22 2" />
                </svg>
              )}
            </button>
          </div>
        </div>

        {error && (
          <div className="cr-error">
            ⚠ {error}
            {error.includes("WXO_API_KEY") && (
              <div className="cr-error-hint">Add your IBM API key to <code>.env.local</code> then restart the server.</div>
            )}
          </div>
        )}

        <div className="cr-footer-stats">
          <span>⚡ 56 agents</span>
          <span>🔗 14 bridges</span>
          <span>🎯 parallel</span>
        </div>
      </div>

      {/* ══════════════════════ RIGHT PANEL ══════════════════════ */}
      <div className="create-right" ref={responseRef}>
        {!hasConvo ? (
          <div className="cr-preview-empty">
            <div className="cr-preview-icon">🎮</div>
            <div className="cr-preview-msg">YOUR GAME WILL APPEAR HERE</div>
            <div className="cr-preview-sub">Describe your game on the left and click send</div>
          </div>
        ) : (
          <div className="cr-building">
            {/* Conversation */}
            <div className="cr-convo">
              {messages.map((m, i) => (
                <div key={i} className={`cr-msg cr-msg-${m.role}`}>
                  <div className="cr-msg-label">{m.role === "user" ? "YOU" : "HOOS AI"}</div>
                  <div className="cr-msg-text">{m.text}</div>
                </div>
              ))}
              {loading && (
                <div className="cr-msg cr-msg-agent">
                  <div className="cr-msg-label">HOOS AI</div>
                  <div className="cr-msg-thinking">
                    <span /><span /><span />
                  </div>
                </div>
              )}
            </div>

            {/* Agent orchestra */}
            {agentPct.length > 0 && (
              <div className="cr-orchestra">
                <div className="cr-orch-header">
                  <span className="cr-orch-title">AGENT ORCHESTRA</span>
                  <div className="cr-orch-pills">
                    <span className="cr-pill cr-pill-run">⟳ {runningCount} running</span>
                    <span className="cr-pill cr-pill-done">✓ {doneCount} done</span>
                    <span className="cr-pill cr-pill-queue">⧖ {queuedCount} queued</span>
                  </div>
                </div>
                <div className="cr-agent-list">
                  {MOCK_AGENTS.map((agent, i) => {
                    const pct    = agentPct[i] ?? 0;
                    const status = pct >= 100 ? "done" : pct > 0 ? "running" : "queued";
                    return (
                      <div key={agent.name} className="cr-agent-row">
                        <div className={`cr-agent-dot cr-dot-${status}`} />
                        <span className="cr-agent-name">{agent.name}</span>
                        <span className="cr-agent-domain">{agent.domain}</span>
                        <div className="cr-agent-bar">
                          <div className="cr-agent-bar-fill" style={{ width: `${pct}%` }} />
                        </div>
                        <span className={`cr-agent-status cr-status-${status}`}>{status}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

    </div>
  );
}
