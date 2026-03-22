import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

/** Pass-through; login uses @auth0/auth0-react (browser PKCE), not server /api/auth/*. */
export function middleware(_req: NextRequest) {
  return NextResponse.next();
}

export const config = {
  matcher: ["/api/auth/:path*"],
};
