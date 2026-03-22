/**
 * Purpose: ElevenLabs voice list (GET) and TTS mp3 generation (POST).
 * Supports: game narration, in-game character speech, boss taunts, NPC dialogue.
 * Called by: play/page.tsx UI + window.hoosSpeech() bridge injected into every game iframe.
 * Input:
 *   GET  — returns available voices
 *   POST — JSON { voiceId?, text?, character?, emotion?, title?, engine?, prompt? }
 *     character: "hero" | "villain" | "boss" | "npc" | "narrator" | "enemy" | "ally" | string
 *     emotion:   "neutral" | "angry" | "fearful" | "excited" | "sad" | "sinister" | "confident" | string
 * Output: GET JSON voices; POST audio/mpeg stream
 * Auth: None
 */
import { NextRequest, NextResponse } from "next/server";

const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY?.trim() ?? "";
const ELEVENLABS_API_BASE = "https://api.elevenlabs.io/v1";

interface ElevenVoice {
  voice_id: string;
  name: string;
  category?: string;
  labels?: Record<string, string>;
}

function requireApiKey() {
  if (!ELEVENLABS_API_KEY) throw new Error("ELEVENLABS_API_KEY not configured");
}

function getHeaders(extra: Record<string, string> = {}) {
  return { "xi-api-key": ELEVENLABS_API_KEY, ...extra };
}

async function fetchVoices(): Promise<ElevenVoice[]> {
  requireApiKey();
  const res = await fetch(`${ELEVENLABS_API_BASE}/voices`, {
    headers: getHeaders(),
    signal: AbortSignal.timeout(15000),
  });
  if (!res.ok) throw new Error(`ElevenLabs voices ${res.status}: ${await res.text()}`);
  const data = await res.json() as { voices?: ElevenVoice[] };
  return (data.voices ?? []).filter((v) => Boolean(v.voice_id && v.name)).sort((a, b) => a.name.localeCompare(b.name));
}

/**
 * Pick the best ElevenLabs voice for a given character archetype + emotion.
 * Priority: exact label match → name keyword match → positional fallback.
 */
function selectVoice(voices: ElevenVoice[], character: string, emotion: string): ElevenVoice {
  const c = (character ?? "narrator").toLowerCase();
  const e = (emotion ?? "neutral").toLowerCase();

  const isMale   = /villain|boss|soldier|enemy|heavy|knight|king|warrior|wizard|pirate|demon|orc|grunt|ranger/.test(c);
  const isFemale = /hero.*f|heroine|queen|witch|elf|fairy|princess|ally.*f|healer|sorceress/.test(c);
  const isDark   = /villain|boss|demon|undead|zombie|enemy/.test(c) || /sinister|angry|evil|dark/.test(e);
  const isLight  = /hero|ally|narrator|healer|fairy/.test(c) || /excited|confident|friendly/.test(e);

  const keyword = isDark ? ["dark","deep","villain","evil","harsh","rough","old","gravelly"]
                : isLight ? ["bright","young","heroic","confident","clear","warm","smooth"]
                : ["neutral","calm","clear"];

  for (const kw of keyword) {
    const match = voices.find(v =>
      (v.labels?.description ?? "").toLowerCase().includes(kw) ||
      (v.labels?.accent ?? "").toLowerCase().includes(kw) ||
      v.name.toLowerCase().includes(kw)
    );
    if (match) return match;
  }

  if (isMale)   { const m = voices.find(v => (v.labels?.gender ?? v.name).toLowerCase().includes("male")); if (m) return m; }
  if (isFemale) { const f = voices.find(v => (v.labels?.gender ?? v.name).toLowerCase().includes("female")); if (f) return f; }

  return voices[0];
}

/**
 * Voice settings tuned per emotion for realism.
 */
function voiceSettings(emotion: string): { stability: number; similarity_boost: number; style?: number; use_speaker_boost?: boolean } {
  const e = (emotion ?? "neutral").toLowerCase();
  if (/angry|rage|furious/.test(e))     return { stability: 0.25, similarity_boost: 0.85, style: 0.7, use_speaker_boost: true };
  if (/sinister|evil|dark/.test(e))     return { stability: 0.55, similarity_boost: 0.75, style: 0.5 };
  if (/fearful|scared|whisper/.test(e)) return { stability: 0.70, similarity_boost: 0.65, style: 0.2 };
  if (/excited|joyful|happy/.test(e))   return { stability: 0.30, similarity_boost: 0.90, style: 0.8, use_speaker_boost: true };
  if (/sad|mournful|grief/.test(e))     return { stability: 0.80, similarity_boost: 0.60, style: 0.1 };
  if (/confident|heroic|bold/.test(e))  return { stability: 0.45, similarity_boost: 0.82, style: 0.6 };
  return { stability: 0.50, similarity_boost: 0.80 };
}

/**
 * Auto-generate context-appropriate narration when no explicit text is given.
 */
function buildNarration(body: { title?: string; engine?: string; prompt?: string; character?: string; emotion?: string }): string {
  const title = body.title?.trim() || "your game";
  const engine = body.engine?.trim() || "HTML5";
  const prompt = body.prompt?.trim();
  const character = (body.character ?? "narrator").toLowerCase();
  const emotion = (body.emotion ?? "neutral").toLowerCase();

  if (character === "boss" || character === "villain") {
    const lines = [
      `You dare enter my domain? ${title} — your final mistake.`,
      `I have been waiting. Welcome to ${title}. Do not expect mercy.`,
      `Every hero falls. ${title} will be your grave.`,
    ];
    return lines[Math.floor(Math.random() * lines.length)];
  }

  if (character === "hero" || character === "ally") {
    const lines = [
      `The world needs you. ${title} begins now — make it count.`,
      `Stay sharp. Every decision matters. Let's go.`,
      `This is it. ${title}. Show them what you're made of.`,
    ];
    return lines[Math.floor(Math.random() * lines.length)];
  }

  if (character === "npc") {
    const lines = [
      `Traveler! The path ahead is dangerous. Tread carefully.`,
      `I've seen many come this way. Few return.`,
      `Listen closely — the creatures here are unlike anything you've faced.`,
    ];
    return lines[Math.floor(Math.random() * lines.length)];
  }

  if (prompt) {
    return `Welcome to ${title}. Built in ${engine}. Your mission: ${prompt}. Stay sharp, adapt quickly, and make this run count.`;
  }

  return `Welcome to ${title}. Built in ${engine}. The world is live, your controls are armed, and your run starts now. Good luck.`;
}

export async function GET() {
  if (!ELEVENLABS_API_KEY) return NextResponse.json({ configured: false, voices: [] });
  try {
    const voices = await fetchVoices();
    return NextResponse.json({
      configured: true,
      voices: voices.map((v) => ({
        id: v.voice_id,
        name: v.name,
        category: v.category ?? "general",
        accent: v.labels?.accent,
        description: v.labels?.description,
      })),
    });
  } catch (error) {
    return NextResponse.json({ configured: true, voices: [], error: String(error) }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  let body: {
    voiceId?: string; text?: string; character?: string; emotion?: string;
    title?: string; engine?: string; prompt?: string;
  };
  try { body = await req.json(); }
  catch { return NextResponse.json({ error: "Invalid body" }, { status: 400 }); }

  if (!ELEVENLABS_API_KEY) return NextResponse.json({ error: "ELEVENLABS_API_KEY not configured" }, { status: 503 });

  try {
    const voices = await fetchVoices();
    if (!voices.length) return NextResponse.json({ error: "No ElevenLabs voices available" }, { status: 404 });

    const voice = body.voiceId
      ? (voices.find((v) => v.voice_id === body.voiceId) ?? selectVoice(voices, body.character ?? "", body.emotion ?? ""))
      : selectVoice(voices, body.character ?? "narrator", body.emotion ?? "neutral");

    const text = body.text?.trim() || buildNarration(body);
    if (!text) return NextResponse.json({ error: "No text to synthesize" }, { status: 400 });

    const settings = voiceSettings(body.emotion ?? "neutral");

    const res = await fetch(`${ELEVENLABS_API_BASE}/text-to-speech/${voice.voice_id}`, {
      method: "POST",
      headers: getHeaders({ "Content-Type": "application/json", Accept: "audio/mpeg" }),
      body: JSON.stringify({ text, model_id: "eleven_multilingual_v2", voice_settings: settings }),
      signal: AbortSignal.timeout(30000),
    });

    if (!res.ok) throw new Error(`ElevenLabs TTS ${res.status}: ${await res.text()}`);

    const audio = await res.arrayBuffer();
    return new NextResponse(audio, {
      status: 200,
      headers: {
        "Content-Type": "audio/mpeg",
        "Cache-Control": "no-store",
        "X-Voice-Id": voice.voice_id,
        "X-Voice-Name": encodeURIComponent(voice.name),
        "Access-Control-Allow-Origin": "*",
      },
    });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
