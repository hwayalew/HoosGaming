/**
 * Auth0 stub — real Auth0 is disabled until you run `npm install @auth0/nextjs-auth0`
 * and restore the Auth0Client setup from git history.
 */
import { NextRequest, NextResponse } from "next/server";

function authDisabledResponse() {
  return NextResponse.json(
    { error: "Authentication is temporarily disabled. Configure Auth0 to enable." },
    { status: 503 }
  );
}

export const auth0 = {
  middleware(_req: NextRequest) {
    return NextResponse.next();
  },
  startInteractiveLogin() {
    return authDisabledResponse();
  },
  authClient: {
    handleCallback: (_req: NextRequest) => authDisabledResponse(),
    handleLogout: (_req: NextRequest) => authDisabledResponse(),
    handleProfile: (_req: NextRequest) => new NextResponse(null, { status: 204 }),
    sessionStore: {
      get: async () => null as unknown,
    },
  },
};
