# Hoos Gaming

Next.js 14 AI game builder — generates complete, playable HTML5 games from a single text prompt. 78 IBM watsonx Orchestrate agents + 11 virtual rendering agents produce self-contained game files with photorealistic rendering, physics, narrative, enemies, sounds, HUD, boss fights, and win/lose screens.

**Port:** 5000 | **Run:** `npm run dev`

---

## Architecture

- **Framework**: Next.js 14 (App Router, TypeScript)
- **AI Primary**: IBM watsonx Orchestrate (78 agents, IAM auth, thread continuity, SSE streaming)
- **AI Fallback**: Google Gemini 2.5 Flash (auto-fallback when IBM unavailable)
- **Virtual Rendering Agents (11)**: StyleAgent, NarrativeAgent, CharacterSheetAgent, CharacterRenderer, AtmosphericRenderer, MaterialSimulator, LightingEngine, WindPhysics, AnimationRigger, EnvironmentPainter, ParticleSystem
- **Visual Style Detection**: StyleAgent auto-detects cartoon/photorealistic/pixel/neon/painterly/minimalist/runner from prompt
- **Detail Level Control**: 4 tiers — prototype (shapes), standard (sprites), detailed (8 agents), ultra (full CoD-quality spec)
- **Physics Intelligence**: Wolfram|Alpha Full Results API + Cellular Automata (Rule 30/90/110/150)
- **Analytics**: Snowflake (REST API, gracefully falls back to demo data)
- **Prediction Markets**: Presage Protocol (mock mode if key absent)
- **NFT Marketplace**: NFT.Storage IPFS
- **Authentication**: Auth0 (routes wired; `AuthLaunchLink`, `Auth0ReactProvider`, `CreateAuthGate`, `UserMenu` all passthrough when `@auth0/auth0-react` unavailable)
- **Voice Narration**: ElevenLabs TTS (in-game hoosSpeech() calls + spoken intro on /play)
- **Styling**: Custom CSS design system (UVA Orange #E57200 / Navy #232D4B dark mode)
- **Fonts**: Orbitron (display), Cabinet Grotesk (body), JetBrains Mono (code)

---

## Prompt System

`scripts/rebuild-prompt.mjs` regenerates `src/app/api/chat/route.ts` (extractorSrc + buildPromptSrc):

- **`extractWorldHints(prompt)`**: Detects 80+ keywords → protagonist gear, weapons, world themes, animals, vehicles, structures → returns WORLD DETAIL string
- **`extractStyleHints(prompt, detailLevel)`**: Detects visual style (cartoon/pixel/neon/photorealistic/etc.) + quality tier (prototype/standard/detailed/ultra) → returns VISUAL STYLE + QUALITY TIER strings
- **`buildPrompt(userPrompt, language, detailLevel)`**: Assembles engine-specific system prompt with all 11 virtual rendering agents injected
- **Markers**: START_MARKER = `"// ── World detail extractor"`, END_MARKER = `"function isGameComplete"`

## Pages

- `/` — Landing page, 78-agent explainer, 14-domain orbit diagram
- `/create` — Game builder: 4 quality tiers, 7 engine buttons, Wolfram Mode toggle, live pipeline animation, SSE stream reader, detailLevel passed to API
- `/play` — Game runner: sandboxed iframe, HTML/ZIP project export (index.html + src/game.js + README.md + docs/UNITY_GUIDE.md + docs/EXTENDING.md), ElevenLabs voice, Mint, Prediction Market panels
- `/analytics` — Snowflake dashboard: KPI cards, genre chart, live ticker, Wolfram facts
- `/marketplace` — NFT game grid: browse by engine, connect Phantom wallet, play minted games

---

## API Routes

| Route | Method | Purpose |
|---|---|---|
| `/api/chat` | POST | Game generation — IBM → Gemini → demo fallback, SSE stream |
| `/api/agents` | GET | IBM agent list, 55-min cache |
| `/api/gemini` | POST/GET | Direct Gemini game generation |
| `/api/wolfram` | GET | Wolfram|Alpha single physics query |
| `/api/wolfram` | POST | Batch physics bundle — theme → gravity/friction/speed/jump constants |
| `/api/wolfram/automaton` | GET | CA Rule seed for level layout |
| `/api/voice` | GET | ElevenLabs voice list |
| `/api/voice` | POST | ElevenLabs TTS — character-aware voice selection (hero/villain/boss/npc) |
| `/api/analytics/ingest` | POST | Snowflake write — log generation event |
| `/api/analytics/query` | GET | Snowflake read — KPIs + genre data |
| `/api/analytics/suggestions` | GET | Static prompt suggestions |
| `/api/presage/resolve` | POST | Resolve on-chain prediction market |
| `/api/mint` | POST | Upload to IPFS + Solana NFT mint |
| `/api/auth/[...auth0]` | GET/POST | Auth0 fallback (middleware handles real routes) |

---

## Key Files

| File | Purpose |
|---|---|
| `src/app/api/chat/route.ts` | IBM WxO client, 7 engine prompts, completion detection, continuation loop, Gemini fallback, demo fallback, SSE |
| `src/app/api/gemini/route.ts` | Gemini 1.5 Flash direct game generation endpoint |
| `src/app/api/wolfram/route.ts` | GET: single physics query; POST: batch physics bundle for game world |
| `src/app/api/voice/route.ts` | ElevenLabs character-aware TTS; character+emotion → voice selection + stability tuning |
| `src/app/api/mint/route.ts` | NFT.Storage IPFS upload + Solana NFT mint |
| `src/app/api/presage/resolve/route.ts` | Presage prediction market resolution |
| `src/lib/auth0.ts` | Auth0Client v4 configuration |
| `src/middleware.ts` | Next.js middleware (pass-through, auth handled per-route) |
| `src/app/create/page.tsx` | Game builder UI |
| `src/app/play/page.tsx` | Game runner + mint + predict |
| `src/app/analytics/page.tsx` | Snowflake analytics dashboard |
| `src/app/marketplace/page.tsx` | NFT game marketplace |

---

## Critical Technical Notes

- **In-game API bridges**: Every game iframe gets `window.hoosSpeech(text,char,emotion)`, `window.hoosMath(theme,cb)`, `window.hoosMathQuery(q,cb)`, `window.hoosAnalytics(event,data)` injected via `hoosHeadBridge()` in play/page.tsx
- **ElevenLabs voice**: `hoosSpeech()` calls `/api/voice` POST → auto-selects voice by character archetype + emotion; stability/style tuned per emotion; eleven_multilingual_v2 model
- **Wolfram physics**: `hoosMath(theme,cb)` calls `/api/wolfram` POST → real Wolfram|Alpha gravity/friction queries → game-tuned px/s² values; sane defaults always defined first (async refinement)
- **World entity realism**: `extractWorldHints()` in chat/route.ts parses 40+ entity types (animals, vehicles, structures, objects, environments) + injects drawing instructions into all 7 engine prompts
- **IBM URL censorship**: IBM filters `@version` in CDN URLs → `fixCensoredUrls()` repairs after every reply
- **Continuation loop**: `isGameComplete()` AST classifier + `assembleChunks()` merger, up to 20 passes
- **SSE client**: MUST use `fetch()` + `ReadableStream` reader, NOT `await res.json()`
- **Snowflake**: Returns 400 when DB/tables don't exist → analytics gracefully falls back to demo data
- **Auth0 v4**: Uses `Auth0Client` from `@auth0/nextjs-auth0/server`, NOT `handleAuth()` (removed in v4)
- **Gemini fallback**: Wired in `/api/chat` between IBM error block and demo fallback
- **SSR safety**: Avoid `crypto.randomUUID()` in `useRef` initializers — use `Math.random().toString(36)`
- **Spec page**: Reads `hoos_gaming_last_spec` from sessionStorage; written by `/create` on every successful generation (prompt, engine, passes, chars, wolfram, timestamp)
- **Dependencies**: Only 4 runtime deps — `@auth0/nextjs-auth0`, `fflate` (ZIP export), `next`, `react`/`react-dom`. All unused heavy packages removed (127 total)

---

## Environment Secrets (all configured in Replit Secrets)

| Secret | Status | Used In |
|---|---|---|
| `WXO_MANAGER_API_KEY` | ✓ | `/api/chat`, `/api/agents` |
| `WXO_API_KEY` | ✓ | Backup auth |
| `GEMINI_API_KEY` | ✓ | `/api/chat` fallback, `/api/gemini` |
| `WOLFRAM_APP_ID` | ✓ | `/api/wolfram` |
| `SNOWFLAKE_ACCOUNT` | ✓ | `/api/analytics/*` |
| `SNOWFLAKE_USER` | ✓ | `/api/analytics/*` |
| `SNOWFLAKE_PASSWORD` | ✓ | `/api/analytics/*` |
| `PRESAGE_API_KEY` | ✓ | `/api/presage/resolve` |
| `SOLANA_RPC_URL` | ✓ | `/api/mint` |
| `NFT_STORAGE_API_KEY` | ✓ | `/api/mint` |
| `SOLANA_WALLET_PRIVATE_KEY` | ✓ | `/api/mint` |
| `AUTH0_DOMAIN` | ✓ | `/api/auth/*`, `src/lib/auth0.ts` |
| `AUTH0_CLIENT_ID` | ✓ | `src/lib/auth0.ts` |
| `AUTH0_CLIENT_SECRET` | ✓ | `src/lib/auth0.ts` |
| `AUTH0_SECRET` | ✓ | `src/lib/auth0.ts` |
| `ELEVENLABS_API_KEY` | ✓ | `/api/voice` — TTS for in-game character speech |
