/** Placeholder `sessionId` values from `/api/chat` when IBM is not used — not valid WxO thread IDs. */
const WXO_NON_THREAD_SESSION_IDS = new Set(["gemini-session", "demo-session"]);

export function isWxOPersistableThreadId(sessionId: string | null | undefined): sessionId is string {
  if (!sessionId?.trim()) return false;
  return !WXO_NON_THREAD_SESSION_IDS.has(sessionId.trim());
}

/** Safe to send as `thread_id` on `POST /v1/orchestrate/runs`. */
export function wxoThreadIdForApi(sessionId: string | undefined | null): string | undefined {
  if (!isWxOPersistableThreadId(sessionId)) return undefined;
  return sessionId!.trim();
}
