import { NextRequest, NextResponse } from "next/server";

const IAM_URL = "https://iam.cloud.ibm.com/identity/token";

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
  if (!res.ok) throw new Error(`IAM error ${res.status}: ${await res.text().then(t => t.slice(0, 200))}`);
  const data = await res.json();
  return data.access_token as string;
}

/**
 * Extract the instance GUID from a CRN string.
 * CRN format: crn:v1:bluemix:public:watsonx-orchestrate:{region}:a/{account}:{instanceGuid}::
 */
function instanceIdFromCrn(crn: string): string | null {
  // The instance GUID is the 8th colon-separated field (index 7)
  const parts = crn.split(":");
  return parts[7]?.trim() || null;
}

/**
 * Derive the REST API base URL from the host URL.
 * Console:  https://us-south.watson-orchestrate.cloud.ibm.com
 * REST API: https://api.us-south.watson-orchestrate.cloud.ibm.com
 */
function deriveApiBase(hostURL: string): string {
  const noProto = hostURL.replace(/^https?:\/\//, "").replace(/\/$/, "");
  // Simply prepend "api." to the same host
  return `https://api.${noProto}`;
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
    const { prompt, sessionId: existingSession } = (await req.json()) as {
      prompt: string;
      sessionId?: string;
    };

    if (!prompt?.trim()) {
      return NextResponse.json({ error: "prompt is required" }, { status: 400 });
    }

    const hostURL = process.env.NEXT_PUBLIC_WXO_HOST_URL?.trim();
    const crn     = process.env.NEXT_PUBLIC_WXO_CRN?.trim();

    // ── Attempt IBM watsonx Orchestrate REST API ──────────────────────────
    // Correct endpoint: POST /instances/{instanceId}/v1/chat
    // Uses OpenAI-compatible messages format with IAM bearer token
    if (hostURL && crn) {
      const instanceId = instanceIdFromCrn(crn);
      if (instanceId) {
        try {
          const token   = await getIAMToken();
          const apiBase = deriveApiBase(hostURL);
          const chatUrl = `${apiBase}/instances/${instanceId}/v1/chat`;

          const messages = [{ role: "user", content: prompt }];
          // Include prior session context if available (use sessionId as a tag)
          if (existingSession && existingSession !== "demo-session") {
            // watsonx Orchestrate /v1/chat is stateless per-call; session
            // continuity is handled client-side by accumulating messages.
            // For now, each call is a fresh turn — extend later if needed.
          }

          console.log("[chat] Calling:", chatUrl);
          const chatRes = await fetch(chatUrl, {
            method: "POST",
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ messages, stream: false }),
          });

          if (chatRes.ok) {
            const chatData = await chatRes.json() as {
              choices?: Array<{ message?: { content?: string } }>;
              output?:  { text?: string };
            };

            // Handle OpenAI-compatible response shape
            let reply =
              chatData?.choices?.[0]?.message?.content ??
              chatData?.output?.text ?? "";

            if (reply) {
              return NextResponse.json({ reply, sessionId: instanceId });
            }
          } else {
            const errText = await chatRes.text();
            console.warn(`[chat] IBM ${chatRes.status}:`, errText.slice(0, 300));
          }
        } catch (ibmErr) {
          console.warn("[chat] IBM API unavailable:", ibmErr instanceof Error ? ibmErr.message : ibmErr);
        }
      }
    }

    // ── Fallback: rich demo response ──────────────────────────────────────
    await new Promise(r => setTimeout(r, 1500 + Math.random() * 1500));
    const reply = generateDemoResponse(prompt);
    return NextResponse.json({ reply, sessionId: "demo-session", demo: true });

  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("[chat] error:", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
