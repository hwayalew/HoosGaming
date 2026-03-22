"use client";

import { useEffect, useRef, useState } from "react";
import { getWxoPublicConfig } from "@/lib/wxo-public-config";

declare global {
  interface Window {
    wxOConfiguration?: Record<string, unknown>;
    wxoLoader?: { init: () => void };
  }
}

const SCRIPT_ID = "hoos-wxo-loader";

async function fetchIamToken(): Promise<string> {
  const res = await fetch("/api/wxo-token", { method: "POST" });
  if (!res.ok) throw new Error(`Token endpoint returned ${res.status}`);
  const { accessToken } = await res.json();
  return accessToken;
}

export function WxoChatEmbed() {
  const [error, setError] = useState<string | null>(null);
  const loaded = useRef(false);

  useEffect(() => {
    if (loaded.current) return;
    loaded.current = true;

    const cfg = getWxoPublicConfig();
    if (!cfg) {
      setError(
        "IBM embed not configured. Set NEXT_PUBLIC_WXO_* vars in .env.local then restart npm run dev."
      );
      return;
    }

    const root = document.getElementById(cfg.rootElementID);
    if (!root) {
      setError(`Mount element #${cfg.rootElementID} not found.`);
      return;
    }

    const host = cfg.hostURL.replace(/\/$/, "");

    const wxo: Record<string, unknown> = {
      orchestrationID: cfg.orchestrationID,
      hostURL: host,
      rootElementID: cfg.rootElementID,
      deploymentPlatform: cfg.deploymentPlatform,
      crn: cfg.crn,
      chatOptions: { agentId: cfg.agentId },
      onEvent: async (event: Record<string, unknown>) => {
        if (event.type === "authTokenNeeded" || event.type === "token_refresh") {
          try {
            const token = await fetchIamToken();
            event.authToken = token;
          } catch (e) {
            console.error("[WxoChatEmbed] token fetch failed:", e);
            setError("Auth failed — check WXO_API_KEY in .env.local and restart.");
          }
        }
      },
    };
    window.wxOConfiguration = wxo;

    if (document.getElementById(SCRIPT_ID)) {
      window.wxoLoader?.init();
      return;
    }

    const script = document.createElement("script");
    script.id = SCRIPT_ID;
    script.src = `${host}/wxochat/wxoLoader.js?embed=true`;
    script.async = true;
    script.addEventListener("load", () => {
      try {
        window.wxoLoader?.init();
      } catch (e) {
        setError(e instanceof Error ? e.message : "wxoLoader.init() failed");
      }
    });
    script.addEventListener("error", () => {
      setError(
        "Failed to load wxoLoader.js — check NEXT_PUBLIC_WXO_HOST_URL and your network."
      );
    });
    document.head.appendChild(script);
  }, []);

  const cfg = getWxoPublicConfig();
  const rootId = cfg?.rootElementID ?? "wxochat-root";

  return (
    <div className="wxo-embed-wrap">
      {error && <p className="app-error">{error}</p>}
      <div
        id={rootId}
        className="wxo-embed-root"
        suppressHydrationWarning
        aria-label="Hoos Gaming AI chat"
      />
    </div>
  );
}
