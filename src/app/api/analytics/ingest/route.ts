import { NextRequest, NextResponse } from "next/server";
import { executeSQL, SNOWFLAKE_ACCOUNT } from "@/lib/snowflake";

async function sfQuery(sql: string): Promise<void> {
  await executeSQL(sql);
}

function esc(s: unknown): string {
  if (s === null || s === undefined) return "NULL";
  if (typeof s === "boolean") return s ? "TRUE" : "FALSE";
  if (typeof s === "number") return String(s);
  return `'${String(s).replace(/'/g, "''")}'`;
}

export async function POST(req: NextRequest) {
  let body: {
    type?: string;
    id?: string;
    prompt?: string;
    engine?: string;
    duration_ms?: number;
    char_count?: number;
    pass_count?: number;
    success?: boolean;
    wolfram?: boolean;
    game_id?: string;
    reached_win?: boolean;
    modification?: string;
  };
  try { body = await req.json(); } catch { return NextResponse.json({ ok: false }, { status: 400 }); }

  if (!SNOWFLAKE_ACCOUNT) {
    return NextResponse.json({ ok: false, reason: "snowflake not configured" });
  }

  const id = body.id ?? crypto.randomUUID();

  try {
    if (body.type === "generation") {
      await sfQuery(`INSERT INTO HOOS_GAMING.ANALYTICS.game_generations (id,prompt,engine,duration_ms,char_count,pass_count,success,wolfram) VALUES (${esc(id)},${esc(body.prompt ?? "")},${esc(body.engine ?? "")},${esc(body.duration_ms ?? 0)},${esc(body.char_count ?? 0)},${esc(body.pass_count ?? 1)},${esc(body.success ?? true)},${esc(body.wolfram ?? false)})`);
    } else if (body.type === "session") {
      await sfQuery(`INSERT INTO HOOS_GAMING.ANALYTICS.play_sessions (id,game_id,engine,duration_ms,reached_win) VALUES (${esc(id)},${esc(body.game_id ?? "")},${esc(body.engine ?? "")},${esc(body.duration_ms ?? 0)},${esc(body.reached_win ?? false)})`);
    } else if (body.type === "modification") {
      await sfQuery(`INSERT INTO HOOS_GAMING.ANALYTICS.modifications (id,game_id,modification) VALUES (${esc(id)},${esc(body.game_id ?? "")},${esc(body.modification ?? "")})`);
    }
    return NextResponse.json({ ok: true, id });
  } catch (e) {
    console.warn("[analytics/ingest] error:", e instanceof Error ? e.message : e);
    return NextResponse.json({ ok: false });
  }
}
