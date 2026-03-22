import type { NextRequest } from "next/server";
import { auth0 } from "@/lib/auth0";

export function middleware(req: NextRequest) {
  return auth0.middleware(req);
}

export const config = {
  matcher: ["/api/auth/:path*"],
};
