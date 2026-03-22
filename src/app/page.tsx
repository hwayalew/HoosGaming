"use client";

import { useEffect } from "react";
import Link from "next/link";

export default function Home() {
  useEffect(() => {
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            e.target.classList.add("in");
            io.unobserve(e.target);
          }
        });
      },
      { threshold: 0.12 }
    );
    document.querySelectorAll(".reveal").forEach((el) => io.observe(el));

    const onScroll = () => {
      const nav = document.querySelector("nav");
      if (nav) {
        (nav as HTMLElement).style.background =
          window.scrollY > 60
            ? "rgba(10,14,26,.97)"
            : "rgba(10,14,26,.88)";
      }
    };
    window.addEventListener("scroll", onScroll);

    return () => {
      window.removeEventListener("scroll", onScroll);
      io.disconnect();
    };
  }, []);

  return (
    <>
      {/* ═══════ NAV ═══════ */}
      <nav>
        <Link href="/" className="nav-logo">
          <div className="nl-icon">🎮</div>
          <div>
            <div className="nl-name">HOOS GAMING</div>
          </div>
        </Link>
        <div className="nav-links">
          <a className="nl" href="#how">How It Works</a>
          <a className="nl" href="#agents">Agents</a>
          <a className="nl" href="#architecture">Architecture</a>
          <a className="nl" href="#workflow">Workflow</a>
        </div>
        <Link href="/create" className="nav-cta">
          Launch App →
        </Link>
      </nav>

      {/* ═══════ HERO ═══════ */}
      <section className="hero">
        <div className="hero-grid" />
        <div className="orb orb1" />
        <div className="orb orb2" />
        <div className="orb orb3" />

        <div className="container">
          <div className="hero-inner">
            <div className="hero-left">
              <h1 className="hero-h1">
                Build a full game<br />
                <span className="line2">
                  with <span className="grad">one prompt.</span>
                </span>
              </h1>
              <p className="hero-p">
                Hoos Gaming deploys <strong>56 specialized agents</strong> in
                parallel — each owning a distinct domain of game design — and
                integrates everything into a deployable, fully functional video
                game. Powered by IBM watsonx Orchestrate.
              </p>
              <div className="hero-btns">
                <Link href="/create" className="btn-primary">
                  Build Your Game →
                </Link>
                <a className="btn-ghost" href="#how">See How It Works</a>
              </div>
              <div className="hero-stats">
                <div className="hs">
                  <div className="hs-num">56</div>
                  <div className="hs-label">Specialized Agents</div>
                </div>
                <div className="hs">
                  <div className="hs-num">14</div>
                  <div className="hs-label">Integration Bridges</div>
                </div>
                <div className="hs">
                  <div className="hs-num">13</div>
                  <div className="hs-label">Game Domains</div>
                </div>
                <div className="hs">
                  <div className="hs-num">&lt;5m</div>
                  <div className="hs-label">Avg Build Time</div>
                </div>
              </div>
            </div>

            <div className="hero-right">
              <div className="orbit-stage">
                <div className="ring r1" />
                <div className="ring r2" />
                <div className="ring r3" />

                <div className="onode on1a" style={{ transform: "translate(-50%,-50%) translateY(-100px)" }}>
                  ⚡<div className="onode-label">Physics</div>
                </div>
                <div className="onode on1b" style={{ transform: "translate(50%,-50%) translateX(100px)" }}>
                  🎨<div className="onode-label">Art</div>
                </div>
                <div className="onode on1c" style={{ transform: "translate(-50%,-50%) translateY(100px)" }}>
                  🎵<div className="onode-label">Audio</div>
                </div>
                <div className="onode on1d" style={{ transform: "translate(-50%,-50%) translateX(-100px)" }}>
                  🗺️<div className="onode-label">Levels</div>
                </div>
                <div className="onode on2a" style={{ top: "12%", left: "68%", transform: "translate(-50%,-50%)" }}>
                  🤖<div className="onode-label">AI/NPC</div>
                </div>
                <div className="onode on2b" style={{ top: "62%", right: "6%", transform: "translate(50%,-50%)" }}>
                  🖥️<div className="onode-label">UI/UX</div>
                </div>
                <div className="onode on2c" style={{ bottom: "10%", left: "28%", transform: "translate(-50%,50%)" }}>
                  🔧<div className="onode-label">Systems</div>
                </div>
                <div className="onode on2d" style={{ top: "28%", left: "4%", transform: "translate(-50%,-50%)" }}>
                  🚀<div className="onode-label">Deploy</div>
                </div>

                <div className="orbit-core">
                  <div className="core-label">GAME<br />DIRECTOR</div>
                  <div className="core-sub">AI</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ═══════ HOW IT WORKS ═══════ */}
      <section className="how" id="how">
        <div className="container">
          <div className="section-head reveal">
            <div className="sh-pre">The Process</div>
            <h2 className="sh-h2">
              How Hoos Gaming <span>builds your game</span>
            </h2>
            <p className="sh-p">
              A single natural language prompt triggers a four-layer pipeline
              that decomposes, parallelizes, integrates, and deploys your game
              end-to-end.
            </p>
          </div>

          <div className="pipeline">
            {/* Step 1 */}
            <div className="pipe-step reveal">
              <div className="ps-content">
                <span className="ps-num" style={{ color: "var(--c6)" }}>STEP 01</span>
                <span className="ps-icon">💬</span>
                <div className="ps-title">You describe your game</div>
                <div className="ps-desc">
                  Type a natural language description — genre, art style,
                  mechanics, tone, anything. Hoos Gaming accepts everything from
                  &quot;dark fantasy 2D side-scroller with boss fights&quot; to
                  &quot;cute puzzle platformer for mobile.&quot; No code
                  required, no forms to fill out.
                </div>
                <div className="ps-tags">
                  <span className="tag tag-cyan">Natural Language</span>
                  <span className="tag tag-purple">Any Genre</span>
                  <span className="tag tag-pink">2D or 3D</span>
                </div>
              </div>
              <div className="ps-center">
                <div className="pipe-node">💬</div>
                <div className="pipe-arrow" />
              </div>
              <div />
            </div>

            {/* Step 2 */}
            <div className="pipe-step reveal reveal-d1">
              <div />
              <div className="ps-center">
                <div className="pipe-arrow" />
                <div className="pipe-node">🧠</div>
                <div className="pipe-arrow" />
              </div>
              <div className="ps-content">
                <span className="ps-num" style={{ color: "var(--c4)" }}>STEP 02</span>
                <span className="ps-icon">🧠</span>
                <div className="ps-title">Game Director decomposes the prompt</div>
                <div className="ps-desc">
                  The <strong>Game Director AI</strong> — the master
                  orchestration agent — classifies your game, builds a
                  structured game spec object, and uses the{" "}
                  <strong>Task Decomposition Engine</strong> and{" "}
                  <strong>Dependency Graph Builder</strong> to map every required
                  task. The <strong>Agent Scheduler</strong> then fires all
                  agents in the optimal sequence.
                </div>
                <div className="ps-tags">
                  <span className="tag tag-purple">game_director</span>
                  <span className="tag tag-purple">task_decomposition_engine</span>
                  <span className="tag tag-purple">agent_scheduler</span>
                </div>
              </div>
            </div>

            {/* Step 3 */}
            <div className="pipe-step reveal reveal-d2">
              <div className="ps-content">
                <span className="ps-num" style={{ color: "var(--c1)" }}>STEP 03</span>
                <span className="ps-icon">⚡</span>
                <div className="ps-title">44 domain agents run in parallel</div>
                <div className="ps-desc">
                  Every game domain runs simultaneously — physics while art
                  while audio while level design while AI behavior while UI
                  while deployment config. Each agent reads from the Shared
                  Context Store and writes its structured output back, so every
                  domain produces real, usable artifacts: JSON configs, shader
                  code, sprite specs, behavior trees, SFX manifests.
                </div>
                <div className="ps-tags">
                  <span className="tag tag-pink">44 Parallel Agents</span>
                  <span className="tag tag-yellow">Shared Context Store</span>
                  <span className="tag tag-orange">Structured Outputs</span>
                </div>
              </div>
              <div className="ps-center">
                <div className="pipe-arrow" />
                <div className="pipe-node">⚡</div>
                <div className="pipe-arrow" />
              </div>
              <div />
            </div>

            {/* Step 4 */}
            <div className="pipe-step reveal reveal-d3">
              <div />
              <div className="ps-center">
                <div className="pipe-arrow" />
                <div className="pipe-node">🔗</div>
                <div className="pipe-arrow" />
              </div>
              <div className="ps-content">
                <span className="ps-num" style={{ color: "var(--c5)" }}>STEP 04</span>
                <span className="ps-icon">🔗</span>
                <div className="ps-title">14 integration bridges wire it all together</div>
                <div className="ps-desc">
                  The most critical layer — <strong>integration bridges</strong>{" "}
                  run continuously and catch conflicts that would break the game.
                  The Physics-Animation Bridge syncs hitbox sizes to rig scale.
                  The Art-to-Code Bridge propagates palette tokens to shader
                  uniforms. The Level-Gameplay Bridge validates every quest
                  objective is geometrically reachable. No more silent
                  mismatches.
                </div>
                <div className="ps-tags">
                  <span className="tag tag-pink">14 Integration Bridges</span>
                  <span className="tag tag-cyan">Conflict Detection</span>
                  <span className="tag tag-purple">Auto Resolution</span>
                </div>
              </div>
            </div>

            {/* Step 5 */}
            <div className="pipe-step reveal reveal-d4">
              <div className="ps-content">
                <span className="ps-num" style={{ color: "var(--c3)" }}>STEP 05</span>
                <span className="ps-icon">✅</span>
                <div className="ps-title">Validation, merge &amp; build</div>
                <div className="ps-desc">
                  The <strong>Schema Validator</strong> gates every agent output
                  before it enters the game state. The{" "}
                  <strong>Conflict Resolver</strong> autonomously resolves
                  contradictions using a priority ruleset (no circular
                  dependencies). The <strong>Master Code Merge</strong> assembles
                  a lint-checked, import-resolved codebase. The{" "}
                  <strong>Build Pipeline</strong> packages it for your target
                  platform.
                </div>
                <div className="ps-tags">
                  <span className="tag tag-yellow">schema_validator</span>
                  <span className="tag tag-yellow">conflict_resolver</span>
                  <span className="tag tag-yellow">master_code_merge</span>
                </div>
              </div>
              <div className="ps-center">
                <div className="pipe-arrow" />
                <div className="pipe-node">✅</div>
                <div className="pipe-arrow" />
              </div>
              <div />
            </div>

            {/* Step 6 */}
            <div className="pipe-step reveal reveal-d5">
              <div />
              <div className="ps-center">
                <div className="pipe-arrow" />
                <div className="pipe-node">🚀</div>
              </div>
              <div className="ps-content">
                <span className="ps-num" style={{ color: "var(--c1)" }}>STEP 06</span>
                <span className="ps-icon">🚀</span>
                <div className="ps-title">Live game + modify anytime</div>
                <div className="ps-desc">
                  Your playable game appears in seconds. A second{" "}
                  <strong>Modification Chatbot</strong> accepts live change
                  requests — &quot;make gravity heavier&quot;, &quot;change the
                  palette to blue tones&quot;, &quot;add more enemies&quot;. The{" "}
                  <strong>Change Router</strong> identifies the minimum affected
                  agents (not all 56) and hot-reloads only what changed. No full
                  rebuild required.
                </div>
                <div className="ps-tags">
                  <span className="tag tag-orange">modification_chatbot</span>
                  <span className="tag tag-orange">change_router</span>
                  <span className="tag tag-orange">Hot Reload</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ═══════ THE 56 AGENTS ═══════ */}
      <section className="agents-section" id="agents">
        <div className="container">
          <div className="section-head reveal">
            <div className="sh-pre">The Agent Orchestra</div>
            <h2 className="sh-h2">
              56 agents across <span>13 domains</span>
            </h2>
            <p className="sh-p">
              Every agent owns a narrow, well-scoped contract — a defined input
              schema, a defined output schema, and a single domain of
              responsibility. This is what makes true parallelism possible.
            </p>
          </div>

          <div className="domains-grid">
            <div className="domain-card reveal" style={{ "--accent-col": "var(--c6)" } as React.CSSProperties}>
              <div className="dc-head">
                <div className="dc-icon">⚙️</div>
                <div className="dc-name">Orchestration</div>
                <div className="dc-count">7 agents</div>
              </div>
              <div className="dc-agents">
                <div className="dca"><div className="dca-dot" style={{ background: "var(--c6)" }} />game_director — Master orchestrator</div>
                <div className="dca"><div className="dca-dot" style={{ background: "var(--c6)" }} />genre_scope_analyst — Classifies game type</div>
                <div className="dca"><div className="dca-dot" style={{ background: "var(--c6)" }} />task_decomposition_engine — Builds task manifest</div>
                <div className="dca"><div className="dca-dot" style={{ background: "var(--c6)" }} />dependency_graph_builder — Maps agent DAG</div>
                <div className="dca"><div className="dca-dot" style={{ background: "var(--c6)" }} />agent_scheduler — Fires &amp; monitors agents</div>
                <div className="dca"><div className="dca-dot" style={{ background: "var(--c6)" }} />modification_chatbot — Live change requests</div>
                <div className="dca"><div className="dca-dot" style={{ background: "var(--c6)" }} />change_router — Minimum affected set</div>
              </div>
            </div>

            <div className="domain-card reveal reveal-d1" style={{ "--accent-col": "var(--c1)" } as React.CSSProperties}>
              <div className="dc-head">
                <div className="dc-icon">📖</div>
                <div className="dc-name">Concept &amp; Narrative</div>
                <div className="dc-count">4 agents</div>
              </div>
              <div className="dc-agents">
                <div className="dca"><div className="dca-dot" style={{ background: "var(--c1)" }} />story_architect — Story structure &amp; lore</div>
                <div className="dca"><div className="dca-dot" style={{ background: "var(--c1)" }} />character_design — Character manifest &amp; stats</div>
                <div className="dca"><div className="dca-dot" style={{ background: "var(--c1)" }} />dialogue_script — Branching dialogue trees</div>
                <div className="dca"><div className="dca-dot" style={{ background: "var(--c1)" }} />economy_design — Currency &amp; reward loops</div>
              </div>
            </div>

            <div className="domain-card reveal reveal-d2" style={{ "--accent-col": "var(--c2)" } as React.CSSProperties}>
              <div className="dc-head">
                <div className="dc-icon">🗺️</div>
                <div className="dc-name">World &amp; Level Design</div>
                <div className="dc-count">4 agents</div>
              </div>
              <div className="dc-agents">
                <div className="dca"><div className="dca-dot" style={{ background: "var(--c2)" }} />world_bible — World rules &amp; geography</div>
                <div className="dca"><div className="dca-dot" style={{ background: "var(--c2)" }} />level_layout — Room graphs &amp; pacing</div>
                <div className="dca"><div className="dca-dot" style={{ background: "var(--c2)" }} />procedural_terrain — Dungeon seed generation</div>
                <div className="dca"><div className="dca-dot" style={{ background: "var(--c2)" }} />spawn_events — Enemy &amp; item placement</div>
              </div>
            </div>

            <div className="domain-card reveal" style={{ "--accent-col": "var(--c3)" } as React.CSSProperties}>
              <div className="dc-head">
                <div className="dc-icon">🎨</div>
                <div className="dc-name">Art &amp; Visual</div>
                <div className="dc-count">4 agents</div>
              </div>
              <div className="dc-agents">
                <div className="dca"><div className="dca-dot" style={{ background: "var(--c3)" }} />color_palette — Hex token system per zone</div>
                <div className="dca"><div className="dca-dot" style={{ background: "var(--c3)" }} />art_direction — Visual style guide</div>
                <div className="dca"><div className="dca-dot" style={{ background: "var(--c3)" }} />sprite_mesh_gen — Sprite sheets / 3D meshes</div>
                <div className="dca"><div className="dca-dot" style={{ background: "var(--c3)" }} />texture_material — Surface materials &amp; maps</div>
              </div>
            </div>

            <div className="domain-card reveal reveal-d1" style={{ "--accent-col": "var(--c4)" } as React.CSSProperties}>
              <div className="dc-head">
                <div className="dc-icon">💡</div>
                <div className="dc-name">Rendering</div>
                <div className="dc-count">4 agents</div>
              </div>
              <div className="dc-agents">
                <div className="dca"><div className="dca-dot" style={{ background: "var(--c4)" }} />lighting_design — Light sources &amp; baking</div>
                <div className="dca"><div className="dca-dot" style={{ background: "var(--c4)" }} />shader_writing — GLSL/HLSL shaders</div>
                <div className="dca"><div className="dca-dot" style={{ background: "var(--c4)" }} />post_processing — Bloom, vignette, LUTs</div>
                <div className="dca"><div className="dca-dot" style={{ background: "var(--c4)" }} />particle_systems — Combat &amp; FX emitters</div>
              </div>
            </div>

            <div className="domain-card reveal reveal-d2" style={{ "--accent-col": "var(--c1)" } as React.CSSProperties}>
              <div className="dc-head">
                <div className="dc-icon">⚡</div>
                <div className="dc-name">Physics</div>
                <div className="dc-count">4 agents</div>
              </div>
              <div className="dc-agents">
                <div className="dca"><div className="dca-dot" style={{ background: "var(--c1)" }} />physics_constants — Gravity, friction, timestep</div>
                <div className="dca"><div className="dca-dot" style={{ background: "var(--c1)" }} />collision_system — AABB &amp; layer matrix</div>
                <div className="dca"><div className="dca-dot" style={{ background: "var(--c1)" }} />rigidbody_forces — Mass &amp; force profiles</div>
                <div className="dca"><div className="dca-dot" style={{ background: "var(--c1)" }} />ragdoll_cloth — Soft-body physics</div>
              </div>
            </div>

            <div className="domain-card reveal" style={{ "--accent-col": "var(--c5)" } as React.CSSProperties}>
              <div className="dc-head">
                <div className="dc-icon">🎭</div>
                <div className="dc-name">Animation</div>
                <div className="dc-count">4 agents</div>
              </div>
              <div className="dc-agents">
                <div className="dca"><div className="dca-dot" style={{ background: "var(--c5)" }} />keyframe_animation — Clip manifest</div>
                <div className="dca"><div className="dca-dot" style={{ background: "var(--c5)" }} />rigging_skinning — Bone hierarchy</div>
                <div className="dca"><div className="dca-dot" style={{ background: "var(--c5)" }} />animation_state_machine — FSM transitions</div>
                <div className="dca"><div className="dca-dot" style={{ background: "var(--c5)" }} />procedural_animation — IK &amp; secondary motion</div>
              </div>
            </div>

            <div className="domain-card reveal reveal-d1" style={{ "--accent-col": "var(--c2)" } as React.CSSProperties}>
              <div className="dc-head">
                <div className="dc-icon">🕹️</div>
                <div className="dc-name">Gameplay &amp; Mechanics</div>
                <div className="dc-count">4 agents</div>
              </div>
              <div className="dc-agents">
                <div className="dca"><div className="dca-dot" style={{ background: "var(--c2)" }} />core_mechanics — Rules, loops, win/loss</div>
                <div className="dca"><div className="dca-dot" style={{ background: "var(--c2)" }} />player_controller — Movement &amp; actions</div>
                <div className="dca"><div className="dca-dot" style={{ background: "var(--c2)" }} />progression_system — XP &amp; skill trees</div>
                <div className="dca"><div className="dca-dot" style={{ background: "var(--c2)" }} />quest_mission — Objectives &amp; rewards</div>
              </div>
            </div>

            <div className="domain-card reveal reveal-d2" style={{ "--accent-col": "var(--c4)" } as React.CSSProperties}>
              <div className="dc-head">
                <div className="dc-icon">🤖</div>
                <div className="dc-name">AI &amp; NPC</div>
                <div className="dc-count">4 agents</div>
              </div>
              <div className="dc-agents">
                <div className="dca"><div className="dca-dot" style={{ background: "var(--c4)" }} />npc_behavior_tree — Behavior trees</div>
                <div className="dca"><div className="dca-dot" style={{ background: "var(--c4)" }} />pathfinding — A* NavMesh generation</div>
                <div className="dca"><div className="dca-dot" style={{ background: "var(--c4)" }} />boss_combat_ai — Phase &amp; attack patterns</div>
                <div className="dca"><div className="dca-dot" style={{ background: "var(--c4)" }} />crowd_simulation — Flocking &amp; ambient NPCs</div>
              </div>
            </div>

            <div className="domain-card reveal" style={{ "--accent-col": "var(--c3)" } as React.CSSProperties}>
              <div className="dc-head">
                <div className="dc-icon">🎵</div>
                <div className="dc-name">Audio</div>
                <div className="dc-count">4 agents</div>
              </div>
              <div className="dc-agents">
                <div className="dca"><div className="dca-dot" style={{ background: "var(--c3)" }} />music_composition — Adaptive OST</div>
                <div className="dca"><div className="dca-dot" style={{ background: "var(--c3)" }} />sound_effects — Full SFX manifest</div>
                <div className="dca"><div className="dca-dot" style={{ background: "var(--c3)" }} />spatial_audio — 3D reverb &amp; occlusion</div>
                <div className="dca"><div className="dca-dot" style={{ background: "var(--c3)" }} />voice_script — VO direction &amp; TTS</div>
              </div>
            </div>

            <div className="domain-card reveal reveal-d1" style={{ "--accent-col": "var(--c1)" } as React.CSSProperties}>
              <div className="dc-head">
                <div className="dc-icon">🖥️</div>
                <div className="dc-name">UI / UX + Systems</div>
                <div className="dc-count">8 agents</div>
              </div>
              <div className="dc-agents">
                <div className="dca"><div className="dca-dot" style={{ background: "var(--c1)" }} />hud_design — HUD layout &amp; data bindings</div>
                <div className="dca"><div className="dca-dot" style={{ background: "var(--c1)" }} />menu_system — All screens &amp; navigation</div>
                <div className="dca"><div className="dca-dot" style={{ background: "var(--c1)" }} />accessibility — A11y compliance audit</div>
                <div className="dca"><div className="dca-dot" style={{ background: "var(--c1)" }} />localization — i18n string extraction</div>
                <div className="dca"><div className="dca-dot" style={{ background: "var(--c1)" }} />save_state — Serialization &amp; checkpoints</div>
                <div className="dca"><div className="dca-dot" style={{ background: "var(--c1)" }} />input_mapping — KB / gamepad / touch</div>
                <div className="dca"><div className="dca-dot" style={{ background: "var(--c1)" }} />multiplayer_netcode — Rollback networking</div>
                <div className="dca"><div className="dca-dot" style={{ background: "var(--c1)" }} />analytics_telemetry — Event schema</div>
              </div>
            </div>

            <div className="domain-card reveal reveal-d2" style={{ "--accent-col": "var(--c6)" } as React.CSSProperties}>
              <div className="dc-head">
                <div className="dc-icon">🚀</div>
                <div className="dc-name">QA &amp; Deployment</div>
                <div className="dc-count">7 agents</div>
              </div>
              <div className="dc-agents">
                <div className="dca"><div className="dca-dot" style={{ background: "var(--c6)" }} />bug_detection — Static analysis &amp; schema checks</div>
                <div className="dca"><div className="dca-dot" style={{ background: "var(--c6)" }} />performance_profiler — FPS &amp; memory audit</div>
                <div className="dca"><div className="dca-dot" style={{ background: "var(--c6)" }} />lod_culling — LOD &amp; occlusion rules</div>
                <div className="dca"><div className="dca-dot" style={{ background: "var(--c6)" }} />playtesting_simulation — Bot playtest runs</div>
                <div className="dca"><div className="dca-dot" style={{ background: "var(--c6)" }} />build_pipeline — CI/CD config</div>
                <div className="dca"><div className="dca-dot" style={{ background: "var(--c6)" }} />platform_targeting — Per-platform adaption</div>
                <div className="dca"><div className="dca-dot" style={{ background: "var(--c6)" }} />store_submission — App store packages</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ═══════ INTEGRATION BRIDGES ═══════ */}
      <section className="bridges" id="bridges">
        <div className="container">
          <div className="section-head reveal">
            <div className="sh-pre">The Secret Weapon</div>
            <h2 className="sh-h2">
              14 Integration Bridges that <span>never sleep</span>
            </h2>
            <p className="sh-p">
              Most multi-agent systems fail because outputs conflict silently.
              Integration bridges run continuously and catch every contradiction
              before it reaches the build.
            </p>
          </div>
          <div className="bridges-grid">
            <div className="bridge-card reveal">
              <div className="bc-icon">🎨</div>
              <div>
                <div className="bc-name">art_to_code_bridge</div>
                <div className="bc-desc">
                  Watches color_palette and art_direction. When either updates,
                  propagates changes to all shader uniforms, CSS variables,
                  material files, and particle color curves — automatically.
                </div>
              </div>
            </div>
            <div className="bridge-card reveal reveal-d1">
              <div className="bc-icon">⚡</div>
              <div>
                <div className="bc-name">physics_animation_bridge</div>
                <div className="bc-desc">
                  When gravity changes, recalculates jump arc heights for
                  keyframes, ragdoll joint limits, IK reach distances, and root
                  motion playback speed — keeping visual feel in sync with
                  physics.
                </div>
              </div>
            </div>
            <div className="bridge-card reveal reveal-d2">
              <div className="bc-icon">🗺️</div>
              <div>
                <div className="bc-name">level_gameplay_bridge</div>
                <div className="bc-desc">
                  Validates every quest objective is geometrically reachable. Are
                  all spawn points accessible? Do locked doors have key items in
                  the spawn manifest? Flags unreachable objectives as blockers.
                </div>
              </div>
            </div>
            <div className="bridge-card reveal reveal-d3">
              <div className="bc-icon">📖</div>
              <div>
                <div className="bc-name">narrative_mechanics_bridge</div>
                <div className="bc-desc">
                  Wires every story flag from dialogue choices to a gameplay
                  consequence. Validates no story flag is written without a
                  handler, and no handler waits on an undefined flag.
                </div>
              </div>
            </div>
            <div className="bridge-card reveal">
              <div className="bc-icon">🎵</div>
              <div>
                <div className="bc-name">audio_event_bridge</div>
                <div className="bc-desc">
                  Maps every gameplay event to one or more SFX triggers with
                  priority and interrupt rules. Also maps zone transitions to
                  adaptive music layer changes. No event is silent unless
                  intentional.
                </div>
              </div>
            </div>
            <div className="bridge-card reveal reveal-d1">
              <div className="bc-icon">🖥️</div>
              <div>
                <div className="bc-name">ui_state_bridge</div>
                <div className="bc-desc">
                  Binds every HUD element to a live game state variable. Health
                  bar, ammo counter, score, quest tracker — each bound with
                  update frequency, interpolation mode, and visibility
                  conditions.
                </div>
              </div>
            </div>
            <div className="bridge-card reveal reveal-d2">
              <div className="bc-icon">📦</div>
              <div>
                <div className="bc-name">asset_registry_bridge</div>
                <div className="bc-desc">
                  Assigns a canonical UUID to every asset the first time
                  it&apos;s declared. Detects when multiple agents reference the
                  same logical asset under different names. Prevents all broken
                  references.
                </div>
              </div>
            </div>
            <div className="bridge-card reveal reveal-d3">
              <div className="bc-icon">✅</div>
              <div>
                <div className="bc-name">schema_validator + conflict_resolver</div>
                <div className="bc-desc">
                  schema_validator gates every write to the shared context store.
                  conflict_resolver autonomously resolves contradictions using a
                  4-rule priority system — no circular dependencies, no
                  game_director back-reference needed.
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ═══════ ARCHITECTURE ═══════ */}
      <section className="arch" id="architecture">
        <div className="container">
          <div className="section-head reveal">
            <div className="sh-pre">System Architecture</div>
            <h2 className="sh-h2">
              Four layers, <span>one pipeline</span>
            </h2>
            <p className="sh-p">
              The full execution graph runs on IBM watsonx Orchestrate&apos;s
              agentic workflow engine — wired as a single
              game_creation_pipeline with fan-out parallelism and fan-in bridge
              gates.
            </p>
          </div>

          <div className="arch-diagram reveal">
            <div className="arch-layers">
              <div className="arch-layer">
                <div className="al-label">Layer 1 — Command &amp; Orchestration (Sequential)</div>
                <div className="al-nodes">
                  <div className="aln aln-orch pulse">START</div>
                  <div className="aln aln-orch">game_director</div>
                  <div className="aln aln-orch">genre_scope_analyst</div>
                  <div className="aln aln-orch">task_decomposition_engine</div>
                  <div className="aln aln-orch">dependency_graph_builder</div>
                  <div className="aln aln-orch pulse">agent_scheduler</div>
                </div>
              </div>

              <div className="arch-arrow-row">
                ↓ parallel fan-out — all 44 domain agents fire simultaneously
              </div>

              <div className="arch-layer">
                <div className="al-label">Layer 2 — 44 Domain Agents (All Parallel)</div>
                <div className="al-nodes">
                  <div className="aln aln-domain">story_architect</div>
                  <div className="aln aln-domain">character_design</div>
                  <div className="aln aln-domain">dialogue_script</div>
                  <div className="aln aln-domain">economy_design</div>
                  <div className="aln aln-domain">world_bible</div>
                  <div className="aln aln-domain">level_layout</div>
                  <div className="aln aln-domain">procedural_terrain</div>
                  <div className="aln aln-domain">spawn_events</div>
                  <div className="aln aln-domain">color_palette</div>
                  <div className="aln aln-domain">art_direction</div>
                  <div className="aln aln-domain">sprite_mesh_gen</div>
                  <div className="aln aln-domain">texture_material</div>
                  <div className="aln aln-domain">lighting_design</div>
                  <div className="aln aln-domain">shader_writing</div>
                  <div className="aln aln-domain">post_processing</div>
                  <div className="aln aln-domain">particle_systems</div>
                  <div className="aln aln-domain">physics_constants</div>
                  <div className="aln aln-domain">collision_system</div>
                  <div className="aln aln-domain">rigidbody_forces</div>
                  <div className="aln aln-domain">ragdoll_cloth</div>
                  <div className="aln aln-domain">keyframe_animation</div>
                  <div className="aln aln-domain">rigging_skinning</div>
                  <div className="aln aln-domain">animation_state_machine</div>
                  <div className="aln aln-domain">procedural_animation</div>
                  <div className="aln aln-domain">core_mechanics</div>
                  <div className="aln aln-domain">player_controller</div>
                  <div className="aln aln-domain">progression_system</div>
                  <div className="aln aln-domain">quest_mission</div>
                  <div className="aln aln-domain">npc_behavior_tree</div>
                  <div className="aln aln-domain">pathfinding</div>
                  <div className="aln aln-domain">boss_combat_ai</div>
                  <div className="aln aln-domain">crowd_simulation</div>
                  <div className="aln aln-domain">music_composition</div>
                  <div className="aln aln-domain">sound_effects</div>
                  <div className="aln aln-domain">hud_design</div>
                  <div className="aln aln-domain">save_state</div>
                  <div className="aln aln-domain">input_mapping</div>
                  <div className="aln aln-domain">analytics_telemetry</div>
                  <div className="aln aln-domain">bug_detection</div>
                  <div className="aln aln-domain">performance_profiler</div>
                  <div className="aln aln-domain">…+4 more</div>
                </div>
              </div>

              <div className="arch-arrow-row">
                ↓ fan-in — bridges wait for all upstream agents
              </div>

              <div className="arch-layer">
                <div className="al-label">Layer 3 — 14 Integration Bridges (Continuous)</div>
                <div className="al-nodes">
                  <div className="aln aln-bridge">art_to_code_bridge</div>
                  <div className="aln aln-bridge">physics_animation_bridge</div>
                  <div className="aln aln-bridge">level_gameplay_bridge</div>
                  <div className="aln aln-bridge">narrative_mechanics_bridge</div>
                  <div className="aln aln-bridge">audio_event_bridge</div>
                  <div className="aln aln-bridge">ui_state_bridge</div>
                  <div className="aln aln-bridge">asset_registry_bridge</div>
                  <div className="aln aln-bridge">platform_build_bridge</div>
                  <div className="aln aln-bridge">localization_ui_bridge</div>
                  <div className="aln aln-bridge">analytics_design_bridge</div>
                  <div className="aln aln-bridge pulse">schema_validator</div>
                  <div className="aln aln-bridge pulse">conflict_resolver</div>
                </div>
              </div>

              <div className="arch-arrow-row">↓ sequential final chain</div>

              <div className="arch-layer">
                <div className="al-label">Layer 4 — Build &amp; Deploy (Sequential)</div>
                <div className="al-nodes">
                  <div className="aln aln-deploy">master_code_merge</div>
                  <div className="aln aln-deploy">build_pipeline</div>
                  <div className="aln aln-deploy">platform_targeting</div>
                  <div className="aln aln-deploy">store_submission</div>
                  <div className="aln aln-deploy pulse">END → deployable game</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ═══════ IBM WORKFLOW ═══════ */}
      <section className="workflow" id="workflow">
        <div className="container">
          <div className="section-head reveal">
            <div className="sh-pre">IBM watsonx Orchestrate</div>
            <h2 className="sh-h2">
              Two workflows, <span>zero code</span> to run
            </h2>
            <p className="sh-p">
              The entire 56-agent system is built as two named agentic workflows
              in IBM watsonx Orchestrate — importable, testable, and deployable
              from the GUI.
            </p>
          </div>
          <div className="wf-grid">
            <div className="wf-pipeline reveal">
              <div className="wfp-step">
                <div className="wfp-left">
                  <div className="wfp-dot" style={{ borderColor: "var(--c6)", background: "rgba(107,159,212,.12)", color: "var(--c6)" }}>1</div>
                  <div className="wfp-line" style={{ background: "linear-gradient(to bottom,var(--c6),var(--c2))", opacity: 0.25 }} />
                </div>
                <div className="wfp-content">
                  <div className="wfp-title" style={{ color: "var(--c6)" }}>game_creation_pipeline</div>
                  <div className="wfp-desc">
                    The main workflow. Sequential setup → parallel fan-out to all
                    44 domain agents → integration bridge fan-in → validation
                    chain → build. Triggered once per game prompt.
                  </div>
                  <div className="wfp-agents">
                    <span className="wfa">START</span>
                    <span className="wfa">game_director</span>
                    <span className="wfa">agent_scheduler</span>
                    <span className="wfa">→ 44 parallel</span>
                    <span className="wfa">→ 14 bridges</span>
                    <span className="wfa">END</span>
                  </div>
                </div>
              </div>
              <div className="wfp-step">
                <div className="wfp-left">
                  <div className="wfp-dot" style={{ borderColor: "var(--c2)", background: "rgba(138,174,208,.1)", color: "var(--c2)" }}>2</div>
                  <div className="wfp-line" style={{ background: "linear-gradient(to bottom,var(--c2),var(--c1))", opacity: 0.25 }} />
                </div>
                <div className="wfp-content">
                  <div className="wfp-title" style={{ color: "var(--c2)" }}>modification_pipeline</div>
                  <div className="wfp-desc">
                    The live-change workflow. modification_chatbot parses intent
                    → change_router identifies minimum affected set → only those
                    agents re-run → hot reload. Never a full rebuild.
                  </div>
                  <div className="wfp-agents">
                    <span className="wfa">modification_chatbot</span>
                    <span className="wfa">change_router</span>
                    <span className="wfa">Branch node</span>
                    <span className="wfa">affected only</span>
                    <span className="wfa">hot reload</span>
                  </div>
                </div>
              </div>
              <div className="wfp-step">
                <div className="wfp-left">
                  <div className="wfp-dot" style={{ borderColor: "var(--c1)", background: "rgba(229,114,0,.1)", color: "var(--c1)" }}>3</div>
                </div>
                <div className="wfp-content">
                  <div className="wfp-title" style={{ color: "var(--c1)" }}>Collaborators &amp; Agent Hierarchy</div>
                  <div className="wfp-desc">
                    game_director has all 56 agents as collaborators — it can
                    reason about and delegate to any of them dynamically. Leaf
                    agents have no collaborators; they are the endpoints that
                    produce structured outputs.
                  </div>
                  <div className="wfp-agents">
                    <span className="wfa">59 collaborators</span>
                    <span className="wfa">change_router: 62</span>
                    <span className="wfa">30 leaf agents</span>
                  </div>
                </div>
              </div>
            </div>
            <div className="wf-right reveal reveal-d1">
              <div className="wfr-card">
                <div className="wfr-title">Agent Definition Pattern</div>
                <div className="wfr-desc">
                  Every agent follows this exact structure in IBM watsonx
                  Orchestrate. The <code>instructions</code> field is the system
                  prompt that makes it domain-specific and forces structured JSON
                  output.
                </div>
                <div className="wfr-code">
                  <span className="code-k">from</span> ibm_watsonx_orchestrate.agent_builder.agents{" "}
                  <span className="code-k">import</span> Agent<br />
                  <br />
                  color_palette_agent = Agent(<br />
                  &nbsp;&nbsp;<span className="code-s">name</span>=
                  <span className="code-s">&quot;color_palette&quot;</span>,<br />
                  &nbsp;&nbsp;<span className="code-s">model</span>=
                  <span className="code-s">&quot;ibm/granite-3-8b-instruct&quot;</span>,<br />
                  &nbsp;&nbsp;<span className="code-s">description</span>=
                  <span className="code-s">&quot;Defines canonical color system…&quot;</span>,<br />
                  &nbsp;&nbsp;<span className="code-s">instructions</span>=
                  <span className="code-s">
                    &quot;Output only JSON: &#123;zones, ui, characters&#125;&quot;
                  </span>,<br />
                  &nbsp;&nbsp;<span className="code-s">tools</span>=[
                  <span className="code-s">&quot;read_context_store&quot;</span>,{" "}
                  <span className="code-s">&quot;write_context_store&quot;</span>]<br />
                  )
                </div>
              </div>
              <div className="wfr-card">
                <div className="wfr-title">Shared Context Store</div>
                <div className="wfr-desc">
                  Every agent reads from and writes to a single versioned JSON
                  schema — the Shared Context Store. This is what makes
                  parallelism possible without collision: each agent owns a
                  distinct path (e.g. <code>art.palette</code>,{" "}
                  <code>physics.constants</code>) and the Schema Validator gates
                  every write.
                </div>
              </div>
              <div className="wfr-card">
                <div className="wfr-title">Circular Dependency Fix</div>
                <div className="wfr-desc">
                  conflict_resolver uses Option 2 — fully self-contained with a
                  4-rule priority system (genre conformance → dependency priority
                  → conservative preference → NEEDS_HUMAN_REVIEW). No
                  back-reference to game_director needed, no circular dependency
                  error.
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ═══════ FEATURES ═══════ */}
      <section className="features" id="features">
        <div className="container">
          <div className="section-head reveal">
            <div className="sh-pre">What Makes This Different</div>
            <h2 className="sh-h2">
              Not a wrapper. <span>A full pipeline.</span>
            </h2>
            <p className="sh-p">
              Hoos Gaming isn&apos;t prompting a single AI for code. It&apos;s a
              production-grade multi-agent system with conflict detection,
              dependency graphs, and integration validation.
            </p>
          </div>
          <div className="feat-grid">
            <div className="feat-card reveal">
              <div className="feat-icon" style={{ background: "rgba(138,174,208,.1)", border: "1px solid rgba(138,174,208,.2)" }}>⚡</div>
              <div className="feat-title">True Parallel Execution</div>
              <div className="feat-desc">
                All 44 domain agents fire simultaneously via IBM
                Orchestrate&apos;s agentic workflow fan-out. Physics, art, audio,
                and AI systems all build at the same time — not one after
                another.
              </div>
            </div>
            <div className="feat-card reveal reveal-d1">
              <div className="feat-icon" style={{ background: "rgba(229,114,0,.1)", border: "1px solid rgba(229,114,0,.25)" }}>🔗</div>
              <div className="feat-title">Integration-First Design</div>
              <div className="feat-desc">
                14 dedicated integration bridges run continuously catching silent
                conflicts — palette tokens that don&apos;t match shader uniforms,
                level geometry that makes quests unreachable, physics constants
                that break animations.
              </div>
            </div>
            <div className="feat-card reveal reveal-d2">
              <div className="feat-icon" style={{ background: "rgba(245,166,35,.08)", border: "1px solid rgba(245,166,35,.2)" }}>✏️</div>
              <div className="feat-title">Live Modification</div>
              <div className="feat-desc">
                The Modification Chatbot routes change requests to only the
                minimum affected agents via the Change Router. &quot;Make gravity
                heavier&quot; re-runs 4 agents, not 56. Changes hot-reload to the
                live canvas in under 10 seconds.
              </div>
            </div>
            <div className="feat-card reveal">
              <div className="feat-icon" style={{ background: "rgba(107,159,212,.1)", border: "1px solid rgba(107,159,212,.22)" }}>🏗️</div>
              <div className="feat-title">Structured Output Contracts</div>
              <div className="feat-desc">
                Every agent has a declared input schema and output schema. The
                Schema Validator gates every write. No agent can produce
                malformed data that silently breaks downstream agents.
              </div>
            </div>
            <div className="feat-card reveal reveal-d1">
              <div className="feat-icon" style={{ background: "rgba(229,114,0,.1)", border: "1px solid rgba(229,114,0,.25)" }}>🚀</div>
              <div className="feat-title">Full Deployment Pipeline</div>
              <div className="feat-desc">
                Not just code generation — the system includes CI/CD pipeline
                config, platform targeting (web, desktop, mobile, console), store
                submission packages, and live ops infrastructure for post-launch.
              </div>
            </div>
            <div className="feat-card reveal reveal-d2">
              <div className="feat-icon" style={{ background: "rgba(138,174,208,.1)", border: "1px solid rgba(138,174,208,.2)" }}>🤖</div>
              <div className="feat-title">Bot Playtesting</div>
              <div className="feat-desc">
                The playtesting_simulation agent runs automated bot playtests —
                exercising all level paths for reachability, all quest branches
                for completability, and combat difficulty curves — before any
                human plays the game.
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ═══════ IBM SECTION ═══════ */}
      <section className="ibm-section">
        <div className="container">
          <div className="ibm-inner">
            <div className="ibm-left reveal">
              <span className="tag tag-cyan">Powered by</span>
              <h2>Built on IBM watsonx Orchestrate</h2>
              <p>
                Hoos Gaming uses IBM watsonx Orchestrate&apos;s agentic workflow
                engine as its execution backbone — giving us deterministic
                parallel scheduling, native agent-to-agent collaboration, and
                GUI-based workflow management without writing orchestration logic
                from scratch.
              </p>
              <div className="ibm-features">
                <div className="ibmf">
                  <div className="ibmf-icon">📊</div>Agentic Workflows with
                  fan-out parallelism and fan-in gating across all 56 agents
                </div>
                <div className="ibmf">
                  <div className="ibmf-icon">🔧</div>Native collaborator
                  assignments — game_director delegates to all 56 agents
                  dynamically
                </div>
                <div className="ibmf">
                  <div className="ibmf-icon">🧱</div>IBM Granite 3 models
                  (granite-3-8b-instruct) powering every domain agent
                </div>
                <div className="ibmf">
                  <div className="ibmf-icon">🌐</div>OpenAPI tool integration
                  for the Shared Context Store read/write operations
                </div>
                <div className="ibmf">
                  <div className="ibmf-icon">⚙️</div>GUI-based workflow canvas —
                  no extra orchestration code, just nodes and edges
                </div>
              </div>
            </div>
            <div className="ibm-right reveal reveal-d1">
              <div className="terminal-top">
                <div className="t-btn r" />
                <div className="t-btn y" />
                <div className="t-btn g" />
              </div>
              <div className="cmd">$ orchestrate agents import --all</div>
              <div className="ok">✓ 56 agents imported successfully</div>
              <div className="cmd">$ orchestrate tools import -f context_store_tools.py</div>
              <div className="ok">✓ read_context_store registered</div>
              <div className="ok">✓ write_context_store registered</div>
              <div className="cmd">
                $ orchestrate tools import -f game_creation_pipeline.py --kind
                flow
              </div>
              <div className="ok">✓ workflow registered: game_creation_pipeline</div>
              <div className="cmd">$ workflow run game_creation_pipeline \</div>
              <div className="dim">
                &nbsp;&nbsp;--input &quot;dark fantasy 2D side-scroller&quot;
              </div>
              <div className="run">⟳ START → game_director → agent_scheduler</div>
              <div className="run">⟳ fan-out: 44 agents firing in parallel…</div>
              <div className="ok">✓ color_palette [done] → art.palette</div>
              <div className="ok">✓ physics_constants [done] → physics.constants</div>
              <div className="ok">✓ story_architect [done] → narrative.story</div>
              <div className="run">⟳ art_to_code_bridge [syncing…]</div>
              <div className="run">⟳ schema_validator [gating…]</div>
              <div className="ok">✓ master_code_merge [done]</div>
              <div className="ok">✓ build_pipeline [done] → game ready 🎮</div>
            </div>
          </div>
        </div>
      </section>

      {/* ═══════ CTA ═══════ */}
      <section className="cta">
        <div className="container">
          <div className="cta-inner reveal">
            <span className="tag tag-purple">Ready to Build</span>
            <h2>
              Your game.<br />
              <span>One prompt away.</span>
            </h2>
            <p>
              Type a description. Watch 56 agents build your game in parallel.
              Modify it live. Deploy it anywhere.
            </p>
            <div className="cta-btns">
              <Link href="/create" className="btn-primary">
                Launch Hoos Gaming →
              </Link>
              <a className="btn-ghost" href="#how">Learn More</a>
            </div>
            <div className="cta-stats">
              <div className="cs">
                <div className="cs-num">56</div>
                <div className="cs-label">Total Agents</div>
              </div>
              <div className="cs">
                <div className="cs-num">14</div>
                <div className="cs-label">Integration Bridges</div>
              </div>
              <div className="cs">
                <div className="cs-num">13</div>
                <div className="cs-label">Game Domains</div>
              </div>
              <div className="cs">
                <div className="cs-num">2D/3D</div>
                <div className="cs-label">Any Dimension</div>
              </div>
              <div className="cs">
                <div className="cs-num">∞</div>
                <div className="cs-label">Game Genres</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ═══════ FOOTER ═══════ */}
      <footer>
        <div className="container">
          <div className="footer-inner">
            <Link href="/" className="footer-left" style={{ textDecoration: "none", color: "inherit" }}>
              <div className="nl-icon" style={{ width: 28, height: 28, fontSize: 14 }}>🎮</div>
              <div>
                <div className="nl-name" style={{ fontSize: 12 }}>HOOS GAMING</div>
              </div>
            </Link>
            <div className="footer-right">
              Built with IBM watsonx Orchestrate<br />
              56 agents · 14 bridges · 13 domains
            </div>
          </div>
        </div>
      </footer>
    </>
  );
}
