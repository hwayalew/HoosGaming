/**
 * Auth0 v4 — route handler.
 * The auth0.middleware() in src/middleware.ts handles:
 *   GET /api/auth/login    → redirect to Auth0 Universal Login
 *   GET /api/auth/callback → exchange code, set session cookie
 *   GET /api/auth/logout   → clear session, redirect to home
 *
 * This catch-all provides a safe 404 fallback for anything
 * that slips past the middleware (e.g. POST to /api/auth).
 */
import { NextResponse } from "next/server";

export function GET() {
  return NextResponse.json(
    { error: "Auth endpoint not found. Use /api/auth/login or /api/auth/logout." },
    { status: 404 }
  );
}

export function POST() {
  return NextResponse.json({ error: "Method not allowed" }, { status: 405 });
}
