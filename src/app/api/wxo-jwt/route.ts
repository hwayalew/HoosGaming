import { NextResponse } from "next/server";
import jwt from "jsonwebtoken";

/**
 * POST /api/wxo-jwt
 *
 * Signs a short-lived JWT with the RSA private key stored in WXO_PRIVATE_KEY.
 * IBM watsonx Orchestrate verifies this JWT using the public key you uploaded
 * to your instance's embedded-chat security settings.
 *
 * Setup required (one-time, in IBM Cloud console):
 *  1. Generate an RSA-2048 key pair:
 *       openssl genrsa -out private.pem 2048
 *       openssl rsa -in private.pem -pubout -out public.pem
 *  2. In IBM watsonx Orchestrate → Embedded Chat → Security: upload public.pem
 *  3. Add the contents of private.pem as the Replit secret WXO_PRIVATE_KEY
 *     (use \n for line breaks, or paste the raw PEM text as-is)
 */
export async function POST() {
  const rawKey = process.env.WXO_PRIVATE_KEY;

  if (!rawKey) {
    return NextResponse.json(
      { error: "WXO_PRIVATE_KEY secret is not set. Generate an RSA key pair and upload the public key to IBM watsonx Orchestrate." },
      { status: 503 }
    );
  }

  // Replit secrets store newlines as \n literal — normalise them
  const privateKey = rawKey.replace(/\\n/g, "\n");

  const now = Math.floor(Date.now() / 1000);

  try {
    const token = jwt.sign(
      {
        // user_payload is encrypted by IBM — add any custom fields here
        user_payload: { anonymous: true },
        iat: now,
        exp: now + 15 * 60, // 15-minute expiry
      },
      privateKey,
      { algorithm: "RS256" }
    );

    return NextResponse.json({ token });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      { error: `JWT signing failed: ${msg}` },
      { status: 500 }
    );
  }
}
