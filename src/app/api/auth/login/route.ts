import { NextRequest } from "next/server";
import { auth0 } from "@/lib/auth0";

export async function GET(req: NextRequest) {
  return auth0.startInteractiveLogin();
}
