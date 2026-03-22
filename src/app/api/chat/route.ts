import { NextRequest, NextResponse } from "next/server";

const IAM_URL = "https://iam.cloud.ibm.com/identity/token";

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

▶ Click PLAY in the nav to preview your game once build completes.`;
}

export async function POST(req: NextRequest) {
  try {
    const { prompt } = (await req.json()) as { prompt: string; sessionId?: string };

    if (!prompt?.trim()) {
      return NextResponse.json({ error: "prompt is required" }, { status: 400 });
    }

    const apiKey      = process.env.WXO_API_KEY?.trim();
    const instanceUrl = process.env.NEXT_PUBLIC_WXO_HOST_URL?.trim().replace(/\/$/, "");
    const agentId     = process.env.NEXT_PUBLIC_WXO_AGENT_ID?.trim();

    if (apiKey && instanceUrl) {
      try {
        const token = await getIAMToken(apiKey);
        const hdrs  = { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };
        const body  = JSON.stringify({ messages: [{ role: "user", content: prompt }], stream: false });

        // Try endpoint patterns: with agentId, then generic /v1/orchestrate/runs
        const endpoints = agentId
          ? [
              `${instanceUrl}/v1/agents/${agentId}/chat_completions`,
              `${instanceUrl}/v1/orchestrate/${agentId}/chat_completions`,
              `${instanceUrl}/v1/chat`,
              `${instanceUrl}/v1/orchestrate/runs`,
            ]
          : [
              `${instanceUrl}/v1/chat`,
              `${instanceUrl}/v1/orchestrate/runs`,
            ];

        for (const url of endpoints) {
          const r = await fetch(url, {
            method: "POST", headers: hdrs, body,
            signal: AbortSignal.timeout(20000),
          });

          const txt = await r.text();

          if (r.ok) {
            let reply = "";
            try {
              const json = JSON.parse(txt) as Record<string, unknown>;
              // OpenAI-compatible
              const choices = json.choices as Array<{ message?: { content?: string } }> | undefined;
              reply = choices?.[0]?.message?.content ?? "";
              // Orchestrate runs format
              if (!reply) {
                const output = (json.output ?? json.result ?? json.response) as Record<string, unknown> | undefined;
                reply = (output?.text ?? output?.content ?? json.text ?? json.content ?? "") as string;
              }
              if (!reply) reply = JSON.stringify(json, null, 2);
            } catch {
              reply = txt;
            }
            console.log(`[chat] IBM success via ${url.split("/").slice(-2).join("/")}`);
            return NextResponse.json({ reply, sessionId: instanceUrl });
          }

          console.warn(`[chat] IBM ${url.split("/").slice(-2).join("/")} → ${r.status}: ${txt.slice(0, 200)}`);
        }
      } catch (ibmErr) {
        console.warn("[chat] IBM error:", ibmErr instanceof Error ? ibmErr.message : ibmErr);
      }
    }

    // ── Fallback demo ─────────────────────────────────────────────────────
    await new Promise(r => setTimeout(r, 1500 + Math.random() * 1500));
    const reply = generateDemoResponse(prompt);
    return NextResponse.json({ reply, sessionId: "demo-session", demo: true });

  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("[chat] error:", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
