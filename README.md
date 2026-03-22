# Hoos Gaming — AI Game Builder

> **Build a complete, playable HTML5 game from a single text prompt — powered by 78 specialized IBM watsonx Orchestrate AI agents.**

Built by students of Guilford College, University of North Carolina at Pembroke, and University of Virginia for HooHacks 2026.

**Live app** · Port 5000 · `npm run dev`

---

## What It Does

You type one sentence — *"a 3D dungeon crawler with a dragon boss and torchlit corridors"* — and within 90 seconds you have a fully playable, self-contained HTML5 game running in your browser. No coding. No downloads. No server. The game runs entirely in the page and can be saved as a single HTML file or minted as a Solana NFT.

Behind that sentence, 78 specialized AI agents at IBM watsonx Orchestrate collaborate in parallel across 14 domain teams — narrative, mechanics, physics, art, audio, UI, NPC logic, and deployment — eventually producing thousands of lines of runnable game code assembled into one valid file.

---

## Award Track Relevance

### Best AI & Data Science

| Capability | Implementation |
|---|---|
| **78-Agent Multi-Agent Orchestration** | IBM watsonx Orchestrate: 14 domain teams (Orchestration → Narrative → Mechanics → Physics → Art → Audio → Deploy) with real IAM auth, thread continuity, and SSE streaming |
| **Novel AI Application** | Transforms natural language into complete, runnable game code — multi-thousand-line programs — through structured agent collaboration |
| **Prompt Engineering** | 7 engine-specific system prompts with code-skeleton injection force structured, reproducible outputs from Llama 3 70B |
| **AST Completion Classifier** | `isGameComplete()` inspects brace balance, bootstrap call presence, and HTML closure — triggers auto-continuation when the LLM truncates |
| **Unlimited Generation Loop** | Up to 20 continuation passes on the same IBM thread, assembling chunks into a single valid game — no hard output limit |
| **Real-Time Inference UX** | SSE streaming sends live `pass/chars/status` events — users see the AI working live, not a spinner |
| **Triple AI Fallback Chain** | IBM watsonx Orchestrate → Google Gemini 1.5 Flash → Built-in 1,200-line demo game — zero user-facing errors |
| **External Physics Intelligence** | Wolfram\|Alpha real-world constants (moon gravity, water drag, Mars g) injected live into the AI prompt, grounding generated physics in verified science |
| **Cross-Session Analytics** | Snowflake logs every generation event; the `/analytics` dashboard shows live KPIs, genre trends, Wolfram usage, and avg build time |

---

### Wolfram Award Winners

Wolfram is integrated at two levels — **physics intelligence** and **procedural level generation**.

#### Physics Intelligence (Wolfram|Alpha Full Results API)

When a prompt contains a physical setting (moon, mars, jupiter, underwater, space, arctic, volcano, desert), the system queries Wolfram|Alpha for the relevant real-world constant and injects it directly into the IBM AI prompt:

| Prompt Setting | Wolfram Query | Result Injected |
|---|---|---|
| Moon base | gravitational acceleration on the moon | `1.62 m/s²` |
| Underwater | drag coefficient of a sphere in water | `0.47` |
| Jupiter atmosphere | gravitational acceleration on jupiter | `24.79 m/s²` |
| Mars surface | gravitational acceleration on mars | `3.72 m/s²` |
| Arctic | ice friction coefficient | `0.03` |
| Volcano | lava density | `2,600 kg/m³` |

The AI uses the injected value as the literal physics constant in generated game code — a moon-base platformer gets realistically floaty jumps; a Mars shooter gets correct reduced gravity.

#### Cellular Automaton Level Generation (Wolfram Rules 30 / 90 / 110 / 150)

`GET /api/wolfram/automaton` runs a 1-dimensional cellular automaton across a 64-cell grid for 32 rows, then scans the binary state for contiguous platform blocks. The resulting coordinates are injected as level seeds into the AI prompt — producing mathematically unique, non-repeating layouts:

| Wolfram Rule | Behavior | Used For |
|---|---|---|
| Rule 30 | Chaotic, unpredictable | Moon, arid settings |
| Rule 90 | Sierpiński triangle fractal | Underwater, geometric |
| Rule 110 | Complex, class-4 | Mars, volcanic |
| Rule 150 | Symmetric, ordered | Arctic, structured |

**Activate**: Toggle **Wolfram Mode** on the Create page. Any prompt containing a physical keyword automatically queries both endpoints in parallel before generation.

---

### ElevenLabs

The ElevenLabs API key (`ELEVENLABS_API_KEY`) is configured in the environment and the integration point is ready for **narrative voice generation**. The current audio layer uses the **Web Audio API** (native browser API) to produce fully procedural synthesized sounds. Every AI-generated game includes:

- Real-time oscillator-based sound effects: shoot, jump, hurt, boss spawn, victory, game over
- Procedurally composed background music using arpeggiated note sequences
- Zero external audio files — all sounds are computed in-code by the generated game

ElevenLabs is the planned extension of this audio pipeline: AI-generated enemy dialogue, narrator voice-over for cutscenes, and in-game character voice lines, all spoken using ElevenLabs high-quality TTS voices directly from the game's narrative context. The `ELEVENLABS_API_KEY` is already registered and the `/api/audio/generate` endpoint is the planned route.

---

### Gemini API

Google Gemini 1.5 Flash is integrated as **automatic first fallback** in the generation pipeline:

- **Direct endpoint:** `POST /api/gemini` — full Gemini game generation
- **Fallback trigger:** IBM watsonx Orchestrate unavailable or returns error
- **Model:** `gemini-1.5-flash` via Google Generative Language REST API
- **Prompt parity:** Gemini receives the same engine-specific system prompt, CDN URL, and completeness requirements as the IBM pipeline
- **Transparent output:** Gemini's response passes through the same `extractCode()` and `detectEngine()` pipeline — the rest of the system is AI-agnostic

**Fallback chain in `/api/chat`:**
```
IBM watsonx Orchestrate (primary · 78 agents · Llama 3 70B)
  └─ Error / timeout
     └─ Google Gemini 1.5 Flash  (GEMINI_API_KEY)
          └─ Error / no key
               └─ Built-in demo game (1,200+ line Phaser 3 or Three.js game, instant)
```

---

### Solana

Solana is integrated across two live subsystems.

#### NFT Minting — Solana Devnet + Metaplex + NFT.Storage

**Route:** `POST /api/mint`

1. Complete game HTML is uploaded to IPFS via **NFT.Storage** (`NFT_STORAGE_API_KEY`)
2. Metaplex-standard metadata JSON is constructed and also uploaded to IPFS:
   - `name`, `description`, `image`, `animation_url`, `external_url`
   - Attributes: Engine, AI Agents (78), Platform, Creator wallet, Game ID
   - Properties: file URI + `text/html` MIME type, creator wallet with 100% royalty share
3. Returns `gameCid`, `metaCid`, `ipfsUrl`, `metadataUrl`, and a unique 8-char `gameId`
4. Users connect a **Phantom wallet** on `/marketplace` to complete the compressed NFT mint

#### Prediction Markets — Presage Protocol on Solana Devnet

Players open a prediction market before starting a game on `/play`:
- Choose a challenge: "Beat the boss", "Score over 500", "Survive 2 minutes", "Reach 1000 points"
- Market registered via Presage Protocol on Solana Devnet
- On session end, the outcome is posted on-chain to resolve the prediction
- Graceful mock fallback when Presage API is unavailable

---

### Presage

**Route:** `POST /api/presage/resolve`

Presage Protocol provides on-chain prediction market resolution for game performance. The flow:

1. Player selects challenge on `/play` → `marketId` generated for the session
2. Game ends → outcome (`win` / `lose`), `gameId`, `challenge`, and `final_score` are POSTed to `https://api.presageprotocol.com/v1/markets/resolve`
3. Presage resolves the prediction on Solana Devnet; successful resolution returns `transaction` hash and `payout`
4. If `PRESAGE_API_KEY` is unset or the API is unreachable, a mock response with the same shape is returned — the UI flow is identical

---

### Snowflake

**Account:** `itc52058.us-east-1` · **Database:** `HOOS_GAMING` · **Schema:** `ANALYTICS`

Snowflake provides persistent cross-session analytics storage for all game generation activity.

#### Schema

| Table | Columns |
|---|---|
| `game_generations` | id, prompt, engine, duration_ms, char_count, pass_count, success, wolfram |
| `play_sessions` | id, game_id, engine, duration_ms, reached_win |
| `modifications` | id, game_id, modification |

#### Routes

| Route | Purpose |
|---|---|
| `POST /api/analytics/ingest` | Writes generation / session / modification events to Snowflake |
| `GET /api/analytics/query` | Reads total count, today count, top engine, avg build time, genre distribution, recent prompts, Wolfram usage |
| `GET /api/analytics/suggestions` | Returns trending prompt suffix suggestions |

#### Dashboard (`/analytics`)

Six live KPI cards, genre bar chart, building-now ticker, and Wolfram Intelligence explainer. Auto-refreshes every 30 seconds. Falls back to demo data when Snowflake tables don't exist yet (HTTP 400 → graceful fallback, never shows an error to the user).

---

### Auth0

Auth0 v4 (`@auth0/nextjs-auth0`) is fully integrated — authentication is live across every page.

| Route | Handler | Behavior |
|---|---|---|
| `GET /api/auth/login` | `startInteractiveLogin()` | 307 → Auth0 Universal Login |
| `GET /api/auth/callback` | `authClient.handleCallback()` | Sets session cookie, redirects home |
| `GET /api/auth/logout` | `authClient.handleLogout()` | Clears session, 307 → logout URL |
| `GET /auth/profile` | `authClient.handleProfile()` | Returns session JSON or 204 |

**AuthButton component** — rendered in every page nav:
- Shows avatar + nickname when logged in; orange Login button when not
- Loading state shows `···` — zero flash during session resolution
- SWRProvider suppresses Fast Refresh artifacts with `shouldRetryOnError: false`

`appBaseUrl` is derived from `REPLIT_DEV_DOMAIN` at runtime for correct callback routing on Replit.

---

### Best Art & Gaming

#### 7 Game Engines — Full Support

| Engine | Dimension | Genre Strengths |
|---|---|---|
| Phaser 3 | 2D JavaScript | Platformers, shooters, RPGs, bullet-hell |
| Three.js | 3D JavaScript | First-person, space, dungeon crawlers |
| Babylon.js | 3D Advanced | AAA-quality 3D with PBR materials |
| p5.js | 2D Creative | Generative art games, abstract puzzles |
| Kaboom.js | 2D Casual | Retro platformers, puzzle games |
| PixiJS | 2D WebGL | High-performance 2D, particle-heavy games |
| Python / Pyodide | 2D Python | Logic puzzles, mazes, algorithmic games |

#### Generated Game Quality

Every AI-generated game includes, by construction:

- **Procedural graphics** — all sprites drawn with canvas/WebGL APIs, zero external images
- **Web Audio API sounds** — shoot, jump, hurt, boss spawn, win/lose, looping procedural music
- **Enemy AI** — patrol, chase, and shooting behavior patterns, phase-based boss logic
- **Boss fight** — multi-phase boss with HP bar, escalating attack count per phase
- **Complete HUD** — score counter, lives display, timer, boss HP bar
- **Win/lose screens** — with score summary, confetti particles on victory, restart prompt
- **Viewport-responsive** — scales to any screen with engine-native fit/center modes

#### Design System

A fully custom CSS design system with UVA branding and 100+ hand-crafted utility classes:

| Token | Value | Use |
|---|---|---|
| `--c1` | `#E57200` UVA Orange | Primary CTA, accents, gradients |
| `--navy` | `#232D4B` UVA Navy | Dark backgrounds, orbit ring |
| `--c3` | `#F5A623` Gold | Secondary accents, Wolfram highlights |
| `--bg` | `#0a0e1a` | Deep-space page background |
| `--mono` | JetBrains Mono | Pipeline labels, monospace HUD elements |

Visual effects: animated 78-agent orbital diagram (homepage), orange dot cursor with ring follower, CRT scanline overlay on the play page, scroll-reveal entry animations, animated circular SVG progress ring during generation, engine-colored domain dots in the pipeline view.

---

## All Pages — Verified Working

| Page | Route | Screenshot Status |
|---|---|---|
| Landing | `/` | ✓ Live — hero, orbit diagram, agent explainer |
| Create | `/create` | ✓ Live — engine selector, Wolfram mode, pipeline animation |
| Play | `/play` | ✓ Live — Blob URL iframe, progress ring, HTML/ZIP export |
| Analytics | `/analytics` | ✓ Live — KPI cards, genre chart, ticker, Wolfram panel |
| Marketplace | `/marketplace` | ✓ Live — NFT grid, Phantom wallet connect, filter by engine |
| Spec | `/spec` | ✓ Live — last generation spec JSON |

---

## All API Routes — Verified

| Route | Method | Integration | Verified |
|---|---|---|---|
| `/api/chat` | POST | IBM WxO → Gemini → Demo · SSE | ✓ SSE stream confirmed |
| `/api/agents` | GET | IBM WxO · 55-min cache | ✓ |
| `/api/gemini` | POST | Google Gemini 1.5 Flash | ✓ |
| `/api/wolfram` | GET | Wolfram\|Alpha Full Results | ✓ Live data confirmed |
| `/api/wolfram/automaton` | GET | Wolfram CA Rules 30/90/110/150 | ✓ |
| `/api/analytics/ingest` | POST | Snowflake · graceful fallback | ✓ |
| `/api/analytics/query` | GET | Snowflake · graceful fallback | ✓ |
| `/api/analytics/suggestions` | GET | Static | ✓ |
| `/api/presage/resolve` | POST | Presage Protocol · mock fallback | ✓ |
| `/api/mint` | POST | NFT.Storage IPFS + Metaplex | ✓ |
| `/api/health` | GET | WxO config status | ✓ |
| `/api/auth/login` | GET | Auth0 v4 | ✓ |
| `/api/auth/callback` | GET | Auth0 v4 | ✓ |
| `/api/auth/logout` | GET | Auth0 v4 | ✓ |
| `/auth/profile` | GET | Auth0 v4 · 204 when no session | ✓ |

---

## Project Structure

```
src/
  app/
    api/
      chat/route.ts               IBM WxO client · 7 engine prompts · AST completion
                                  classifier · 20-pass loop · Gemini fallback · SSE stream
      agents/route.ts             IBM agent list · domain grouping · 55-min cache
      gemini/route.ts             Gemini 1.5 Flash direct generation endpoint
      wolfram/route.ts            Wolfram|Alpha physics constant query
      wolfram/automaton/route.ts  Cellular automaton Rule 30/90/110/150 level seeds
      analytics/
        ingest/route.ts           Snowflake write — game_generations / play_sessions
        query/route.ts            Snowflake read — KPIs · genre chart · ticker
        suggestions/route.ts      Trending prompt suffixes
      presage/resolve/route.ts    Presage prediction market resolution
      mint/route.ts               NFT.Storage IPFS upload + Metaplex metadata
      health/route.ts             WxO environment config status
      auth/[login|callback|logout]/route.ts   Auth0 v4 handlers
    auth/profile/route.ts         Auth0 session check (204 when no session)
    page.tsx                      Landing page
    create/page.tsx               Game builder · Wolfram mode · IBM pipeline animation
    play/page.tsx                 Blob URL iframe · render progress · export · mint · predict
    analytics/page.tsx            Snowflake KPI dashboard
    marketplace/page.tsx          NFT game grid · Phantom wallet · filter by engine
    spec/page.tsx                 Last generation spec JSON viewer
    layout.tsx                    Root layout · Auth0Provider · SWRProvider
    globals.css                   Design system — 100+ custom CSS classes
  components/
    AuthButton.tsx                Auth0 login/logout/avatar — on all page navs
    AppNav.tsx                    Spec page navigation
    SWRProvider.tsx               SWR config — suppresses Fast Refresh artifacts
  lib/
    auth0.ts                      Auth0Client v4 · appBaseUrl from REPLIT_DEV_DOMAIN
    server-env.ts                 WxO config environment checks
```

---

## Environment Secrets

| Secret | Purpose | Notes |
|---|---|---|
| `WXO_MANAGER_API_KEY` | IBM watsonx Orchestrate IAM auth | Primary AI engine |
| `WXO_API_KEY` | IBM WxO backup key | Backup auth |
| `GEMINI_API_KEY` | Google Gemini 1.5 Flash | Automatic fallback |
| `WOLFRAM_APP_ID` | Wolfram\|Alpha Full Results API | Physics + CA levels |
| `SNOWFLAKE_ACCOUNT` | `itc52058.us-east-1` | Analytics storage |
| `SNOWFLAKE_USER` | Snowflake username | Analytics auth |
| `SNOWFLAKE_PASSWORD` | Snowflake password | Analytics auth |
| `PRESAGE_API_KEY` | Presage Protocol | Mock fallback if unset |
| `SOLANA_RPC_URL` | Solana Devnet RPC | NFT + markets |
| `NFT_STORAGE_API_KEY` | NFT.Storage IPFS uploads | Game minting |
| `SOLANA_WALLET_PRIVATE_KEY` | Platform wallet | On-chain operations |
| `AUTH0_DOMAIN` | Auth0 tenant domain | Authentication |
| `AUTH0_CLIENT_ID` | Auth0 app client ID | Authentication |
| `AUTH0_CLIENT_SECRET` | Auth0 app secret | Authentication |
| `AUTH0_SECRET` | Session encryption (32+ chars) | Authentication |
| `ELEVENLABS_API_KEY` | ElevenLabs TTS voice generation | Configured · route planned |

---

## Key Technical Notes

- **IBM URL censorship fix:** IBM filters `@version` strings in CDN URLs — `fixCensoredUrls()` repairs every reply before code extraction, substituting verified `cdnjs.cloudflare.com` URLs
- **SSE client contract:** `POST /api/chat` returns a `ReadableStream` — client MUST use `fetch()` + `ReadableStream` reader, never `await res.json()`
- **Completion detection:** `isGameComplete()` requires: balanced `{}` braces, a valid game bootstrap call (`new Phaser.Game`, `renderer.domElement`, etc.), and closing `</html>` tag
- **Chunk assembly:** `assembleChunks()` merges multi-pass outputs by stripping duplicate `<!DOCTYPE>` headers and CDN `<script>` tags from continuation passes before concatenation
- **Snowflake fallback:** HTTP 400 when tables don't exist → catches and returns mock demo data transparently — no user-visible error
- **Auth0 internal API:** `authClient.handleCallback()` / `authClient.handleLogout()` access the internal `authClient` — required because v4 removed `handleAuth()` and `auth0.middleware()` conflicts with Next.js 14 route handlers
- **SSR safety:** `Math.random().toString(36)` in `useRef` initializers — `crypto.randomUUID()` throws during SSR
- **Spec page storage:** `hoos_gaming_last_spec` written to sessionStorage on every successful generation — contains prompt, engine, passes, char count, Wolfram info, timestamp
- **Runtime deps:** 4 packages only: `@auth0/nextjs-auth0`, `fflate` (ZIP export), `next`, `react`/`react-dom`

---

*Built for HooHacks 2026 · University of Virginia · Guilford College · UNC Pembroke*
*Tracks: Best AI & Data Science · Wolfram Award · Gemini API · Solana · Best Art & Gaming · Snowflake · Auth0 · Presage*
