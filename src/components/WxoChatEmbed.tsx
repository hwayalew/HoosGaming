"use client";

import { useEffect, useRef, useState } from "react";
import { getWxoPublicConfig } from "@/lib/wxo-public-config";

declare global {
  interface Window {
    wxOConfiguration?: Record<string, unknown>;
    wxoLoader?: { init: () => Promise<WxoInstance | undefined | null> };
  }
}

interface WxoInstance {
  on: (event: string, handler: (...args: unknown[]) => void | Promise<void>) => void;
}

const SCRIPT_ID = "hoos-wxo-loader";

async function fetchJwt(): Promise<string> {
  const res = await fetch("/api/wxo-jwt", { method: "POST" });
  const body = await res.json();
  if (!res.ok) throw new Error(body.error ?? `JWT endpoint ${res.status}`);
  return body.token as string;
}

export function WxoChatEmbed() {
  const [status, setStatus] = useState<"loading" | "ready" | "no-key" | "error">("loading");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const loaded = useRef(false);

  useEffect(() => {
    if (loaded.current) return;
    loaded.current = true;

    const cfg = getWxoPublicConfig();
    if (!cfg) {
      setStatus("error");
      setErrorMsg("IBM embed not configured — set NEXT_PUBLIC_WXO_* environment variables.");
      return;
    }

    const host = cfg.hostURL.replace(/\/$/, "");

    // Build configuration that exactly matches the official IBM embed script.
    // Uses the default "float" layout (chat button + panel) — the most reliable
    // mode across all environments since it doesn't require a pre-existing element.
    window.wxOConfiguration = {
      orchestrationID:    cfg.orchestrationID,
      hostURL:            host,
      rootElementID:      cfg.rootElementID,
      deploymentPlatform: cfg.deploymentPlatform,
      crn:                cfg.crn,
      chatOptions: {
        agentId:            cfg.agentId,
        agentEnvironmentId: cfg.agentEnvironmentId,
      },
    };

    // Reuse existing script if already appended
    if (document.getElementById(SCRIPT_ID)) {
      window.wxoLoader?.init().then(attachHandlers);
      return;
    }

    // Defer exactly as IBM's official snippet does
    setTimeout(() => {
      const script = document.createElement("script");
      script.id  = SCRIPT_ID;
      script.src = `${host}/wxochat/wxoLoader.js?embed=true`;

      script.addEventListener("load", () => {
        window.wxoLoader?.init()
          .then(attachHandlers)
          .catch((e: unknown) => {
            setStatus("error");
            setErrorMsg(e instanceof Error ? e.message : "wxoLoader.init() failed");
          });
      });

      script.addEventListener("error", () => {
        setStatus("error");
        setErrorMsg("Failed to load wxoLoader.js — check NEXT_PUBLIC_WXO_HOST_URL.");
      });

      document.head.appendChild(script);
    }, 0);

    async function attachHandlers(instance: WxoInstance | undefined | null) {
      if (!instance) return; // init may resolve undefined if it fails internally
      // Correct IBM API: subscribe to events on the resolved instance object,
      // not via wxOConfiguration.onEvent.
      instance.on("authTokenNeeded", async (event: unknown) => {
        try {
          const token = await fetchJwt();
          (event as Record<string, unknown>).authToken = token;
        } catch (e) {
          const msg = e instanceof Error ? e.message : String(e);
          if (msg.includes("WXO_PRIVATE_KEY")) {
            setStatus("no-key");
          } else {
            setStatus("error");
            setErrorMsg(`Auth failed: ${msg}`);
          }
        }
      });

      instance.on("chat:ready", () => {
        setStatus("ready");
      });
    }
  }, []);

  const cfg = getWxoPublicConfig();
  const rootId = cfg?.rootElementID ?? "root";

  return (
    <div className="wxo-embed-wrap" style={{ height: "100%", display: "flex", flexDirection: "column" }}>

      {status === "no-key" && (
        <div className="wxo-setup-banner">
          <div className="wxo-banner-title">🔑 RSA key setup required</div>
          <div className="wxo-banner-body">
            IBM watsonx Orchestrate requires a signed JWT to activate the chat widget.
            Complete this one-time setup:
          </div>
          <ol className="wxo-banner-steps">
            <li>
              Generate an RSA-2048 key pair:<br />
              <code>openssl genrsa -out private.pem 2048</code><br />
              <code>openssl rsa -in private.pem -pubout -out public.pem</code>
            </li>
            <li>
              In your IBM watsonx Orchestrate console → <strong>Embedded Chat → Security</strong>:
              upload <code>public.pem</code>
            </li>
            <li>
              In Replit → <strong>Secrets</strong>: add secret <code>WXO_PRIVATE_KEY</code>
              with the full contents of <code>private.pem</code>
            </li>
            <li>Restart the app — the chat will then fully initialize.</li>
          </ol>
        </div>
      )}

      {status === "error" && errorMsg && (
        <div style={{ padding: "16px 20px", color: "#e87878", fontFamily: "monospace", fontSize: 12 }}>
          ⚠ {errorMsg}
        </div>
      )}

      {/* IBM injects the chat widget into this element */}
      <div
        id={rootId}
        className="wxo-embed-root"
        suppressHydrationWarning
        aria-label="Hoos Gaming AI chat"
        style={{ flex: 1, minHeight: 0 }}
      />
    </div>
  );
}
