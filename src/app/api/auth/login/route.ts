/** Purpose: Legacy server Auth0 login (SPA uses @auth0/auth0-react in the browser). */
import { NextRequest } from "next/server";
import { auth0 } from "@/lib/auth0";

export async function GET(req: NextRequest) {
  return auth0.startInteractiveLogin();
}
