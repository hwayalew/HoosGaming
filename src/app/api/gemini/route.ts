import { NextRequest, NextResponse } from "next/server";

const GEMINI_API_KEY = process.env.GEMINI_API_KEY ?? "";
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent`;

const CDN = {
  phaser:  "https://cdnjs.cloudflare.com/ajax/libs/phaser/3.60.0/phaser.min.js",
  three:   "https://cdnjs.cloudflare.com/ajax/libs/three.js/r134/three.min.js",
  p5:      "https://cdnjs.cloudflare.com/ajax/libs/p5.js/1.9.0/p5.min.js",
  pixi:    "https://cdnjs.cloudflare.com/ajax/libs/pixi.js/7.2.4/pixi.min.js",
  kaboom:  "https://unpkg.com/kaboom@3000.0.1/dist/kaboom.js",
  babylon: "https://cdn.babylonjs.com/babylon.js",
  pyodide: "https://cdn.jsdelivr.net/pyodide/v0.23.4/full/pyodide.js",
};

function buildGeminiPrompt(userPrompt: string, language: string): string {
  const cdnMap: Record<string, string> = {
    "js-phaser":  CDN.phaser,
    "js-three":   CDN.three,
    "js-p5":      CDN.p5,
    "js-pixi":    CDN.pixi,
    "js-kaboom":  CDN.kaboom,
    "js-babylon": CDN.babylon,
    "python":     CDN.pyodide,
  };
  const cdn = cdnMap[language] ?? CDN.phaser;

  const engineMap: Record<string, string> = {
    "js-phaser":  "Phaser 3",
    "js-three":   "Three.js",
    "js-p5":      "p5.js",
    "js-pixi":    "PixiJS",
    "js-kaboom":  "Kaboom.js",
    "js-babylon": "Babylon.js",
    "python":     "Pyodide (Python in browser)",
  };
  const engine = engineMap[language] ?? "Phaser 3";

  return `You are an expert HTML5 game developer. Generate a complete, immediately playable HTML5 game using ${engine}.

Game description: "${userPrompt}"

STRICT REQUIREMENTS:
1. Output ONLY a single complete HTML file inside \`\`\`html ... \`\`\` code fences.
2. Start with <!DOCTYPE html> and end with </html> — never truncate.
3. Load ${engine} from: ${cdn} — no other CDN.
4. Use Web Audio API (AudioContext + oscillators) for all sounds — no external audio files.
5. All graphics must be drawn programmatically — no external images.
6. Must include: player movement, enemies with AI, health/score HUD, win condition, game-over screen.
7. Must be fun, polished, and fully functional on first load.
8. Include these controls on screen: movement, attack/shoot, restart on game over.

Output the complete HTML file now:`;
}

interface GeminiResponse {
  candidates?: Array<{
    content?: {
      parts?: Array<{ text?: string }>;
    };
  }>;
  error?: { message?: string };
}

export async function POST(req: NextRequest) {
  let body: { prompt?: string; language?: string };
  try { body = await req.json(); } catch { return NextResponse.json({ error: "Invalid body" }, { status: 400 }); }

  const { prompt, language = "js-phaser" } = body;
  if (!prompt?.trim()) return NextResponse.json({ error: "prompt required" }, { status: 400 });

  if (!GEMINI_API_KEY) {
    return NextResponse.json({ error: "GEMINI_API_KEY not configured" }, { status: 503 });
  }

  try {
    const res = await fetch(`${GEMINI_URL}?key=${GEMINI_API_KEY}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: buildGeminiPrompt(prompt, language) }] }],
        generationConfig: {
          temperature: 0.8,
          topK: 40,
          topP: 0.95,
          maxOutputTokens: 8192,
        },
        safetySettings: [
          { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_NONE" },
          { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_NONE" },
          { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_NONE" },
          { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_NONE" },
        ],
      }),
      signal: AbortSignal.timeout(60000),
    });

    const data = await res.json() as GeminiResponse;

    if (!res.ok || data.error) {
      throw new Error(data.error?.message ?? `Gemini HTTP ${res.status}`);
    }

    const text = data.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
    if (!text) throw new Error("Empty response from Gemini");

    return NextResponse.json({ ok: true, reply: text, model: "gemini-1.5-flash" });

  } catch (e) {
    console.error("[gemini] error:", e instanceof Error ? e.message : e);
    return NextResponse.json({ error: String(e instanceof Error ? e.message : e) }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({
    ok: true,
    configured: Boolean(GEMINI_API_KEY),
    model: "gemini-1.5-flash",
    purpose: "AI game generation fallback when IBM watsonx Orchestrate is unavailable",
  });
}
