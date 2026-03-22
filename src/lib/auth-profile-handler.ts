/**
 * Profile for Auth0 `useUser` — stub returns logged-out (204) while Auth0 is disabled.
 */
import { NextRequest, NextResponse } from "next/server";

export async function handleAuthProfile(_req: NextRequest) {
  return new NextResponse(null, { status: 204 });
}
