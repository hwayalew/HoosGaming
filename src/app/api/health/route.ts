import { NextResponse } from "next/server";
import { isWxoEmbedConfigured, isWxoApiKeySet } from "@/lib/server-env";

/** GET — reports whether wxO env vars are set (no secrets exposed) */
export async function GET() {
  return NextResponse.json({
    ok: true,
    wxoEmbed: { configured: isWxoEmbedConfigured() },
    wxoApiKey: { set: isWxoApiKeySet() },
  });
}
