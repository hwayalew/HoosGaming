import { NextRequest, NextResponse } from "next/server";
import { executeSQL, SNOWFLAKE_ACCOUNT } from "@/lib/snowflake";

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
  if (!SNOWFLAKE_ACCOUNT) {
    return NextResponse.json({ ...MOCK_DATA, mock: true });
  }

  if (_cache && Date.now() - _cacheAt < 30_000) {
    return NextResponse.json({ ..._cache, cached: true });
  }

  try {
    const DB = "HOOS_GAMING.ANALYTICS";
    const [totalRows, todayRows, engineRows, avgRows, genreRows, recentRows, wolframRows] = await Promise.all([
      executeSQL(`SELECT COUNT(*) FROM ${DB}.game_generations`),
      executeSQL(`SELECT COUNT(*) FROM ${DB}.game_generations WHERE ts >= DATEADD(day,-1,CURRENT_TIMESTAMP())`),
      executeSQL(`SELECT engine, COUNT(*) as cnt FROM ${DB}.game_generations GROUP BY engine ORDER BY cnt DESC LIMIT 1`),
      executeSQL(`SELECT AVG(duration_ms) FROM ${DB}.game_generations WHERE success=TRUE`),
      executeSQL(`SELECT CASE WHEN LOWER(prompt) LIKE '%platform%' OR LOWER(prompt) LIKE '%jump%' THEN 'Platformer' WHEN LOWER(prompt) LIKE '%shoot%' OR LOWER(prompt) LIKE '%fps%' OR LOWER(prompt) LIKE '%shooter%' THEN 'Shooter' WHEN LOWER(prompt) LIKE '%rpg%' OR LOWER(prompt) LIKE '%dungeon%' THEN 'RPG' WHEN LOWER(prompt) LIKE '%puzzle%' OR LOWER(prompt) LIKE '%maze%' THEN 'Puzzle' ELSE 'Other' END as genre, COUNT(*) as cnt FROM ${DB}.game_generations WHERE ts >= DATEADD(hour,-24,CURRENT_TIMESTAMP()) GROUP BY genre ORDER BY cnt DESC`),
      executeSQL(`SELECT prompt FROM ${DB}.game_generations ORDER BY ts DESC LIMIT 20`),
      executeSQL(`SELECT COUNT(*) FROM ${DB}.game_generations WHERE wolfram=TRUE`),
    ]);

    const data = {
      total: Number(totalRows.rows[0]?.[0] ?? 0),
      today: Number(todayRows.rows[0]?.[0] ?? 0),
      topEngine: String(engineRows.rows[0]?.[0] ?? "Phaser 3"),
      avgMs: Number(avgRows.rows[0]?.[0] ?? 58000),
      genres: genreRows.rows.map(r => ({ genre: String(r[0]), count: Number(r[1]) })),
      recent: recentRows.rows.map(r => {
        const p = String(r[0] ?? "");
        const words = p.toLowerCase().match(/\b(2d|3d|rpg|puzzle|shooter|platformer|runner|dark|space|neon|pixel|fantasy)\b/g) ?? [];
        return words.slice(0, 3).join(" ") + " game…";
      }).filter(Boolean),
      wolfram_count: Number(wolframRows.rows[0]?.[0] ?? 0),
    };

    _cache = data; _cacheAt = Date.now();
    return NextResponse.json(data);
  } catch (e) {
    console.warn("[analytics/query] fallback to mock:", e instanceof Error ? e.message : e);
    return NextResponse.json({ ...MOCK_DATA, mock: true });
  }
}
