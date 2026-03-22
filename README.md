# Hoos Gaming — AI Game Builder

> **Build a complete, playable HTML5 game from a single text prompt — powered by IBM watsonx Orchestrate (multi-agent), with Gemini and offline demo fallbacks.**

Built by students of Guilford College, University of North Carolina at Pembroke, and University of Virginia for HooHacks26.

---

## About the Project

Hoos Gaming answers a simple question: *what if anyone could make a video game by just describing it?*

You type one sentence — e.g. “a 3D dungeon crawler with a dragon boss” — and get a self-contained HTML5 game in the browser (latency depends on WxO / Gemini and continuation passes). No coding. No downloads. No server. The game runs entirely in the page and can be saved as a single HTML file and shared like any document.

Behind that single sentence, 78 specialized AI agents at IBM watsonx Orchestrate collaborate in parallel — a Game Director orchestrates domain teams covering narrative, mechanics, physics, art, audio, UI, NPC logic, and deployment. Each agent owns a specific slice of game design and passes its output downstream, eventually producing thousands of lines of runnable game code assembled into one valid file.

The system supports 7 game engines (Phaser 3, Three.js, Babylon.js, p5.js, Kaboom.js, PixiJS, and Python via Pyodide), an auto-continuation loop (up to 20 passes), and integrations for Wolfram enrichment, ElevenLabs voice, IPFS upload (NFT.storage), optional Presage market resolve, Snowflake analytics, and Auth0 sign-in.

---

## Hackathon Track: Best AI & Data Science

| Criterion | How Hoos Gaming Delivers |
|---|---|
| **Novel AI Application** | Multi-agent pipeline that transforms natural language into runnable game code — an unsolved problem at this fidelity |
| **IBM AI Platform** | Deep integration with IBM watsonx Orchestrate: 78 agents, real API calls, IAM auth, thread continuity |
| **Multi-Agent Orchestration** | 14 specialized domains run in dependency-gated parallel: Orchestration → Narrative → Mechanics → Physics → Art → Audio → Deploy |
| **Data-Driven Completion** | `isGameComplete()` — an AST-level code classifier that inspects brace balance, bootstrap call presence, and HTML closure to decide whether to continue generating |
| **Prompt Engineering** | Seven engine-specific system prompts with architecture checklists in `chat/route.ts` |
| **Real-Time AI Inference UX** | SSE streaming sends live pass/char/status events so users see the AI working, not a spinner |
| **Auto-Continuation Loop** | If the LLM truncates, the system fires a continuation prompt on the same IBM thread and re-assembles chunks — no hard output limit, up to 20 passes |
| **External Data Intelligence** | Wolfram|Alpha physics constants (moon gravity, water drag, Mars g) are injected live into the AI prompt, grounding generated physics in real science |
| **IPFS & markets** | Games can be uploaded to IPFS via NFT.storage (wallet address in metadata); `/play` can call Presage resolve (live API or demo without `PRESAGE_API_KEY`) |
| **Cross-Session Analytics** | Snowflake logs every build; the /analytics dashboard shows live KPIs, genre trends, and average build times |
| **Graceful Degradation** | When IBM is unavailable, a locally generated 1,200+ line demo game runs instantly — zero user-facing errors |

---

## Did You Implement a Generative AI Model or API?

**Yes — three separate generative AI systems are integrated:**
1. **IBM watsonx Orchestrate** — primary 78-agent game generation pipeline
2. **Google Gemini 2.5 Flash** — automatic fallback when IBM is unavailable
3. **Wolfram|Alpha** — real-world physics intelligence oracle
4. **ElevenLabs** — optional spoken game intro narration

### IBM watsonx Orchestrate (78-Agent Pipeline)

IBM watsonx Orchestrate hosts the specialized game agents. The app authenticates with an IBM API key (`WXO_MANAGER_API_KEY`, or `WXO_API_KEY` as fallback for generation only), exchanges it for a short-lived Bearer token (cached with refresh slack), then:

1. **`POST /v1/orchestrate/runs`** — starts a run with the user message (optional `thread_id` for continuations)  
2. **Polls `/v1/orchestrate/runs/{run_id}`** until the run completes  
3. **`GET /v1/orchestrate/threads/{thread_id}/messages`** — reads the latest assistant reply  

Domain-specific system prompts are built per engine in `src/app/api/chat/route.ts`. The exact foundation model is determined by your WxO agent configuration (not hard-coded in this repo).

Crucially, because LLMs have finite context windows, generated games are often truncated mid-code. The app's auto-continuation loop detects incomplete output using `isGameComplete()` (an AST-level classifier) and re-submits to the same IBM thread with a targeted continuation prompt. This loop can run up to 20 passes, producing games well over 20,000 characters — far beyond what a single LLM call could generate.

### Google Gemini 2.5 Flash (Automatic Fallback)

When IBM watsonx Orchestrate is unavailable (network issue, quota, key not set), the same **`/api/chat`** stream automatically falls back to **Google Gemini 2.5 Flash** — no user action required. Gemini receives the same engine-specific prompt builder. After a build, the saved spec in **sessionStorage** (`hoos_gaming_last_spec`) includes `demo` and `gemini` flags when applicable.

**Fallback chain:** IBM watsonx Orchestrate (78 agents) → Gemini 2.5 Flash → Built-in demo game

The direct endpoint at `/api/gemini` accepts any prompt and returns a game from Gemini directly, useful for testing or integration.

### ElevenLabs (Optional Intro Narration)

The `/play` page can generate a spoken intro for the current game using ElevenLabs. Voices are fetched server-side from your ElevenLabs account, and the browser receives only the generated audio stream — never the API key.

### Wolfram|Alpha (Physics Intelligence)

When a user's prompt mentions a physical setting (moon, Mars, underwater, Jupiter, arctic, volcano, etc.), a live Wolfram|Alpha API call fetches the exact physics constant for that environment — lunar gravity (1.62 m/s²), water drag coefficient (0.405), Martian surface gravity (3.71 m/s²) — and injects it directly into the IBM generation prompt. The AI then uses scientifically accurate values rather than guessing.

Additionally, Wolfram cellular automata (Rule 30, 90, 110, 150) generate deterministic platform coordinate seeds for procedural level layout — different rules produce different architectural patterns encoded as X,Y positions that the AI uses as scaffolding.

---

## Built With

| Layer | Technology |
|---|---|
| **Framework** | Next.js 14 (App Router, TypeScript, SSR + API Routes) |
| **AI Backbone** | IBM watsonx Orchestrate (multi-agent; model set in your WxO deployment) |
| **AI Fallback** | Google Gemini 2.5 Flash (automatic when IBM unavailable) |
| **Physics Intelligence** | Wolfram\|Alpha Full Results API + Cellular Automata |
| **Voice Narration** | ElevenLabs Text-to-Speech |
| **Analytics Warehouse** | Snowflake (us-east-1, official Node driver) |
| **Prediction markets** | Presage API via `POST /api/presage/resolve` (mock response if `PRESAGE_API_KEY` unset) |
| **IPFS** | NFT.Storage — uploads HTML + JSON metadata; **no on-chain mint** in this codebase |
| **Solana wallet** | Phantom (client) for optional creator address in metadata only |
| **Authentication** | Auth0 (Universal Login, session management) |
| **Game Engine — 2D Default** | Phaser 3.60 (arcade physics, multi-scene) |
| **Game Engine — 3D** | Three.js r134 (WebGL, pointer-lock, shadows) |
| **Game Engine — Advanced 3D** | Babylon.js (PBR materials, built-in physics) |
| **Game Engine — Creative** | p5.js 1.9.0 (generative / artistic) |
| **Game Engine — Casual** | Kaboom.js 3000 (component-based) |
| **Game Engine — Fast 2D** | PixiJS 7.2 (WebGL 2D, particle-heavy) |
| **Game Engine — Python** | Pyodide v0.23.4 (WASM Python in browser) |
| **Audio** | Web Audio API (oscillator SFX + procedural music, zero files) |
| **ZIP Export** | fflate (client-side, no server needed) |
| **Styling** | Custom CSS design system (UVA Orange/Blue dark mode) |
| **Fonts** | Orbitron, Cabinet Grotesk, JetBrains Mono |

---

## External applications & APIs (third-party)

Everything below is **outside** this repo. Hoos Gaming calls them from **Next.js route handlers**, the **browser** (wallet, iframe CDNs), or shows their **configured** state on **`GET /api/health`**.

| External system | Purpose in Hoos Gaming | Environment / config | How it is used |
|-----------------|------------------------|----------------------|----------------|
| **IBM Cloud IAM** | OAuth-style API key → Bearer JWT | `WXO_MANAGER_API_KEY` or `WXO_API_KEY` (chat fallback only) | `POST https://iam.cloud.ibm.com/identity/token` from `chat/route.ts` and `agents/route.ts` |
| **IBM watsonx Orchestrate** | Multi-agent game generation + agent catalog | `NEXT_PUBLIC_WXO_HOST_URL` (→ instance API base), keys above | `POST/GET …/v1/orchestrate/runs`, `GET …/v1/orchestrate/threads/…/messages`, `GET …/v1/orchestrate/agents` |
| **Google Generative Language API** | Fallback text generation | `GEMINI_API_KEY` | `POST https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent` from `chat/route.ts` and `gemini/route.ts` |
| **Wolfram\|Alpha** | Physics / facts query | `WOLFRAM_APP_ID` | `GET https://api.wolframalpha.com/v2/query` from `wolfram/route.ts` |
| **ElevenLabs** | Voice list + TTS | `ELEVENLABS_API_KEY` | `GET/POST https://api.elevenlabs.io/v1/…` from `voice/route.ts` |
| **NFT.storage** | IPFS pinning | `NFT_STORAGE_API_KEY` | `POST https://api.nft.storage/upload` from `mint/route.ts` |
| **Presage Protocol** (optional) | Market resolve HTTP API | `PRESAGE_API_KEY` | `POST https://api.presageprotocol.com/v1/markets/resolve` from `presage/resolve/route.ts` (or mock) |
| **Snowflake** | Analytics warehouse | `SNOWFLAKE_ACCOUNT`, `SNOWFLAKE_USER`, `SNOWFLAKE_PASSWORD`, optional `SNOWFLAKE_DATABASE` / `SCHEMA` / `WAREHOUSE` | `snowflake-sdk` in `snowflake.ts` — `analytics/ingest` + `analytics/query` |
| **Auth0** | Universal Login + session | `AUTH0_DOMAIN`, `AUTH0_CLIENT_ID`, `AUTH0_CLIENT_SECRET`, `AUTH0_SECRET`, `APP_BASE_URL` / `AUTH0_BASE_URL` | Hosted login + token exchange; routes under `/api/auth/*`; profile at `/auth/profile` and `/api/auth/profile` |
| **Phantom (Solana)** | Wallet address for metadata | None (user extension) | `window.solana` on `/play` and `/marketplace` — not sent to a Hoos server except inside `POST /api/mint` body as `walletAddress` |
| **Public CDNs** | Game engine scripts inside generated HTML | None | Browser loads e.g. cdnjs, unpkg, jsdelivr, babylonjs.com when the user runs a game in the iframe (not proxied by Hoos) |

**Public IBM embed identifiers** (defaults in `src/lib/app-config.ts`, overridable via `NEXT_PUBLIC_*`): instance host URL, `WXO_AGENT_ID`, `WXO_AGENT_ENVIRONMENT_ID`, `WXO_CRN`, `WXO_ORCHESTRATION_ID`, `WXO_DEPLOYMENT_PLATFORM`. These appear in **`GET /api/health`** for debugging configuration; they are not secrets.

---

## The 4 Integrations

### Integration #8 — Wolfram Procedural Game Intelligence

**What it does:**
Before every game is generated, Hoos Gaming checks whether the user's prompt mentions a specific physical environment. If it does, a live call to the Wolfram|Alpha Full Results API fetches the real-world physics constant for that setting.

| Setting Keyword | Wolfram Query | Value | CA Rule |
|---|---|---|---|
| moon | surface gravity Moon | 1.62 m/s² | Rule 30 |
| mars | surface gravity Mars | 3.71 m/s² | Rule 90 |
| underwater / ocean | drag coefficient water | 0.405 | Rule 110 |
| jupiter | surface gravity Jupiter | 24.79 m/s² | Rule 150 |
| saturn | surface gravity Saturn | 10.44 m/s² | Rule 30 |
| space / vacuum | gravitational acceleration vacuum | 0 m/s² | Rule 90 |
| arctic / desert / volcano | surface gravity Earth | 9.81 m/s² | Rule 110 |

These values are injected directly into the IBM Orchestrate system prompt so the game's physics engine uses scientifically accurate constants — not guesses.

**Wolfram Cellular Automata (Level Seeds):**
Rule 30/90/110/150 generate 10 deterministic platform (X,Y) coordinates seeded with the prompt's first character. These positions are appended to the AI prompt as layout scaffolding. Different rules produce distinctly different architectural patterns (chaotic, symmetric, complex, fractal).

**Where you see it:**
- `/create` page: Wolfram Mode toggle in the engine selector; badge shows the fetched value (e.g., `✓ Rule 90 · 3.71 m/s²`)
- API route: `GET /api/wolfram?query=surface+gravity+Mars`
- API route: `GET /api/wolfram/automaton?rule=90&width=64&rows=32` (bounds: rule 0–255, width 16–128, rows 8–64)

---

### Integration #7 — Snowflake Game Analytics Engine

**What it does:**
When Snowflake credentials are set, the app can **write** generation events and **read** aggregates for the dashboard. Table names are resolved as `{SNOWFLAKE_DATABASE}.{SNOWFLAKE_SCHEMA}` (defaults: `HOOS_GAMING.ANALYTICS`; see `src/lib/analytics-sql.ts`).

**Ingest (`POST /api/analytics/ingest`):**
- `type: "generation"` — after each build on `/create`
- `type: "session"` — on `/play` (POST after win/gameover and `sendBeacon` on tab close, when Snowflake is configured)
- `type: "modification"` — reserved for future live-edit logging

**Dashboard (`/analytics`) — actual KPIs in the UI:**
- Games built (total), built today, top engine by count, average build duration, static “78 agents” card, Wolfram usage count from DB
- **Trending Genres · 24h** — heuristic buckets from prompt text (not ML classification)
- **Building Right Now** — recent prompt snippets from Snowflake (or mock ticker)

**Prompt suggestions (`GET /api/analytics/suggestions`):**
- Returns a **static** list of short fragments; merged into example chips on `/create` (not queried from Snowflake).

**Database setup (Snowflake Worksheet):**
```sql
CREATE DATABASE IF NOT EXISTS HOOS_GAMING;
CREATE SCHEMA IF NOT EXISTS HOOS_GAMING.ANALYTICS;

CREATE TABLE IF NOT EXISTS HOOS_GAMING.ANALYTICS.game_generations (
  id          VARCHAR PRIMARY KEY,
  prompt      VARCHAR,
  engine      VARCHAR,
  duration_ms NUMBER,
  char_count  NUMBER,
  pass_count  NUMBER,
  success     BOOLEAN,
  wolfram     BOOLEAN DEFAULT FALSE,
  ts          TIMESTAMP_LTZ DEFAULT CURRENT_TIMESTAMP()
);

CREATE TABLE IF NOT EXISTS HOOS_GAMING.ANALYTICS.play_sessions (
  id           VARCHAR PRIMARY KEY,
  game_id      VARCHAR,
  engine       VARCHAR,
  duration_ms  NUMBER,
  reached_win  BOOLEAN,
  ts           TIMESTAMP_LTZ DEFAULT CURRENT_TIMESTAMP()
);

CREATE TABLE IF NOT EXISTS HOOS_GAMING.ANALYTICS.modifications (
  id            VARCHAR PRIMARY KEY,
  game_id       VARCHAR,
  modification  VARCHAR,
  ts            TIMESTAMP_LTZ DEFAULT CURRENT_TIMESTAMP()
);
```

**Where you see it:**
- `/analytics` — `GET /api/analytics/query` every 30s
- `/create` — `POST` ingest on successful completion; optional `/api/health` integration strip
- If Snowflake is **not** configured, query returns **demo JSON** with `mock: true`; ingest returns `{ ok: false, reason: "snowflake not configured" }` (writes skipped)

---

### Integration #6 — Presage prediction market (resolve hook)

**What it does:**
On `/play`, users can open a **local UI state** “market” (challenge text + generated id) and, when the iframe reports win/gameover via `postMessage`, the client calls **`POST /api/presage/resolve`** with outcome. If **`PRESAGE_API_KEY`** is set, the server forwards to the configured Presage HTTP API; otherwise the route returns a **successful mock payload** so the UI still demonstrates the flow.

**What this repo does *not* implement:** creating markets on-chain, order books, or SOL escrow — those would require additional Presage/Solana product wiring.

**Where you see it:**
- `/play` — Prediction Market panel
- `POST /api/presage/resolve`

---

### Integration #5 — IPFS upload & marketplace listing

**What it does:**
`POST /api/mint` uploads the **game HTML** and a **JSON metadata** document to **NFT.storage** (IPFS). The API returns CIDs / `ipfs.io` URLs and a generated display id. **No Solana or Metaplex transaction** is submitted from this server — Phantom is used client-side only to pass a **creator wallet address** into metadata.

**Flow:**
1. Build a game on `/create`, then open `/play` (or use `/marketplace` with code in `sessionStorage`)
2. Connect Phantom (optional) and trigger upload — `POST /api/mint`
3. Successful uploads can be appended to **`sessionStorage`** (`hoos_minted_games`) and shown in the marketplace grid alongside built-in demo cards

**Marketplace (`/marketplace`):**
- Demo grid + locally stored uploads; filter by engine label
- **Play** opens the IPFS HTML link when `ipfsUrl` is set

**Where you see it:**
- `/play` — IPFS upload panel (toolbar **NFT**)
- `/marketplace` — upload panel + grid
- `POST /api/mint`

---

## AI Architecture

### The 78-Agent Pipeline

```
User Prompt
    │
    ▼
┌─────────────────────────────────────────────────────────┐
│  IBM watsonx Orchestrate — /v1/orchestrate/runs + thread │
│                                                         │
│  Orchestration (13) ──► Narrative (6) ──► Mechanics (7) │
│         │                                      │        │
│         ▼                                      ▼        │
│  Physics (4) ──► Animation (4) ──► Art (4)             │
│         │                              │                │
│         ▼                              ▼                │
│  Rendering (4) ──► Level (2) ──► Audio (4)             │
│                                        │                │
│                         UI (3) ◄───────┘                │
│                          │                              │
│                 AI/NPC (4) ──► QA (5) ──► Deploy (4)   │
│                                                         │
│  Bridge agents (10) — run throughout, translate state   │
└─────────────────────────────────────────────────────────┘
    │
    ▼
Single-file HTML5 game (```html ... ```)
    │
    ▼
isGameComplete() → if false: auto-continuation pass (up to 20×)
    │
    ▼
assembleChunks() → merge all passes into one valid HTML file
    │
    ▼
sessionStorage → /play iframe → runs directly in browser
```

### IAM Authentication & Token Caching

```typescript
// Module-level cache — one IAM exchange per 55 minutes
let _iamCache: { token: string; expiresAt: number } | null = null;

POST https://iam.cloud.ibm.com/identity/token
  grant_type=urn:ibm:params:oauth:grant-type:apikey
  &apikey=<IBM API key>
→ { access_token, expires_in: 3600 }
```

Use **`WXO_MANAGER_API_KEY`** for IAM. Generation also tries **`WXO_API_KEY`** if the manager key is unset. **`GET /api/agents`** uses the manager key only (falls back to mock agents if missing).

### Completion Detection

`isGameComplete(code)` acts as an AI output classifier:
1. Must end with `</html>`
2. Must contain a bootstrap call (`new Phaser.Game(`, `requestAnimationFrame`, `kaboom()`, `BABYLON.Engine`, `new PIXI.Application`, `pyodide.runPythonAsync`)
3. `<script>` block brace depth must be exactly 0 (all functions closed)

### IBM URL Censorship Fix

IBM's content filter replaces `@version` strings in CDN URLs (e.g., `phaser@3.60.0` → `*****`). `fixCensoredUrls()` runs regex repair after every reply, substituting known cdnjs.cloudflare.com URLs.

---

## Supported Game Engines

| Engine | Tech | Best For |
|---|---|---|
| **Phaser 3** | JavaScript 2D | Platformers, side-scrollers, RPGs, bullet-hell |
| **Three.js** | JavaScript 3D | First-person shooters, dungeon crawlers, 3D adventures |
| **Babylon.js** | JavaScript 3D | PBR rendering, physics-heavy AAA-quality scenes |
| **p5.js** | JavaScript 2D | Creative coding, artistic games, generative art |
| **Kaboom.js** | JavaScript 2D | Casual games, rapid prototyping, arcade |
| **PixiJS** | JavaScript 2D | Fast WebGL 2D, particle-heavy games |
| **Python** | Pyodide WASM | Python education, puzzle games, maze runners |

---

## Pages & user-facing features

| Page | Key features | Primary APIs / data |
|------|----------------|---------------------|
| **`/`** | Marketing sections, nav to Create/Analytics/Marketplace, Auth0 login link | — |
| **`/create`** | 7 engine buttons, Wolfram toggle, prompt textarea, SSE “pass” status, animated agent pipeline sidebar, example + API suggestion chips, “Play Game” → `sessionStorage`, integration status dots | `POST /api/chat`, `GET /api/agents`, `GET /api/health`, `GET /api/analytics/suggestions`, optional `GET /api/wolfram*`, `POST /api/analytics/ingest` after build |
| **`/play`** | Iframe game, render progress bar, fullscreen, export HTML / ZIP / SRC, copy code, ElevenLabs panel, IPFS upload panel, prediction panel, rebuild link, `postMessage` win/gameover | `GET/POST /api/voice`, `POST /api/mint`, `POST /api/presage/resolve`, `POST /api/analytics/ingest` (+ beacon), Auth0 button |
| **`/analytics`** | KPI cards, genre chart, recent ticker, Wolfram explainer | `GET /api/analytics/query` (30s poll) |
| **`/marketplace`** | Demo + locally stored uploads, Phantom connect, mint from `sessionStorage`, filter by engine | `POST /api/mint` |
| **`/spec`** | Read-only JSON of last successful spec | `sessionStorage` only (`hoos_gaming_last_spec`) |

**`sessionStorage` keys (client):** `hoos_game_code`, `hoos_game_source`, `hoos_game_language`, `hoos_game_prompt`, `hoos_game_engine`, `hoos_gaming_last_spec`, `hoos_minted_games` — used to pass state from Create → Play and Marketplace.

---

## HTTP API reference (this application)

All routes live under `src/app/api/` unless noted. **Auth:** none of these are Auth0-protected unless you add middleware; Auth0 only matches `/api/auth/*`.

### Game generation & AI

| Method | Path | Called by | Request | Response | External calls |
|--------|------|-----------|---------|----------|----------------|
| **POST** | **`/api/chat`** | `/create` | JSON `{ prompt, sessionId?, language? }` | `text/event-stream` — SSE lines `data: {JSON}` with `type: "progress" \| "complete"`; `complete` may include `demo`, `gemini`, `passes`, `reply` | IBM WxO runs API → optional **Gemini** → no network (demo HTML) |
| **GET** | **`/api/agents`** | `/create` | — | JSON `{ agents[], mock?, error? }` | IBM IAM + WxO agents list; **mock** agents if no `WXO_MANAGER_API_KEY` |
| **POST** | **`/api/gemini`** | External / manual | JSON `{ prompt, language? }` | JSON `{ ok, reply, model }` or error | **Google Gemini** only |
| **GET** | **`/api/gemini`** | Optional checks | — | JSON `{ ok, configured, model, purpose }` | — |

### Wolfram

| Method | Path | Called by | Request | Response | External calls |
|--------|------|-----------|---------|----------|----------------|
| **GET** | **`/api/wolfram`** | `/create` (Wolfram mode + keyword) | Query `q` (required) | JSON `{ result?, query }` or 503 | **Wolfram\|Alpha** API |
| **GET** | **`/api/wolfram/automaton`** | `/create` (same) | `rule` (0–255), `width` (16–128), `rows` (8–64) | JSON `{ grid, platforms, … }` | — (pure compute) |

### Voice

| Method | Path | Called by | Request | Response | External calls |
|--------|------|-----------|---------|----------|----------------|
| **GET** | **`/api/voice`** | `/play` (voice panel) | — | JSON `{ configured, voices[] }` or error | **ElevenLabs** `GET /voices` |
| **POST** | **`/api/voice`** | `/play` | JSON `{ voiceId?, text?, title?, engine?, prompt? }` | `audio/mpeg` stream + `X-Voice-*` headers, or JSON error | **ElevenLabs** TTS |

### Analytics (Snowflake)

| Method | Path | Called by | Request | Response | External calls |
|--------|------|-----------|---------|----------|----------------|
| **POST** | **`/api/analytics/ingest`** | `/create` (after generation), `/play` (session / beacon) | JSON body by `type`: **`generation`** — `prompt`, `engine`, `duration_ms`, `char_count`, `pass_count`, `success`, `wolfram`; **`session`** — `game_id`, `engine`, `duration_ms`, `reached_win`; **`modification`** — `game_id`, `modification` | `{ ok, id }` or `{ ok: false }` / 400 | **Snowflake** `INSERT` into `{DB}.{SCHEMA}` tables |
| **GET** | **`/api/analytics/query`** | `/analytics` | — | JSON KPIs + `genres` + `recent` + `wolfram_count`; `mock: true` if no Snowflake | **Snowflake** `SELECT` (cached 30s) |
| **GET** | **`/api/analytics/suggestions`** | `/create` | — | JSON `{ suggestions: string[], source: "static" }` | — |

### IPFS & markets

| Method | Path | Called by | Request | Response | External calls |
|--------|------|-----------|---------|----------|----------------|
| **POST** | **`/api/mint`** | `/play`, `/marketplace` | JSON `{ gameCode, title, engine, prompt, walletAddress }` | JSON with IPFS URLs + `gameId`, or 503/500 | **NFT.storage** upload (HTML + metadata JSON) |
| **POST** | **`/api/presage/resolve`** | `/play` | JSON `{ marketId, outcome, gameId, challenge, score? }` | JSON `{ ok, mock?, message?, … }` | **Presage** HTTP API if key set, else mock |

### Operations & auth

| Method | Path | Called by | Request | Response | External calls |
|--------|------|-----------|---------|----------|----------------|
| **GET** | **`/api/health`** | `/create` | — | JSON snapshot: `app`, `wxoEmbed`, `wxoApiKey`, `wxoManagerApiKey`, `auth0`, `gemini`, `wolfram`, `elevenlabs`, `snowflake`, `presage`, `nftStorage`, `solana` (booleans + non-secret metadata) | — |
| **GET** | **`/api/auth/login`** | `AuthButton` / links | — | Redirect to Auth0 | **Auth0** `/authorize` |
| **GET** | **`/api/auth/logout`** | `AuthButton` | — | Redirect / session clear | **Auth0** logout |
| **GET** | **`/api/auth/callback`** | Auth0 redirect | OAuth query params | Sets session cookie, redirect to app | **Auth0** token exchange |
| **GET** | **`/api/auth/profile`** | Optional client config | — | User JSON or 204 | Reads session (same handler as below) |
| **GET** | **`/auth/profile`** | `@auth0/nextjs-auth0` **`useUser()`** default | — | User JSON or **204** when logged out | Reads session |

**Middleware** (`src/middleware.ts`): `auth0.middleware` for **`/api/auth/:path*`** only. **Route handlers** for `login`, `logout`, `callback`, and `profile` still exist under `app/api/auth/`; profile is duplicated at `app/auth/profile` for the SDK default path.

---

## Sound Architecture

Every generated game includes Web Audio API sound — no files, no CORS, works offline:

```javascript
const actx = new AudioContext();
function sfx(freq, dur, type = 'square', vol = 0.22) {
  const o = actx.createOscillator(), g = actx.createGain();
  o.type = type; o.frequency.value = freq;
  g.gain.setValueAtTime(vol, actx.currentTime);
  g.gain.exponentialRampToValueAtTime(0.001, actx.currentTime + dur);
  o.connect(g); g.connect(actx.destination);
  o.start(); o.stop(actx.currentTime + dur);
}

sfx(580, 0.08, 'sine')      // jump
sfx(480, 0.06, 'sine')      // shoot
sfx(220, 0.06, 'sawtooth')  // enemy hit
sfx(70,  0.20, 'sawtooth')  // player hurt
sfx(50,  0.80, 'sawtooth')  // game over
sfx(880, 0.60, 'sine')      // victory
```

---

## Export & Portability

Games are exported as **single, self-contained HTML files** that:
- Run in any modern browser without a server
- Include all assets generated procedurally in code (zero external images or sounds)
- Can be shared as email attachments or hosted anywhere
- Embed into any website via `<iframe>`

The `/play` page also includes:
- `↻ Render` to reload the iframe (with **progress %** while the runtime boots)
- `⧉ Code` / **SRC** — copy or download extracted engine source
- `⬇ HTML` to export the full runnable file
- `📦 ZIP` — `index.html`, source file, and `README.txt` (fflate, client-side)

The ZIP export (fflate, runs client-side) adds:
- `index.html` — the complete game
- `README.txt` — engine, controls, and credit line

---

## Environment Variables

See `.env.example` for full setup instructions. Summary:

| Variable | Required | What It Does |
|---|---|---|
| `WXO_MANAGER_API_KEY` | **Yes** (for live IBM + agent list) | IBM API key — IAM token for WxO runs and `/api/agents` |
| `WXO_API_KEY` | No | Used only as **fallback** for **`/api/chat`** if manager key is unset |
| `AUTH0_DOMAIN` | No | Auth0 tenant domain (e.g. `yourapp.us.auth0.com`) |
| `AUTH0_CLIENT_ID` / `AUTH0_CLIENT_SECRET` / `AUTH0_SECRET` | No | Auth0 Regular Web App + session cookie secret |
| `APP_BASE_URL` | No | **Preferred** app origin for OAuth (`http://localhost:3000` locally; must match Auth0 URLs) |
| `AUTH0_BASE_URL` | No | Same as app URL if set (see `.env.example` order) |
| `NEXT_PUBLIC_APP_URL` | No | Public URL for client-side links / health-related display |
| `GEMINI_API_KEY` | No | Google Gemini 2.5 Flash (auto-fallback when IBM is down) |
| `WOLFRAM_APP_ID` | No | Wolfram\|Alpha Full Results API App ID |
| `SNOWFLAKE_ACCOUNT` | No | Snowflake account locator (e.g. `itc52058.us-east-1`) |
| `SNOWFLAKE_USER` | No | Snowflake login username |
| `SNOWFLAKE_PASSWORD` | No | Snowflake login password |
| `SNOWFLAKE_DATABASE` | No | Default: `HOOS_GAMING` |
| `SNOWFLAKE_SCHEMA` | No | Default: `ANALYTICS` |
| `SNOWFLAKE_WAREHOUSE` | No | Default: `COMPUTE_WH` |
| `PRESAGE_API_KEY` | No | Presage Protocol developer API key |
| `SOLANA_RPC_URL` | No | Solana RPC endpoint (Devnet) |
| `NFT_STORAGE_API_KEY` | No | NFT.Storage IPFS upload key |
| `SOLANA_WALLET_PRIVATE_KEY` | No | Devnet server wallet (Base64 encoded) |
| `ELEVENLABS_API_KEY` | No | ElevenLabs intro narration on `/play` |
| `NEXT_PUBLIC_WXO_HOST_URL` | No | Overrides default IBM WxO instance API base (used by server routes + health) |
| `NEXT_PUBLIC_WXO_AGENT_ID` | No | WxO agent UUID for orchestration runs |
| `NEXT_PUBLIC_WXO_AGENT_ENVIRONMENT_ID` | No | WxO agent environment id |
| `NEXT_PUBLIC_WXO_CRN` | No | IBM cloud resource name (shown in health; not a secret) |
| `NEXT_PUBLIC_WXO_ORCHESTRATION_ID` | No | WxO orchestration id |
| `NEXT_PUBLIC_WXO_DEPLOYMENT_PLATFORM` | No | e.g. `ibmcloud` — embed metadata |
| `NEXT_PUBLIC_SOLANA_NETWORK` | No | Client label for Solana network (default `devnet`) |
| `NEXT_PUBLIC_SOLANA_WALLET_PUBKEY` | No | Optional display pubkey for Solana-related UI |

All `NEXT_PUBLIC_*` IBM fields are read in `src/lib/app-config.ts` and surfaced on **`GET /api/health`** for configuration checks.

---

## Local Development

```bash
# 1. Clone and install
git clone <repo>
cd hoos-gaming
npm install

# 2. Set up environment
cp .env.example .env.local
# Fill in keys for integrations you need (IBM, Auth0, Snowflake, etc.).
# See the Environment Variables table below.

# 3. Run
npm run dev
# → http://localhost:3000 (default; override with PORT=5000 npm run dev)
```

**Without `WXO_MANAGER_API_KEY` / `WXO_API_KEY`:** `/api/chat` skips IBM and uses **Gemini** if `GEMINI_API_KEY` is set, else the **built-in demo HTML** game. **`/api/agents`** returns mock agents and shows a **DEMO** badge on Create.

## Operational Status

Verified with the current codebase:
- `npm run build` passes (ESLint may warn on `<img>` in `AuthButton`)
- Auth0: `/api/auth/login` → `/api/auth/callback` — **Allowed Callback URL** must be `{APP_BASE_URL}/api/auth/callback`
- IBM: `WXO_MANAGER_API_KEY` → `/v1/orchestrate/runs` + continuation loop in `/api/chat`
- Gemini: automatic fallback **inside** `/api/chat`; **`/api/gemini`** is optional for direct tests
- Wolfram: `/api/wolfram` + `/api/wolfram/automaton` when `WOLFRAM_APP_ID` is set
- Snowflake: `/api/analytics/*` when `SNOWFLAKE_*` credentials are set; otherwise mock query + skipped ingest
- ElevenLabs: `/api/voice` when `ELEVENLABS_API_KEY` is set
- `/play`: iframe runtime, progress UI, exports, voice, IPFS panel, Presage client, analytics hooks

---

## Auth0 Dashboard Setup

Application type: **Regular Web Application**. This app uses **`/api/auth/*`** routes (not `/auth/*`).

**Allowed Callback URLs** (comma-separated; must match how you open the app):
```
http://localhost:3000/api/auth/callback,
http://localhost:5000/api/auth/callback,
https://YOUR-PRODUCTION-DOMAIN/api/auth/callback
```

**Allowed Logout URLs** — same origins, no path:
```
http://localhost:3000,
http://localhost:5000,
https://YOUR-PRODUCTION-DOMAIN
```

**Allowed Web Origins** — same as logout URLs.

Set **`APP_BASE_URL`** (and **`AUTH0_BASE_URL`**) in `.env.local` to the **exact** origin you use (scheme + host + port).

---

## Known IBM Behaviors & Fixes

| Behavior | Cause | Fix Applied |
|---|---|---|
| CDN URLs censored (`@3.60.0` → `*****`) | IBM content filter blocks `@version` npm patterns | `fixCensoredUrls()` regex repair after every reply |
| 35–90s response time | 78-agent pipeline with sequential domain gating | Poll with gentle backoff (2s → 4s), animated pipeline shows progress |
| Truncated output | LLM context window limit | Auto-continuation loop (20 passes max), `isGameComplete()` + `assembleChunks()` |
| `game_director` routing errors | IBM-side agent flow issue | Uses WxO **runs** API with thread continuity (see `startRun` / `pollRun`) |
| IAM token 401 | Token expired mid-session | Module-level cache with 5-min early refresh window |
| Timeout after 90s | IBM stall | Continue with collected chunks, demo fallback if nothing received |

---

## Project Structure

```
src/
  middleware.ts              Auth0 — matcher /api/auth/*
  lib/
    app-config.ts            URLs, WxO defaults, AUTH0_ROUTES
    auth0.ts                 Auth0Client
    auth-profile-handler.ts  Profile JSON handler (shared)
    analytics-sql.ts         Snowflake analytics table prefix
    server-env.ts            getHealthSnapshot()
    snowflake.ts             DB driver + executeSQL
  app/
    api/
      chat/ agents/ gemini/ health/
      auth/login, logout, callback, profile/
      wolfram/ + wolfram/automaton/
      analytics/ingest, query, suggestions/
      voice/ presage/resolve/ mint/
    auth/profile/            useUser() default profile route
    create/ play/ analytics/ marketplace/ spec/ page.tsx
    layout.tsx globals.css
  components/                AuthButton, AppNav, CustomCursor, SWRProvider
README.md  .env.example  replit.md  IBMOrchestra.md  docs/AUDIT_REPORT.md
```

---

## Design System

| Token | Value | Used For |
|---|---|---|
| `--c1` | `#E57200` UVA Orange | Primary CTA, accents, highlights |
| `--navy` | `#232D4B` UVA Navy | Gradients, dark backgrounds |
| `--c3` | `#F5A623` Gold | Secondary accents |
| `--bg` | `#0a0e1a` | Page background |
| `--txt` | `#e8eaf0` | Body text |
| `--muted` | `#5a6280` | Secondary / label text |
| `--mono` | JetBrains Mono | Code blocks, HUD labels |

Effects: custom orange dot cursor + ring follower, CRT scanline overlay, scroll-reveal animations.

---

*Built for IBM TechXchange 2025 · Best AI & Data Science Track · University of Virginia · Hoos Gaming*
