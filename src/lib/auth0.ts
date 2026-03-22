import { Auth0Client } from "@auth0/nextjs-auth0/server";
import { AUTH0_BASE_URL, AUTH0_ROUTES } from "@/lib/app-config";

export const auth0 = new Auth0Client({
  domain:       process.env.AUTH0_DOMAIN,
  clientId:     process.env.AUTH0_CLIENT_ID,
  clientSecret: process.env.AUTH0_CLIENT_SECRET,
  appBaseUrl:   AUTH0_BASE_URL,
  secret:       process.env.AUTH0_SECRET,
  routes:       AUTH0_ROUTES,
});
