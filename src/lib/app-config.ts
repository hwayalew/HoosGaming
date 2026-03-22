function firstNonEmpty(...values: Array<string | null | undefined>): string {
  for (const value of values) {
    const trimmed = value?.trim();
    if (trimmed) return trimmed;
  }
  return "";
}

export const DEFAULT_WXO_INSTANCE_API_BASE =
  "https://api.us-south.watson-orchestrate.cloud.ibm.com/instances/c8a9d776-460e-4c9a-b55f-0a2556febf8e";
export const DEFAULT_WXO_AGENT_ID = "c246e4a4-dd47-431a-8c9c-8056174e5afb";
export const DEFAULT_WXO_AGENT_ENVIRONMENT_ID = "633f7088-497f-457c-be2e-7add21efb7e5";
export const DEFAULT_WXO_CRN =
  "crn:v1:bluemix:public:watsonx-orchestrate:us-south:a/f459230554db416db8c23a3534ec4e8b:c8a9d776-460e-4c9a-b55f-0a2556febf8e::";
export const DEFAULT_WXO_DEPLOYMENT_PLATFORM = "ibmcloud";
export const DEFAULT_WXO_ORCHESTRATION_ID =
  "f459230554db416db8c23a3534ec4e8b_c8a9d776-460e-4c9a-b55f-0a2556febf8e";

/** Default local URL; keep in sync with `npm run dev` port (see package.json). */
export const DEFAULT_PUBLIC_APP_URL = "http://localhost:3000";
export const DEFAULT_SOLANA_NETWORK = "devnet";
export const DEFAULT_SOLANA_WALLET_PUBKEY = "8BgC9yewyzMY8zs8ivbDGWVnTHkKsasMDngvKu3e3iVR";
export const DEFAULT_SNOWFLAKE_DATABASE = "HOOS_GAMING";
export const DEFAULT_SNOWFLAKE_SCHEMA = "ANALYTICS";
export const DEFAULT_SNOWFLAKE_WAREHOUSE = "COMPUTE_WH";

export const WXO_INSTANCE_API_BASE = firstNonEmpty(
  process.env.NEXT_PUBLIC_WXO_HOST_URL,
  DEFAULT_WXO_INSTANCE_API_BASE,
);
export const WXO_AGENT_ID = firstNonEmpty(
  process.env.NEXT_PUBLIC_WXO_AGENT_ID,
  DEFAULT_WXO_AGENT_ID,
);
export const WXO_AGENT_ENVIRONMENT_ID = firstNonEmpty(
  process.env.NEXT_PUBLIC_WXO_AGENT_ENVIRONMENT_ID,
  DEFAULT_WXO_AGENT_ENVIRONMENT_ID,
);
export const WXO_CRN = firstNonEmpty(process.env.NEXT_PUBLIC_WXO_CRN, DEFAULT_WXO_CRN);
export const WXO_DEPLOYMENT_PLATFORM = firstNonEmpty(
  process.env.NEXT_PUBLIC_WXO_DEPLOYMENT_PLATFORM,
  DEFAULT_WXO_DEPLOYMENT_PLATFORM,
);
export const WXO_ORCHESTRATION_ID = firstNonEmpty(
  process.env.NEXT_PUBLIC_WXO_ORCHESTRATION_ID,
  DEFAULT_WXO_ORCHESTRATION_ID,
);

export const PUBLIC_APP_URL = firstNonEmpty(
  process.env.NEXT_PUBLIC_APP_URL,
  process.env.NEXT_PUBLIC_AUTH0_BASE_URL,
  process.env.AUTH0_BASE_URL,
  DEFAULT_PUBLIC_APP_URL,
);
export const AUTH0_BASE_URL = firstNonEmpty(
  process.env.AUTH0_BASE_URL,
  process.env.APP_BASE_URL,
  process.env.NEXT_PUBLIC_AUTH0_BASE_URL,
  process.env.NEXT_PUBLIC_APP_URL,
  DEFAULT_PUBLIC_APP_URL,
);

export const SOLANA_NETWORK = firstNonEmpty(
  process.env.NEXT_PUBLIC_SOLANA_NETWORK,
  DEFAULT_SOLANA_NETWORK,
);
export const SOLANA_RPC_URL = firstNonEmpty(process.env.SOLANA_RPC_URL);
export const SOLANA_WALLET_PUBKEY = firstNonEmpty(
  process.env.NEXT_PUBLIC_SOLANA_WALLET_PUBKEY,
  DEFAULT_SOLANA_WALLET_PUBKEY,
);

export const SNOWFLAKE_DATABASE = firstNonEmpty(
  process.env.SNOWFLAKE_DATABASE,
  DEFAULT_SNOWFLAKE_DATABASE,
);
export const SNOWFLAKE_SCHEMA = firstNonEmpty(
  process.env.SNOWFLAKE_SCHEMA,
  DEFAULT_SNOWFLAKE_SCHEMA,
);
export const SNOWFLAKE_WAREHOUSE = firstNonEmpty(
  process.env.SNOWFLAKE_WAREHOUSE,
  DEFAULT_SNOWFLAKE_WAREHOUSE,
);

export const AUTH0_ROUTES = {
  login: "/api/auth/login",
  logout: "/api/auth/logout",
  callback: "/api/auth/callback",
  profile: "/api/auth/profile",
  accessToken: "/api/auth/access-token",
} as const;

export function isConfigured(value: string | null | undefined): boolean {
  return Boolean(value?.trim());
}
