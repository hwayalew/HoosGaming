/**
 * Build wxO embed config from NEXT_PUBLIC_* env vars.
 * Safe to import from client components.
 */
export type WxoPublicConfig = {
  hostURL: string;
  orchestrationID: string;
  rootElementID: string;
  deploymentPlatform: string;
  crn: string;
  agentId: string;
  apiKey?: string;
};

export function getWxoPublicConfig(): WxoPublicConfig | null {
  const hostURL = process.env.NEXT_PUBLIC_WXO_HOST_URL?.trim();
  const orchestrationID = process.env.NEXT_PUBLIC_WXO_ORCHESTRATION_ID?.trim();
  const agentId = process.env.NEXT_PUBLIC_WXO_AGENT_ID?.trim();
  const crn = process.env.NEXT_PUBLIC_WXO_CRN?.trim();
  const deploymentPlatform =
    process.env.NEXT_PUBLIC_WXO_DEPLOYMENT_PLATFORM?.trim() || "ibmcloud";
  const rootElementID =
    process.env.NEXT_PUBLIC_WXO_ROOT_ELEMENT_ID?.trim() || "wxochat-root";
  const apiKey = process.env.NEXT_PUBLIC_WXO_API_KEY?.trim();

  if (!hostURL || !orchestrationID || !agentId || !crn) return null;

  const out: WxoPublicConfig = {
    hostURL,
    orchestrationID,
    rootElementID,
    deploymentPlatform,
    crn,
    agentId,
  };
  if (apiKey) out.apiKey = apiKey;
  return out;
}
