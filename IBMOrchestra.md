# IBM watsonx Orchestrate — Full Agent Reference & AI/Data Science Guide

> **Hoos Gaming's multi-agent AI pipeline: 78 specialized agents across 14 domains, orchestrated by IBM watsonx Orchestrate, transforming a single text prompt into a playable HTML5 game.**

**Instance ID:** `c8a9d776-460e-4c9a-b55f-0a2556febf8e`  
**Region:** `us-south`  
**Base URL:** `https://api.us-south.watson-orchestrate.cloud.ibm.com/instances/c8a9d776-460e-4c9a-b55f-0a2556febf8e`  
**Underlying LLM:** Meta Llama 3 70B Instruct (via IBM watsonx.ai)

---

## Why This Is AI & Data Science

Hoos Gaming is not a chatbot. It is a **data-driven AI software engineering pipeline** — a system where:

1. **78 AI agents** each hold a narrow, well-scoped contract: defined input schema, defined output schema, and a single domain of expertise
2. **Agents communicate through structured data** — JSON manifests, code artifacts, dependency graphs — not free-form text
3. **A real-time completion classifier** (`isGameComplete()`) acts as a binary ML decision: does this output satisfy all structural invariants? If not, trigger another inference pass
4. **LLM prompt engineering** injects code skeletons and feature checklists to force reproducible, structured outputs — this is applied machine learning for code generation
5. **IBM watsonx Orchestrate** provides the runtime for multi-agent scheduling, parallel domain execution, thread memory, and result aggregation

This architecture directly mirrors production AI/Data Science pipelines at IBM, where specialized models each handle one part of a complex inference task, with an orchestration layer coordinating the flow.

---

## Hackathon Track Alignment: Best AI & Data Science

### How Every Required Criterion Is Met

**"Meaningful use of AI"**
Every game is generated 100% by AI. The user types one sentence. No templates, no Mad Libs, no rule-based generation — the Llama 3 70B LLM reasons about the game concept and writes syntactically valid, runnable JavaScript or Python code from scratch.

**"IBM AI platform integration"**
Deep integration with IBM watsonx Orchestrate:
- Real API calls to `POST /v1/orchestrate/runs` for every game
- IAM authentication flow with module-level token caching (TTL: 55 minutes)
- Thread continuity via `thread_id` for multi-pass generation and follow-up modifications
- Agent registry via `GET /v1/orchestrate/agents` consumed by the UI for the live pipeline animation

**"Multi-agent / multi-model architecture"**
14 domain pipelines run with dependency gating — Orchestration must complete before Narrative; Physics must complete before Rendering. Bridge agents run throughout to translate data between incompatible schemas. This is a genuine heterogeneous multi-agent system.

**"Data science methodology"**
- `isGameComplete()` is a rule-based classifier operating on code structure (AST brace balance, bootstrap call detection, HTML closure) — analogous to a model scoring output completeness
- System prompts are engineered with few-shot code skeleton injection to bias the distribution of LLM outputs toward structurally valid games
- Completion rate, pass count, and char count are tracked per generation and surfaced in the UI
- `assembleChunks()` implements a merge algorithm that handles boundary conditions (duplicate headers, premature closures) — data pipeline thinking applied to LLM output

**"Real-world problem"**
Game development requires 6+ specialized disciplines (code, art, audio, narrative, level design, QA). A solo developer needs months. Hoos Gaming collapses this to 90 seconds by parallelizing 78 AI specialists.

---

## Authentication

```bash
# Get Bearer token (valid 1 hour, cached 55 min in app)
curl -X POST https://iam.cloud.ibm.com/identity/token \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "grant_type=urn:ibm:params:oauth:grant-type:apikey&apikey=<WXO_MANAGER_API_KEY>"
# → { access_token, expires_in: 3600, token_type: "Bearer" }

# List all agents
curl "${BASE_URL}/v1/orchestrate/agents" \
  -H "Authorization: Bearer <token>"

# Start a run (AskOrchestrate — no agent_id)
curl -X POST "${BASE_URL}/v1/orchestrate/runs" \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"message":{"role":"user","content":"<system prompt + user prompt>"}}'
# → { thread_id, run_id }

# Poll status
curl "${BASE_URL}/v1/orchestrate/runs/<run_id>" \
  -H "Authorization: Bearer <token>"
# → { status: "running" | "completed" | "failed" }

# Fetch reply
curl "${BASE_URL}/v1/orchestrate/threads/<thread_id>/messages" \
  -H "Authorization: Bearer <token>"
# → [{ role: "assistant", content: [{ text: "..." }] }]
```

---

## How to Recreate This Instance

### Step 1 — IBM Cloud Setup
1. Create account at [cloud.ibm.com](https://cloud.ibm.com)
2. Navigate to **Catalog → AI / Machine Learning → watsonx Orchestrate**
3. Provision an instance (Plus or Enterprise tier for multi-agent support)
4. Note your Instance ID from the dashboard

### Step 2 — API Keys
1. **Manage → Access (IAM) → API Keys → Create**
2. Assign the key **Manager** role on your watsonx Orchestrate instance
3. Store as `WXO_MANAGER_API_KEY` environment variable

### Step 3 — Create Each Agent via REST

```bash
POST ${BASE_URL}/v1/orchestrate/agents
Authorization: Bearer <token>
Content-Type: application/json

{
  "name": "game_director",
  "description": "Central orchestrator for the 78-agent game creation pipeline",
  "instructions": "You are the game director. You receive a game specification and coordinate all domain agents to produce a complete, playable HTML5 game. You decompose the spec into domain tasks, schedule agents in dependency order, and merge their outputs.",
  "tools": ["task_decomposition_engine", "agent_scheduler", "master_code_merge"],
  "model": "meta-llama/llama-3-70b-instruct"
}
```

Repeat for all 78 agents below, wiring each with the `tools` array specifying which downstream agents they can invoke.

---

## Agent Domains Summary

| # | Domain | Agents | Primary Function |
|---|---|---|---|
| 1 | **Orchestration** | 13 | Pipeline coordination, task routing, conflict resolution, performance analysis |
| 2 | **Narrative** | 6 | Story, world-building, characters, quests, spawn events |
| 3 | **Mechanics** | 7 | Gameplay rules, player systems, input, economy, accessibility |
| 4 | **Physics** | 4 | Collision, forces, constants, ragdoll simulation |
| 5 | **Animation** | 4 | State machines, keyframes, procedural motion, rigging |
| 6 | **Art** | 4 | Color palettes, sprite/mesh generation, textures, art direction |
| 7 | **Rendering** | 4 | Shaders, lighting, particles, post-processing |
| 8 | **Level** | 2 | Level layout, procedural terrain generation |
| 9 | **Audio** | 4 | Music composition, SFX, spatial audio, voice |
| 10 | **UI** | 3 | HUD, menus, localization |
| 11 | **AI/NPC** | 4 | Behavior trees, pathfinding, boss AI, crowd simulation |
| 12 | **QA** | 5 | Performance testing, bug detection, LOD, playtesting, analytics |
| 13 | **Deploy** | 4 | Build pipeline, platform targeting, store metadata, live ops |
| 14 | **Bridge** | 10 | Cross-domain data translation and schema synchronization |
| | **Total** | **78** | |

---

## Domain 1: Orchestration (13 agents)

The coordination layer. These agents decompose prompts, schedule domain agents, merge outputs, and validate the pipeline. This is the **AI/Data Science core** — a dependency graph executor with conflict arbitration.

---

### `game_director`
**Role:** Entry point for the entire 78-agent pipeline  
**AI Contribution:** Uses LLM reasoning to parse natural language game specs into structured domain tasks. Applies in-context learning from the game spec to assign the right agents in the right order.  
**Tools:** `task_decomposition_engine`, `agent_scheduler`, `master_code_merge`  
**Note:** IBM routing: use `AskOrchestrate` (no `agent_id`) for reliability.

---

### `task_decomposition_engine`
**Role:** Break complex game specs into discrete, assignable subtasks  
**AI Contribution:** Zero-shot task graph generation from natural language — transforms "2D dark fantasy side-scroller with 3 boss fights" into a structured JSON DAG of ~40 subtasks across 14 domains.  
**Input:** Natural language game spec  
**Output:** Task dependency graph `{ tasks: [{ id, domain, dependsOn, spec }] }`

---

### `agent_scheduler`
**Role:** Parallel and sequential agent execution engine  
**AI Contribution:** Applies topological sort to the task DAG to identify parallelizable workstreams (Art and Audio are independent; Physics must precede Rendering). Manages retry logic with exponential backoff.  
**Input:** Task DAG  
**Output:** Execution schedule + orchestration signals

---

### `agent_dependency_graph_builder`
**Role:** Construct and validate inter-agent DAGs  
**AI Contribution:** Validates that no circular dependencies exist between domain agents. Identifies the critical path for minimum build time. Outputs the theoretical minimum end-to-end latency.  
**Output:** Dependency DAG (JSON) + critical path analysis

---

### `master_code_merge`
**Role:** Merge all agent code artifacts into one valid game file  
**AI Contribution:** Resolves namespace conflicts between code segments from different domains, connects event buses (e.g., Physics collision → Audio SFX trigger), and ensures all modules reference shared global state correctly.  
**Input:** Code artifacts from all domains  
**Output:** Single-file HTML5 game  
**Why This Is Data Science:** Output integration from 14 data sources with schema mismatch resolution — identical to ETL pipeline merge operations.

---

### `schema_validator`
**Role:** Validate agent outputs against expected schemas before passing downstream  
**AI Contribution:** JSON Schema validation with LLM-powered semantic checking — catches outputs that are syntactically valid JSON but semantically wrong (e.g., `gravity: -9.8` when `gravity: 500` is expected for Phaser).  
**Triggers:** Rejects malformed outputs, forces agent retry

---

### `conflict_resolver`
**Role:** Arbitrate conflicting specifications between domains  
**AI Contribution:** Uses the original game spec as ground truth to resolve domain conflicts. Example: Physics proposes `gravity: 9.8` but Mechanics requires `gravity: 0` for a space game. The resolver picks the semantically correct value.

---

### `conflict_analysis_reporter`
**Role:** Document all pipeline conflicts for debugging  
**Output:** Structured conflict report `{ conflicts: [{ agent_a, agent_b, field, resolution, rationale }] }`

---

### `change_router`
**Role:** Route modification requests to correct domain agents  
**AI Contribution:** Determines which domains need re-running for a modification. "Make enemies faster" → re-runs Mechanics + Physics + AI/NPC. "Change background color" → re-runs Art only.

---

### `change_intent_classifier`
**Role:** Classify modification request type and scope  
**AI Contribution:** Multi-class text classification — maps user modification prompts to one of: `{ cosmetic | mechanical | structural | narrative | audio }`. Determines agent subset to re-invoke.

---

### `change_validation_summarizer`
**Role:** Validate and summarize completed modifications  
**Output:** Human-readable diff summary of what changed between game versions.

---

### `spec_quality_scorer`
**Role:** Score game spec completeness before build starts  
**AI Contribution:** Outputs a completeness score (0–100) and flags missing elements: no win condition, no enemy types specified, no audio notes. Prompts the user for clarifications before wasting 60+ seconds of compute.  
**Output:** `{ score: 74, missing: ["win_condition", "audio_theme"], suggestions: [...] }`

---

### `agent_performance_analyzer`
**Role:** Collect agent timing metrics and identify pipeline bottlenecks  
**Why This Is Data Science:** Pure telemetry analytics — timing histograms per agent, P95 latency, critical path vs. slack time. Powers ongoing pipeline optimization.  
**Output:** Performance report with per-agent latency distribution

---

## Domain 2: Narrative (6 agents)

The storytelling layer. These agents produce the creative foundation that all other domains build on — the world, characters, quests, and events that give a game its identity.

---

### `story_architect`
**Role:** Design the three-act narrative arc  
**AI Contribution:** Generates a thematic narrative from minimal input. "Space shooter" → "Ancient alien civilization's data cores hold the last knowledge of humanity — you must recover them before the purge at dawn."  
**Output:** `{ acts: [setup, confrontation, resolution], protagonist, antagonist, stakes }`

---

### `world_bible`
**Role:** Define the game world's lore, geography, and in-world rules  
**AI Contribution:** Expands the narrative arc into a full world specification — geography, factions, history, technology level, magic system (if applicable). This context constrains the Art and Level agents.  
**Input:** Narrative arc from `story_architect`  
**Output:** World bible document

---

### `character_design`
**Role:** Design all player and NPC characters  
**AI Contribution:** Generates character sheets for player avatar (abilities, appearance, backstory), enemy types (behavior profile, appearance, lore), bosses (attack patterns, dialogue, phase triggers), and NPCs.  
**Output:** `{ player: {...}, enemies: [{type, behavior, appearance}], bosses: [{...}] }`

---

### `dialogue_script`
**Role:** Write all in-game text content  
**AI Contribution:** Zero-shot dialogue generation — creates HUD messages, tutorial prompts, item descriptions, boss taunts, and victory messages themed to the game world.  
**Output:** Dialogue database indexed by trigger keys

---

### `quest_mission`
**Role:** Design objective structure and progression goals  
**AI Contribution:** Generates main quest line + optional side quests with branching outcomes. Outputs a quest dependency graph.  
**Output:** `{ main: [{id, objective, reward, unlocksAfter}], side: [...] }`

---

### `spawn_events`
**Role:** Define dynamic enemy, item, and event spawn triggers  
**AI Contribution:** Creates the event schedule: when enemies appear, where items drop, what story moments trigger world state changes. Works with `level_layout` for spatial placement.  
**Output:** Spawn manifest `{ triggers: [{ condition, spawnType, position, quantity }] }`

---

## Domain 3: Mechanics (7 agents)

The gameplay rules layer. Every interaction the player can have — moving, fighting, collecting, progressing — is specified here.

---

### `core_mechanics`
**Role:** Define the fundamental game loop and interaction model  
**AI Contribution:** Determines core verbs (jump + shoot? build + manage? match + clear?) from the game spec and establishes win/lose conditions, scoring, and the second-to-second loop.  
**Output:** `{ loop: "...", winCondition: "...", loseCondition: "...", scoring: {...} }`

---

### `player_controller`
**Role:** Specify player movement, input, and capability set  
**AI Contribution:** Maps the core mechanics to engine-specific physics parameters. "Fast-paced platformer" → Phaser velocity 240, jump force 480, coyote time 120ms.  
**Output:** `{ speed: 240, jumpForce: 480, groundFriction: 0.8, actions: ["shoot", "dash", "wall-jump"] }`

---

### `progression_system`
**Role:** Design leveling, skill trees, and difficulty scaling  
**AI Contribution:** Generates balanced progression curves — XP thresholds, stat scaling formulas, unlock gates. Applies game design heuristics to prevent difficulty spikes.  
**Output:** `{ levels: [{xpRequired, statMultiplier, unlockedAbility}] }`

---

### `input_mapping`
**Role:** Map all controls to player actions for keyboard/mouse and gamepad  
**AI Contribution:** Generates complete input configuration, respects platform norms (WASD for 3D, arrows for 2D platformers), includes gamepad button mapping.  
**Output:** `{ keyboard: {...}, gamepad: {...}, touch: {...} }`

---

### `save_state`
**Role:** Design the save/load system  
**AI Contribution:** Determines what state to persist (score, position, inventory, level), chooses storage method (localStorage for browser games), and defines auto-save triggers.  
**Output:** `{ schema: {...}, saveTriggers: [...], storageKey: "hoos_game_save" }`

---

### `accessibility`
**Role:** Design accessibility features  
**AI Contribution:** Generates configuration for colorblind modes, adjustable text sizes, reduced motion settings, difficulty assists (auto-aim, damage reduction). Ensures WCAG compliance for browser games.

---

### `agent_economy_design`
**Role:** Design in-game economy: resources, costs, rewards  
**AI Contribution:** Generates loot tables, currency drop rates, shop pricing, and reward balance curves. Applies economic modeling to prevent inflation or starved economies.  
**Output:** `{ currency: {...}, drops: [{ enemy, probability, reward }], shop: [...] }`

---

## Domain 4: Physics (4 agents)

Every number that governs how objects move, collide, and interact in the game world.

---

### `physics_constants`
**Role:** Define all global physics parameters  
**AI Contribution:** Selects physics constants appropriate for game genre and engine. "Gravity-defying space platformer" → gravity: 200, "Dark souls-like heavy combat" → gravity: 700, high friction.  
**Output:** `{ gravity: { x: 0, y: 520 }, friction: 0.85, bounce: 0.05, airResistance: 0.02 }`

---

### `collision_engine`
**Role:** Specify collision detection and response for all object pairs  
**AI Contribution:** Generates the complete collision matrix — which objects collide with which, what happens on contact (damage, bounce, destroy, trigger event). Maps to Phaser Arcade Physics or Three.js distance checks.  
**Output:** `{ pairs: [{ a: "bullet", b: "enemy", response: "damage(1)+destroy(bullet)" }] }`

---

### `force_dynamics`
**Role:** Define non-gravity forces: wind, knockback, magnetism, springs  
**AI Contribution:** Generates force vectors for environmental effects and combat feedback. Adds game feel through knockback on hits, recoil on shoot, screen shake impulse values.

---

### `ragdoll_system`
**Role:** Design ragdoll/death physics for defeated enemies  
**AI Contribution:** Specifies death animation fallback physics — impulse direction from killing hit, rotational velocity, ground bounce coefficient. Produces satisfying enemy deaths without full ragdoll simulation.

---

## Domain 5: Animation (4 agents)

How everything moves — from player idle cycles to enemy death sequences.

---

### `animation_state_machine`
**Role:** Design state machines for all animated characters  
**AI Contribution:** Generates FSM definitions for player (idle/run/jump/fall/attack/hurt/death), enemy types, and bosses. Defines transition conditions and priorities.  
**Output:** `{ player: { states: [...], transitions: [{from, to, condition}] } }`

---

### `keyframe_animator`
**Role:** Define keyframe sequences for each animation state  
**AI Contribution:** Generates sprite sheet frame sequences or procedural animation parameters for each state. For Phaser: `{ key: "run", frames: [3,4,5,6], frameRate: 10, repeat: -1 }`.

---

### `procedural_motion`
**Role:** Design procedural animations: sine-wave floating, breathing, screen shake  
**AI Contribution:** Generates parametric motion equations for ambient effects. Enemy floating pattern: `y = baseY + Math.sin(time * 0.003) * 25`. Boss screen shake: `camera.shake(300, 0.02)`.

---

### `rigging_config`
**Role:** Define skeletal rig structure for 3D characters  
**AI Contribution:** For Three.js / Babylon.js games — specifies bone hierarchy, weight maps, IK targets. For 2D games, specifies multi-part sprite assembly rigs.

---

## Domain 6: Art (4 agents)

The visual identity of the game — color, form, texture, and style direction.

---

### `color_palette`
**Role:** Define the game's complete color system  
**AI Contribution:** Generates a thematic hex palette from the game spec. "Dark fantasy" → deep purples, blood reds, sickly greens. "Cyber neon" → electric blues, hot pinks, bright yellows on near-black.  
**Output:** `{ primary: "#8B00FF", secondary: "#CC0033", accent: "#FFD700", bg: "#0a0010" }`

---

### `sprite_mesh_generator`
**Role:** Generate all visual assets procedurally  
**AI Contribution:** For 2D games: Phaser `graphics.generateTexture()` calls for player, enemies, platforms, bullets. For 3D: `THREE.BoxGeometry`/`SphereGeometry`/`CylinderGeometry` combinations with materials.  
**Output:** Asset generation code embedded in Boot scene

---

### `texture_artist`
**Role:** Design surface textures for all game materials  
**AI Contribution:** Generates procedural texture parameters — color gradients, noise patterns, roughness values. For PBR materials: `{ roughness: 0.7, metalness: 0.2, normalScale: 0.5 }`.

---

### `art_director`
**Role:** Maintain visual cohesion across all generated assets  
**AI Contribution:** Cross-domain consistency check — ensures enemy colors contrast with backgrounds, bullets are visible against environments, and all visuals match the narrative theme.

---

## Domain 7: Rendering (4 agents)

How the game looks on screen — shaders, lights, effects, and performance.

---

### `shader_system`
**Role:** Design custom shader programs for visual effects  
**AI Contribution:** Generates GLSL shader code for Three.js/Babylon.js games. Glow effects, scanline overlays, distortion shaders, cel-shading outlines.

---

### `lighting_rig`
**Role:** Configure the complete lighting setup  
**AI Contribution:** Generates light placement, color, intensity, and shadow configuration. "Dungeon crawler" → single warm torch-color PointLight, deep shadows. "Open world" → DirectionalLight + ambient sky.  
**Output:** `{ ambient: { color: 0x112244, intensity: 0.5 }, directional: { color: 0x4466ff, position: [10,20,5], shadows: true } }`

---

### `particle_system`
**Role:** Design particle emitters for all effects  
**AI Contribution:** Generates particle configurations for explosions, footsteps, magic trails, weather. For Phaser: `add.particles()` emitter configs. For Three.js: `THREE.Points` + `BufferGeometry` with velocity animation.  
**Output:** `{ kill: { quantity: 8, speed: 150, lifespan: 350 }, boss_explosion: {...} }`

---

### `post_processing`
**Role:** Define screen-space post-processing effects  
**AI Contribution:** Configures bloom, vignette, chromatic aberration, and CRT effects. For Three.js: `EffectComposer` + `RenderPass` + `BloomPass`. Applied as final screen overlay.

---

## Domain 8: Level (2 agents)

The physical space players explore.

---

### `level_layout`
**Role:** Design level structure, platform placement, and navigable space  
**AI Contribution:** Generates platform coordinates, hazard placements, and traversal paths. Applies level design heuristics: reachability, exploration rewards, safe rest zones, escalating challenge zones.  
**Output:** `{ platforms: [{x, y, width}], hazards: [...], spawnPoints: [...] }`

---

### `procedural_terrain`
**Role:** Generate algorithmic terrain for infinite or randomized levels  
**AI Contribution:** Implements seeded noise-based terrain generation (Perlin noise, cellular automata) for procedural level content. Ensures minimum playability constraints.  
**Output:** Terrain generation function code with seed parameter

---

## Domain 9: Audio (4 agents)

Every sound the player hears — from ambient music to hit confirmation SFX.

---

### `music_composer`
**Role:** Compose the game's adaptive musical score  
**AI Contribution:** Generates Web Audio API oscillator note sequences themed to the game. Creates adaptive stems that change based on game state: calm exploration → tense combat → boss fight → victory.  
**Output:** Note sequences and timing for `time.delayedCall` loop patterns

---

### `sfx_designer`
**Role:** Design all sound effects  
**AI Contribution:** Maps game events to AudioContext oscillator parameters. "Laser shoot" → `sfx(480, 0.06, 'sine')`. "Boss roar" → `sfx(60, 1.2, 'sawtooth')`. No external files needed.  
**Output:** `{ shoot: [480, 0.06, 'sine'], hurt: [70, 0.2, 'sawtooth'], win: [880, 0.6, 'sine'] }`

---

### `spatial_audio`
**Role:** Design positional audio for 3D games  
**AI Contribution:** Configures `PannerNode` spatial audio for Three.js / Babylon.js games — enemy approach audio fades in with proximity, directional sound for offscreen threats.

---

### `voice_director`
**Role:** Script and direct AI voice acting (ElevenLabs integration)  
**AI Contribution:** Generates voice direction for character lines — emotion, pacing, emphasis. Outputs scripts formatted for ElevenLabs TTS API. **Reserved for future feature.**

---

## Domain 10: UI (3 agents)

Every screen, menu, and overlay the player interacts with.

---

### `hud_designer`
**Role:** Design the heads-up display and in-game UI  
**AI Contribution:** Generates complete HUD layout — score, lives, HP, ammo, boss bar, minimap. For Phaser: `add.text()` + `add.rectangle()` elements. For Three.js: HTML overlay `position:fixed` elements.  
**Output:** HUD element specs with position, style, update logic

---

### `menu_system`
**Role:** Design all game menus: main, pause, settings, game-over  
**AI Contribution:** Generates menu hierarchy and navigation flows. Outputs complete menu code including keyboard navigation, visual styling, and state transitions.  
**Output:** `{ main: [...], pause: [...], settings: [...], gameover: [...] }`

---

### `localization`
**Role:** Internationalize all in-game text  
**AI Contribution:** Tags all dialogue and UI strings for localization, generates initial translations to Spanish and French. Implements `i18n()` lookup function in game code.

---

## Domain 11: AI / NPC (4 agents)

How enemies think, move, and react.

---

### `behavior_tree`
**Role:** Design AI behavior trees for all enemy types  
**AI Contribution:** Generates structured behavior trees (Selector/Sequence/Condition/Action nodes) for each enemy type. Exported as executable JavaScript switch logic or Kaboom.js `onUpdate` patterns.  
**Output:** `{ patrol: { type: "Sequence", children: [Patrol, DetectPlayer, ChasePlayer] } }`

---

### `pathfinding`
**Role:** Implement navigation and obstacle avoidance  
**AI Contribution:** Generates A* pathfinding or flow-field navigation appropriate for the game engine. For grid-based games: full A* implementation. For physics-based: steering behaviors (seek, flee, obstacle avoid).

---

### `boss_ai`
**Role:** Design multi-phase boss fight AI  
**AI Contribution:** Generates boss attack pattern state machine with phase transitions. Boss at 100% HP: slow projectiles. At 60%: faster + spread. At 30%: enrage mode with all patterns simultaneously.  
**Output:** Boss AI code with phase detection and attack timing

---

### `crowd_simulation`
**Role:** Simulate large groups of enemies or NPCs  
**AI Contribution:** Implements flocking behavior (separation, alignment, cohesion) for enemy swarms. Prevents enemy pile-ups on the player while maintaining group coherence.

---

## Domain 12: QA (5 agents)

Automated quality assurance before the game ships.

---

### `performance_profiler`
**Role:** Profile game performance and identify bottlenecks  
**AI Contribution:** Inserts FPS monitoring code into the game loop. Detects O(n²) collision checks, excessive DOM operations, garbage collection pressure. Outputs optimization recommendations.

---

### `bug_detector`
**Role:** Detect common game code bugs before deployment  
**AI Contribution:** Static analysis of generated code — detects uninitialized variables, missing null checks, physics body access after `destroy()`, event listener leaks. Flags and patches common issues.

---

### `lod_optimizer`
**Role:** Implement Level of Detail for performance  
**AI Contribution:** Adds LOD logic — distant enemies use simplified sprites/meshes, particle counts reduce at low FPS, physics steps coarsen for far objects.

---

### `playtesting_agent`
**Role:** Simulate player playthroughs to validate game balance  
**AI Contribution:** Runs simulated play sessions with different difficulty profiles (casual, average, expert) and reports: time to die, average score, boss reachability, level deadlock risk.  
**Output:** `{ avgTimeToFirstDeath: "12s", bossReachRate: 0.34, completionRate: 0.18 }`

---

### `analytics_instrumentation`
**Role:** Instrument the game with play analytics  
**AI Contribution:** Injects event tracking into key game moments (death, boss reached, level cleared, powerup collected). Outputs to `localStorage` for offline-first analytics. **Why This Is Data Science:** structured event collection for post-hoc game balance analysis.

---

## Domain 13: Deploy (4 agents)

Packaging and publishing the finished game.

---

### `build_pipeline`
**Role:** Assemble the final game artifact  
**AI Contribution:** `master_code_merge` output → minification → single-file validation → blob URL generation for immediate browser playback. Validates the final file runs without server.

---

### `platform_targeting`
**Role:** Adapt the game for specific deployment targets  
**AI Contribution:** Generates platform-specific adaptations: responsive scaling for mobile, pointer-lock instructions for desktop, PWA manifest for installable web app, Electron wrapper spec for desktop binary.

---

### `store_metadata`
**Role:** Generate app store and marketplace metadata  
**AI Contribution:** Produces game title (if not specified), tagline, description (100 words), genre tags, content rating, and screenshot annotations. Ready for itch.io, CrazyGames, or web store listing.

---

### `live_ops`
**Role:** Design post-launch content update plan  
**AI Contribution:** Generates a live operations roadmap: time-limited events, seasonal content, balance patch schedule, new enemy type cadence. Outputs as structured JSON schedule.

---

## Domain 14: Bridge (10 agents)

The connective tissue — 10 cross-domain translation agents that prevent schema mismatches from corrupting the pipeline.

---

### `narrative_to_mechanics_bridge`
**Role:** Translate story elements into mechanical gameplay rules  
**Example:** "The hero has lost their magic" (Narrative) → "Player starts with 0 special ability charges" (Mechanics)

---

### `mechanics_to_physics_bridge`
**Role:** Translate gameplay specs into physics constants  
**Example:** "Fast-paced high-jump platformer" (Mechanics) → `{ gravity: 600, jumpVelocity: -520, speed: 260 }` (Physics)

---

### `physics_to_animation_bridge`
**Role:** Sync physics state to animation state machine transitions  
**Example:** `body.velocity.y < 0` (Physics) → trigger `"jump"` animation state (Animation)

---

### `art_to_rendering_bridge`
**Role:** Translate art direction into renderer configuration  
**Example:** "Neon cyberpunk palette" (Art) → `{ bloom: true, bloomIntensity: 1.5, vignetteAlpha: 0.4 }` (Rendering)

---

### `narrative_to_audio_bridge`
**Role:** Map story events to audio cues  
**Example:** "Boss has been defeated" (Narrative) → play victory fanfare + switch to calm ambient (Audio)

---

### `mechanics_to_ui_bridge`
**Role:** Translate mechanic data to HUD display format  
**Example:** `{ lives: 3, score: 450 }` (Mechanics) → `"♥♥♥  SCORE: 450"` HUD text (UI)

---

### `level_to_physics_bridge`
**Role:** Translate level geometry into physics body definitions  
**Example:** Platform at `{x:200, y:340, w:140}` (Level) → `staticGroup.create(200,340,'plat')` with `body.setSize(140,14)` (Physics)

---

### `ai_to_animation_bridge`
**Role:** Translate NPC AI state to animation triggers  
**Example:** Enemy AI state `"chasing"` → play `"run"` animation facing player direction (Animation)

---

### `mechanics_to_audio_bridge`
**Role:** Map gameplay events to SFX triggers  
**Example:** `player.shoot()` event (Mechanics) → `sfx(480, 0.06, 'sine')` (Audio)

---

### `qa_to_deploy_bridge`
**Role:** Gate deployment on QA pass results  
**Example:** If `performance_profiler` reports avg FPS < 30 → LOD optimizer re-runs before `build_pipeline`

---

## The AI Pipeline as a Data Science System

Looking at the full 78-agent system through a Data Science lens:

```
INPUT: Natural language string (1–3 sentences)
    │
    ▼ [Prompt Engineering]
Structured system prompt with code skeleton injection
    │
    ▼ [LLM Inference — Llama 3 70B via IBM watsonx.ai]
Raw text output (HTML/JavaScript/Python code)
    │
    ▼ [Output Classification — isGameComplete()]
Binary: complete | incomplete
    │              │
    │              ▼ [Continuation trigger]
    │          Thread-persistent follow-up prompt
    │          ▼ [Re-inference on same context window]
    │          Continuation chunk
    │              │
    ▼ ◄────────────┘ (up to 20 passes)
    ▼ [Data Assembly — assembleChunks()]
Merged, validated, complete HTML file
    │
    ▼ [URL Repair — fixCensoredUrls()]
Fixed CDN references
    │
    ▼ [Storage & Serving]
sessionStorage → Blob URL → iframe sandbox
    │
    ▼
PLAYABLE GAME IN BROWSER
```

**Key AI/DS Components:**
- **Prompt as feature vector:** The system prompt injects structural priors (code skeleton) that bias the LLM output distribution toward valid game code
- **Completion classifier:** `isGameComplete()` is a rule-based classifier that operates on code structure — brace balance (depth counter), HTML closure, bootstrap call presence
- **Auto-continuation loop:** Iterative inference with state continuity — the LLM retains the full generated code in its context window across continuation passes
- **URL repair post-processor:** Regex-based output transformation pipeline, analogous to a data cleaning step
- **IAM token cache:** TTL-based credential management — a standard data engineering pattern

---

## IBM watsonx Orchestrate Capabilities Used

| Capability | How Used |
|---|---|
| **Multi-agent orchestration** | 78 agents coordinated through dependency DAG executed by `agent_scheduler` |
| **Thread continuity** | Same `thread_id` used across all continuation passes — LLM retains full context |
| **AskOrchestrate routing** | Entry point without specifying `agent_id` — routes to the most capable agent for the task |
| **Parallel execution** | Independent domains (Art + Audio) run simultaneously, not sequentially |
| **IAM authentication** | Standard IBM Cloud IAM Bearer token flow with module-level caching |
| **Agent registry API** | `GET /v1/orchestrate/agents` consumed for UI pipeline animation and agent count |
| **Llama 3 70B** | Underlying LLM for all agent reasoning, code generation, and structured output |

---

*Built for IBM TechXchange 2025 · Best AI & Data Science Track · University of Virginia · Hoos Gaming*
