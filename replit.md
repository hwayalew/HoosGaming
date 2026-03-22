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
- `/create` — Game creation interface with IBM watsonx Orchestrate chat embed
- `/play` — Game playback/viewer
- `/spec` — Game specification viewer

## IBM watsonx Orchestrate Integration

The chat embed (`src/components/WxoChatEmbed.tsx`) loads IBM's official `wxoLoader.js` SDK and uses `wxoLoader.init().then(instance => instance.on(...))` — the correct IBM API pattern. Configuration exactly matches the official IBM embed script IBM provided.

### Auth flow (RSA JWT — required by IBM)

IBM watsonx Orchestrate embedded chat requires JWT authentication signed with an RSA private key:

1. Generate an RSA-2048 key pair on your machine:
   ```
   openssl genrsa -out private.pem 2048
   openssl rsa -in private.pem -pubout -out public.pem
   ```
2. In IBM Cloud → watsonx Orchestrate → **Embedded Chat → Security**: upload `public.pem`
3. In Replit → **Secrets**: add `WXO_PRIVATE_KEY` with the full contents of `private.pem`
4. Restart the app — the `authTokenNeeded` event will be handled by `/api/wxo-jwt`

The `POST /api/wxo-jwt` route signs 15-minute-expiry JWTs using RS256.

## API Routes

- `POST /api/wxo-jwt` — Signs RSA JWT for IBM watsonx Orchestrate embed auth
- `POST /api/wxo-token` — Exchanges `WXO_API_KEY` for IBM IAM token (retained for reference)
- `GET /api/health` — Health check endpoint

## Environment Variables

### Required Secrets (set via Replit Secrets tab)
- `WXO_PRIVATE_KEY` — RSA private key PEM for signing JWTs (see Auth flow above)
- `WXO_API_KEY` — IBM watsonx Orchestrate API key (IAM, retained for reference)
- `ELEVENLABS_API_KEY` — ElevenLabs API key (audio features)

### Public Config (set as env vars — all currently configured)
- `NEXT_PUBLIC_WXO_HOST_URL=https://us-south.watson-orchestrate.cloud.ibm.com`
- `NEXT_PUBLIC_WXO_ORCHESTRATION_ID=f459230554db416db8c23a3534ec4e8b_c8a9d776-460e-4c9a-b55f-0a2556febf8e`
- `NEXT_PUBLIC_WXO_AGENT_ID=c246e4a4-dd47-431a-8c9c-8056174e5afb`
- `NEXT_PUBLIC_WXO_AGENT_ENVIRONMENT_ID=633f7088-497f-457c-be2e-7add21efb7e5`
- `NEXT_PUBLIC_WXO_CRN=crn:v1:bluemix:public:watsonx-orchestrate:us-south:...`
- `NEXT_PUBLIC_WXO_DEPLOYMENT_PLATFORM=ibmcloud`

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
