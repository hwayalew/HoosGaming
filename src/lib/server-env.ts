import {
  AUTH0_BASE_URL,
  PUBLIC_APP_URL,
  SNOWFLAKE_DATABASE,
  SNOWFLAKE_SCHEMA,
  SNOWFLAKE_WAREHOUSE,
  SOLANA_NETWORK,
  SOLANA_RPC_URL,
  SOLANA_WALLET_PUBKEY,
  WXO_AGENT_ENVIRONMENT_ID,
  WXO_AGENT_ID,
  WXO_CRN,
  WXO_DEPLOYMENT_PLATFORM,
  WXO_INSTANCE_API_BASE,
  WXO_ORCHESTRATION_ID,
  isConfigured,
} from "@/lib/app-config";

/**
 * Server-side checks for IBM wxO embed configuration.
 */
export function isWxoEmbedConfigured(): boolean {
  return Boolean(WXO_INSTANCE_API_BASE && WXO_AGENT_ID && WXO_ORCHESTRATION_ID && WXO_CRN);
}

export function isWxoApiKeySet(): boolean {
  return isConfigured(process.env.WXO_API_KEY);
}

export function getHealthSnapshot() {
  return {
    ok: true,
    app: {
      appUrl: PUBLIC_APP_URL,
      authBaseUrl: AUTH0_BASE_URL,
      telemetryDisabled: process.env.NEXT_TELEMETRY_DISABLED === "1",
    },
    wxoEmbed: {
      configured: isWxoEmbedConfigured(),
      hostUrl: WXO_INSTANCE_API_BASE,
      agentId: WXO_AGENT_ID,
      agentEnvironmentId: WXO_AGENT_ENVIRONMENT_ID,
      orchestrationId: WXO_ORCHESTRATION_ID,
      crn: WXO_CRN,
      deploymentPlatform: WXO_DEPLOYMENT_PLATFORM,
    },
    wxoApiKey: { set: isWxoApiKeySet() },
    wxoManagerApiKey: { set: isConfigured(process.env.WXO_MANAGER_API_KEY) },
    auth0: {
      configured: [
        process.env.AUTH0_DOMAIN,
        process.env.AUTH0_CLIENT_ID,
        process.env.AUTH0_CLIENT_SECRET,
        process.env.AUTH0_SECRET,
      ].every(isConfigured),
    },
    gemini: { configured: isConfigured(process.env.GEMINI_API_KEY) },
    wolfram: { configured: isConfigured(process.env.WOLFRAM_APP_ID) },
    elevenlabs: { configured: isConfigured(process.env.ELEVENLABS_API_KEY) },
    snowflake: {
      configured: [
        process.env.SNOWFLAKE_ACCOUNT,
        process.env.SNOWFLAKE_USER,
        process.env.SNOWFLAKE_PASSWORD,
      ].every(isConfigured),
      database: SNOWFLAKE_DATABASE,
      schema: SNOWFLAKE_SCHEMA,
      warehouse: SNOWFLAKE_WAREHOUSE,
    },
    presage: { configured: isConfigured(process.env.PRESAGE_API_KEY) },
    nftStorage: { configured: isConfigured(process.env.NFT_STORAGE_API_KEY) },
    solana: {
      configured: isConfigured(SOLANA_RPC_URL) && isConfigured(process.env.SOLANA_WALLET_PRIVATE_KEY),
      network: SOLANA_NETWORK,
      walletPubkey: SOLANA_WALLET_PUBKEY,
    },
  };
}
