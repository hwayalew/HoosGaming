import { NextRequest, NextResponse } from "next/server";

const IAM_URL = "https://iam.cloud.ibm.com/identity/token";

/** Exchange API key for IAM bearer token */
async function getIAMToken(): Promise<string> {
  const apiKey = process.env.WXO_API_KEY?.trim();
  if (!apiKey) throw new Error("WXO_API_KEY not set in .env.local");

  const res = await fetch(IAM_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ibm:params:oauth:grant-type:apikey",
      apikey: apiKey,
    }),
  });
  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`IAM error ${res.status}: ${txt.slice(0, 200)}`);
  }
  const data = await res.json();
  return data.access_token as string;
}

/**
 * POST /api/chat
 * Body: { prompt: string; sessionId?: string }
 * Returns: { reply: string; sessionId: string }
 *
 * Uses IBM Watson Assistant v2 API against watsonx Orchestrate.
 */
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

    if (!hostURL || !agentId) {
      return NextResponse.json(
        { error: "NEXT_PUBLIC_WXO_HOST_URL or NEXT_PUBLIC_WXO_AGENT_ID missing" },
        { status: 500 }
      );
    }

    const token = await getIAMToken();
    const headers = {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    };

    // ── 1. Create or reuse a session ──────────────────────────────────────
    let sessionId = existingSession;
    if (!sessionId) {
      const sessRes = await fetch(
        `${hostURL}/v2/assistants/${agentId}/sessions`,
        { method: "POST", headers }
      );
      if (!sessRes.ok) {
        const txt = await sessRes.text();
        console.error("[chat] session error:", sessRes.status, txt.slice(0, 400));
        return NextResponse.json(
          { error: `Session creation failed (${sessRes.status}): ${txt.slice(0, 200)}` },
          { status: sessRes.status }
        );
      }
      const sessData = await sessRes.json();
      sessionId = sessData.session_id as string;
    }

    // ── 2. Send message ───────────────────────────────────────────────────
    const msgRes = await fetch(
      `${hostURL}/v2/assistants/${agentId}/sessions/${sessionId}/message`,
      {
        method: "POST",
        headers,
        body: JSON.stringify({
          input: { message_type: "text", text: prompt },
        }),
      }
    );

    if (!msgRes.ok) {
      const txt = await msgRes.text();
      console.error("[chat] message error:", msgRes.status, txt.slice(0, 400));
      return NextResponse.json(
        { error: `Message failed (${msgRes.status}): ${txt.slice(0, 200)}` },
        { status: msgRes.status }
      );
    }

    const msgData = await msgRes.json();

    // ── 3. Extract text from any response shape ───────────────────────────
    let reply = "";

    // Watson Assistant v2 shape
    const generic = msgData?.output?.generic as Array<Record<string, unknown>> | undefined;
    if (Array.isArray(generic)) {
      reply = generic
        .filter((g) => g.response_type === "text")
        .map((g) => g.text as string)
        .join("\n\n");
    }

    // Flat text fallback
    if (!reply && typeof msgData?.output?.text === "string") {
      reply = msgData.output.text;
    }

    // Top-level text fallback
    if (!reply && typeof msgData?.text === "string") {
      reply = msgData.text;
    }

    if (!reply) {
      // Return raw so we can debug
      reply = JSON.stringify(msgData, null, 2);
    }

    return NextResponse.json({ reply, sessionId });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("[chat] error:", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
