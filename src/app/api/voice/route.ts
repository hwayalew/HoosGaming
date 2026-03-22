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
  if (!ELEVENLABS_API_KEY) {
    throw new Error("ELEVENLABS_API_KEY not configured");
  }
}

function getHeaders(extra: Record<string, string> = {}) {
  return {
    "xi-api-key": ELEVENLABS_API_KEY,
    ...extra,
  };
}

async function fetchVoices(): Promise<ElevenVoice[]> {
  requireApiKey();
  const res = await fetch(`${ELEVENLABS_API_BASE}/voices`, {
    headers: getHeaders(),
    signal: AbortSignal.timeout(15000),
  });

  if (!res.ok) {
    throw new Error(`ElevenLabs voices ${res.status}: ${await res.text()}`);
  }

  const data = await res.json() as { voices?: ElevenVoice[] };
  return (data.voices ?? [])
    .filter((voice) => Boolean(voice.voice_id && voice.name))
    .sort((a, b) => a.name.localeCompare(b.name));
}

function buildNarration(body: { title?: string; engine?: string; prompt?: string }): string {
  const title = body.title?.trim() || "your generated game";
  const engine = body.engine?.trim() || "HTML5";
  const prompt = body.prompt?.trim();

  if (prompt) {
    return `Welcome to ${title}. Built in ${engine}. Your mission begins now: ${prompt}. Stay sharp, learn the pattern, and make this run count.`;
  }

  return `Welcome to ${title}. Built in ${engine}. The world is live, the controls are armed, and your run starts now. Good luck.`;
}

export async function GET() {
  if (!ELEVENLABS_API_KEY) {
    return NextResponse.json({ configured: false, voices: [] });
  }

  try {
    const voices = await fetchVoices();
    return NextResponse.json({
      configured: true,
      voices: voices.map((voice) => ({
        id: voice.voice_id,
        name: voice.name,
        category: voice.category ?? "general",
        accent: voice.labels?.accent,
        description: voice.labels?.description,
      })),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ configured: true, voices: [], error: message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  let body: { voiceId?: string; text?: string; title?: string; engine?: string; prompt?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  if (!ELEVENLABS_API_KEY) {
    return NextResponse.json({ error: "ELEVENLABS_API_KEY not configured" }, { status: 503 });
  }

  try {
    const voices = await fetchVoices();
    const requestedVoiceId = body.voiceId?.trim() ?? "";
    const preferredVoice = requestedVoiceId
      ? voices.find((voice) => voice.voice_id === requestedVoiceId)
      : voices[0];

    if (!preferredVoice) {
      return NextResponse.json({ error: "No ElevenLabs voices available" }, { status: 404 });
    }

    const text = body.text?.trim() || buildNarration(body);
    const res = await fetch(`${ELEVENLABS_API_BASE}/text-to-speech/${preferredVoice.voice_id}`, {
      method: "POST",
      headers: getHeaders({
        "Content-Type": "application/json",
        Accept: "audio/mpeg",
      }),
      body: JSON.stringify({
        text,
        voice_settings: {
          stability: 0.45,
          similarity_boost: 0.8,
        },
      }),
      signal: AbortSignal.timeout(30000),
    });

    if (!res.ok) {
      throw new Error(`ElevenLabs synthesis ${res.status}: ${await res.text()}`);
    }

    const audio = await res.arrayBuffer();
    return new NextResponse(audio, {
      status: 200,
      headers: {
        "Content-Type": "audio/mpeg",
        "Cache-Control": "no-store",
        "X-Voice-Id": preferredVoice.voice_id,
        "X-Voice-Name": preferredVoice.name,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
