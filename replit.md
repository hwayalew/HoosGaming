# Hoos Gaming

A Next.js 14 web application showcasing the Hoos Gaming platform — an AI-powered game builder that deploys 56 specialized agents in parallel to build full video games from a single prompt, powered by IBM watsonx Orchestrate.

## Architecture

- **Framework**: Next.js 14 (App Router)
- **Styling**: Tailwind CSS + custom CSS variables (UVA Orange & Blue dark theme)
- **Fonts**: Orbitron & JetBrains Mono via `next/font/google`; Cabinet Grotesk via CSS `@import`
- **3D/Animation**: Three.js, @react-three/fiber, @react-three/drei, Framer Motion
- **Game Engine**: Phaser 3 (transpiled via Next.js config)
- **State**: Zustand
- **UI Components**: Radix UI primitives

## Pages

- `/` — Marketing landing page with animated agent orbit diagram
- `/create` — Game creation interface with IBM watsonx Orchestrate chat
- `/play` — Game playback/viewer
- `/spec` — Game specification viewer

## IBM watsonx Orchestrate Integration

The chat UI (`/create`) calls `/api/chat` which communicates directly with IBM watsonx Orchestrate via REST. No embedded widget or JWT/RSA auth is used — the integration uses IBM Cloud IAM bearer tokens.

### Auth & API Flow

1. Exchange `WXO_MANAGER_API_KEY` for a short-lived IAM bearer token via `https://iam.cloud.ibm.com/identity/token`
2. **POST** `{BASE_URL}/v1/orchestrate/runs` with body `{ message: { role:"user", content:"..." } }` — returns `thread_id` and `run_id`
3. **Poll** `{BASE_URL}/v1/orchestrate/runs/{run_id}` every 2 seconds until `status === "completed"`
4. **GET** `{BASE_URL}/v1/orchestrate/threads/{thread_id}/messages` — find the last `role:"assistant"` message and extract `content[0].text`
5. Return reply + `thread_id` as `sessionId` for conversation continuity (subsequent turns pass `thread_id` in the POST body)

**Instance Base URL**: `https://api.us-south.watson-orchestrate.cloud.ibm.com/instances/c8a9d776-460e-4c9a-b55f-0a2556febf8e`

### Fallback

If IBM is unavailable or the API key is missing, a rich keyword-aware demo response is generated client-side with a 1.5–3 s simulated delay.

## API Routes

- `POST /api/chat` — Proxies prompt to IBM watsonx Orchestrate; polls for agent reply
- `GET /api/health` — Health check endpoint

## Environment Variables

### Required Secrets (set via Replit Secrets tab)
- `WXO_MANAGER_API_KEY` — IBM Cloud IAM API key for the watsonx Orchestrate Manager service credential (`HooHAX` key, `ServiceId-ad95c013-...`)
- `WXO_API_KEY` — watsonx Orchestrate native console API key (backup)
- `ELEVENLABS_API_KEY` — ElevenLabs API key (audio features)

### Public Config
- `NEXT_PUBLIC_WXO_HOST_URL=https://api.us-south.watson-orchestrate.cloud.ibm.com/instances/c8a9d776-460e-4c9a-b55f-0a2556febf8e`
- `NEXT_PUBLIC_WXO_AGENT_ID=c246e4a4-dd47-431a-8c9c-8056174e5afb`
- `NEXT_PUBLIC_WXO_ORCHESTRATION_ID=f459230554db416db8c23a3534ec4e8b_c8a9d776-460e-4c9a-b55f-0a2556febf8e`

## Development

```bash
npm run dev    # Starts dev server on port 5000
npm run build  # Production build
npm run start  # Starts production server on port 5000
```

## Replit Configuration

- **Port**: 5000 (required for Replit webview)
- **Host**: 0.0.0.0 (required for Replit proxy)
- **next.config.js**: `allowedDevOrigins: ["*.spock.replit.dev"]`
- **suppressHydrationWarning**: set on `<html>` and `<body>` (Grammarly extension safety)
