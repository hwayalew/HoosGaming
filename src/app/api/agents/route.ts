/**
 * Purpose: List game-relevant watsonx Orchestrate agents for the Create sidebar.
 * Called by: create/page.tsx
 * Input: GET
 * Output: { agents, mock?, error? } — mock agents if WXO_MANAGER_API_KEY missing or IBM errors
 * Auth: None
 */
import { NextResponse } from "next/server";
import { WXO_INSTANCE_API_BASE } from "@/lib/app-config";

const IAM_URL  = "https://iam.cloud.ibm.com/identity/token";

const DOMAIN_MAP: Record<string, string> = {
  game_director: "Orchestration", task_decomposition_engine: "Orchestration",
  agent_scheduler: "Orchestration", agent_dependency_graph_builder: "Orchestration",
  master_code_merge: "Orchestration", schema_validator: "Orchestration",
  conflict_resolver: "Orchestration", conflict_analysis_reporter: "Orchestration",
  change_router: "Orchestration", change_intent_classifier: "Orchestration",
  change_validation_summarizer: "Orchestration", spec_quality_scorer: "Orchestration",
  agent_performance_analyzer: "Orchestration", final_game_summary: "Orchestration",
  story_architect: "Narrative", world_bible: "Narrative", character_design: "Narrative",
  dialogue_script: "Narrative", quest_mission: "Narrative", spawn_events: "Narrative",
  core_mechanics: "Mechanics", player_controller: "Mechanics", progression_system: "Mechanics",
  input_mapping: "Mechanics", save_state: "Mechanics", accessibility: "Mechanics",
  agent_economy_design: "Mechanics",
  physics_constants: "Physics", rigidbody_forces: "Physics",
  collision_system: "Physics", ragdoll_cloth: "Physics",
  animation_state_machine: "Animation", keyframe_animation: "Animation",
  procedural_animation: "Animation", rigging_skinning: "Animation",
  color_palette: "Art", sprite_mesh_gen: "Art", texture_material: "Art",
  art_direction: "Art",
  shader_writing: "Rendering", lighting_design: "Rendering",
  particle_systems: "Rendering", post_processing: "Rendering",
  level_layout: "Level", procedural_terrain: "Level",
  music_composition: "Audio", sound_effects: "Audio",
  spatial_audio: "Audio", voice_script: "Audio",
  hud_design: "UI", menu_system: "UI", localization: "UI",
  npc_behavior_tree: "AI / NPC", pathfinding: "AI / NPC",
  boss_combat_ai: "AI / NPC", crowd_simulation: "AI / NPC",
  performance_profiler: "QA", bug_detection: "QA",
  lod_culling: "QA", playtesting_simulation: "QA", analytics_telemetry: "QA",
  build_pipeline: "Deploy", platform_targeting: "Deploy",
  store_submission: "Deploy", live_ops: "Deploy",
  art_to_code_bridge: "Bridge", physics_animation_bridge: "Bridge",
  level_gameplay_bridge: "Bridge", narrative_mechanics_bridge: "Bridge",
  audio_event_bridge: "Bridge", ui_state_bridge: "Bridge",
  asset_registry_bridge: "Bridge", analytics_design_bridge: "Bridge",
  platform_build_bridge: "Bridge", localization_ui_bridge: "Bridge",
  agent_modification_chatbot: "Orchestration",
};

const GAME_AGENT_EXCLUDE = new Set([
  "QCInspectorAgent", "YieldForecasterAgent", "SupplyChainRiskAgent",
  "BOMEngineerAgent", "DesignOptimizerAgent", "SimulationAnalystAgent",
  "ChipArchitectAgent", "AGENT_NCCUAI", "AskOrchestrate", "Time_Date",
]);

function getDomain(name: string): string {
  for (const [prefix, domain] of Object.entries(DOMAIN_MAP)) {
    if (name.toLowerCase().startsWith(prefix.toLowerCase())) return domain;
  }
  if (name.includes("bridge")) return "Bridge";
  return "Orchestration";
}

function isGameAgent(name: string): boolean {
  for (const exc of Array.from(GAME_AGENT_EXCLUDE)) {
    if (name.startsWith(exc)) return false;
  }
  return true;
}

let _cache: { agents: AgentInfo[]; at: number } | null = null;
const CACHE_MS = 55 * 60 * 1000;

interface AgentInfo {
  id: string;
  name: string;
  cleanName: string;
  domain: string;
  description: string;
}

interface IBMAgent {
  id: string;
  name: string;
  description?: string;
}

async function getIAMToken(apiKey: string): Promise<string> {
  const res = await fetch(IAM_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ grant_type: "urn:ibm:params:oauth:grant-type:apikey", apikey: apiKey }),
  });
  const data = await res.json() as { access_token?: string };
  if (!data.access_token) throw new Error("IAM token failed");
  return data.access_token;
}

async function fetchAgents(token: string): Promise<AgentInfo[]> {
  const all: IBMAgent[] = [];
  for (let offset = 0; offset < 200; offset += 100) {
    const r = await fetch(`${WXO_INSTANCE_API_BASE}/v1/orchestrate/agents?limit=100&offset=${offset}`, {
      headers: { Authorization: `Bearer ${token}` },
      signal: AbortSignal.timeout(15000),
    });
    if (!r.ok) break;
    const d = await r.json() as IBMAgent[] | Record<string, IBMAgent>;
    const arr: IBMAgent[] = Array.isArray(d) ? d : (Object.values(d).filter(v => v && typeof v === "object" && "id" in v) as IBMAgent[]);
    all.push(...arr);
    if (arr.length < 100) break;
  }

  return all
    .filter(a => isGameAgent(a.name))
    .map(a => {
      const cleanName = a.name.replace(/_[A-Z0-9]{4,6}[a-z0-9]*$/, "").replace(/__/g, "_").replace(/_+$/, "");
      return {
        id: a.id,
        name: a.name,
        cleanName,
        domain: getDomain(a.name),
        description: (a.description ?? "").slice(0, 120),
      };
    })
    .sort((a, b) => {
      const domainOrder = ["Orchestration","Narrative","Mechanics","Physics","Animation","Art","Rendering","Level","Audio","UI","AI / NPC","QA","Deploy","Bridge"];
      return domainOrder.indexOf(a.domain) - domainOrder.indexOf(b.domain) || a.cleanName.localeCompare(b.cleanName);
    });
}

export async function GET() {
  if (_cache && Date.now() - _cache.at < CACHE_MS) {
    return NextResponse.json({ agents: _cache.agents, cached: true });
  }

  const apiKey = process.env.WXO_MANAGER_API_KEY?.trim() ?? "";
  if (!apiKey) {
    return NextResponse.json({ agents: getMockAgents(), mock: true });
  }

  try {
    const token = await getIAMToken(apiKey);
    const agents = await fetchAgents(token);
    _cache = { agents, at: Date.now() };
    return NextResponse.json({ agents });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("[agents]", msg);
    return NextResponse.json({ agents: getMockAgents(), mock: true, error: msg });
  }
}

function getMockAgents(): AgentInfo[] {
  return [
    { id:"1", name:"game_director_0459Oz",       cleanName:"game_director",       domain:"Orchestration", description:"Central orchestrator — coordinates all downstream agents." },
    { id:"2", name:"task_decomposition_engine",   cleanName:"task_decomposition",  domain:"Orchestration", description:"Breaks game prompt into parallelizable sub-tasks." },
    { id:"3", name:"story_architect_8933J9",      cleanName:"story_architect",     domain:"Narrative",     description:"Builds world lore, story beats, and narrative arc." },
    { id:"4", name:"character_design_2762Mf",     cleanName:"character_design",    domain:"Narrative",     description:"Designs protagonist, NPCs, and enemy archetypes." },
    { id:"5", name:"level_layout_96746u",         cleanName:"level_layout",        domain:"Level",         description:"Generates level geometry and platform placement." },
    { id:"6", name:"core_mechanics_3372v5",       cleanName:"core_mechanics",      domain:"Mechanics",     description:"Player movement, jumping, and core interaction loops." },
    { id:"7", name:"physics_constants_5169Sn",    cleanName:"physics_constants",   domain:"Physics",       description:"Gravity, mass, friction, and collision coefficients." },
    { id:"8", name:"npc_behavior_tree_9120lp",    cleanName:"npc_behavior_tree",   domain:"AI / NPC",      description:"State-machine AI for enemies: patrol → alert → attack." },
    { id:"9", name:"music_composition_3458Hp",    cleanName:"music_composition",   domain:"Audio",         description:"Adaptive soundtrack: ambient and combat layers." },
    { id:"10",name:"hud_design_8627fb",           cleanName:"hud_design",          domain:"UI",            description:"HUD overlay: health, score, minimap, ability icons." },
  ];
}
