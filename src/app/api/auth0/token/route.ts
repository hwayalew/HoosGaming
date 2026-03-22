import { NextRequest, NextResponse } from "next/server";

function normalizeDomain(raw: string): string {
  return raw
    .trim()
    .replace(/^https?:\/\//, "")
    .split("/")[0]
    .split(":")[0];
}

function getAuthEnv() {
  const domain = normalizeDomain(
    process.env.AUTH0_DOMAIN || process.env.NEXT_PUBLIC_AUTH0_DOMAIN || "",
  );
  const clientId = (process.env.AUTH0_CLIENT_ID || process.env.NEXT_PUBLIC_AUTH0_CLIENT_ID || "").trim();
  const clientSecret = process.env.AUTH0_CLIENT_SECRET?.trim();
  return { domain, clientId, clientSecret };
}

/**
 * Proxies Auth0 /oauth/token from the browser so a **client_secret** can be applied.
 * Needed when the Auth0 application is a "Regular Web Application" while the UI uses
 * @auth0/auth0-react (PKCE without secret → 401 otherwise).
 */
export async function POST(req: NextRequest) {
  const { domain, clientId, clientSecret } = getAuthEnv();
  if (!domain || !clientId) {
    return NextResponse.json({ error: "Auth0 domain or client id not configured" }, { status: 500 });
  }

  const raw = await req.text();
  const contentTypeHeader = req.headers.get("content-type") || "application/x-www-form-urlencoded";
  const contentType = contentTypeHeader.split(";")[0].trim() || "application/x-www-form-urlencoded";

  const tokenUrl = `https://${domain}/oauth/token`;

  if (!clientSecret) {
    const res = await fetch(tokenUrl, {
      method: "POST",
      headers: { "Content-Type": contentType },
      body: raw,
    });
    const text = await res.text();
    const ct = res.headers.get("content-type") || "application/json";
    return new NextResponse(text, { status: res.status, headers: { "Content-Type": ct } });
  }

  let forwardBody: string;

  if (contentType.includes("application/json")) {
    try {
      const o = JSON.parse(raw) as Record<string, unknown>;
      const cid = o.client_id;
      if (typeof cid === "string" && cid !== clientId) {
        return NextResponse.json({ error: "client_id mismatch" }, { status: 400 });
      }
      forwardBody = JSON.stringify({ ...o, client_secret: clientSecret });
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }
  } else {
    const params = new URLSearchParams(raw);
    const cid = params.get("client_id");
    if (cid && cid !== clientId) {
      return NextResponse.json({ error: "client_id mismatch" }, { status: 400 });
    }
    params.set("client_secret", clientSecret);
    forwardBody = params.toString();
  }

  const res = await fetch(tokenUrl, {
    method: "POST",
    headers: { "Content-Type": contentType },
    body: forwardBody,
  });
  const text = await res.text();
  const ct = res.headers.get("content-type") || "application/json";
  return new NextResponse(text, { status: res.status, headers: { "Content-Type": ct } });
}
