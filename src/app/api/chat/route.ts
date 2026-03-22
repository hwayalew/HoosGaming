import { NextRequest, NextResponse } from "next/server";

const IAM_URL = "https://iam.cloud.ibm.com/identity/token";
const WA_VERSION = "2023-06-15";

async function getIAMToken(): Promise<string> {
  const apiKey = process.env.WXO_API_KEY?.trim();
  if (!apiKey) throw new Error("WXO_API_KEY not set");
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
  return data.access_token as string;
}

function instanceIdFromCrn(crn: string): string | null {
  return crn.split(":")?.[7] ?? null;
}

/** Generate a realistic game spec based on prompt keywords */
function generateDemoResponse(prompt: string): string {
  const p = prompt.toLowerCase();
  const is3d = p.includes("3d") || p.includes("shooter") || p.includes("space");
  const isRpg = p.includes("rpg") || p.includes("dungeon") || p.includes("gothic") || p.includes("fantasy");
  const isPlatformer = p.includes("platform") || p.includes("side") || p.includes("runner");
  const isPuzzle = p.includes("puzzle") || p.includes("maze") || p.includes("crystal");

  const genre = is3d ? "3D Shooter" : isRpg ? "RPG" : isPlatformer ? "Platformer" : isPuzzle ? "Puzzle" : "Action";
  const engine = is3d ? "Three.js + Cannon.js physics" : "Phaser 3";
  const agents = Math.floor(Math.random() * 6) + 51;

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

▶ Click PLAY in the nav to preview your game once build completes.

─────────────────────────────────
⚠  Demo mode — IBM watsonx Orchestrate will replace this output
   once RSA key pair is configured (see setup guide).`;
}

export async function POST(req: NextRequest) {
  try {
    const { prompt, sessionId: existingSession } = (await req.json()) as {
      prompt: string;
      sessionId?: string;
    };

    if (!prompt?.trim()) {
      return NextResponse.json({ error: "prompt is required" }, { status: 400 });
    }

    const hostURL = process.env.NEXT_PUBLIC_WXO_HOST_URL?.replace(/\/$/, "");
    const agentId = process.env.NEXT_PUBLIC_WXO_AGENT_ID?.trim();
    const crn     = process.env.NEXT_PUBLIC_WXO_CRN?.trim();

    // ── Attempt IBM watsonx Orchestrate REST API ──────────────────────────
    if (hostURL && agentId && crn) {
      const instanceId = instanceIdFromCrn(crn);
      if (instanceId) {
        try {
          const token = await getIAMToken();
          const headers = {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          };
          const baseUrl = `${hostURL}/instances/${instanceId}/v2/assistants/${agentId}`;

          let sessionId = existingSession;
          if (!sessionId) {
            const sessRes = await fetch(`${baseUrl}/sessions?version=${WA_VERSION}`, {
              method: "POST", headers,
            });
            if (sessRes.ok) {
              const sessData = await sessRes.json();
              sessionId = sessData.session_id as string;
            }
          }

          if (sessionId) {
            const msgRes = await fetch(
              `${baseUrl}/sessions/${sessionId}/message?version=${WA_VERSION}`,
              {
                method: "POST", headers,
                body: JSON.stringify({ input: { message_type: "text", text: prompt } }),
              }
            );
            if (msgRes.ok) {
              const msgData = await msgRes.json();
              let reply = "";
              const generic = msgData?.output?.generic as Array<Record<string, unknown>> | undefined;
              if (Array.isArray(generic)) {
                reply = generic.filter(g => g.response_type === "text")
                  .map(g => g.text as string).join("\n\n");
              }
              if (!reply && typeof msgData?.output?.text === "string") reply = msgData.output.text;
              if (!reply) reply = JSON.stringify(msgData, null, 2);
              return NextResponse.json({ reply, sessionId });
            }
          }
        } catch (ibmErr) {
          console.warn("[chat] IBM API unavailable:", ibmErr instanceof Error ? ibmErr.message : ibmErr);
        }
      }
    }

    // ── Fallback: rich demo response ──────────────────────────────────────
    // Simulate realistic agent processing time (1.5–3 s server-side)
    await new Promise(r => setTimeout(r, 1500 + Math.random() * 1500));
    const reply = generateDemoResponse(prompt);
    return NextResponse.json({ reply, sessionId: "demo-session", demo: true });

  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("[chat] error:", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
