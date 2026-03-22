/**
 * Purpose: Proxy plaintext Wolfram|Alpha queries for physics enrichment on Create.
 * Called by: create/page.tsx
 * Input: GET ?q=
 * Output: JSON { result?, query } or error
 * Auth: None
 */
import { NextRequest, NextResponse } from "next/server";

const APP_ID = process.env.WOLFRAM_APP_ID ?? "";

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q") ?? "";
  if (!q) return NextResponse.json({ error: "q required" }, { status: 400 });
  if (!APP_ID) return NextResponse.json({ error: "WOLFRAM_APP_ID not configured" }, { status: 503 });

  try {
    const url = `https://api.wolframalpha.com/v2/query?input=${encodeURIComponent(q)}&format=plaintext&output=JSON&appid=${APP_ID}`;
    const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
    const data = await res.json() as {
      queryresult: { success: boolean; pods?: Array<{ title: string; subpods: Array<{ plaintext: string }> }> };
    };

    if (!data.queryresult?.success) {
      return NextResponse.json({ result: null, query: q });
    }

    const pods = data.queryresult.pods ?? [];
    const result: Record<string, string> = {};
    for (const pod of pods.slice(0, 6)) {
      const text = pod.subpods?.[0]?.plaintext?.trim();
      if (text) result[pod.title] = text;
    }
    return NextResponse.json({ result, query: q });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
