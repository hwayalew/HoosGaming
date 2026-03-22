/**
 * Purpose: Non-secret configuration snapshot for ops UI (Create integration strip).
 * Called by: create/page.tsx
 * Input: GET
 * Output: JSON flags (auth0, gemini, wxo, snowflake, etc.) — never returns key values
 */
import { NextResponse } from "next/server";
import { getHealthSnapshot } from "@/lib/server-env";

export async function GET() {
  return NextResponse.json(getHealthSnapshot());
}
