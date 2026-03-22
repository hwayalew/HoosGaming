# Hoos Gaming — AI Game Builder

> **Build a complete, playable HTML5 game from a single text prompt in under 90 seconds — powered by 78 specialized IBM watsonx Orchestrate AI agents.**

Built by students of Guilford College, University of North Carolina at Pembroke, and University of Virginia for HooHacks26.

---

## About the Project

Hoos Gaming answers a simple question: *what if anyone could make a video game by just describing it?*

You type one sentence — "a 3D dungeon crawler with a dragon boss and torchlit corridors" — and within 90 seconds you have a fully playable, self-contained HTML5 game running in your browser. No coding. No downloads. No server. The game runs entirely in the page and can be saved as a single HTML file and shared like any document.

Behind that single sentence, 78 specialized AI agents at IBM watsonx Orchestrate collaborate in parallel — a Game Director orchestrates domain teams covering narrative, mechanics, physics, art, audio, UI, NPC logic, and deployment. Each agent owns a specific slice of game design and passes its output downstream, eventually producing thousands of lines of runnable game code assembled into one valid file.

The system supports 7 game engines (Phaser 3, Three.js, Babylon.js, p5.js, Kaboom.js, PixiJS, and Python via Pyodide), an unlimited-length auto-continuation loop, and 4 live integrations that add real-world data intelligence, on-chain economics, and cross-session analytics to every build.

---

## Hackathon Track: Best AI & Data Science

| Criterion | How Hoos Gaming Delivers |
|---|---|
| **Novel AI Application** | Multi-agent pipeline that transforms natural language into runnable game code — an unsolved problem at this fidelity |
| **IBM AI Platform** | Deep integration with IBM watsonx Orchestrate: 78 agents, real API calls, IAM auth, thread continuity |
| **Multi-Agent Orchestration** | 14 specialized domains run in dependency-gated parallel: Orchestration → Narrative → Mechanics → Physics → Art → Audio → Deploy |
| **Data-Driven Completion** | `isGameComplete()` — an AST-level code classifier that inspects brace balance, bootstrap call presence, and HTML closure to decide whether to continue generating |
| **Prompt Engineering** | 7 engine-specific system prompts with code-skeleton injection force structured, reproducible outputs from Llama 3 70B |
| **Real-Time AI Inference UX** | SSE streaming sends live pass/char/status events so users see the AI working, not a spinner |
| **Auto-Continuation Loop** | If the LLM truncates, the system fires a continuation prompt on the same IBM thread and re-assembles chunks — no hard output limit, up to 20 passes |
| **External Data Intelligence** | Wolfram|Alpha physics constants (moon gravity, water drag, Mars g) are injected live into the AI prompt, grounding generated physics in real science |
| **Blockchain Integration** | Every game can be minted as a compressed NFT on Solana; prediction markets let players bet on their own performance |
| **Cross-Session Analytics** | Snowflake logs every build; the /analytics dashboard shows live KPIs, genre trends, and average build times |
| **Graceful Degradation** | When IBM is unavailable, a locally generated 1,200+ line demo game runs instantly — zero user-facing errors |

---

## Did You Implement a Generative AI Model or API?

**Yes — three separate generative AI systems are integrated:**
1. **IBM watsonx Orchestrate** — primary 78-agent game generation pipeline
2. **Google Gemini 1.5 Flash** — automatic fallback when IBM is unavailable
3. **Wolfram|Alpha** — real-world physics intelligence oracle

### IBM watsonx Orchestrate (78-Agent Pipeline)

IBM watsonx Orchestrate hosts the 78 specialized game agents. The app authenticates with a Manager-role IAM key, exchanges it for a short-lived Bearer token (cached 55 minutes), and submits every game generation as a structured natural-language prompt to the `AskOrchestrate` endpoint.

The underlying model is **Llama 3 70B** running on IBM infrastructure with domain-specific system prompts engineered per engine. IBM's multi-agent routing handles internal coordination between the 78 agents — Hoos Gaming sees a single API call but receives the synthesized output of the entire pipeline.

Crucially, because LLMs have finite context windows, generated games are often truncated mid-code. The app's auto-continuation loop detects incomplete output using `isGameComplete()` (an AST-level classifier) and re-submits to the same IBM thread with a targeted continuation prompt. This loop can run up to 20 passes, producing games well over 20,000 characters — far beyond what a single LLM call could generate.

### Google Gemini 1.5 Flash (Automatic Fallback)

When IBM watsonx Orchestrate is unavailable (network issue, quota, key not set), the system automatically falls back to Google Gemini 1.5 Flash — no user action required. Gemini receives the same detailed engine-specific system prompt and returns a complete HTML5 game. The status indicator on the Create page shows which AI generated the game.

**Fallback chain:** IBM watsonx Orchestrate (78 agents) → Gemini 1.5 Flash → Built-in demo game

The direct endpoint at `/api/gemini` accepts any prompt and returns a game from Gemini directly, useful for testing or integration.

### Wolfram|Alpha (Physics Intelligence)

When a user's prompt mentions a physical setting (moon, Mars, underwater, Jupiter, arctic, volcano, etc.), a live Wolfram|Alpha API call fetches the exact physics constant for that environment — lunar gravity (1.62 m/s²), water drag coefficient (0.405), Martian surface gravity (3.71 m/s²) — and injects it directly into the IBM generation prompt. The AI then uses scientifically accurate values rather than guessing.

Additionally, Wolfram cellular automata (Rule 30, 90, 110, 150) generate deterministic platform coordinate seeds for procedural level layout — different rules produce different architectural patterns encoded as X,Y positions that the AI uses as scaffolding.

---

## Built With

| Layer | Technology |
|---|---|
| **Framework** | Next.js 14 (App Router, TypeScript, SSR + API Routes) |
| **AI Backbone** | IBM watsonx Orchestrate (78 agents, Llama 3 70B) |
| **AI Fallback** | Google Gemini 1.5 Flash (automatic when IBM unavailable) |
| **Physics Intelligence** | Wolfram\|Alpha Full Results API + Cellular Automata |
| **Analytics Warehouse** | Snowflake (us-east-1, REST API) |
| **Prediction Markets** | Presage Protocol (on-chain Solana markets) |
| **NFT Layer** | Solana Devnet + Metaplex Bubblegum (compressed NFTs) |
| **IPFS Storage** | NFT.Storage (game HTML → IPFS CID) |
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
- API route: `GET /api/wolfram/automaton?rule=90&seed=42`

---

### Integration #7 — Snowflake Game Analytics Engine

**What it does:**
Every completed game generation fires an analytics event to Snowflake, recording the engine used, duration, character count, pass count, success status, and whether Wolfram physics were injected. This powers the live `/analytics` dashboard.

**Dashboard KPIs:**
- Games Built Today (24-hour window)
- Average Build Time (ms per engine)
- Most Popular Engine (by generation count)
- Wolfram Physics Boost (% of builds using real physics)
- Total Characters Generated
- Average Passes per Game

**Charts:**
- Genre Distribution bar chart (last 24 hours, grouped by engine)
- Recent builds live ticker (scrolling activity feed)
- Wolfram facts section (physics constants + CA rules reference)

**Database setup (Snowflake Worksheet):**
```sql
CREATE DATABASE HOOS_GAMING;
USE DATABASE HOOS_GAMING;
CREATE SCHEMA ANALYTICS;

CREATE TABLE ANALYTICS.game_generations (
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
```

**Where you see it:**
- `/analytics` page — polls every 30 seconds
- API routes: `POST /api/analytics/ingest`, `GET /api/analytics/query`, `GET /api/analytics/suggestions`
- Gracefully falls back to labeled demo data if Snowflake is unreachable

---

### Integration #6 — Presage Prediction Markets

**What it does:**
Before playing a generated game, users can open an on-chain prediction market for their playthrough: "Will I beat the boss?", "Will I score over 500?", "Will I survive 2 minutes?" Other players can see and bet on the outcome with SOL tokens on Solana Devnet. When the game ends, the `/api/presage/resolve` route posts the actual outcome back to Presage, which distributes winnings automatically.

**Flow:**
1. User arrives at `/play` — the Prediction Market panel shows in the sidebar
2. User picks a question and opens a market (creates a Presage market via API)
3. Other players see the live market and can bet SOL
4. When the game ends (win/lose), the app auto-resolves the market via `POST /api/presage/resolve`
5. Winnings are distributed on-chain by Presage's smart contract

**Where you see it:**
- `/play` page: Prediction Market panel (inline, right side)
- API route: `POST /api/presage/resolve`
- Runs on Solana Devnet — all bets are test SOL

---

### Integration #5 — Solana NFT Game Marketplace

**What it does:**
Every generated game can be permanently minted as a compressed NFT on Solana Devnet. The game's full HTML source is uploaded to IPFS via NFT.Storage (getting a permanent content hash / CID), then a Metaplex Bubblegum compressed NFT is minted on-chain linking to that IPFS content. Anyone with the NFT address can retrieve and play the exact game forever.

**Mint flow:**
1. User clicks "Mint as NFT" on the `/play` page
2. `POST /api/mint` uploads game HTML to IPFS → gets CID
3. Metaplex Bubblegum mints a compressed NFT with metadata: name, description, prompt, engine, IPFS URI
4. NFT address returned and displayed; user can copy the Solana transaction link
5. Game appears in `/marketplace` for other users to browse and play

**Marketplace:**
- Grid of all minted games (title, engine badge, prompt snippet, mint address)
- Filter by engine (All / Phaser / Three.js / Babylon / p5 / Kaboom / Pixi / Python)
- "Connect Wallet" to link a Phantom wallet for minting and trading
- "Play" button loads any minted game from its IPFS source

**Where you see it:**
- `/play` page: Mint panel (inline, right side)
- `/marketplace` page: full browseable NFT game grid
- API routes: `POST /api/mint`

---

## AI Architecture

### The 78-Agent Pipeline

```
User Prompt
    │
    ▼
┌─────────────────────────────────────────────────────────┐
│  IBM watsonx Orchestrate — AskOrchestrate entry point   │
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
  &apikey=<WXO_MANAGER_API_KEY>
→ { access_token, expires_in: 3600 }
```

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

## Pages

| Page | Purpose |
|---|---|
| `/` | Landing page — 78-agent explainer, 14-domain diagram, feature cards |
| `/create` | Game builder — engine selector, Wolfram toggle, live pipeline animation, prompt input |
| `/play` | Game runner — sandboxed iframe, HTML/ZIP export, fullscreen, Mint panel, Prediction Market panel |
| `/analytics` | Snowflake dashboard — KPI cards, genre chart, live ticker, Wolfram facts |
| `/marketplace` | NFT game grid — browse, filter by engine, connect Phantom wallet, play any minted game |

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

The ZIP export (fflate, runs client-side) adds:
- `index.html` — the complete game
- `README.txt` — engine, controls, and credit line

---

## Environment Variables

See `.env.example` for full setup instructions. Summary:

| Variable | Required | What It Does |
|---|---|---|
| `WXO_MANAGER_API_KEY` | **Yes** | IBM watsonx Orchestrate Manager key |
| `WXO_API_KEY` | No | Backup WxO native key |
| `AUTH0_DOMAIN` | No | Auth0 tenant domain |
| `AUTH0_CLIENT_ID` | No | Auth0 application client ID |
| `AUTH0_CLIENT_SECRET` | No | Auth0 application client secret |
| `AUTH0_SECRET` | No | Random 64-char hex session secret |
| `AUTH0_BASE_URL` | No | App base URL (`http://localhost:5000` or Replit URL) |
| `GEMINI_API_KEY` | No | Google Gemini 1.5 Flash (auto-fallback when IBM is down) |
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
| `ELEVENLABS_API_KEY` | No | ElevenLabs AI voice (reserved, future) |

---

## Local Development

```bash
# 1. Clone and install
git clone <repo>
cd hoos-gaming
npm install

# 2. Set up environment
cp .env.example .env.local
# .env.example already contains working values for all 4 integrations.
# Only WXO_MANAGER_API_KEY and SNOWFLAKE_PASSWORD need to be filled in.

# 3. Run
npm run dev
# → http://localhost:5000
```

**Without IBM keys:** The app runs in demo mode — generates a full local Phaser 3 game instantly with zero API calls. The "DEMO" badge appears top-left on the Create page.

---

## Auth0 Dashboard Setup

In your Auth0 Application settings (manage.auth0.com → Applications → Hoos Gaming):

**Allowed Callback URLs:**
```
https://7d2bf76f-babf-4b28-84a0-f6e30e738ec9-00-3rkciryt92v1r.spock.replit.dev/api/auth/callback
http://localhost:5000/api/auth/callback
```

**Allowed Logout URLs:**
```
https://7d2bf76f-babf-4b28-84a0-f6e30e738ec9-00-3rkciryt92v1r.spock.replit.dev
http://localhost:5000
```

**Allowed Web Origins:**
```
https://7d2bf76f-babf-4b28-84a0-f6e30e738ec9-00-3rkciryt92v1r.spock.replit.dev
http://localhost:5000
```

---

## Known IBM Behaviors & Fixes

| Behavior | Cause | Fix Applied |
|---|---|---|
| CDN URLs censored (`@3.60.0` → `*****`) | IBM content filter blocks `@version` npm patterns | `fixCensoredUrls()` regex repair after every reply |
| 35–90s response time | 78-agent pipeline with sequential domain gating | Poll with gentle backoff (2s → 4s), animated pipeline shows progress |
| Truncated output | LLM context window limit | Auto-continuation loop (20 passes max), `isGameComplete()` + `assembleChunks()` |
| `game_director` routing errors | IBM-side agent flow issue | Route via `AskOrchestrate` (no `agent_id` param) |
| IAM token 401 | Token expired mid-session | Module-level cache with 5-min early refresh window |
| Timeout after 90s | IBM stall | Continue with collected chunks, demo fallback if nothing received |

---

## Project Structure

```
src/
  app/
    api/
      chat/route.ts               IBM WxO client, 7 engine prompts, completion
                                  detection, continuation loop, SSE stream, URL repair
      agents/route.ts             IBM agent list, domain grouping, 55-min cache
      wolfram/route.ts            Wolfram|Alpha physics query
      wolfram/automaton/route.ts  CA Rule 30/90/110/150 level seed generator
      analytics/
        ingest/route.ts           Snowflake write — log every game generation
        query/route.ts            Snowflake read — KPIs + genre chart data
        suggestions/route.ts     Snowflake read — top prompt patterns
      presage/resolve/route.ts    Resolve on-chain prediction market
      mint/route.ts               IPFS upload + Solana NFT mint
    create/page.tsx               Game builder UI
    play/page.tsx                 Game runner — iframe, export, mint, predict
    analytics/page.tsx            Snowflake dashboard
    marketplace/page.tsx          NFT game grid + wallet connect
    page.tsx                      Landing page
    globals.css                   Design system (100+ CSS classes)
    layout.tsx                    Root layout — cursor, scroll reveal
README.md                         This file
.env.example                      All env vars with setup instructions + working values
replit.md                         Internal dev notes
IBMOrchestra.md                   78-agent reference with AI/Data Science context
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
