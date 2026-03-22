/**
 * Purpose: Return short prompt fragments for the Create page chip row.
 * Called by: create/page.tsx
 * Input: GET
 * Output: { suggestions: string[], source: "static" } — not loaded from Snowflake (name is legacy).
 */
import { NextResponse } from "next/server";

const FALLBACK = [
  "with boss fights", "with procedural levels", "with roguelike progression",
  "dark fantasy theme", "neon cyberpunk aesthetic", "with adaptive music",
  "pixel art style", "with powerups and upgrades",
];

export async function GET() {
  return NextResponse.json({ suggestions: FALLBACK, source: "static" });
}
