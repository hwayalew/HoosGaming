# Hoos Gaming — AI Game Builder

> **Build a complete, playable HTML5 game from a single text prompt — powered by IBM watsonx Orchestrate (78 agents), with visual style intelligence, detail level control, and portable code export.**

Built by students of Guilford College, University of North Carolina at Pembroke, and University of Virginia for HooHacks 2026.

---

## About the Project

Hoos Gaming answers a simple question: *what if anyone could make a video game by just describing it?*

You type one sentence — e.g. "a photorealistic military shooter" or "a cartoon endless runner like Subway Surfers" — and get a self-contained HTML5 game in the browser in minutes. No coding. No downloads. The game runs entirely in the browser and can be exported as a structured project with Unity adaptation guides.

Behind that single sentence, **78 specialized AI agents** at IBM watsonx Orchestrate collaborate — a Game Director orchestrates 14 domain teams covering narrative, mechanics, physics, art, audio, UI, NPC logic, rendering, and deployment.

The system supports **7 game engines** (Phaser 3, Three.js, Babylon.js, p5.js, Kaboom.js, PixiJS, and Python via Pyodide), **4 visual quality tiers**, **automatic style detection**, a **20-pass continuation loop**, and 6 external integrations.

---

## Hackathon Track: Best AI & Data Science

| Criterion | How Hoos Gaming Delivers |
|---|---|
| **Novel AI Application** | Multi-agent pipeline that transforms natural language into runnable, visually rich game code |
| **IBM AI Platform** | Deep integration with IBM watsonx Orchestrate: 78 agents, real API calls, IAM auth, thread continuity |
| **Multi-Agent Orchestration** | 14 specialized domains + 11 virtual rendering agents in dependency-gated pipeline |
| **Visual Style Intelligence** | StyleAgent auto-detects cartoon/photorealistic/pixel/neon style from prompt; adapts ALL rendering accordingly |
| **Detail Level Control** | 4 tiers: Quick (shapes), Standard (sprites), Detailed (8 render agents), Ultra AAA (full CoD-quality spec) |
| **Character Depth** | CharacterRenderer 6-layer pipeline per entity; NarrativeAgent names+lore+dialogue; CharacterSheetAgent multi-view |
| **Data-Driven Completion** | `isGameComplete()` AST-level classifier + 20-pass continuation loop |
| **Real-Time AI UX** | SSE streaming sends live pass/char/status events |
| **External Data Intelligence** | Wolfram|Alpha physics constants injected into prompts; cellular automata level seeds |
| **Portable Code Export** | ZIP export: index.html + src/game.js + README.md + docs/UNITY_GUIDE.md + docs/EXTENDING.md |
| **Cross-Session Analytics** | Snowflake logs every build; /analytics dashboard shows live KPIs |
| **Graceful Degradation** | IBM → Gemini → demo game fallback chain |

---

## Visual Quality System

### 4 Detail Tiers (selectable before generation)

| Tier | Label | What gets generated |
|---|---|---|
| **prototype** | ⚡ Quick | Colored shapes + core game loop. Fast generation. No photorealism agents. |
| **standard** | 📐 Standard | Sprite-level art with basic gradients. CharacterRenderer layers 1–3. 2–3 enemy types. |
| **detailed** | 🎨 Detailed | All 8 rendering agents. 6-layer CharacterRenderer. 4 enemy types + boss. Full HUD. |
| **ultra** | 💎 Ultra AAA | Maximum spec. All 8 agents at full fidelity. 300-particle pool. 15-layer draw order. CoD / Hitman quality. |

### StyleAgent — Automatic Visual Style Detection

The StyleAgent detects the visual style from your prompt keywords and adapts ALL rendering agents accordingly:

| Detected Style | Keywords | Visual Approach |
|---|---|---|
| **Cartoon/Stylized** | cartoon, fortnite, overwatch, anime, stylized | Bold outlines (2–3px), cel-shading, exaggerated proportions, bright saturated palette |
| **Photorealistic** | photorealistic, hitman, assassin, gritty, cinematic | Gradient-based 3D form per body part, muted palette, material simulation, letterbox bars |
| **Pixel Art** | pixel, 8-bit, retro, NES, 16-bit | Integer-aligned fillRects, imageSmoothingEnabled=false, limited 8–16 color palette |
| **Neon/Cyberpunk** | neon, cyberpunk, synthwave, glow | shadowBlur on all draws, screen blend mode, dark background, scan-line overlay |
| **Painterly** | watercolor, painterly, impressionist | Soft edges via shadowBlur, color bleeding fills, irregular brush stroke rects |
| **Minimalist** | minimalist, minimal, flat, geometric | Geometric shapes only, flat fills, bold primary palette, thick 3–4px outlines |
| **Endless Runner** | runner, subway, endless, infinite run | Bright warm palette, coin sparkle burst, speed lines, 3/4 perspective |

---

## 11 Virtual Rendering Agents

The prompt system embeds 11 specialized virtual rendering agents into every generation:

| Agent | Role |
|---|---|
| **StyleAgent** | Adapts all drawing code to match detected visual style |
| **NarrativeAgent** | Game title, lore, mission objectives, NPC names, dialogue for hoosSpeech() |
| **CharacterSheetAgent** | Multi-view character viewer (front/side/back/face/weapon panels) |
| **CharacterRenderer** | 6-layer humanoid pipeline: shadow → volumes → surface patterns → fine detail → lighting overlay → rim light |
| **AtmosphericRenderer** | 100+ smoke particles, fire emitters, 3-layer fog, explosion 5-phase, Verlet wind |
| **MaterialSimulator** | Per-surface textures: metal, stone, concrete, wood, fabric, glass, skin, water |
| **LightingEngine** | Ambient multiply, point light screen blend, muzzle flash spike, shadow ellipses, bloom |
| **WindPhysics** | Verlet cloth simulation for capes, hair, banners, scarves |
| **AnimationRigger** | Walk/run/idle/aim/hurt/death-ragdoll cycles for all entities |
| **EnvironmentPainter** | Parallax sky, terrain, weather (rain/snow/ash), depth blur, cloud rendering |
| **ParticleSystem** | Pre-allocated 300-particle pool: smoke, fire, ember, spark, blood, debris, dust, muzzle, explosion |

---

## Portable / Exportable Code

Every game can be exported as a structured ZIP project:

```
my-game/
  index.html            ← Standalone playable game (open in browser)
  src/
    game.js             ← Extracted game logic (no HTML wrapper)
  docs/
    HOW_TO_PLAY.md      ← Controls, mechanics, tips
    UNITY_GUIDE.md      ← Full Unity port guide with C# code snippets
    EXTENDING.md        ← How to add enemies, weapons, levels, voices
  package.json          ← Run locally with npx serve
  README.md             ← Project overview
```

### Unity Adaptation Guide (included in ZIP)

The `docs/UNITY_GUIDE.md` in every export includes:
- Concept mapping table (canvas → Sprite Renderer, requestAnimationFrame → Update(), etc.)
- C# code snippets for PlayerController, EnemyAI, audio wiring
- Physics constant reference table (GRAVITY, WALK_SPD, JUMP_VEL mapped to Unity fields)
- Recommended Unity packages (Cinemachine, DOTween, URP, Input System)

---

## Did You Implement a Generative AI Model or API?

**Yes — three separate generative AI systems are integrated:**
1. **IBM watsonx Orchestrate** — primary 78-agent game generation pipeline
2. **Google Gemini 2.5 Flash** — automatic fallback when IBM is unavailable
3. **Wolfram|Alpha** — real-world physics intelligence oracle
4. **ElevenLabs** — optional spoken game intro narration

### IBM watsonx Orchestrate (78-Agent Pipeline)

IBM watsonx Orchestrate hosts the specialized game agents. The app authenticates with an IBM API key, exchanges it for a short-lived Bearer token (cached with refresh slack), then:

1. **`POST /v1/orchestrate/runs`** — starts a run with the user message (optional `thread_id` for continuations)
2. **Polls `/v1/orchestrate/runs/{run_id}`** until the run completes
3. **`GET /v1/orchestrate/threads/{thread_id}/messages`** — reads the latest assistant reply

Domain-specific system prompts with all 11 virtual rendering agents are built per engine in `src/app/api/chat/route.ts`.

**Fallback chain:** IBM watsonx Orchestrate (78 agents) → Gemini 2.5 Flash → Built-in demo game

### Google Gemini 2.5 Flash (Automatic Fallback)

When IBM is unavailable, the same **`/api/chat`** stream automatically falls back to Gemini 2.5 Flash — no user action required. Gemini receives the same engine-specific prompt with all 11 rendering agents.

### ElevenLabs (Optional Intro Narration + In-Game Voice)

The `/play` page can generate a spoken intro. Additionally, every generated game includes `window.hoosSpeech()` calls at key moments (boss spawn, phase transitions, win, death) — these call ElevenLabs TTS in real-time from inside the iframe.

### Wolfram|Alpha (Physics Intelligence)

When a prompt mentions a physical environment (moon, Mars, underwater, Jupiter, arctic, volcano), a live Wolfram|Alpha API call fetches the exact physics constant and injects it into the IBM prompt. Wolfram cellular automata (Rule 30/90/110/150) also generate deterministic platform seeds for level layout.

---

## Built With

| Layer | Technology |
|---|---|
| **Framework** | Next.js 14 (App Router, TypeScript, SSR + API Routes) |
| **AI Backbone** | IBM watsonx Orchestrate (78 agents; model set in WxO deployment) |
| **AI Fallback** | Google Gemini 2.5 Flash (automatic when IBM unavailable) |
| **Virtual Rendering Agents** | 11 custom agents in system prompt: StyleAgent, NarrativeAgent, CharacterSheetAgent, CharacterRenderer, AtmosphericRenderer, MaterialSimulator, LightingEngine, WindPhysics, AnimationRigger, EnvironmentPainter, ParticleSystem |
| **Visual Style Detection** | StyleAgent: cartoon / photorealistic / pixel / neon / painterly / minimalist / runner |
| **Detail Level Control** | 4 tiers: prototype / standard / detailed / ultra AAA |
| **Physics Intelligence** | Wolfram|Alpha Full Results API + Cellular Automata |
| **Voice Narration** | ElevenLabs Text-to-Speech (voices + in-game character speech) |
| **Analytics Warehouse** | Snowflake (us-east-1, official Node driver) |
| **Prediction markets** | Presage API via `POST /api/presage/resolve` |
| **IPFS** | NFT.Storage — uploads HTML + JSON metadata |
| **Solana wallet** | Phantom (client) for optional creator address in metadata |
| **Authentication** | Auth0 (Universal Login, session management) |
| **Game Engine — 2D Default** | Phaser 3.60 (arcade physics, multi-scene) |
| **Game Engine — 3D** | Three.js r134 (WebGL, pointer-lock, shadows) |
| **Game Engine — Advanced 3D** | Babylon.js (PBR materials, built-in physics) |
| **Game Engine — Creative** | p5.js 1.9.0 (generative / artistic) |
| **Game Engine — Casual** | Kaboom.js 3000 (component-based) |
| **Game Engine — Fast 2D** | PixiJS 7.2 (WebGL 2D, particle-heavy) |
| **Game Engine — Python** | Pyodide v0.23.4 (WASM Python in browser) |
| **Audio** | Web Audio API (oscillator SFX + procedural music, zero files) |
| **ZIP Export** | fflate (client-side) — structured project + Unity guide |
| **Styling** | Custom CSS design system (UVA Orange/Blue dark mode) |
| **Fonts** | Orbitron, Cabinet Grotesk, JetBrains Mono |

---

## External applications & APIs (third-party)

| External system | Purpose | Environment / config | How it is used |
|-----------------|---------|----------------------|----------------|
| **IBM Cloud IAM** | API key → Bearer JWT | `WXO_MANAGER_API_KEY` or `WXO_API_KEY` | `POST https://iam.cloud.ibm.com/identity/token` |
| **IBM watsonx Orchestrate** | 78-agent game generation | `NEXT_PUBLIC_WXO_HOST_URL`, keys above | `POST/GET …/v1/orchestrate/runs`, `GET …/v1/orchestrate/threads/…/messages` |
| **Google Generative Language API** | Fallback text generation | `GEMINI_API_KEY` | `POST https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent` |
| **Wolfram|Alpha** | Physics / facts query | `WOLFRAM_APP_ID` | `GET https://api.wolframalpha.com/v2/query` |
| **ElevenLabs** | Voice list + TTS | `ELEVENLABS_API_KEY` | `GET/POST https://api.elevenlabs.io/v1/…` |
| **NFT.storage** | IPFS pinning | `NFT_STORAGE_API_KEY` | `POST https://api.nft.storage/upload` |
| **Presage Protocol** | Market resolve | `PRESAGE_API_KEY` | `POST https://api.presageprotocol.com/v1/markets/resolve` (or mock) |
| **Snowflake** | Analytics warehouse | `SNOWFLAKE_ACCOUNT`, `SNOWFLAKE_USER`, `SNOWFLAKE_PASSWORD` | `snowflake-sdk` — analytics/ingest + analytics/query |
| **Auth0** | Universal Login + session | `AUTH0_DOMAIN`, `AUTH0_CLIENT_ID`, `AUTH0_CLIENT_SECRET`, `AUTH0_SECRET` | Hosted login + token exchange |
| **Phantom (Solana)** | Wallet address for metadata | None (user extension) | `window.solana` on /play and /marketplace |

---

## Character Sheet / Multi-View Mode

When your prompt includes keywords like "character sheet", "multiple views", "3 views", "turnaround", or "reference sheet", the CharacterSheetAgent activates and generates a CHARACTER VIEWER instead of a standard combat game:

- **LEFT panel** — Front view (full body facing camera)
- **CENTER panel** — 3/4 view (slight turn)
- **RIGHT panel** — Side/back view
- **Bottom panels** — Face close-up, weapon detail, equipment breakdown
- **Keyboard navigation** — Cycle between views, ability showcase, equipment comparisons
- **Labels** — Body parts and gear annotated

---

## AI Architecture

### The 78-Agent + 11 Virtual Agent Pipeline

```
User Prompt + detailLevel + visual style detection
    │
    ▼
┌─────────────────────────────────────────────────────────────┐
│  IBM watsonx Orchestrate — /v1/orchestrate/runs + thread    │
│                                                             │
│  Orchestration (13) ──► Narrative (6) ──► Mechanics (7)    │
│         │                                      │            │
│         ▼                                      ▼            │
│  Physics (4) ──► Animation (4) ──► Art (4)                 │
│         │                              │                    │
│         ▼                              ▼                    │
│  Rendering (4) ──► Level (2) ──► Audio (4)                 │
│                                        │                    │
│                         UI (3) ◄───────┘                   │
│                          │                                  │
│                 AI/NPC (4) ──► QA (5) ──► Deploy (4)       │
│                                                             │
│  Bridge agents (10) — run throughout, translate state       │
└─────────────────────────────────────────────────────────────┘
    │
    ▼
System prompt with 11 virtual rendering agents:
  StyleAgent, NarrativeAgent, CharacterSheetAgent,
  CharacterRenderer, AtmosphericRenderer, MaterialSimulator,
  LightingEngine, WindPhysics, AnimationRigger,
  EnvironmentPainter, ParticleSystem
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
    │
    ▼
Export ZIP: index.html + src/game.js + README.md + Unity guide
```

### Completion Detection

`isGameComplete(code)` acts as an AI output classifier:
1. Must end with `</html>`
2. Must contain a bootstrap call (`new Phaser.Game(`, `requestAnimationFrame`, `kaboom()`, `BABYLON.Engine`, etc.)
3. `<script>` block brace depth must be exactly 0 (all functions closed)

### IBM URL Censorship Fix

IBM's content filter replaces `@version` strings in CDN URLs. `fixCensoredUrls()` runs regex repair after every reply, substituting known cdnjs.cloudflare.com URLs.

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

| Page | Key features |
|------|-------------|
| **`/`** | Marketing sections, nav to Create/Analytics/Marketplace, Auth0 login link |
| **`/create`** | 4 visual quality tiers, 7 engine buttons, Wolfram toggle, SSE pass status, animated pipeline, example chips | 
| **`/play`** | Iframe game, fullscreen, export HTML / ZIP project / SRC, ElevenLabs voice, IPFS upload, prediction market, chat assistant |
| **`/analytics`** | KPI cards, genre chart, recent ticker, Wolfram explainer |
| **`/marketplace`** | Demo + locally stored uploads, Phantom connect, filter by engine |
| **`/spec`** | Read-only JSON of last successful spec |

---

## The 6 Integrations

### Integration #8 — Wolfram Procedural Game Intelligence

Before generation, Hoos Gaming checks if the prompt mentions a physical environment and fetches the exact physics constant from Wolfram|Alpha. These are injected into the IBM prompt so the AI uses scientifically accurate values.

| Setting | Wolfram Query | Value | CA Rule |
|---|---|---|---|
| moon | surface gravity Moon | 1.62 m/s² | Rule 30 |
| mars | surface gravity Mars | 3.71 m/s² | Rule 90 |
| underwater | drag coefficient water | 0.405 | Rule 110 |
| jupiter | surface gravity Jupiter | 24.79 m/s² | Rule 150 |

Wolfram cellular automata (Rule 30/90/110/150) also generate deterministic platform coordinate seeds.

### Integration #7 — Snowflake Game Analytics Engine

Snowflake logs every build and play session. The `/analytics` dashboard shows: games built, top engine, average build time, genre trends, live "building now" ticker.

**Setup SQL:**
```sql
CREATE DATABASE IF NOT EXISTS HOOS_GAMING;
CREATE SCHEMA IF NOT EXISTS HOOS_GAMING.ANALYTICS;
CREATE TABLE IF NOT EXISTS HOOS_GAMING.ANALYTICS.game_generations (
  id VARCHAR PRIMARY KEY, prompt VARCHAR, engine VARCHAR,
  duration_ms NUMBER, char_count NUMBER, pass_count NUMBER,
  success BOOLEAN, wolfram BOOLEAN DEFAULT FALSE,
  ts TIMESTAMP_LTZ DEFAULT CURRENT_TIMESTAMP()
);
```

### Integration #6 — Presage Prediction Markets

On `/play`, users open a challenge market. When the game reports win/gameover via `postMessage`, the client calls `POST /api/presage/resolve`. With `PRESAGE_API_KEY` set, forwards to Presage; otherwise returns a mock payload.

### Integration #5 — IPFS Upload & Marketplace

`POST /api/mint` uploads game HTML + JSON metadata to NFT.storage (IPFS). Phantom wallet address is included in metadata as creator. Minted games appear in `/marketplace`.

### Integration #4 — ElevenLabs Voice Narration

`GET /api/voice` fetches available voices from your ElevenLabs account. `POST /api/voice` generates spoken game intro or character speech. Every generated game calls `window.hoosSpeech()` for in-game character voices at key moments.

### Integration #3 — Auth0 Authentication

Auth0 Universal Login handles sign-in. Session management via Auth0 SDK. `/api/auth/*` routes handle token exchange.

---

## HTTP API Reference

| Method | Path | Request | Response |
|--------|------|---------|----------|
| **POST** | `/api/chat` | `{ prompt, sessionId?, language?, detailLevel? }` | SSE stream — `progress` + `complete` events |
| **GET** | `/api/agents` | — | `{ agents[], mock? }` |
| **GET/POST** | `/api/wolfram` | `q` query param or `{ theme }` body | `{ result }` or `{ physics }` |
| **GET** | `/api/wolfram/automaton` | `rule`, `width`, `rows` | `{ grid, platforms }` |
| **GET/POST** | `/api/voice` | — / `{ voiceId?, text?, title?, engine? }` | `{ voices[] }` / `audio/mpeg` stream |
| **POST** | `/api/mint` | `{ gameCode, title, engine, walletAddress }` | `{ ok, ipfsUrl, gameId }` |
| **POST/GET** | `/api/analytics/ingest` | `{ type, prompt, engine, … }` | `{ ok, id }` |
| **GET** | `/api/analytics/query` | — | KPI JSON or mock |
| **POST** | `/api/presage/resolve` | `{ marketId, outcome }` | `{ ok, resolved }` |
| **GET** | `/api/health` | — | Service configuration status |

**`detailLevel` values:** `prototype` | `standard` | `detailed` (default) | `ultra`
