# IBM watsonx Orchestrate — Full Agent Reference

Complete reference for all 78 game-building AI agents in the Hoos Gaming IBM watsonx Orchestrate instance.

**Instance ID:** `c8a9d776-460e-4c9a-b55f-0a2556febf8e`  
**Region:** `us-south`  
**Base URL:** `https://api.us-south.watson-orchestrate.cloud.ibm.com/instances/c8a9d776-460e-4c9a-b55f-0a2556febf8e`

---

## Authentication

```bash
# Get Bearer token (valid 1 hour)
curl -X POST https://iam.cloud.ibm.com/identity/token \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "grant_type=urn:ibm:params:oauth:grant-type:apikey&apikey=<WXO_MANAGER_API_KEY>"

# List all agents
curl https://api.us-south.watson-orchestrate.cloud.ibm.com/instances/<INSTANCE_ID>/v1/orchestrate/agents \
  -H "Authorization: Bearer <token>"
```

---

## How to Recreate This Instance

### Step 1 — Create IBM Cloud Account
1. Go to [cloud.ibm.com](https://cloud.ibm.com) and create an account
2. Navigate to **Catalog → AI / Machine Learning → watsonx Orchestrate**
3. Provision an instance (Plus or Enterprise tier for multi-agent support)

### Step 2 — Get API Keys
1. In your IBM Cloud account: **Manage → Access (IAM) → API Keys**
2. Create an API key — this is your `WXO_MANAGER_API_KEY`
3. Alternatively use the native WxO API key from the instance dashboard

### Step 3 — Create Agents via REST API

```bash
POST /v1/orchestrate/agents
Authorization: Bearer <token>
Content-Type: application/json

{
  "name": "game_director",
  "description": "Central orchestrator for game creation pipeline",
  "instructions": "You coordinate all game building agents...",
  "tools": ["task_decomposition", "agent_scheduler"],
  "model": "meta-llama/llama-3-70b-instruct"
}
```

### Step 4 — Wire Up the Pipeline
Use the `tools` array in each agent definition to give agents access to other agents or skills.

---

## Agent Domains Overview

| Domain | Agent Count | Primary Role |
|---|---|---|
| Orchestration | 13 | Pipeline coordination, task routing, conflict resolution |
| Narrative | 6 | Story, world-building, characters, dialogue, quests |
| Mechanics | 7 | Gameplay rules, player systems, progression, economy |
| Physics | 4 | Collision, forces, ragdoll, constants |
| Animation | 4 | State machines, keyframes, procedural motion, rigging |
| Art | 4 | Color, sprites/meshes, textures, art direction |
| Rendering | 4 | Shaders, lighting, particles, post-processing |
| Level | 2 | Level layout, procedural terrain generation |
| Audio | 4 | Music composition, SFX, spatial audio, voice |
| UI | 3 | HUD, menus, localization |
| AI / NPC | 4 | Behavior trees, pathfinding, boss AI, crowds |
| QA | 5 | Performance, bug detection, LOD, playtesting, analytics |
| Deploy | 4 | Build pipeline, platform targeting, store, live ops |
| Bridge | 10 | Cross-domain data translation and synchronization |
| **Total** | **78** | |

---

## Domain 1: Orchestration (13 agents)

The coordination layer. These agents break down user prompts, schedule work across other domains, merge outputs, and validate the final game spec.

---

### `game_director`
**Role:** Central orchestrator and entry point for the 56-agent game creation pipeline  
**Description:** Receives the initial game specification and decomposes it into domain tasks. Assigns work to all other domains in the correct order, manages dependencies, and triggers the final merge. Has two primary tools: the full 56-agent creation pipeline and the modification pipeline.  
**Tools:** `task_decomposition_engine`, `agent_scheduler`, `master_code_merge`  
**Note:** Calling via `agent_id` currently errors on IBM's side. Route through `AskOrchestrate` instead.

---

### `task_decomposition_engine`
**Role:** Break down complex game specs into discrete, assignable subtasks  
**Description:** Takes a natural-language game description and produces a structured task graph with dependencies. Identifies which domains need to be activated and in what order. Outputs a JSON task manifest consumed by `agent_scheduler`.  
**Input:** Game spec string  
**Output:** Task dependency graph (JSON)

---

### `agent_scheduler`
**Role:** Orchestrate parallel and sequential agent execution  
**Description:** Reads the task manifest from `task_decomposition_engine` and triggers domain agents in the optimal order. Handles parallel execution for independent tasks (e.g., Art and Audio can run simultaneously). Manages retries on agent failure.  
**Input:** Task dependency graph  
**Output:** Execution plan + orchestration signals

---

### `agent_dependency_graph_builder`
**Role:** Construct and validate inter-agent dependency graphs  
**Description:** Builds a directed acyclic graph (DAG) of agent dependencies for a given game build. Ensures no circular dependencies and identifies the critical path for minimum build time.  
**Output:** Dependency DAG (JSON)

---

### `master_code_merge`
**Role:** Merge all agent outputs into a single cohesive game file  
**Description:** Collects code segments from all active agents (physics constants, animation state machines, enemy AI, audio triggers, HUD code) and merges them into a single `index.html` file. Resolves namespace conflicts and ensures all modules are properly connected.  
**Input:** Code artifacts from all domain agents  
**Output:** Single-file HTML5 game

---

### `schema_validator`
**Role:** Validate agent outputs against expected JSON schemas  
**Description:** After each agent produces output, validates it against a pre-defined schema before passing it downstream. Rejects malformed outputs and triggers agent retries. Prevents bad data from propagating through the pipeline.

---

### `conflict_resolver`
**Role:** Resolve conflicting specifications between agents  
**Description:** When two agents produce incompatible outputs (e.g., Physics proposes gravity=9.8 but Mechanics requires zero-gravity for a space game), this agent arbitrates using the original game spec as ground truth.

---

### `conflict_analysis_reporter`
**Role:** Document and report all conflicts detected in the pipeline  
**Description:** Logs every conflict, its cause, and resolution to a structured report. Used for pipeline debugging and improving future runs.

---

### `change_router`
**Role:** Route modification requests to the correct domain agents  
**Description:** When a user requests a change to an existing game (e.g., "make the enemies faster"), this agent identifies which domains need to be re-run and routes the change request appropriately. Part of the modification pipeline.

---

### `change_intent_classifier`
**Role:** Classify the type and scope of a modification request  
**Description:** Distinguishes between cosmetic changes (color, text) vs. mechanical changes (physics, AI) vs. structural changes (new level, new enemy type). Outputs a change scope object used by `change_router`.

---

### `change_validation_summarizer`
**Role:** Validate and summarize the results of a modification run  
**Description:** After a modification pipeline completes, verifies the changes were applied correctly and generates a human-readable summary of what changed.

---

### `spec_quality_scorer`
**Role:** Score the quality and completeness of the game specification  
**Description:** Analyzes the user's original prompt and the task manifest to score completeness (0–100). Flags missing elements (no win condition, no audio spec, no enemy types) and prompts clarifying additions before the build starts.

---

### `agent_performance_analyzer`
**Role:** Analyze agent execution metrics and identify bottlenecks  
**Description:** Collects timing data from each agent invocation and produces a performance report. Identifies the slowest agents in the pipeline and suggests optimizations. Used for pipeline tuning.

---

## Domain 2: Narrative (6 agents)

Craft the story, world, characters, and event-driven game logic.

---

### `story_architect`
**Role:** Design the overall narrative arc of the game  
**Description:** Creates the three-act story structure (setup, confrontation, resolution), defines the player's motivation, the antagonist, and the stakes. Outputs a narrative spec consumed by `world_bible` and `quest_mission`.  
**Output:** Narrative arc document (JSON)

---

### `world_bible`
**Role:** Define the game world's lore, geography, and rules  
**Description:** Creates the world's setting, history, factions, geographic regions, and in-world rules (e.g., magic system rules, technology level). This context informs art direction, level design, and enemy types.  
**Input:** Narrative arc from `story_architect`  
**Output:** World bible document

---

### `character_design`
**Role:** Design player and NPC characters  
**Description:** Defines all characters: player avatar (abilities, appearance, backstory), enemy types (behavior, appearance, lore), bosses (multi-phase attack patterns, dialogue), and key NPCs. Outputs character sheets.  
**Output:** Character manifests (JSON)

---

### `dialogue_script`
**Role:** Write all in-game dialogue and narrative text  
**Description:** Creates all dialogue trees, item descriptions, loading screen tips, tutorial prompts, and NPC conversations. Text is localization-tagged for the `localization` UI agent.  
**Input:** Character manifests, world bible  
**Output:** Dialogue database (JSON)

---

### `quest_mission`
**Role:** Design quests, missions, and objectives  
**Description:** Creates the main quest line and optional side quests with branching outcomes. Defines objectives, rewards, and unlockables. Outputs a quest graph with dependency chains.  
**Output:** Quest graph (JSON)

---

### `spawn_events`
**Role:** Define enemy, item, and event spawn triggers  
**Description:** Creates the dynamic event system: when enemies spawn, where they appear, what events trigger story moments, and how the world state changes over time. Works with `level_layout` to place spawn points.  
**Output:** Spawn event manifest (JSON)

---

## Domain 3: Mechanics (7 agents)

Define all gameplay rules, player systems, and progression.

---

### `core_mechanics`
**Role:** Define the fundamental gameplay rules and interactions  
**Description:** Establishes the core game loop (what the player does every second), win/lose conditions, scoring system, and fundamental interactions. This is the foundation all other mechanics build on.  
**Output:** Core mechanics spec (JSON)

---

### `player_controller`
**Role:** Specify player movement, input handling, and actions  
**Description:** Defines all player capabilities: movement speed, jump height, attack range, dodge roll, special abilities. Outputs a controller spec that maps to Phaser Arcade Physics or Three.js physics.  
**Output:** Player controller config (JSON)

---

### `progression_system`
**Role:** Design leveling, skill trees, and player growth  
**Description:** Creates the XP/level system, skill unlock progression, stat scaling curves, and difficulty ramping. Ensures the game stays challenging throughout.  
**Output:** Progression config (JSON)

---

### `input_mapping`
**Role:** Map controls to player actions for each platform  
**Description:** Defines keyboard/mouse, gamepad, and touch input mappings. Creates the input config used by the player controller. Handles input buffering for responsive controls.  
**Output:** Input map (JSON)

---

### `save_state`
**Role:** Design game save/load system  
**Description:** Defines what game state is saved (player position, inventory, score, level progress), the save format (localStorage for browser games), and auto-save triggers.  
**Output:** Save state schema (JSON)

---

### `accessibility`
**Role:** Design accessibility features for the game  
**Description:** Specifies colorblind modes, input remapping options, text size settings, reduced motion options, and difficulty assists (auto-aim, damage reduction). Ensures the game is playable by a wide audience.  
**Output:** Accessibility config (JSON)

---

### `agent_economy_design`
**Role:** Design in-game economy: resources, costs, rewards  
**Description:** Creates the in-game economy: currency drops, upgrade costs, chest/loot tables, shop systems, and reward balancing. Ensures the game economy feels fair and motivating.  
**Output:** Economy config (JSON)

---

## Domain 4: Physics (4 agents)

Define the physical simulation layer.

---

### `physics_constants`
**Role:** Define all physics constants for the game world  
**Description:** Sets gravity strength, friction coefficients, terminal velocity, bounce restitution, and air resistance. Outputs a constants object consumed by the physics engine (Phaser Arcade Physics or Three.js physics).  
**Output:** Physics constants (JSON)

---

### `rigidbody_forces`
**Role:** Specify force application rules for all game objects  
**Description:** Defines how forces are applied to game objects: knockback forces on hit, explosion radii, launch arcs for projectiles, push forces from environmental hazards.  
**Output:** Force spec (JSON)

---

### `collision_system`
**Role:** Design collision detection and response rules  
**Description:** Defines collision layers (player / enemy / bullet / platform / hazard), collision callbacks (damage, bounce, destroy), and trigger zones for level events.  
**Output:** Collision config (JSON)

---

### `ragdoll_cloth`
**Role:** Specify ragdoll physics and cloth simulation  
**Description:** Defines ragdoll behavior for enemy death animations and cloth physics for capes/flags. Outputs soft-body simulation parameters.  
**Output:** Soft physics config (JSON)

---

## Domain 5: Animation (4 agents)

Define all motion and visual behavior.

---

### `animation_state_machine`
**Role:** Design state machines governing all character animations  
**Description:** Creates FSMs for player and enemy animations: idle → walk → run → jump → fall → attack → hurt → death. Defines transition conditions and blend times.  
**Output:** Animation FSM spec (JSON)

---

### `keyframe_animation`
**Role:** Specify keyframe data for sprite and 3D model animations  
**Description:** Defines frame ranges, timing, and easing for each animation clip. For Phaser games: spritesheet frame configs. For Three.js: bone animation data.  
**Output:** Keyframe animation data

---

### `procedural_animation`
**Role:** Design procedural/generative animation systems  
**Description:** Creates secondary animation systems: screen shake on impact, camera bob while walking, idle breath animation, environmental wind effects, procedural footstep timing.  
**Output:** Procedural animation config (JSON)

---

### `rigging_skinning`
**Role:** Define character rig structure and skinning weights  
**Description:** For 3D games: creates the bone hierarchy for player and enemy models, and specifies skinning weights for mesh deformation. Outputs rig data used by `keyframe_animation`.  
**Output:** Rig spec (JSON)

---

## Domain 6: Art (4 agents)

Define all visual aesthetics.

---

### `color_palette`
**Role:** Define the game's color palette and visual language  
**Description:** Creates the primary, secondary, and accent color palettes. Assigns colors to gameplay roles (player = warm, enemies = red, safe = green, danger = orange). Ensures visual consistency.  
**Output:** Color palette (JSON + CSS vars)

---

### `sprite_mesh_gen`
**Role:** Specify procedural sprite and 3D mesh generation  
**Description:** Defines how all game assets are generated programmatically using canvas drawing (Phaser) or geometry primitives (Three.js). No external image assets required — all art is code-generated.  
**Output:** Asset generation spec (JSON)

---

### `texture_material`
**Role:** Design textures and PBR materials  
**Description:** For 3D games: defines MeshStandardMaterial properties (color, roughness, metalness, emissive). For 2D: defines fill patterns and gradient styles for all game elements.  
**Output:** Material config (JSON)

---

### `art_direction`
**Role:** Maintain visual cohesion across all game art  
**Description:** Acts as the art director: reviews outputs from `color_palette`, `sprite_mesh_gen`, and `texture_material` to ensure visual consistency. Flags any art that breaks the intended aesthetic.

---

## Domain 7: Rendering (4 agents)

Handle the visual rendering pipeline.

---

### `shader_writing`
**Role:** Write GLSL shaders for visual effects  
**Description:** Creates vertex and fragment shaders for: water distortion, glow effects, dissolve on death, scanline overlays, depth-of-field. Outputs GLSL code used by Three.js ShaderMaterial.  
**Output:** GLSL shader code

---

### `lighting_design`
**Role:** Design the game's lighting setup  
**Description:** Defines ambient light intensity, directional/point/spot light positions and colors, shadow parameters, and day/night cycle behavior. Outputs a lighting config for Three.js or Phaser's light plugin.  
**Output:** Lighting config (JSON)

---

### `particle_systems`
**Role:** Design all particle effects  
**Description:** Creates particle effect specs for: hit sparks, enemy death explosions, magic spells, environmental atmosphere (rain, snow, fireflies), speed lines. Outputs Phaser Particle configs or Three.js Points geometry setups.  
**Output:** Particle system configs (JSON)

---

### `post_processing`
**Role:** Design post-processing visual effects  
**Description:** Specifies screen-space effects applied after the main render: bloom, vignette, chromatic aberration, motion blur, color grading LUT. For Three.js: EffectComposer passes. For Phaser: fullscreen shader filter.  
**Output:** Post-process pipeline config

---

## Domain 8: Level (2 agents)

Design game levels and environments.

---

### `level_layout`
**Role:** Design the layout of all game levels  
**Description:** Creates level layouts: platform positions, room connectivity, enemy placement zones, pickup locations, checkpoint positions, and boss arena designs. For procedural games: seeds and layout algorithms.  
**Input:** Spawn event manifest, game mechanics spec  
**Output:** Level layout data (JSON / tilemap)

---

### `procedural_terrain`
**Role:** Generate procedural terrain and environment systems  
**Description:** Creates algorithms for procedural generation: noise-based terrain height maps, dungeon room generators, cave systems, forest density maps. Outputs generation seeds and algorithms in JavaScript.  
**Output:** Terrain generation code

---

## Domain 9: Audio (4 agents)

Design and generate all game audio.

---

### `music_composition`
**Role:** Compose adaptive background music  
**Description:** Designs the musical system: note sequences for different game states (exploration, combat, boss, game-over, victory). All music is generated via Web Audio API oscillators — no external audio files. Outputs JavaScript audio code.  
**Output:** Music system code (JS)

Example output pattern:
```javascript
// Adaptive combat music via oscillators
function playBossTheme() {
  const notes = [55, 65, 73, 55]; let i = 0;
  const tick = () => {
    const o = actx.createOscillator(), g = actx.createGain();
    o.type = 'sawtooth'; o.frequency.value = notes[i++ % notes.length];
    g.gain.setValueAtTime(0.08, actx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, actx.currentTime + 0.35);
    o.connect(g); g.connect(actx.destination);
    o.start(); o.stop(actx.currentTime + 0.35);
    setTimeout(tick, 400);
  }; tick();
}
```

---

### `sound_effects`
**Role:** Design all game sound effects  
**Description:** Creates SFX for every game event: jump, land, attack, hit, enemy death, item pickup, boss roar, explosion, UI clicks. All implemented as Web Audio API oscillator bursts. No external audio files.  
**Output:** SFX library code (JS)

---

### `spatial_audio`
**Role:** Implement 3D positional audio  
**Description:** For 3D games: uses Web Audio API's `PannerNode` and `AudioListener` to create positional sound. Enemy sounds get louder as the player approaches. Gunshots have directionality.  
**Output:** Spatial audio system code (JS)

---

### `voice_script`
**Role:** Write character voice lines and narration scripts  
**Description:** Writes spoken dialogue for characters, narrator lines, and tutorial voice-overs. Text outputs are ready for text-to-speech integration (ElevenLabs). Currently displayed as subtitle text in-game.  
**Output:** Voice script document

---

## Domain 10: UI (3 agents)

Design all user interface elements.

---

### `hud_design`
**Role:** Design the in-game heads-up display  
**Description:** Specifies all HUD elements: health bar, score counter, lives display, minimap, stamina bar, boss health bar, ammo counter, timer. Defines position, style, and update behavior. For browser games: HTML overlay or Phaser text objects.  
**Output:** HUD component spec (JSON + HTML/CSS)

---

### `menu_system`
**Role:** Design all game menus  
**Description:** Creates all menu screens: main menu, pause menu, settings screen, game-over screen with score display, victory screen, level select. Defines navigation flow and animation transitions.  
**Output:** Menu flow spec + HTML/CSS/JS code

---

### `localization`
**Role:** Implement multi-language text support  
**Description:** Wraps all game text in a localization system. Creates translation keys for all UI text, dialogue, and system messages. Outputs a localization JSON and a `t()` function for in-game use.  
**Output:** Localization system (JSON + JS)

---

## Domain 11: AI / NPC (4 agents)

Design all non-player character behavior.

---

### `npc_behavior_tree`
**Role:** Design behavior trees for all NPCs  
**Description:** Creates behavior trees (Blackboard pattern) for all non-boss NPCs: patrol routes, player detection radius, attack decision logic, retreat when low health, alert nearby enemies. Outputs behavior tree JSON and JavaScript execution code.  
**Output:** Behavior tree code (JS)

---

### `pathfinding`
**Role:** Implement pathfinding for NPC navigation  
**Description:** Implements A* or navmesh pathfinding for enemy movement. For 2D: grid-based A*. For 3D: navmesh with waypoints. Handles dynamic obstacles (moving platforms, destructible terrain).  
**Output:** Pathfinding system code (JS)

---

### `boss_combat_ai`
**Role:** Design multi-phase boss combat systems  
**Description:** Creates boss AI with distinct attack phases triggered by health thresholds. Phase 1: pattern attacks. Phase 2: rage mode with new attacks. Phase 3: desperate final form. Includes telegraphing animations and counterplay windows.  
**Output:** Boss AI code (JS)

---

### `crowd_simulation`
**Role:** Simulate large groups of NPCs with emergent behavior  
**Description:** Implements crowd simulation using flocking algorithms (separation, alignment, cohesion) for large enemy groups. Handles 50+ NPCs without performance degradation using spatial hashing.  
**Output:** Crowd simulation code (JS)

---

## Domain 12: QA (5 agents)

Quality assurance for generated games.

---

### `performance_profiler`
**Role:** Analyze and optimize game performance  
**Description:** Reviews generated game code for performance issues: O(n²) loops in update(), garbage-creating patterns, too many draw calls, missing object pooling. Suggests and applies optimizations.  
**Output:** Optimized game code

---

### `bug_detection`
**Role:** Detect and fix bugs in generated game code  
**Description:** Static analysis of the generated code: checks for unclosed event listeners, missing null checks, potential undefined access, physics body cleanup on object destroy, and memory leaks.  
**Output:** Bug report + fixed code

---

### `lod_culling`
**Role:** Implement level-of-detail and frustum culling  
**Description:** Adds LOD systems for 3D games (simplified meshes at distance) and frustum culling (don't render off-screen objects). For 2D: deactivates off-screen enemies to reduce update overhead.  
**Output:** LOD/culling code

---

### `playtesting_simulation`
**Role:** Simulate playtesting to validate game balance  
**Description:** Runs a simulated playthrough of the generated game logic, checking: can the player complete the game, is the difficulty ramp reasonable, are any sections impossible, does the boss scale correctly to player level.  
**Output:** Playtest report (JSON)

---

### `analytics_telemetry`
**Role:** Add optional analytics to track player behavior  
**Description:** Adds in-game telemetry: death heatmaps, session length tracking, most-used abilities, difficulty drop-off points. Data stored locally (no external server required for browser games).  
**Output:** Analytics system code (JS)

---

## Domain 13: Deploy (4 agents)

Package and deploy the finished game.

---

### `build_pipeline`
**Role:** Package the game for distribution  
**Description:** Takes the merged single-file HTML game and optimizes it for distribution: minifies JavaScript, inlines critical CSS, adds cache headers, generates a `game.html` artifact ready for hosting.  
**Output:** Optimized `game.html`

---

### `platform_targeting`
**Role:** Adapt the game for specific target platforms  
**Description:** Adjusts the game for the target platform: desktop browser (keyboard focus), mobile (touch controls, viewport meta tag), tablet (gamepad support). Outputs platform-specific code variants.  
**Output:** Platform-targeted game code

---

### `store_submission`
**Role:** Prepare store listing assets and metadata  
**Description:** Generates game store metadata: title, description, screenshots (canvas captures), tags, category, age rating. Formats for itch.io, Newgrounds, CrazyGames, or HTML5 game portals.  
**Output:** Store listing package

---

### `live_ops`
**Role:** Design live operations systems for post-launch games  
**Description:** Designs systems for post-launch updates: event scheduling, seasonal content toggles, A/B testing hooks, leaderboard integration, and patch management. All implementable via localStorage flags for browser games.  
**Output:** Live ops config (JSON)

---

## Domain 14: Bridge (10 agents)

Cross-domain data translators. Bridge agents ensure that outputs from one domain are properly formatted for consumption by another domain.

---

### `art_to_code_bridge`
**Role:** Translate art specs into renderable game code  
**Description:** Takes color palette and sprite gen specs from the Art domain and converts them into executable `graphics.fillStyle()` / `MeshStandardMaterial` calls that appear in the final game code.

---

### `physics_animation_bridge`
**Role:** Connect physics simulation with animation state machines  
**Description:** Ensures that physics events (landing on ground, taking knockback, hitting a wall) correctly trigger animation state transitions. Translates physics body velocity into animation blend weights.

---

### `level_gameplay_bridge`
**Role:** Connect level design with gameplay mechanics  
**Description:** Maps level layout data (platform positions, spawn points, trigger zones) to gameplay events (enemy spawns, collectible placement, checkpoint activation). Ensures level geometry matches physics expectations.

---

### `narrative_mechanics_bridge`
**Role:** Connect story events with gameplay mechanics  
**Description:** Translates narrative milestones (completing a quest, defeating a boss) into mechanical changes (new ability unlocked, new area opened, difficulty increase). Creates the event hooks between `quest_mission` and `core_mechanics`.

---

### `audio_event_bridge`
**Role:** Connect gameplay events to audio triggers  
**Description:** Maps every gameplay event (player jumps, enemy dies, boss phase change, level complete) to the correct audio call (`sfx(freq, dur)`). Ensures no gameplay event is silent.

---

### `ui_state_bridge`
**Role:** Connect game state to UI updates  
**Description:** Ensures the HUD always reflects current game state. Maps health changes → health bar update, score changes → score text update, boss appearing → boss health bar visible. Creates the event listeners between game logic and UI rendering.

---

### `asset_registry_bridge`
**Role:** Maintain the registry of all generated game assets  
**Description:** Tracks every asset generated by the pipeline (textures, sounds, animations, level data) with its name, type, and dependencies. Ensures `master_code_merge` can access all assets by name.  
**Output:** Asset registry (JSON)

---

### `analytics_design_bridge`
**Role:** Connect design intentions with analytics events  
**Description:** Translates design goals ("we want to know if players find the first boss too hard") into specific analytics events ("log player health at boss death"). Ensures analytics data answers real design questions.

---

### `platform_build_bridge`
**Role:** Connect platform targeting with the build pipeline  
**Description:** Passes platform requirements from `platform_targeting` to `build_pipeline`. Ensures the correct optimizations (touch controls, viewport meta, gamepad API) are applied for the chosen platform.

---

### `localization_ui_bridge`
**Role:** Connect localization strings with UI components  
**Description:** Takes the localization JSON from the `localization` UI agent and wires it into all UI components. Replaces hardcoded strings with `t("key")` calls. Handles RTL language layout flips.

---

## Excluded / System Agents (10 agents)

These agents exist in the instance but are excluded from game builds:

| Agent | Reason Excluded |
|---|---|
| `AskOrchestrate` | Default router — not a game agent, used as routing entry point |
| `QCInspectorAgent` | Semiconductor QC inspection — unrelated domain |
| `YieldForecasterAgent` | Semiconductor yield forecasting — unrelated domain |
| `SupplyChainRiskAgent` | Supply chain management — unrelated domain |
| `BOMEngineerAgent` | Bill of materials engineering — unrelated domain |
| `DesignOptimizerAgent` | Chip design optimization — unrelated domain |
| `SimulationAnalystAgent` | Semiconductor simulation — unrelated domain |
| `ChipArchitectAgent` | Chip architecture design — unrelated domain |
| `AGENT_NCCUAI` | Internal IBM system agent |
| `Time_Date` | Utility agent for date/time queries |

---

## Recreating the Pipeline from Scratch

To recreate this full pipeline in a new IBM watsonx Orchestrate instance:

### Agent Creation Script (pseudocode)

```python
import requests

BASE = "https://api.us-south.watson-orchestrate.cloud.ibm.com/instances/<YOUR_INSTANCE_ID>"
HEADERS = {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}

AGENTS = [
    {
        "name": "game_director",
        "description": "Central orchestrator for the game creation pipeline",
        "instructions": """You are the game director. When given a game specification:
1. Break it into domain tasks using task_decomposition_engine
2. Schedule parallel execution with agent_scheduler  
3. Collect all outputs and merge with master_code_merge
4. Return the complete single-file HTML5 game""",
        "tools": ["task_decomposition_engine", "agent_scheduler", "master_code_merge"]
    },
    {
        "name": "story_architect",
        "description": "Designs narrative arc, story structure, and world lore",
        "instructions": "Create a compelling three-act narrative structure for the game...",
        "tools": []
    },
    # ... repeat for all 78 agents
]

for agent in AGENTS:
    r = requests.post(f"{BASE}/v1/orchestrate/agents", json=agent, headers=HEADERS)
    print(f"Created {agent['name']}: {r.status_code}")
```

### Minimum Viable Pipeline

To recreate with just the core agents needed for basic game generation:

1. **`task_decomposition_engine`** — Parse game spec into tasks
2. **`core_mechanics`** — Define gameplay rules
3. **`player_controller`** — Player movement and input
4. **`collision_system`** — Physics collision
5. **`sprite_mesh_gen`** — Procedural art generation
6. **`hud_design`** — HUD and menus
7. **`npc_behavior_tree`** — Enemy AI
8. **`sound_effects`** — Web Audio SFX
9. **`master_code_merge`** — Merge everything
10. **`build_pipeline`** — Package final output

These 10 agents can produce a functional game. The remaining 68 add depth, polish, and optimization.

---

## Testing the API

```bash
# List all agents
curl "$BASE/v1/orchestrate/agents" \
  -H "Authorization: Bearer $TOKEN" | jq '.[] | {name, id}'

# Create a game via AskOrchestrate (most reliable routing)
curl -X POST "$BASE/v1/orchestrate/runs" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "message": {
      "role": "user",
      "content": "Build a complete Phaser 3 2D platformer HTML5 game with enemies and boss fight. Output as ```html block."
    }
  }'

# Poll run status
curl "$BASE/v1/orchestrate/runs/<RUN_ID>" \
  -H "Authorization: Bearer $TOKEN"

# Get reply
curl "$BASE/v1/orchestrate/threads/<THREAD_ID>/messages" \
  -H "Authorization: Bearer $TOKEN" | jq '.[-1].content[0].text'
```

---

*Hoos Gaming · IBM watsonx Orchestrate Instance Reference · University of Virginia*
