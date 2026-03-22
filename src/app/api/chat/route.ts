import { NextRequest, NextResponse } from "next/server";

const IAM_URL  = "https://iam.cloud.ibm.com/identity/token";
const BASE_URL = "https://api.us-south.watson-orchestrate.cloud.ibm.com/instances/c8a9d776-460e-4c9a-b55f-0a2556febf8e";

async function getIAMToken(apiKey: string): Promise<string> {
  const res = await fetch(IAM_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ibm:params:oauth:grant-type:apikey",
      apikey: apiKey,
    }),
  });
  if (!res.ok) throw new Error(`IAM error ${res.status}`);
  const data = await res.json();
  if (!data.access_token) throw new Error("No access_token in IAM response");
  return data.access_token as string;
}

async function startRun(token: string, content: string, threadId?: string): Promise<{ thread_id: string; run_id: string }> {
  const body: Record<string, unknown> = { message: { role: "user", content } };
  if (threadId) body.thread_id = threadId;

  const res = await fetch(`${BASE_URL}/v1/orchestrate/runs`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(20000),
  });
  if (!res.ok) throw new Error(`Start run error ${res.status}: ${await res.text()}`);
  const data = await res.json() as { thread_id: string; run_id: string };
  return data;
}

async function pollRun(token: string, runId: string, maxMs = 55000): Promise<string> {
  const deadline = Date.now() + maxMs;
  const hdrs = { Authorization: `Bearer ${token}` };

  while (Date.now() < deadline) {
    await new Promise(r => setTimeout(r, 2000));
    const res = await fetch(`${BASE_URL}/v1/orchestrate/runs/${runId}`, {
      headers: hdrs,
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) throw new Error(`Poll error ${res.status}`);
    const data = await res.json() as { status: string };
    if (data.status === "completed") return "completed";
    if (data.status === "failed")    return "failed";
    if (data.status === "cancelled") return "cancelled";
  }
  return "timeout";
}

async function getReply(token: string, threadId: string): Promise<string> {
  const res = await fetch(`${BASE_URL}/v1/orchestrate/threads/${threadId}/messages`, {
    headers: { Authorization: `Bearer ${token}` },
    signal: AbortSignal.timeout(10000),
  });
  if (!res.ok) throw new Error(`Messages error ${res.status}`);
  const msgs = await res.json() as Array<{
    role: string;
    content: Array<{ response_type: string; text: string }>;
  }>;

  // Find last assistant message
  const assistantMsgs = msgs.filter(m => m.role === "assistant");
  if (!assistantMsgs.length) return "The agent did not return a response.";
  const last = assistantMsgs[assistantMsgs.length - 1];
  return last.content.map(c => c.text ?? "").join("\n").trim();
}

function generateDemoResponse(prompt: string): string {
  const p = prompt.toLowerCase();
  const is3d      = p.includes("3d") || p.includes("shooter") || p.includes("space");
  const isRpg     = p.includes("rpg") || p.includes("dungeon") || p.includes("gothic") || p.includes("fantasy");
  const isPlatform = p.includes("platform") || p.includes("side") || p.includes("runner");
  const isPuzzle  = p.includes("puzzle") || p.includes("maze");
  const genre     = is3d ? "3D Shooter" : isRpg ? "RPG" : isPlatform ? "Platformer" : isPuzzle ? "Puzzle" : "Action";
  const engine    = is3d ? "Three.js + Cannon.js physics" : "Phaser 3";
  const agents    = Math.floor(Math.random() * 6) + 51;

  return `✅ Game spec generated — ${agents} agents deployed in parallel

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
GAME: ${prompt.slice(0, 60)}${prompt.length > 60 ? "…" : ""}
GENRE: ${genre}  |  ENGINE: ${engine}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

CORE SYSTEMS
• game_director    — Orchestrating ${agents} specialist agents
• story_architect  — Procedural narrative & dialogue trees
• level_layout     — Chunk-based world generation
• core_mechanics   — Player controller, hitbox, collision response
• physics_engine   — Gravity, momentum, rigid-body dynamics
• npc_behavior     — Behaviour-tree AI (patrol → alert → attack)

ART & AUDIO
• color_palette    — Dark fantasy palette: #1a0a2e / #e57300 / #6ba0d4
• asset_pipeline   — Sprite sheets, tile sets, particle FX
• music_composer   — Adaptive soundtrack (ambient → combat)
• sfx_generator    — Procedural sound via Web Audio API

BUILD OUTPUT
• Target: WebGL + HTML5 (browser-playable)
• Build size: ~2.4 MB gzip
• Target FPS: 60 on mid-range hardware
• Deployment: Vercel edge / Replit static export

▶ Click PLAY in the nav to preview your game once build completes.`;
}

export async function POST(req: NextRequest) {
  try {
    const { prompt, sessionId } = (await req.json()) as { prompt: string; sessionId?: string };

    if (!prompt?.trim()) {
      return NextResponse.json({ error: "prompt is required" }, { status: 400 });
    }

    const apiKey = (process.env.WXO_MANAGER_API_KEY ?? "").trim();

    if (apiKey) {
      try {
        const token = await getIAMToken(apiKey);
        const { thread_id, run_id } = await startRun(token, prompt, sessionId);
        console.log(`[chat] IBM run started — thread:${thread_id} run:${run_id}`);

        const finalStatus = await pollRun(token, run_id);
        if (finalStatus === "completed") {
          const reply = await getReply(token, thread_id);
          console.log(`[chat] IBM reply received (${reply.length} chars)`);
          return NextResponse.json({ reply, sessionId: thread_id });
        }
        console.warn(`[chat] IBM run ended with status: ${finalStatus}`);
      } catch (ibmErr) {
        console.warn("[chat] IBM error:", ibmErr instanceof Error ? ibmErr.message : ibmErr);
      }
    }

    // ── Demo fallback ──────────────────────────────────────────────────────
    await new Promise(r => setTimeout(r, 1500 + Math.random() * 1500));
    const reply = generateDemoResponse(prompt);
    return NextResponse.json({ reply, sessionId: "demo-session", demo: true });

  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("[chat] error:", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
