"use client";

import Link from "next/link";
import { WxoChatEmbed } from "@/components/WxoChatEmbed";

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

export default function CreatePage() {
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
            deployable game. Type your idea in the chat on the right to begin.
          </p>
        </div>

        {/* Example chips */}
        <div className="cr-section-label">EXAMPLE PROMPTS</div>
        <div className="cr-chips">
          {EXAMPLE_PROMPTS.map((p) => (
            <div key={p} className="cr-chip">{p}</div>
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

        {/* Agent list */}
        <div className="cr-section-label">ACTIVE AGENTS</div>
        <div className="cr-agent-list" style={{ marginBottom: 12 }}>
          {MOCK_AGENTS.map((agent) => (
            <div key={agent.name} className="cr-agent-row">
              <div className="cr-agent-dot cr-dot-queued" />
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

      {/* ══════════════════════ RIGHT PANEL — IBM WxO Chat ══════════════════════ */}
      <div className="create-right" style={{ display: "flex", flexDirection: "column" }}>
        <div className="cr-chat-header">
          <div className="cr-chat-title">
            <span style={{ fontSize: 16 }}>🤖</span>
            <span>HOOS AI — Powered by IBM watsonx Orchestrate</span>
          </div>
          <div className="cr-chat-sub">
            Describe your game and 56 agents will build it in parallel
          </div>
        </div>

        <div className="cr-chat-body">
          <WxoChatEmbed />
        </div>
      </div>

    </div>
  );
}
