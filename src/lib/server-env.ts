/**
 * Server-side checks for IBM wxO embed configuration.
 */
export function isWxoEmbedConfigured(): boolean {
  const host = process.env.NEXT_PUBLIC_WXO_HOST_URL?.trim();
  const agent = process.env.NEXT_PUBLIC_WXO_AGENT_ID?.trim();
  const orch = process.env.NEXT_PUBLIC_WXO_ORCHESTRATION_ID?.trim();
  const crn = process.env.NEXT_PUBLIC_WXO_CRN?.trim();
  return Boolean(host && agent && orch && crn);
}

export function isWxoApiKeySet(): boolean {
  return Boolean(process.env.WXO_API_KEY?.trim());
}
