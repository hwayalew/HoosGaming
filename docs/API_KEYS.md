# When (and how) to add API keys — **without sharing them with anyone**

## You do **not** give keys to Cursor or ChatGPT

- Put secrets **only** in a file named **`.env.local`** in the project root (same folder as `package.json`).
- That file is **gitignored** — it never gets committed.
- If you paste a key in chat by mistake, **rotate/revoke it** in your provider's dashboard and create a new one.

## When you need to add keys

| You want… | Add keys when… |
|-----------|----------------|
| **Create page** ("Build your game") with embedded IBM chat | Before visiting `/create` — copy `.env.example` → `.env.local` and fill in `NEXT_PUBLIC_WXO_*` values, then restart `npm run dev`. |
| **Health check** | Optional anytime — visit `/api/health` after `npm run dev`; it reports `wxoEmbed.configured: true/false`, never the actual values. |
| **Play / Spec pages** | No keys required. Spec shows the last result stored in the browser after a successful chat session. |

## Steps (local)

1. Copy `.env.example` → `.env.local` (or create `.env.local` by hand).
2. Fill in the four required variables from your IBM watsonx Orchestrate instance:
   - `NEXT_PUBLIC_WXO_HOST_URL` — the host (e.g. `https://us-south.watson-orchestrate.cloud.ibm.com`)
   - `NEXT_PUBLIC_WXO_ORCHESTRATION_ID` — from the embed snippet
   - `NEXT_PUBLIC_WXO_AGENT_ID` — from the embed snippet's `chatOptions.agentId`
   - `NEXT_PUBLIC_WXO_CRN` — from the embed snippet
3. Restart `npm run dev` (Next.js reads env at startup).

## How it works

The `/create` page loads IBM's `wxoLoader.js` from the host URL and passes your config via `window.wxOConfiguration`. All communication runs directly between the browser and IBM's servers — no backend proxy needed.

## What asks you for keys?

**Nothing in this repo should prompt you for keys in the UI.** Only your `.env.local` file holds them. If something else asks, treat it as suspicious.
