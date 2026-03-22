"use client";

import { useState, useRef, useCallback } from "react";
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
  { name: "game_director",     domain: "Orchestration" },
  { name: "story_architect",   domain: "Narrative" },
  { name: "level_layout",      domain: "World" },
  { name: "color_palette",     domain: "Art" },
  { name: "physics_constants", domain: "Physics" },
  { name: "core_mechanics",    domain: "Gameplay" },
  { name: "npc_behavior_tree", domain: "AI / NPC" },
  { name: "music_composition", domain: "Audio" },
  { name: "hud_design",        domain: "UI / UX" },
  { name: "build_pipeline",    domain: "Deploy" },
];

type Message = { role: "user" | "agent"; text: string };

export default function CreatePage() {
  const [prompt, setPrompt]     = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading]   = useState(false);
  const textareaRef             = useRef<HTMLTextAreaElement>(null);
  const convoRef                = useRef<HTMLDivElement>(null);
  const sessionIdRef            = useRef<string | null>(null);

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
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Network error";
      setMessages(prev => [...prev, { role: "agent", text: `⚠ ${msg}` }]);
    } finally {
      setLoading(false);
      scrollBottom();
    }
  }, [prompt, loading, scrollBottom]);

  const handleKey = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendPrompt();
    }
  };

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
        <div className="cr-section-label">EXAMPLE PROMPTS</div>
        <div className="cr-chips">
          {EXAMPLE_PROMPTS.map((p) => (
            <button
              key={p}
              className="cr-chip cr-chip-btn"
              onClick={() => fillPrompt(p)}
            >
              {p}
            </button>
          ))}
        </div>

        {/* Recent builds */}
        <div className="cr-section-label">RECENT BUILDS</div>
        <div className="cr-builds">
          {RECENT_BUILDS.map((b) => (
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

        {/* Prompt input */}
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

        {/* Agent list */}
        <div className="cr-section-label">ACTIVE AGENTS</div>
        <div className="cr-agent-list" style={{ marginBottom: 12 }}>
          {MOCK_AGENTS.map((agent) => (
            <div key={agent.name} className="cr-agent-row">
              <div className={`cr-agent-dot ${loading ? "cr-dot-running" : "cr-dot-queued"}`} />
              <span className="cr-agent-name">{agent.name}</span>
              <span className="cr-agent-domain">{agent.domain}</span>
            </div>
          ))}
        </div>

        <div className="cr-footer-stats">
          <span>⚡ 56 agents</span>
          <span>🔗 14 bridges</span>
          <span>🎯 parallel</span>
        </div>
      </div>

      {/* ══════════════════════ RIGHT PANEL ══════════════════════ */}
      <div className="create-right" style={{ display: "flex", flexDirection: "column" }}>
        <div className="cr-chat-header">
          <div className="cr-chat-title">
            <span style={{ fontSize: 16 }}>🤖</span>
            <span>HOOS AI — Powered by IBM watsonx Orchestrate</span>
          </div>
          <div className="cr-chat-sub">Your game will appear here as agents build it</div>
        </div>

        <div className="cr-convo" ref={convoRef}>
          {messages.length === 0 && !loading && (
            <div className="cr-preview-empty">
              <div className="cr-preview-icon">🎮</div>
              <div className="cr-preview-msg">WAITING FOR PROMPT</div>
              <div className="cr-preview-sub">
                Type a game idea on the left and hit Send — 56 agents will fire in parallel
              </div>
            </div>
          )}

          {messages.map((msg, i) => (
            <div key={i} className={`cr-msg cr-msg-${msg.role}`}>
              <div className="cr-msg-label">
                {msg.role === "user" ? "YOU" : "HOOS AI"}
              </div>
              <div className="cr-msg-text">{msg.text}</div>
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
      </div>

    </div>
  );
}
