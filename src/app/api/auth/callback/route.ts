/** Purpose: OAuth2 callback handler for Auth0. Called by: Auth0 redirect only. */
import { NextRequest } from "next/server";
import { auth0 } from "@/lib/auth0";

export async function GET(req: NextRequest) {
  return (auth0 as unknown as { authClient: { handleCallback: (req: NextRequest) => Promise<Response> } })
    .authClient.handleCallback(req);
}
