# Hoos Gaming — AI Video Game Creator

## Running the app locally

```bash
npm install
npm run dev
```

| Route | What it does |
|-------|----------------|
| **`/`** | Marketing landing page. In-page nav links scroll to sections; **Launch App**, **Build Your Game**, **Launch Hoos Gaming** go to **`/create`**. |
| **`/create`** | Prompt + **Build Your Game** → `POST /api/generate` (proxies to your API using **server-only** env vars). |
| **`/spec`** | Shows the last successful JSON from Create (browser `sessionStorage`). |
| **`/play`** | Placeholder for the future game preview. |

**API keys:** add `ORCHESTRATE_API_URL` and `ORCHESTRATE_API_KEY` to **`.env.local`** only — never commit them, never paste them into chat. See **`docs/API_KEYS.md`** for exactly **when** you need them (before the first real generate). Copy **`.env.example`** to **`.env.local`** and fill in values. After changing env, restart `npm run dev`.

Check config without exposing secrets: `GET http://localhost:3000/api/health` → `{ "orchestrate": { "configured": true/false } }`.

---

# AI Video Game Creator — IBM watsonx Orchestrate

## What This System Does
This is a 56-agent AI game design engine built on IBM watsonx Orchestrate. You give it one natural language prompt — like "Create a 2D dark fantasy platformer with pixel art style for PC" — and it orchestrates 56 specialized AI agents to produce a complete game specification covering every aspect of game design from narrative to deployment.

The system produced a fully named game called Shadowforge on its first run, complete with a JSON game state schema, physics config, narrative arc, character stats, level layouts, asset specifications, build pipeline, and a release kit for Steam, Mac App Store, and Linux — from a single sentence prompt.

## What It Can Do

**Game Design Generation** — takes any genre (platformer, RPG, FPS, RTS, puzzle, horror, racing, strategy) in 2D or 3D, any art style, any target platform, and generates a complete design document covering every system in the game.

**Physics Simulation Design** — dedicated agents configure gravity, collision layers, rigidbody profiles, ragdoll systems, and cloth simulation. Physics constants are defined first and all downstream agents inherit from them so nothing conflicts.

**Narrative and World Building** — generates story structure, character backstories and stats, branching dialogue trees, quest manifests with objectives and rewards, and a full world bible covering geography, factions, and lore.

**Art and Visual Direction** — produces a canonical color palette with hex tokens per zone, a style guide covering line weight, shadow style, and texture density, sprite and mesh specifications for all characters and objects, and material definitions for every surface type.

**Audio System Design** — designs the full adaptive music system, SFX manifest with trigger conditions, 3D spatial audio zone configurations, and voice acting scripts with emotional direction tags.

**AI and NPC Behavior** — generates behavior trees for every NPC class, NavMesh configuration for pathfinding, multi-phase boss encounter designs, and crowd simulation parameters for ambient life.

**UI and UX** — designs HUD layouts with game state bindings, full menu system with navigation flows, accessibility compliance checks for colorblind modes and remappable controls, and localization infrastructure for multiple languages.

**Build and Deployment** — configures a full CI/CD pipeline, platform-specific build adaptations for PC, console, mobile, and web, store submission packages for Steam and App Store, and a live ops framework for post-launch patches and DLC.

**Live Modification** — a second chatbot accepts natural language change requests like "make gravity 30% heavier" and routes only the affected agents to rerun. No full rebuild required. Changes propagate through integration bridges automatically.

**Conflict Resolution** — integration agents run continuously and catch conflicts between domain agents. If the color palette agent and shader agent write contradictory values, the conflict resolver applies priority rules and resolves it automatically without human intervention.

## System Architecture

The system has four layers.

**Layer 1 — Command** — the Game Director AI parses your prompt, the Genre and Scope Analyst classifies the game type, the Task Decomposition Engine breaks the work into typed agent tasks, the Dependency Graph Builder maps which agents can run simultaneously, and the Agent Scheduler fires everything in the correct order.

**Layer 2 — 44 Domain Agents across 13 domains** — Concept and Narrative, World and Level Design, Art and Visual, Rendering, Physics, Animation, Gameplay and Mechanics, AI and NPC, Audio, UI/UX, Systems and Infrastructure, QA and Performance, Build and Deployment. Each agent owns a single isolated domain and writes its output to a shared game state schema using dot-notation paths.

**Layer 3 — 13 Integration Bridge Agents** — these run continuously and wire domains together. The Art-to-Code Bridge translates palette tokens into shader uniforms. The Physics-Animation Bridge syncs collision geometry with animation rigs. The Level-Gameplay Bridge validates that all quest objectives are reachable within the level geometry. The Analytics-Design Bridge feeds bot playtesting data back to level and mechanics agents for tuning. Nothing enters the shared game state without passing the Schema Validator.

**Layer 4 — Modification Pipeline** — a separate workflow handles live changes. The Modification Chatbot parses the change request, the Change Router identifies the minimum affected agents, only those agents rerun, and the result is validated and committed without touching anything else.

## The 56 Agents

**Command and Orchestration** — game_director, genre_scope_analyst, task_decomposition_engine, dependency_graph_builder, agent_scheduler, modification_chatbot, change_router

**Concept and Narrative** — story_architect, character_design, dialogue_script, economy_design

**World and Level Design** — world_bible, level_layout, procedural_terrain, spawn_events

**Art and Visual** — color_palette, art_direction, sprite_mesh_gen, texture_material

**Rendering** — lighting_design, shader_writing, post_processing, particle_systems

**Physics** — physics_constants, collision_system, rigidbody_forces, ragdoll_cloth

**Animation** — keyframe_animation, rigging_skinning, animation_state_machine, procedural_animation

**Gameplay and Mechanics** — core_mechanics, player_controller, progression_system, quest_mission

**AI and NPC** — npc_behavior_tree, pathfinding, boss_combat_ai, crowd_simulation

**Audio** — music_composition, sound_effects, spatial_audio, voice_script

**UI/UX** — hud_design, menu_system, accessibility, localization

**Systems and Infrastructure** — save_state, input_mapping, multiplayer_netcode, analytics_telemetry

**QA and Performance** — bug_detection, performance_profiler, lod_culling, playtesting_simulation

**Build and Deployment** — build_pipeline, platform_targeting, store_submission, live_ops

**Integration Agents** — schema_validator, conflict_resolver, art_to_code_bridge, physics_animation_bridge, level_gameplay_bridge, narrative_mechanics_bridge, audio_event_bridge, ui_state_bridge, asset_registry_bridge, platform_build_bridge, localization_ui_bridge, analytics_design_bridge, master_code_merge

## How to Use It

**Creating a game** — open the game_director agent preview, type a description of the game you want, and the full pipeline executes. The more detail you give the better the output. Example prompts that work well:
- "Create a 3D open world RPG with realistic art style, multiplayer co-op, PC and console"
- "Create a mobile puzzle game with cute cartoon art, single player, iOS and Android"
- "Create a top-down horror survival game with pixel art, dark atmosphere, PC"
- "Create a 2D fighting game with anime art style, local multiplayer, PC and console"

**Modifying a game** — open the modification_chatbot agent preview, provide the domain and your change request. Examples:
- domain: physics — "Make the jump feel floatier and increase coyote time"
- domain: art — "Change the palette to a neon cyberpunk theme"
- domain: narrative — "Change the main character to a female mage instead of a blacksmith"
- domain: audio — "Make the combat music more intense with heavy drums"
- domain: gameplay — "Add a double jump ability and wall sliding mechanic"

## Example Output

On its first run the system generated **Shadowforge** — a complete 2D dark fantasy pixel art platformer — from the prompt "Create a 2D side-scrolling platformer game with pixel art style, dark fantasy theme, single player, target platform PC."

The output included the game title, a complete JSON game state schema with player stats, world data, entity definitions, progression, audio, UI, save data, and input mappings, a full narrative with premise, three-act structure, character name and backstory, a physics configuration at 60Hz fixed timestep with 1500 px/s² gravity, a color palette with hex values, a tileset plan for three distinct environments, an enemy roster with AI behavior types and stats, a boss encounter with two phase transitions, a skill tree with three ability branches, a full build pipeline targeting Windows, macOS, and Linux, and a store submission kit for Steam and the Mac App Store.

## Frontend Integration

### Step 1 — Set up the API connection
IBM watsonx Orchestrate exposes your agent via a REST API. Every time a user submits a game prompt your frontend calls this endpoint and receives the game spec JSON in response.

```
POST https://api.us-south.watsonx-orchestrate.cloud.ibm.com/v1/agent/invoke
Authorization: Bearer YOUR_API_KEY
Body: { "input": "Create a 2D platformer..." }
```

Get your API key from IBM watsonx Orchestrate — Settings — API Keys.

### Step 2 — Build the frontend with Next.js
Create a Next.js application with three screens.

**Screen 1 — Game Creator Chat** — a chat interface where the user types their game description. It calls the game_director agent, streams the response, and displays the reasoning output and final game spec. This is your main demo screen.

**Screen 2 — Game Spec Viewer** — displays the generated game spec as a structured document. Shows all sections: narrative, physics, art, audio, levels, and build config. Has a "Generate Game" button that passes the spec to the renderer.

**Screen 3 — Live Game Preview** — a Phaser.js canvas that reads the game spec JSON and renders a playable prototype. Player movement, platforms, enemies, and UI all come directly from the spec values your agents generated.

### Step 3 — Build the Phaser.js game renderer
Phaser.js is a JavaScript 2D game framework that runs in the browser. It reads the JSON spec your agents produce and renders a live playable game. Key mappings from spec to renderer:
- `physics.constants.gravity` → Phaser arcade physics gravity
- `art.palette` tokens → Phaser graphics fill colors
- `world.levels` layout → Phaser tilemap and platform positions
- `gameplay.player_controller` → Phaser input and movement config
- `entities.enemies` → Phaser enemy sprites with AI state machines
- `audio.sfx` → Phaser sound manager trigger mapping
- `ui.hud` → Phaser DOM overlay or canvas UI elements

### Step 4 — Build the Modification Panel
Add a sidebar to the game preview screen with a chat input. When the user types a change — "make gravity lighter" — it calls the modification_pipeline workflow with the correct domain tag, receives the updated spec values, and Phaser hot-reloads only the affected systems without restarting the game.

### Step 5 — Deploy
Deploy the Next.js app to Vercel. It connects to your IBM Orchestrate API in production. The game renderer runs entirely in the browser. No game engine install required for the end user.

## Recommended Tech Stack
- **Framework** — Next.js 14 with App Router
- **Game Renderer** — Phaser.js 3
- **UI Components** — Tailwind CSS and shadcn/ui
- **State Management** — Zustand
- **API Layer** — Next.js API routes proxying to IBM Orchestrate
- **Deployment** — Vercel
- **3D Option** — Three.js or Babylon.js if you want to extend to 3D games

## Recommended Build Order

1. Build the Next.js project and set up IBM Orchestrate API connection
2. Build the chat interface and verify game spec JSON is returned correctly
3. Build the spec viewer so you can see the full output structured
4. Build the Phaser renderer starting with player movement and platforms
5. Wire palette tokens and physics values from the spec into Phaser
6. Add enemies using the entity definitions from the spec
7. Add the HUD using the ui spec values
8. Build the modification panel and wire it to the modification pipeline
9. Add audio using the Phaser sound manager and the sfx manifest
10. Deploy to Vercel and connect your IBM Orchestrate production API key

## What Makes This a Strong Hackathon Demo

The live demo arc takes under three minutes. Type a game prompt, show the reasoning output with the work stream decomposition, show the complete Shadowforge spec that comes back with all its sections, open the Phaser renderer and show a playable version of the game running in the browser, then type a modification request and show only the affected agents rerun and the game update live.

That sequence demonstrates:
- Natural language to playable game
- Multi-agent parallel orchestration
- Conflict resolution and validation
- Live modification without full rebuild
- Cross-platform deployment readiness

All in one flow.
