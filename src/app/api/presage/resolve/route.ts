/**
 * Purpose: Resolve a prediction-market bet (Presage Protocol) or return a demo payload.
 * Called by: play/page.tsx
 * Input: JSON { marketId, outcome, gameId, challenge, score? }
 * Output: { ok, mock?, message?, ... } — mock when PRESAGE_API_KEY unset
 * Auth: None
 */
import { NextRequest, NextResponse } from "next/server";

const PRESAGE_KEY = process.env.PRESAGE_API_KEY ?? "";

interface ResolveBody {
  marketId: string;
  outcome: "win" | "lose";
  gameId: string;
  challenge: string;
  score?: number;
}

export async function POST(req: NextRequest) {
  let body: ResolveBody;
  try { body = await req.json(); } catch { return NextResponse.json({ error: "Invalid body" }, { status: 400 }); }

  const { marketId, outcome, gameId, challenge, score } = body;
  if (!marketId || !outcome) {
    return NextResponse.json({ error: "marketId and outcome required" }, { status: 400 });
  }

  if (!PRESAGE_KEY) {
    // Return mock success for demo
    return NextResponse.json({
      ok: true,
      mock: true,
      marketId,
      outcome,
      message: `Market ${marketId} resolved: ${outcome.toUpperCase()}. (Demo — PRESAGE_API_KEY not configured)`,
    });
  }

  try {
    const res = await fetch("https://api.presageprotocol.com/v1/markets/resolve", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": PRESAGE_KEY,
      },
      body: JSON.stringify({ market_id: marketId, outcome, game_id: gameId, challenge, final_score: score }),
      signal: AbortSignal.timeout(10000),
    });

    const data = await res.json() as { ok?: boolean; transaction?: string; payout?: number };
    return NextResponse.json({ ok: true, ...data, marketId, outcome });
  } catch (e) {
    // Return mock on API failure
    return NextResponse.json({
      ok: true,
      mock: true,
      marketId,
      outcome,
      message: `Market resolved (mock): ${outcome.toUpperCase()} — ${challenge}`,
    });
  }
}
