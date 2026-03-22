/**
 * Purpose: Return Auth0 session user JSON for client hooks (useUser).
 * Called by: GET /auth/profile and GET /api/auth/profile
 */
import { NextRequest, NextResponse } from "next/server";
import { auth0 } from "@/lib/auth0";

type AuthClientLike = {
  authClient: {
    sessionStore: { get: (cookies: unknown) => Promise<unknown> };
    handleProfile: (req: NextRequest) => Promise<Response>;
  };
};

export async function handleAuthProfile(req: NextRequest) {
  const ac = (auth0 as unknown as AuthClientLike).authClient;
  try {
    const session = await ac.sessionStore.get(req.cookies);
    if (!session) {
      return new NextResponse(null, { status: 204 });
    }
    return ac.handleProfile(req);
  } catch {
    return new NextResponse(null, { status: 204 });
  }
}
