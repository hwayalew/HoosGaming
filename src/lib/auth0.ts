import { Auth0Client } from "@auth0/nextjs-auth0/server";

const appBaseUrl =
  process.env.AUTH0_BASE_URL ??
  process.env.NEXTAUTH_URL ??
  (process.env.REPLIT_DEV_DOMAIN
    ? `https://${process.env.REPLIT_DEV_DOMAIN}`
    : "http://localhost:5000");

export const auth0 = new Auth0Client({
  domain:       process.env.AUTH0_DOMAIN,
  clientId:     process.env.AUTH0_CLIENT_ID,
  clientSecret: process.env.AUTH0_CLIENT_SECRET,
  appBaseUrl,
  secret:       process.env.AUTH0_SECRET,
  routes: {
    login:    "/api/auth/login",
    logout:   "/api/auth/logout",
    callback: "/api/auth/callback",
  },
});
