import { NextResponse } from "next/server";
import { getHealthSnapshot } from "@/lib/server-env";

/** GET — reports whether wxO env vars are set (no secrets exposed) */
export async function GET() {
  return NextResponse.json(getHealthSnapshot());
}
