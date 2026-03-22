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
- `/create` — Game creation interface (IBM watsonx Orchestrate embed)
- `/play` — Game playback/viewer
- `/spec` — Game specification viewer

## API Routes

- `POST /api/wxo-token` — Exchanges server-side `WXO_API_KEY` for a short-lived IBM IAM token (key never sent to browser)
- `GET /api/health` — Health check endpoint

## Environment Variables

### Required Secrets (set via Replit Secrets tab)
- `WXO_API_KEY` — IBM watsonx Orchestrate API key for IAM token exchange

### Public Config (set as env vars)
- `NEXT_PUBLIC_WXO_HOST_URL` — IBM watsonx host URL (default: `https://us-south.watson-orchestrate.cloud.ibm.com`)
- `NEXT_PUBLIC_WXO_ORCHESTRATION_ID` — IBM orchestration ID
- `NEXT_PUBLIC_WXO_AGENT_ID` — IBM agent ID
- `NEXT_PUBLIC_WXO_CRN` — IBM CRN
- `NEXT_PUBLIC_WXO_DEPLOYMENT_PLATFORM` — Platform (default: `ibmcloud`)

## Development

```bash
npm run dev    # Starts dev server on port 5000
npm run build  # Production build
npm run start  # Starts production server on port 5000
```

## Replit Configuration

- **Port**: 5000 (required for Replit webview)
- **Host**: 0.0.0.0 (required for Replit proxy)
- **Workflow**: "Start application" runs `npm run dev`
- **Allowed Dev Origins**: `*.replit.dev`, `*.spock.replit.dev`, `*.replit.app`
