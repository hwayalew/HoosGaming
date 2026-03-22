import { NextRequest, NextResponse } from "next/server";

const SF_ACCOUNT   = process.env.SNOWFLAKE_ACCOUNT ?? "";
const SF_USER      = process.env.SNOWFLAKE_USER ?? "";
const SF_PASSWORD  = process.env.SNOWFLAKE_PASSWORD ?? "";
const SF_DATABASE  = process.env.SNOWFLAKE_DATABASE ?? "HOOS_GAMING";
const SF_SCHEMA    = process.env.SNOWFLAKE_SCHEMA ?? "ANALYTICS";
const SF_WAREHOUSE = process.env.SNOWFLAKE_WAREHOUSE ?? "COMPUTE_WH";

let _sfToken: string | null = null;
let _sfTokenExp = 0;

async function getSFToken(): Promise<string> {
  if (_sfToken && Date.now() < _sfTokenExp - 60_000) return _sfToken;
  if (!SF_ACCOUNT) throw new Error("SNOWFLAKE_ACCOUNT not set");

  const res = await fetch(
    `https://${SF_ACCOUNT}.snowflakecomputing.com/session/v1/login-request?warehouse=${SF_WAREHOUSE}&db=${SF_DATABASE}&schema=${SF_SCHEMA}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json", "Accept": "application/json" },
      body: JSON.stringify({
        data: {
          CLIENT_APP_ID: "HoosGaming",
          CLIENT_APP_VERSION: "1.0",
          SVN_REVISION: "1",
          ACCOUNT_NAME: SF_ACCOUNT.split(".")[0].toUpperCase(),
          LOGIN_NAME: SF_USER,
          PASSWORD: SF_PASSWORD,
          SESSION_PARAMETERS: {},
        },
      }),
      signal: AbortSignal.timeout(10000),
    }
  );
  if (!res.ok) throw new Error(`SF auth ${res.status}`);
  const json = await res.json() as { success?: boolean; data?: { token?: string; validityInSeconds?: number } };
  if (!json.success || !json.data?.token) throw new Error("No SF token");
  _sfToken = json.data.token;
  _sfTokenExp = Date.now() + (json.data.validityInSeconds ?? 3600) * 1000;
  return _sfToken;
}

async function sfQuery(sql: string): Promise<void> {
  const token = await getSFToken();
  const res = await fetch(`https://${SF_ACCOUNT}.snowflakecomputing.com/api/v2/statements`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${token}`,
      "X-Snowflake-Authorization-Token-Type": "SESSION_TOKEN",
      "Accept": "application/json",
    },
    body: JSON.stringify({
      statement: sql,
      timeout: 15,
      database: SF_DATABASE,
      schema: SF_SCHEMA,
      warehouse: SF_WAREHOUSE,
    }),
    signal: AbortSignal.timeout(12000),
  });
  if (!res.ok) {
    const body = await res.text();
    console.warn("[snowflake] insert failed:", res.status, body.slice(0, 200));
  }
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

  if (!SF_ACCOUNT) {
    return NextResponse.json({ ok: false, reason: "snowflake not configured" });
  }

  const id = body.id ?? crypto.randomUUID();

  try {
    if (body.type === "generation") {
      await sfQuery(`INSERT INTO ${SF_DATABASE}.${SF_SCHEMA}.game_generations (id,prompt,engine,duration_ms,char_count,pass_count,success,wolfram) VALUES (${esc(id)},${esc(body.prompt ?? "")},${esc(body.engine ?? "")},${esc(body.duration_ms ?? 0)},${esc(body.char_count ?? 0)},${esc(body.pass_count ?? 1)},${esc(body.success ?? true)},${esc(body.wolfram ?? false)})`);
    } else if (body.type === "session") {
      await sfQuery(`INSERT INTO ${SF_DATABASE}.${SF_SCHEMA}.play_sessions (id,game_id,engine,duration_ms,reached_win) VALUES (${esc(id)},${esc(body.game_id ?? "")},${esc(body.engine ?? "")},${esc(body.duration_ms ?? 0)},${esc(body.reached_win ?? false)})`);
    } else if (body.type === "modification") {
      await sfQuery(`INSERT INTO ${SF_DATABASE}.${SF_SCHEMA}.modifications (id,game_id,modification) VALUES (${esc(id)},${esc(body.game_id ?? "")},${esc(body.modification ?? "")})`);
    }
    return NextResponse.json({ ok: true, id });
  } catch (e) {
    console.warn("[analytics/ingest] error:", e instanceof Error ? e.message : e);
    return NextResponse.json({ ok: false });
  }
}
