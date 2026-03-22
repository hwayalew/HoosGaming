import { NextResponse } from "next/server";

const FALLBACK = [
  "with boss fights", "with procedural levels", "with roguelike progression",
  "dark fantasy theme", "neon cyberpunk aesthetic", "with adaptive music",
  "pixel art style", "with powerups and upgrades",
];

export async function GET() {
  return NextResponse.json({ suggestions: FALLBACK, source: "static" });
}
