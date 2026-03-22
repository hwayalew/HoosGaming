import { NextResponse } from "next/server";

const IAM_URL = "https://iam.cloud.ibm.com/identity/token";

/**
 * POST /api/wxo-token
 * Exchanges the server-side WXO_API_KEY for a short-lived IAM access token.
 * The API key never leaves the server.
 */
export async function POST() {
  const apiKey = process.env.WXO_API_KEY?.trim();
  if (!apiKey) {
    return NextResponse.json(
      { error: "WXO_API_KEY not set in .env.local" },
      { status: 500 }
    );
  }

  try {
    const res = await fetch(IAM_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "urn:ibm:params:oauth:grant-type:apikey",
        apikey: apiKey,
      }),
    });

    if (!res.ok) {
      const text = await res.text();
      console.error("[wxo-token] IAM error:", res.status, text);
      return NextResponse.json(
        { error: "IAM token exchange failed" },
        { status: res.status }
      );
    }

    const data = await res.json();
    return NextResponse.json({ accessToken: data.access_token });
  } catch (e) {
    console.error("[wxo-token] fetch error:", e);
    return NextResponse.json(
      { error: "Failed to reach IAM" },
      { status: 502 }
    );
  }
}
