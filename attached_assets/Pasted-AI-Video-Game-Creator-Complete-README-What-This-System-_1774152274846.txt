AI Video Game Creator — Complete README

What This System Is
A 56-agent AI game design engine built on IBM watsonx Orchestrate that takes a single natural language prompt and produces a complete, named, deployable video game specification. On its first run it generated Shadowforge. On its second run it generated Shadebound. Every run produces a unique fully specified game with a title, tagline, narrative, physics config, art direction, level layouts, audio system, UI design, build pipeline, and release kit.

What It Can Do
Game Design Generation takes any genre in 2D or 3D — platformer, RPG, FPS, RTS, puzzle, horror, racing, strategy — any art style, any target platform, and generates a complete design document covering every system in the game.
Physics Simulation Design uses dedicated agents to configure gravity, collision layers, rigidbody profiles, ragdoll systems, and cloth simulation. Physics constants are defined first and all downstream agents inherit from them so nothing conflicts.
Narrative and World Building generates story structure, character backstories and stats, branching dialogue trees, quest manifests with objectives and rewards, and a full world bible covering geography, factions, and lore.
Art and Visual Direction produces a canonical color palette with hex tokens per zone, a style guide covering line weight, shadow style, and texture density, sprite and mesh specifications for all characters and objects, and material definitions for every surface type.
Audio System Design designs the full adaptive music system, SFX manifest with trigger conditions, 3D spatial audio zone configurations, and voice acting scripts with emotional direction tags.
AI and NPC Behavior generates behavior trees for every NPC class, NavMesh configuration for pathfinding, multi-phase boss encounter designs, and crowd simulation parameters for ambient life.
UI and UX designs HUD layouts with game state bindings, full menu system with navigation flows, accessibility compliance checks for colorblind modes and remappable controls, and localization infrastructure for multiple languages.
Build and Deployment configures a full CI/CD pipeline, platform-specific build adaptations for PC, console, mobile, and web, store submission packages for Steam and App Store, and a live ops framework for post-launch patches and DLC.
Live Modification accepts natural language change requests like "make gravity 30% heavier" and routes only the affected agents to rerun. No full rebuild required. Changes propagate through integration bridges automatically.
Conflict Resolution runs integration agents continuously to catch conflicts between domain agents. If the color palette agent and shader agent write contradictory values, the conflict resolver applies priority rules and resolves it automatically without human intervention.
Quality Analysis runs six Generative Prompt nodes that score the spec quality before the pipeline fires, report conflicts and pipeline health, measure per-domain completeness and quality, and produce a final polished game summary card with title, tagline, and designer advice.

System Architecture
The system has four layers.
Layer 1 is the Command layer. The Game Director AI parses your prompt. The Genre and Scope Analyst classifies the game type. The Task Decomposition Engine breaks the work into typed agent tasks. The Dependency Graph Builder maps which agents can run simultaneously. The Agent Scheduler fires everything in the correct order.
Layer 2 is 44 Domain Agents across 13 domains — Concept and Narrative, World and Level Design, Art and Visual, Rendering, Physics, Animation, Gameplay and Mechanics, AI and NPC, Audio, UI/UX, Systems and Infrastructure, QA and Performance, and Build and Deployment. Each agent owns a single isolated domain and writes its output to a shared game state schema using dot-notation paths.
Layer 3 is 13 Integration Bridge Agents that wire domains together. The Art-to-Code Bridge translates palette tokens into shader uniforms. The Physics-Animation Bridge syncs collision geometry with animation rigs. The Level-Gameplay Bridge validates that all quest objectives are reachable within the level geometry. The Analytics-Design Bridge feeds bot playtesting data back to level and mechanics agents for tuning. Nothing enters the shared game state without passing the Schema Validator.
Layer 4 is the Modification Pipeline. A separate workflow handles live changes. The Modification Chatbot parses the change request. The Change Intent Classifier parses it into a structured intent object. The Change Router identifies the minimum affected agents. Only those agents rerun. The Change Validation Summarizer reports what changed, what was validated, and what side effects occurred.

The 6 Generative Prompt Nodes
These are not agents — they are LLM analysis nodes that run inside the workflows at key points to produce quality scores, conflict reports, performance metrics, and game summary cards.
spec_quality_scorer runs between genre_scope_analyst and task_decomposition_engine. It scores narrative coherence, physics validity, and art style consistency on a 0-100 scale before the full pipeline fires. If the overall score is below 60 it sets proceed to false and halts the pipeline.
conflict_analysis_reporter runs between conflict_resolver and master_code_merge. It counts total conflicts detected, total conflicts resolved, and conflicts needing human review. It scores overall pipeline health as HEALTHY, WARNING, or CRITICAL.
agent_performance_analyzer runs between master_code_merge and build_pipeline. It scores all 13 domains on completeness and quality from 0-100. It identifies domains scoring below 70 and sets a ready_for_build flag.
final_game_summary runs between build_pipeline and END. It produces the polished game summary card with title, tagline, genre, platform, core loop, unique selling point, similar games, overall quality score, and designer note.
change_intent_classifier runs between modification_chatbot and change_router. It parses natural language change requests into structured intent objects with domain, affected agents, parameters, cascade bridges, and a confidence score.
change_validation_summarizer runs between conflict_resolver and master_code_merge in the modification pipeline. It reports status, change summary, affected agents, parameters changed, side effects, and hot_reload_ready flag.

The 56 Agents
Command and Orchestration
game_director is the central orchestrator. It receives the initial natural language game prompt, parses it into a structured game specification, and coordinates all 56 downstream agents. It writes the initial game state schema to the shared context store and triggers the task decomposition engine.
genre_scope_analyst classifies the game type and constrains agent behavior. It outputs a structured genre profile including game dimension, genre tag, perspective, target platform, and estimated scope. This profile is injected into every subsequent agent task payload.
task_decomposition_engine breaks the full game spec into discrete agent workstreams. It generates a task manifest — a flat list of typed task objects each addressed to a specific agent — with target agent ID, input data slice, output schema, priority level, and dependency references.
dependency_graph_builder maps which agents can run in parallel and which must wait. It constructs a directed acyclic graph of agent dependencies and outputs a ranked execution plan.
agent_scheduler fires agents in the correct order, tracks progress, and handles retries. It consumes the dependency graph and dispatches task payloads in sequence.
modification_chatbot accepts live natural language change requests and routes them as delta updates. It parses each change request using intent classification, entity extraction, and scope detection.
change_router finds the minimum set of agents that need to rerun for a given change. It walks the dependency graph in reverse to identify every affected agent and bridge and suppresses all unaffected agents.
Concept and Narrative
story_architect generates story structure, world lore, and major plot beats. Writes to narrative.story.
character_design defines all characters with stats, backstory, and role. Writes to narrative.characters.
dialogue_script generates all in-game dialogue as branching trees. Writes to narrative.dialogue.
economy_design designs currency, rewards, item drops, and balance. Writes to gameplay.economy.
World and Level Design
world_bible establishes the physical and cultural rules of the game world. Writes to world.bible.
level_layout designs the spatial structure of each level. Writes to world.levels.
procedural_terrain generates open-world map data using seeds and biome rules. Writes to world.terrain.
spawn_events places enemies, items, and environmental triggers. Writes to world.levels.spawns.
Art and Visual
color_palette defines the canonical color system for the entire game. Writes to art.palette.
art_direction establishes the visual style guide. Writes to art.style_guide.
sprite_mesh_gen generates 2D sprite sheets or 3D mesh specifications. Writes to art.assets.
texture_material defines surface materials and texture maps. Writes to art.materials.
Rendering
lighting_design defines all light sources and per-zone lighting moods. Writes to rendering.lighting.
shader_writing writes GLSL/HLSL shader code for all visual effects. Writes to rendering.shaders.
post_processing configures the post-processing stack. Writes to rendering.post_processing.
particle_systems designs all particle effects. Writes to rendering.particles.
Physics
physics_constants defines all global physics parameters. Writes to physics.constants.
collision_system defines collision geometry, layers, and interaction masks. Writes to physics.collision.
rigidbody_forces configures dynamic object behavior. Writes to physics.rigidbodies.
ragdoll_cloth configures soft-body physics. Writes to physics.soft_body.
Animation
keyframe_animation defines all keyframed animation clips. Writes to animation.clips.
rigging_skinning defines bone hierarchies and vertex weight maps. Writes to animation.rigs.
animation_state_machine defines logic that transitions between animation states. Writes to animation.state_machines.
procedural_animation generates runtime animation that responds to physics and environment. Writes to animation.procedural.
Gameplay and Mechanics
core_mechanics defines fundamental rules, loops, and win/lose conditions. Writes to gameplay.mechanics.
player_controller generates movement and action logic. Writes to gameplay.player_controller.
progression_system designs how the player grows stronger over time. Writes to gameplay.progression.
quest_mission generates all quests and objectives with branching outcomes. Writes to gameplay.quests.
AI and NPC
npc_behavior_tree generates behavior logic for all non-player characters. Writes to ai.behavior_trees.
pathfinding configures navigation meshes and pathfinding algorithms. Writes to ai.navigation.
boss_combat_ai designs multi-phase boss encounters. Writes to ai.bosses.
crowd_simulation generates ambient crowd and flock behavior. Writes to ai.crowds.
Audio
music_composition generates the adaptive music system. Writes to audio.music.
sound_effects defines all SFX. Writes to audio.sfx.
spatial_audio configures 3D audio spatialization and reverb zones. Writes to audio.spatial.
voice_script produces voice acting scripts and TTS direction. Writes to audio.voice_scripts.
UI and UX
hud_design designs all heads-up display elements. Writes to ui.hud.
menu_system generates all menu screens. Writes to ui.menus.
accessibility audits UI and gameplay for accessibility compliance. Writes to ui.accessibility.
localization extracts all user-facing strings and generates i18n infrastructure. Writes to ui.localization.
Systems and Infrastructure
save_state designs the save system. Writes to systems.save.
input_mapping defines the full input scheme across all platforms. Writes to systems.input.
multiplayer_netcode configures networking architecture. Writes to systems.networking.
analytics_telemetry instruments the game for player behavior data. Writes to systems.analytics.
QA and Performance
bug_detection runs static analysis across all agent outputs. Writes to qa.bugs.
performance_profiler estimates and measures runtime performance. Writes to qa.performance.
lod_culling configures level-of-detail reduction and visibility culling. Writes to rendering.lod.
playtesting_simulation runs automated bot playtests. Writes to qa.playtests.
Build and Deployment
build_pipeline configures the CI/CD pipeline. Writes to build.pipeline.
platform_targeting adapts the build for each target platform. Writes to build.platforms.
store_submission prepares all assets for storefront submission. Writes to build.store_assets.
live_ops designs the post-launch operations system. Writes to build.live_ops.
Integration Agents
schema_validator gates every agent output before it enters the shared context store. Validates required fields, type conformance, range validation, reference integrity, and conflict pre-check. Returns APPROVED, REJECTED, or CONFLICT_FLAGGED. Has no collaborators and makes no calls to any other agent.
conflict_resolver detects when two agents write contradictory values and resolves them using four priority rules: genre conformance, downstream dependency priority, conservative value preference, and unresolvable escalation. Returns RESOLVED or NEEDS_HUMAN_REVIEW. Has no collaborators.
art_to_code_bridge translates palette tokens and style guide values into shader uniforms, CSS variables, material parameters, and particle color curves.
physics_animation_bridge syncs physics constants with animation rigs. When gravity changes it recalculates jump arc heights, ragdoll joint limits, and procedural animation IK distances.
level_gameplay_bridge validates that all quest objectives are reachable within the level geometry and all spawn points are accessible from player start.
narrative_mechanics_bridge wires story flags from the narrative domain to gameplay consequences — unlocks, stat changes, NPC disposition changes, and world state changes.
audio_event_bridge maps every gameplay event to audio trigger points across SFX and adaptive music systems.
ui_state_bridge binds HUD and menu elements to live game state variables with update frequency and interpolation settings.
asset_registry_bridge maintains a canonical asset ID registry. Assigns UUIDs to every asset and detects duplicate references and broken links.
platform_build_bridge rewrites agent outputs for each target platform — shader profiles, texture compression, input bindings, and API shims.
localization_ui_bridge tests translated strings against UI container bounds and flags overflow by language, element ID, and pixel amount.
analytics_design_bridge routes playtesting heatmaps and analytics data back to level layout, quest, and economy agents as structured design feedback.
master_code_merge assembles all agent outputs into a single lint-checked import-resolved codebase. Resolves import paths, deduplicates utilities, and packages a versioned build artifact.

Collaborator Assignments
Every agent has a defined collaborator list. Collaborators are the agents a given agent can delegate to or receive delegation from.
game_director collaborates with all 56 agents plus all 6 Generative Prompt nodes — genre_scope_analyst, task_decomposition_engine, dependency_graph_builder, agent_scheduler, modification_chatbot, change_router, and every domain and integration agent.
task_decomposition_engine collaborates with genre_scope_analyst, dependency_graph_builder, and agent_scheduler.
dependency_graph_builder collaborates with agent_scheduler.
agent_scheduler collaborates with schema_validator and conflict_resolver.
modification_chatbot collaborates with change_router, schema_validator, conflict_resolver, master_code_merge, change_intent_classifier, and change_validation_summarizer.
change_router collaborates with all 44 domain agents, all 13 integration bridges, schema_validator, conflict_resolver, change_intent_classifier, and change_validation_summarizer.
art_direction collaborates with color_palette, sprite_mesh_gen, and texture_material.
lighting_design collaborates with shader_writing, post_processing, and particle_systems.
collision_system collaborates with physics_constants.
rigidbody_forces collaborates with physics_constants and collision_system.
ragdoll_cloth collaborates with physics_constants and rigidbody_forces.
animation_state_machine collaborates with keyframe_animation and rigging_skinning.
procedural_animation collaborates with rigging_skinning and animation_state_machine.
core_mechanics collaborates with player_controller, progression_system, and quest_mission.
npc_behavior_tree collaborates with pathfinding, boss_combat_ai, and crowd_simulation.
music_composition collaborates with sound_effects, spatial_audio, and voice_script.
hud_design collaborates with menu_system, accessibility, and localization.
bug_detection collaborates with performance_profiler and playtesting_simulation.
lod_culling collaborates with performance_profiler.
build_pipeline collaborates with platform_targeting, store_submission, and live_ops.
conflict_resolver collaborates with schema_validator.
art_to_code_bridge collaborates with color_palette, art_direction, lighting_design, and shader_writing.
physics_animation_bridge collaborates with physics_constants, rigidbody_forces, rigging_skinning, and procedural_animation.
level_gameplay_bridge collaborates with level_layout, spawn_events, quest_mission, and player_controller.
narrative_mechanics_bridge collaborates with story_architect, dialogue_script, quest_mission, and core_mechanics.
audio_event_bridge collaborates with music_composition, sound_effects, core_mechanics, and animation_state_machine.
ui_state_bridge collaborates with hud_design, menu_system, core_mechanics, and progression_system.
asset_registry_bridge collaborates with sprite_mesh_gen, texture_material, sound_effects, and shader_writing.
platform_build_bridge collaborates with shader_writing, input_mapping, platform_targeting, and performance_profiler.
localization_ui_bridge collaborates with localization, hud_design, menu_system, and accessibility.
analytics_design_bridge collaborates with analytics_telemetry, playtesting_simulation, level_layout, core_mechanics, and economy_design.
master_code_merge collaborates with build_pipeline, schema_validator, bug_detection, and performance_profiler.
All leaf agents have no collaborators — genre_scope_analyst, story_architect, character_design, dialogue_script, economy_design, world_bible, level_layout, procedural_terrain, spawn_events, color_palette, sprite_mesh_gen, texture_material, shader_writing, post_processing, particle_systems, physics_constants, keyframe_animation, rigging_skinning, player_controller, progression_system, quest_mission, pathfinding, boss_combat_ai, crowd_simulation, sound_effects, spatial_audio, voice_script, menu_system, accessibility, localization, save_state, input_mapping, multiplayer_netcode, analytics_telemetry, performance_profiler, playtesting_simulation, platform_targeting, store_submission, live_ops, and schema_validator.

The Shared Context Store
The shared context store is the in-flow database of the entire system. It is a versioned JSON object that lives inside the IBM Orchestrate flow context and gets passed between all nodes. Every agent reads from it and writes to it using dot-notation paths. It exists only during a pipeline run and must be saved to an external database to persist between sessions.
{
  "metadata": {
    "title": "Shadebound",
    "version": "1.0.0",
    "genre": "Platformer",
    "platforms": ["PC"],
    "artStyle": "PixelArt",
    "theme": "DarkFantasy"
  },
  "player": {
    "id": "player_1",
    "position": { "x": 0, "y": 0 },
    "velocity": { "x": 0, "y": 0 },
    "health": 100,
    "maxHealth": 100,
    "stamina": 50,
    "maxStamina": 50,
    "abilities": ["Slash", "Dash", "SoulFlare"],
    "inventory": { "items": [], "currency": 0 }
  },
  "world": {
    "currentLevel": "level_01_entrance",
    "levels": {
      "level_01_entrance": {
        "tileset": "tiles_dark",
        "collisionMap": "col_entrance_01",
        "entities": [],
        "checkpoint": { "x": 10, "y": 5 }
      }
    },
    "globalVariables": {
      "timeOfDay": "Night",
      "weather": "Fog"
    }
  },
  "entities": {
    "enemies": {
      "goblin": { "hp": 30, "damage": 8, "speed": 2.5, "ai": "Patrol" },
      "wraith": { "hp": 45, "damage": 12, "speed": 3.2, "ai": "Hover" },
      "boss": {
        "hp": 400,
        "damage": 20,
        "speed": 1.8,
        "phases": [
          { "threshold": 0.7, "pattern": "FlameSweep" },
          { "threshold": 0.3, "pattern": "SoulStorm" }
        ]
      }
    },
    "items": {
      "soulShard": { "type": "currency", "value": 1 },
      "healthPotion": { "heal": 25 },
      "staminaCrystal": { "restore": 15 }
    }
  },
  "art": {
    "palette": {
      "primary": "#2B1B17",
      "secondary": "#5A2E2E",
      "accent": "#F2C94C",
      "background": "#1A1A2E"
    },
    "style_guide": {
      "style": "pixel_art",
      "line_weight": "1px",
      "shadow": "hard",
      "tile_size": 32
    },
    "assets": {},
    "materials": {}
  },
  "physics": {
    "constants": {
      "gravity": -1500,
      "friction": 0.85,
      "timestep": 60
    },
    "collision": {
      "layers": ["player", "enemy", "platform", "hazard"],
      "matrix": {}
    },
    "rigidbodies": {},
    "soft_body": {}
  },
  "rendering": {
    "lighting": {},
    "shaders": {},
    "post_processing": {},
    "particles": {},
    "lod": {}
  },
  "animation": {
    "clips": {},
    "rigs": {},
    "state_machines": {},
    "procedural": {}
  },
  "gameplay": {
    "mechanics": {
      "loop": "run_jump_attack_explore",
      "win_condition": "defeat_final_boss",
      "lose_condition": "health_reaches_zero"
    },
    "player_controller": {},
    "progression": {
      "experience": 0,
      "level": 1,
      "skillTree": {
        "SlashPower": 0,
        "DashCooldown": 0,
        "SoulFlareRadius": 0
      }
    },
    "quests": {},
    "economy": {}
  },
  "ai": {
    "behavior_trees": {},
    "navigation": {},
    "bosses": {},
    "crowds": {}
  },
  "audio": {
    "music": {
      "tracks": ["bg_dark", "bg_combat", "bg_boss"],
      "adaptive": true
    },
    "sfx": {
      "jump": "sfx_jump",
      "attack": "sfx_slash",
      "hit": "sfx_hit",
      "pickup": "sfx_pickup"
    },
    "spatial": {},
    "voice_scripts": {}
  },
  "ui": {
    "hud": {
      "healthBar": "ui_health",
      "staminaBar": "ui_stamina",
      "currency": "ui_currency"
    },
    "menus": {
      "pause": "ui_pause",
      "inventory": "ui_inventory"
    },
    "accessibility": {},
    "localization": {
      "en": { "title": "Shadebound", "start": "Press Start" },
      "es": { "title": "AtadoAlaSombra", "start": "Presiona Inicio" }
    }
  },
  "systems": {
    "save": {
      "profile": "default",
      "checkpoint": true,
      "format": "JSON"
    },
    "input": {
      "keyboard": {
        "moveLeft": "A",
        "moveRight": "D",
        "jump": "Space",
        "attack": "J",
        "dash": "K",
        "pause": "Esc"
      },
      "controller": {
        "moveLeft": "LeftStickLeft",
        "moveRight": "LeftStickRight",
        "jump": "A",
        "attack": "X",
        "dash": "Y",
        "pause": "Start"
      }
    },
    "networking": {},
    "analytics": {}
  },
  "qa": {
    "bugs": [],
    "performance": {},
    "playtests": {}
  },
  "build": {
    "pipeline": {},
    "platforms": ["windows", "macos", "linux"],
    "store_assets": {},
    "live_ops": {},
    "codebase": {}
  },
  "assets": {
    "registry": {}
  },
  "analysis": {
    "quality_scores": {
      "narrative_coherence": 0,
      "physics_validity": 0,
      "art_style_consistency": 0,
      "overall_spec_quality": 0,
      "proceed": true
    },
    "conflict_report": {
      "total_conflicts_detected": 0,
      "total_conflicts_resolved": 0,
      "needs_human_review": 0,
      "schema_rejections": 0,
      "overall_pipeline_health": "HEALTHY",
      "health_summary": ""
    },
    "performance_metrics": {
      "average_completeness": 0,
      "average_quality": 0,
      "most_complete_domain": "",
      "needs_attention": [],
      "ready_for_build": false
    },
    "game_summary_card": {
      "game_title": "",
      "tagline": "",
      "genre": "",
      "platform": "",
      "art_style": "",
      "core_loop": "",
      "unique_selling_point": "",
      "protagonist": "",
      "setting": "",
      "estimated_playtime": "",
      "difficulty": "",
      "mood": "",
      "similar_games": [],
      "pipeline_health": "",
      "overall_quality_score": 0,
      "ready_to_build": false,
      "designer_note": ""
    },
    "modification_history": []
  }
}


How Agents Write to the Context Store
Every agent writes to a specific dot-notation path. Nothing enters the store without passing schema_validator first.
game_director              → metadata
genre_scope_analyst        → metadata.genre, metadata.platforms, metadata.artStyle
color_palette              → art.palette
art_direction              → art.style_guide
sprite_mesh_gen            → art.assets
texture_material           → art.materials
lighting_design            → rendering.lighting
shader_writing             → rendering.shaders
post_processing            → rendering.post_processing
particle_systems           → rendering.particles
physics_constants          → physics.constants
collision_system           → physics.collision
rigidbody_forces           → physics.rigidbodies
ragdoll_cloth              → physics.soft_body
keyframe_animation         → animation.clips
rigging_skinning           → animation.rigs
animation_state_machine    → animation.state_machines
procedural_animation       → animation.procedural
story_architect            → narrative.story
character_design           → narrative.characters
dialogue_script            → narrative.dialogue
economy_design             → gameplay.economy
world_bible                → world.bible
level_layout               → world.levels
procedural_terrain         → world.terrain
spawn_events               → world.levels.spawns
core_mechanics             → gameplay.mechanics
player_controller          → gameplay.player_controller
progression_system         → gameplay.progression
quest_mission              → gameplay.quests
npc_behavior_tree          → ai.behavior_trees
pathfinding                → ai.navigation
boss_combat_ai             → ai.bosses
crowd_simulation           → ai.crowds
music_composition          → audio.music
sound_effects              → audio.sfx
spatial_audio              → audio.spatial
voice_script               → audio.voice_scripts
hud_design                 → ui.hud
menu_system                → ui.menus
accessibility              → ui.accessibility
localization               → ui.localization
save_state                 → systems.save
input_mapping              → systems.input
multiplayer_netcode        → systems.networking
analytics_telemetry        → systems.analytics
bug_detection              → qa.bugs
performance_profiler       → qa.performance
lod_culling                → rendering.lod
playtesting_simulation     → qa.playtests
build_pipeline             → build.pipeline
platform_targeting         → build.platforms
store_submission           → build.store_assets
live_ops                   → build.live_ops
asset_registry_bridge      → assets.registry
master_code_merge          → build.codebase
spec_quality_scorer        → analysis.quality_scores
conflict_analysis_reporter → analysis.conflict_report
agent_performance_analyzer → analysis.performance_metrics
final_game_summary         → analysis.game_summary_card


External Database Integration — Supabase
The shared context store only lives for the duration of one pipeline run. To persist game specs, user sessions, modification history, and analytics between sessions you need Supabase.
Setup:
supabase.com → New project → copy Project URL and anon key

Environment variables:
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key


Table 1 — game_sessions
Stores every game creation pipeline run.
create table game_sessions (
  id                    uuid primary key default gen_random_uuid(),
  created_at            timestamp with time zone default now(),
  user_id               text,
  prompt                text not null,
  game_title            text,
  tagline               text,
  genre                 text,
  platform              text,
  art_style             text,
  pipeline_health       text,
  overall_quality_score integer,
  ready_to_build        boolean default false,
  designer_note         text,
  narrative_coherence   integer,
  physics_validity      integer,
  total_conflicts       integer,
  conflicts_resolved    integer,
  average_completeness  integer,
  average_quality       integer,
  full_spec             jsonb,
  status                text default 'running'
);

What each column maps to in the pipeline output:
id                    → auto-generated
created_at            → auto-generated
user_id               → from auth session
prompt                → original designer input
game_title            → final_game_summary.game_title
tagline               → final_game_summary.tagline
genre                 → genre_scope_analyst output
platform              → genre_scope_analyst output
art_style             → art_direction output
pipeline_health       → conflict_analysis_reporter.overall_pipeline_health
overall_quality_score → spec_quality_scorer.overall_spec_quality
ready_to_build        → agent_performance_analyzer.ready_for_build
designer_note         → final_game_summary.designer_note
narrative_coherence   → spec_quality_scorer.narrative_coherence
physics_validity      → spec_quality_scorer.physics_validity
total_conflicts       → conflict_analysis_reporter.total_conflicts_detected
conflicts_resolved    → conflict_analysis_reporter.total_conflicts_resolved
average_completeness  → agent_performance_analyzer.average_completeness
average_quality       → agent_performance_analyzer.average_quality
full_spec             → complete shared context store JSON
status                → running, complete, or failed


Table 2 — modifications
Stores every change request made through the modification pipeline.
create table modifications (
  id                  uuid primary key default gen_random_uuid(),
  created_at          timestamp with time zone default now(),
  session_id          uuid references game_sessions(id),
  user_id             text,
  change_request      text not null,
  domain              text not null,
  intent              text,
  affected_agents     text[],
  confidence          integer,
  status              text,
  change_summary      text,
  hot_reload_ready    boolean default false,
  conflicts_resolved  integer default 0,
  side_effects        text[],
  recommendation      text,
  parameters_changed  jsonb
);

What each column maps to:
change_request      → original natural language input
domain              → flow.input.domain
intent              → change_intent_classifier.intent
affected_agents     → change_intent_classifier.affected_agents
confidence          → change_intent_classifier.confidence
status              → change_validation_summarizer.status
change_summary      → change_validation_summarizer.change_summary
hot_reload_ready    → change_validation_summarizer.hot_reload_ready
conflicts_resolved  → change_validation_summarizer.conflicts_resolved
side_effects        → change_validation_summarizer.side_effects
recommendation      → change_validation_summarizer.recommendation
parameters_changed  → change_validation_summarizer.parameters_changed


Table 3 — domain_scores
Stores per-domain performance scores from agent_performance_analyzer for each run.
create table domain_scores (
  id              uuid primary key default gen_random_uuid(),
  session_id      uuid references game_sessions(id),
  domain          text not null,
  completeness    integer,
  quality         integer,
  notes           text
);

The 13 domain values stored are narrative, world, art, rendering, physics, animation, gameplay, ai_npc, audio, ui, systems, qa, and build.

Table 4 — voice_lines
Stores ElevenLabs generated audio files linked to game sessions.
create table voice_lines (
  id              uuid primary key default gen_random_uuid(),
  session_id      uuid references game_sessions(id),
  line_id         text not null,
  character       text not null,
  text            text not null,
  emotion         text,
  trigger         text,
  audio_url       text,
  created_at      timestamp with time zone default now()
);


Table 5 — users
Stores user accounts and preferences.
create table users (
  id              uuid primary key default gen_random_uuid(),
  created_at      timestamp with time zone default now(),
  clerk_id        text unique,
  email           text unique,
  display_name    text,
  plan            text default 'free',
  games_created   integer default 0,
  last_active     timestamp with time zone
);


Saving Pipeline Output to Supabase
When the game_creation_pipeline completes it returns flow output to your Next.js frontend. Your frontend immediately saves it to Supabase.
// app/api/save-game/route.ts
import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(request: NextRequest) {
  const { pipelineOutput, userId, prompt } = await request.json()

  const { data: session, error } = await supabase
    .from('game_sessions')
    .insert({
      user_id:               userId,
      prompt:                prompt,
      game_title:            pipelineOutput.game_title,
      tagline:               pipelineOutput.tagline,
      genre:                 pipelineOutput.genre,
      platform:              pipelineOutput.platform,
      pipeline_health:       pipelineOutput.pipeline_health,
      overall_quality_score: pipelineOutput.overall_quality_score,
      ready_to_build:        pipelineOutput.ready_to_build,
      designer_note:         pipelineOutput.designer_note,
      narrative_coherence:   pipelineOutput.narrative_coherence,
      physics_validity:      pipelineOutput.physics_validity,
      total_conflicts:       pipelineOutput.total_conflicts_detected,
      conflicts_resolved:    pipelineOutput.total_conflicts_resolved,
      average_completeness:  pipelineOutput.average_completeness,
      average_quality:       pipelineOutput.average_quality,
      full_spec:             pipelineOutput.game_build,
      status:                'complete'
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error }, { status: 500 })

  if (pipelineOutput.domains) {
    const domainRows = Object.entries(pipelineOutput.domains)
      .map(([domain, scores]: any) => ({
        session_id:   session.id,
        domain:       domain,
        completeness: scores.completeness,
        quality:      scores.quality,
        notes:        scores.notes
      }))
    await supabase.from('domain_scores').insert(domainRows)
  }

  return NextResponse.json({ session_id: session.id })
}


Saving Modifications to Supabase
// app/api/save-modification/route.ts
export async function POST(request: NextRequest) {
  const { modificationOutput, sessionId, userId, changeRequest, domain } =
    await request.json()

  const { data, error } = await supabase
    .from('modifications')
    .insert({
      session_id:         sessionId,
      user_id:            userId,
      change_request:     changeRequest,
      domain:             domain,
      intent:             modificationOutput.intent,
      affected_agents:    modificationOutput.affected_agents,
      confidence:         modificationOutput.confidence,
      status:             modificationOutput.status,
      change_summary:     modificationOutput.change_summary,
      hot_reload_ready:   modificationOutput.hot_reload_ready,
      conflicts_resolved: modificationOutput.conflicts_resolved,
      side_effects:       modificationOutput.side_effects,
      recommendation:     modificationOutput.recommendation,
      parameters_changed: modificationOutput.parameters_changed
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error }, { status: 500 })
  return NextResponse.json({ modification_id: data.id })
}


Querying the Database
Get all games for a user:
const { data: games } = await supabase
  .from('game_sessions')
  .select('*')
  .eq('user_id', userId)
  .order('created_at', { ascending: false })

Get a game with all domain scores and modification history:
const { data: game } = await supabase
  .from('game_sessions')
  .select(`*, domain_scores (*), modifications (*)`)
  .eq('id', sessionId)
  .single()

Get modification history for a game:
const { data: modifications } = await supabase
  .from('modifications')
  .select('*')
  .eq('session_id', sessionId)
  .order('created_at', { ascending: true })


Supabase Storage for Voice Audio
Create a storage bucket for ElevenLabs audio files:
Supabase dashboard → Storage → New bucket
Name: voice-lines
Public: true

Upload audio:
const audioBuffer = await elevenlabsResponse.arrayBuffer()
const fileName = `${sessionId}/${lineId}.mp3`

const { data } = await supabase.storage
  .from('voice-lines')
  .upload(fileName, audioBuffer, {
    contentType: 'audio/mpeg',
    upsert: true
  })

const { data: urlData } = supabase.storage
  .from('voice-lines')
  .getPublicUrl(fileName)

await supabase.from('voice_lines').insert({
  session_id: sessionId,
  line_id:    lineId,
  character:  character,
  text:       text,
  emotion:    emotion,
  trigger:    trigger,
  audio_url:  urlData.publicUrl
})


Complete Data Flow
Designer types prompt
        ↓
IBM Orchestrate game_director receives input
        ↓
game_creation_pipeline executes — 56 agents + 6 Generative Prompts
        ↓
spec_quality_scorer scores the spec before pipeline fires
        ↓
All 44 domain agents write to shared context store
        ↓
13 integration bridges validate and synchronize domain outputs
        ↓
schema_validator gates every write
        ↓
conflict_resolver resolves contradictions
        ↓
conflict_analysis_reporter scores pipeline health
        ↓
master_code_merge assembles final codebase
        ↓
agent_performance_analyzer scores all 13 domains
        ↓
build_pipeline configures CI/CD
        ↓
final_game_summary produces game card with title, tagline, scores
        ↓
Flow output returned to Next.js frontend
        ↓
Next.js saves to Supabase game_sessions table
Next.js saves domain scores to domain_scores table
        ↓
Designer makes a change request
        ↓
modification_pipeline executes
        ↓
change_intent_classifier parses the request
        ↓
change_router routes to minimum affected agents
        ↓
Affected agents rerun
        ↓
change_validation_summarizer reports what changed
        ↓
Next.js saves to Supabase modifications table
        ↓
ElevenLabs generates voice audio from voice_script output
        ↓
Audio saved to Supabase Storage voice-lines bucket
Audio URL saved to Supabase voice_lines table
        ↓
Phaser.js reads full_spec from game_sessions
Phaser.js reads audio URLs from voice_lines
Phaser.js renders live playable game in browser


Complete Environment Variables
# IBM watsonx Orchestrate
IBM_CLOUD_API_KEY=your_ibm_cloud_api_key
WXO_INSTANCE_URL=https://api.us-south.watsonx-orchestrate.cloud.ibm.com
WXO_SPACE_ID=your_space_id
WATSONX_PROJECT_ID=your_watsonx_project_id
WATSONX_REGION=us-south
GAME_DIRECTOR_AGENT_ID=your_game_director_agent_id
MODIFICATION_CHATBOT_AGENT_ID=your_modification_chatbot_agent_id
GAME_CREATION_PIPELINE_ID=your_pipeline_id
MODIFICATION_PIPELINE_ID=your_modification_pipeline_id

# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# Auth
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_xxxxxxxxxxxx
CLERK_SECRET_KEY=sk_test_xxxxxxxxxxxx

# ElevenLabs
ELEVENLABS_API_KEY=your_elevenlabs_key


Frontend Tech Stack
Framework          Next.js 14 with App Router
Game Renderer      Phaser.js 3
UI Components      Tailwind CSS and shadcn/ui
State Management   Zustand
API Layer          Next.js API routes proxying to IBM Orchestrate
Database           Supabase (PostgreSQL)
Auth               Clerk
Voice              ElevenLabs
Deployment         Vercel
3D Option          Three.js or Babylon.js


Example Output
On its first run the system generated Shadowforge from the prompt "Create a 2D side-scrolling platformer game with pixel art style, dark fantasy theme, single player, target platform PC." On its second run from the same prompt type it generated Shadebound. Every run produces a unique title, narrative, and specification.
The Shadowforge output included the game title and tagline, a complete JSON game state schema with player stats, world data, entity definitions, progression, audio, UI, save data, and input mappings, a full narrative with premise, three-act structure, character name and backstory, a physics configuration at 60Hz fixed timestep with 1500 px/s² gravity, a color palette with hex values, a tileset plan for three distinct environments, an enemy roster with AI behavior types and stats, a boss encounter with two phase transitions, a skill tree with three ability branches, a full build pipeline targeting Windows, macOS, and Linux, and a store submission kit for Steam and the Mac App Store.

Hackathon Demo Arc
The live demo takes under three minutes. Type a game prompt. Show the reasoning output with the work stream decomposition. Show the complete game spec that comes back with all its sections. Show the quality scores from spec_quality_scorer. Show the conflict report from conflict_analysis_reporter. Show the domain performance breakdown from agent_performance_analyzer. Show the final game summary card with title, tagline, and designer note. Then type a modification request and show only the affected agents rerun and the change validation summary confirm the update. That sequence demonstrates natural language to fully specified game, 56-agent orchestration, automated quality analysis, conflict resolution, and live modification without full rebuild — all in one continuous flow.

