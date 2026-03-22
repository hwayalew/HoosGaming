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
  if (!SF_ACCOUNT) throw new Error("Snowflake not configured");
  const res = await fetch(
    `https://${SF_ACCOUNT}.snowflakecomputing.com/session/v1/login-request?warehouse=${SF_WAREHOUSE}&db=${SF_DATABASE}&schema=${SF_SCHEMA}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        data: {
          CLIENT_APP_ID: "HoosGaming", CLIENT_APP_VERSION: "1.0", SVN_REVISION: "1",
          ACCOUNT_NAME: SF_ACCOUNT.split(".")[0].toUpperCase(),
          LOGIN_NAME: SF_USER, PASSWORD: SF_PASSWORD, SESSION_PARAMETERS: {},
        },
      }),
      signal: AbortSignal.timeout(10000),
    }
  );
  const json = await res.json() as { success?: boolean; data?: { token?: string; validityInSeconds?: number } };
  if (!json.success || !json.data?.token) throw new Error("No token");
  _sfToken = json.data.token;
  _sfTokenExp = Date.now() + (json.data.validityInSeconds ?? 3600) * 1000;
  return _sfToken;
}

async function sfQuery(sql: string): Promise<unknown[][]> {
  const token = await getSFToken();
  const res = await fetch(`https://${SF_ACCOUNT}.snowflakecomputing.com/api/v2/statements`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${token}`,
      "X-Snowflake-Authorization-Token-Type": "SESSION_TOKEN",
    },
    body: JSON.stringify({ statement: sql, timeout: 20, database: SF_DATABASE, schema: SF_SCHEMA, warehouse: SF_WAREHOUSE }),
    signal: AbortSignal.timeout(15000),
  });
  if (!res.ok) throw new Error(`SF ${res.status}`);
  const json = await res.json() as { data?: unknown[][] };
  return json.data ?? [];
}

// Cache analytics 30s
let _cache: Record<string, unknown> | null = null;
let _cacheAt = 0;

const MOCK_DATA = {
  total: 1247, today: 34, topEngine: "Phaser 3", avgMs: 58000,
  genres: [{ genre: "Platformer", count: 412 }, { genre: "Shooter", count: 298 }, { genre: "RPG", count: 201 }, { genre: "Puzzle", count: 155 }, { genre: "Runner", count: 181 }],
  recent: ["2D dark fantasy platformer…", "3D space shooter…", "Pixel art puzzle…", "Top-down RPG…", "Neon runner…"],
  wolfram_count: 89,
};

export async function GET(req: NextRequest) {
  if (!SF_ACCOUNT) {
    return NextResponse.json({ ...MOCK_DATA, mock: true });
  }

  if (_cache && Date.now() - _cacheAt < 30_000) {
    return NextResponse.json({ ..._cache, cached: true });
  }

  try {
    const DB = `${SF_DATABASE}.${SF_SCHEMA}`;
    const [totalRows, todayRows, engineRows, avgRows, genreRows, recentRows, wolframRows] = await Promise.all([
      sfQuery(`SELECT COUNT(*) FROM ${DB}.game_generations`),
      sfQuery(`SELECT COUNT(*) FROM ${DB}.game_generations WHERE ts >= DATEADD(day,-1,CURRENT_TIMESTAMP())`),
      sfQuery(`SELECT engine, COUNT(*) as cnt FROM ${DB}.game_generations GROUP BY engine ORDER BY cnt DESC LIMIT 1`),
      sfQuery(`SELECT AVG(duration_ms) FROM ${DB}.game_generations WHERE success=TRUE`),
      sfQuery(`SELECT CASE WHEN LOWER(prompt) LIKE '%platform%' OR LOWER(prompt) LIKE '%jump%' THEN 'Platformer' WHEN LOWER(prompt) LIKE '%shoot%' OR LOWER(prompt) LIKE '%fps%' OR LOWER(prompt) LIKE '%shooter%' THEN 'Shooter' WHEN LOWER(prompt) LIKE '%rpg%' OR LOWER(prompt) LIKE '%dungeon%' THEN 'RPG' WHEN LOWER(prompt) LIKE '%puzzle%' OR LOWER(prompt) LIKE '%maze%' THEN 'Puzzle' ELSE 'Other' END as genre, COUNT(*) as cnt FROM ${DB}.game_generations WHERE ts >= DATEADD(hour,-24,CURRENT_TIMESTAMP()) GROUP BY genre ORDER BY cnt DESC`),
      sfQuery(`SELECT prompt FROM ${DB}.game_generations ORDER BY ts DESC LIMIT 20`),
      sfQuery(`SELECT COUNT(*) FROM ${DB}.game_generations WHERE wolfram=TRUE`),
    ]);

    const data = {
      total: Number(totalRows[0]?.[0] ?? 0),
      today: Number(todayRows[0]?.[0] ?? 0),
      topEngine: String(engineRows[0]?.[0] ?? "Phaser 3"),
      avgMs: Number(avgRows[0]?.[0] ?? 58000),
      genres: genreRows.map(r => ({ genre: String(r[0]), count: Number(r[1]) })),
      recent: recentRows.map(r => {
        const p = String(r[0] ?? "");
        const words = p.toLowerCase().match(/\b(2d|3d|rpg|puzzle|shooter|platformer|runner|dark|space|neon|pixel|fantasy)\b/g) ?? [];
        return words.slice(0, 3).join(" ") + " game…";
      }).filter(Boolean),
      wolfram_count: Number(wolframRows[0]?.[0] ?? 0),
    };

    _cache = data; _cacheAt = Date.now();
    return NextResponse.json(data);
  } catch (e) {
    console.warn("[analytics/query] fallback to mock:", e instanceof Error ? e.message : e);
    return NextResponse.json({ ...MOCK_DATA, mock: true });
  }
}
