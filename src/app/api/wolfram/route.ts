/**
 * Purpose: Wolfram|Alpha Procedural Game Intelligence — physics, math, simulation data.
 * Called by: create/page.tsx + window.hoosMath() bridge injected into every game iframe.
 * Input:
 *   GET  ?q=<query>         — single plaintext query
 *   POST { queries, theme } — batch physics bootstrap for a game world
 * Output: JSON with computed physics constants, formulas, and game-tuned values
 * Auth: None
 */
import { NextRequest, NextResponse } from "next/server";

const APP_ID = process.env.WOLFRAM_APP_ID ?? "";

interface WolframPod { title: string; subpods: Array<{ plaintext: string }> }
interface WolframResult { queryresult: { success: boolean; pods?: WolframPod[] } }

async function queryWolfram(q: string): Promise<Record<string, string> | null> {
  if (!APP_ID) return null;
  try {
    const url = `https://api.wolframalpha.com/v2/query?input=${encodeURIComponent(q)}&format=plaintext&output=JSON&appid=${APP_ID}`;
    const res = await fetch(url, { signal: AbortSignal.timeout(9000) });
    if (!res.ok) return null;
    const data = await res.json() as WolframResult;
    if (!data.queryresult?.success) return null;
    const result: Record<string, string> = {};
    for (const pod of (data.queryresult.pods ?? []).slice(0, 6)) {
      const text = pod.subpods?.[0]?.plaintext?.trim();
      if (text) result[pod.title] = text;
    }
    return Object.keys(result).length ? result : null;
  } catch { return null; }
}

/**
 * Generate physics constants for a game world based on its theme.
 * Returns tuned game parameters derived from real Wolfram physics.
 */
async function buildPhysicsBundle(theme: string): Promise<Record<string, unknown>> {
  const t = theme.toLowerCase();

  const isSpace    = /space|zero.g|microgravity|moon|asteroid|orbit/.test(t);
  const isWater    = /underwater|ocean|sea|aquatic|submarine/.test(t);
  const isMoon     = /moon|lunar/.test(t);
  const isHeavy    = /giant|heavy|dense|titan|jupiter/.test(t);
  const isCartoon  = /cartoon|arcade|bouncy|jelly|rubber/.test(t);

  const gravityQuery  = isSpace ? "gravity on ISS in m/s^2"
                      : isMoon  ? "lunar surface gravity in m/s^2"
                      : isHeavy ? "gravity on Jupiter surface in m/s^2"
                      : isWater ? "buoyancy acceleration for neutrally buoyant object"
                      : "Earth surface gravity m/s^2";

  const frictionQuery = isWater ? "drag coefficient sphere water"
                      : isSpace ? "coefficient of friction in vacuum"
                      : /ice|snow|winter/.test(t) ? "coefficient of kinetic friction ice"
                      : /sand|desert/.test(t) ? "coefficient of friction sand"
                      : "coefficient of kinetic friction rubber on concrete";

  const projectileQuery = "projectile range formula given initial velocity and angle";

  const [gravityData, frictionData, projectileData] = await Promise.allSettled([
    queryWolfram(gravityQuery),
    queryWolfram(frictionQuery),
    queryWolfram(projectileQuery),
  ]);

  const gravityRaw = (gravityData.status === "fulfilled" && gravityData.value)
    ? Object.values(gravityData.value)[0] ?? null : null;

  const frictionRaw = (frictionData.status === "fulfilled" && frictionData.value)
    ? Object.values(frictionData.value)[0] ?? null : null;

  const projectileRaw = (projectileData.status === "fulfilled" && projectileData.value)
    ? Object.values(projectileData.value)[0] ?? null : null;

  const gravityMs2 = parseFloat(
    (gravityRaw ?? "").match(/[\d.]+/)?.[0] ?? (isSpace ? "0.0008" : isMoon ? "1.62" : "9.81")
  );

  const frictionCoeff = parseFloat(
    (frictionRaw ?? "").match(/[\d.]+/)?.[0] ?? (isWater ? "0.47" : isSpace ? "0.04" : "0.6")
  );

  const gameGravity = isCartoon ? gravityMs2 * 8
                    : isWater   ? gravityMs2 * 0.12
                    : isSpace   ? gravityMs2 * 50
                    : gravityMs2 * 60;

  const terminalVelocity = isSpace ? 9999 : Math.sqrt((2 * 70 * gravityMs2) / (frictionCoeff * 1.225 * 0.5));

  return {
    wolframSource: "Wolfram|Alpha",
    theme,
    rawGravityQuery: gravityQuery,
    rawGravity: gravityRaw,
    rawFriction: frictionRaw,
    rawProjectile: projectileRaw,
    physics: {
      gravityMs2: Math.round(gravityMs2 * 1000) / 1000,
      gameGravityPxS2: Math.round(gameGravity),
      frictionCoefficient: Math.round(frictionCoeff * 1000) / 1000,
      airResistance: isSpace ? 0 : isWater ? 0.04 : 0.001,
      terminalVelocityMs: Math.round(terminalVelocity * 10) / 10,
      jumpVelocityPxS: Math.round(Math.sqrt(2 * gameGravity * (isSpace ? 400 : isMoon ? 300 : 180))),
      bulletSpeedPxS: isSpace ? 1800 : isWater ? 300 : 900,
      projectileDropPerS: Math.round(gameGravity * 0.5),
      restitution: isCartoon ? 0.8 : isWater ? 0.1 : 0.15,
      walkSpeedPxS: isWater ? 140 : isHeavy ? 180 : 240,
      runSpeedPxS: isWater ? 200 : isHeavy ? 260 : 400,
      notes: `Wolfram-derived physics for "${theme}": g=${gravityMs2.toFixed(2)}m/s² (${gravityQuery}), friction=${frictionCoeff.toFixed(3)} (${frictionQuery})`,
    },
    lighting: {
      ambientIntensity: isSpace ? 0.1 : isWater ? 0.3 : 0.4,
      sunIntensity: isSpace ? 0.05 : isWater ? 0.6 : 1.2,
      fogDensity: isSpace ? 0 : isWater ? 0.05 : 0.012,
      shadowSoftness: isWater ? 0.8 : 0.3,
    },
    behavior: {
      enemyAgroDistance: isSpace ? 80 : isWater ? 40 : 55,
      projectileLifetimeS: isSpace ? 8 : isWater ? 1.5 : 3,
      explosionRadiusPx: isWater ? 120 : isSpace ? 200 : 80,
    },
  };
}

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q") ?? "";
  if (!q) return NextResponse.json({ error: "q required" }, { status: 400 });
  if (!APP_ID) return NextResponse.json({ error: "WOLFRAM_APP_ID not configured", result: null, query: q }, { status: 200 });

  try {
    const result = await queryWolfram(q);
    return NextResponse.json({ result, query: q });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  let body: { queries?: string[]; theme?: string; query?: string };
  try { body = await req.json(); }
  catch { return NextResponse.json({ error: "Invalid body" }, { status: 400 }); }

  if (!APP_ID) {
    const fallback = await buildPhysicsBundle(body.theme ?? "action adventure");
    return NextResponse.json({ ...fallback, wolframSource: "fallback-defaults" });
  }

  if (body.theme) {
    try {
      const bundle = await buildPhysicsBundle(body.theme);
      return NextResponse.json(bundle);
    } catch (e) {
      return NextResponse.json({ error: String(e) }, { status: 500 });
    }
  }

  if (body.queries?.length) {
    try {
      const results = await Promise.allSettled(body.queries.map((q) => queryWolfram(q)));
      const out: Record<string, unknown> = {};
      body.queries.forEach((q, i) => {
        const r = results[i];
        out[q] = r.status === "fulfilled" ? r.value : null;
      });
      return NextResponse.json({ results: out });
    } catch (e) {
      return NextResponse.json({ error: String(e) }, { status: 500 });
    }
  }

  if (body.query) {
    const result = await queryWolfram(body.query);
    return NextResponse.json({ result, query: body.query });
  }

  return NextResponse.json({ error: "Provide theme, queries, or query" }, { status: 400 });
}
