/**
 * Purpose: Same session profile as GET /auth/profile (Auth0 routes config).
 * Called by: Optional NEXT_PUBLIC_PROFILE_ROUTE; tools expecting /api/auth/profile
 */
import { NextRequest } from "next/server";
import { handleAuthProfile } from "@/lib/auth-profile-handler";

export async function GET(req: NextRequest) {
  return handleAuthProfile(req);
}
