# Hoos Gaming — AI Game Builder

> **Build a complete, playable HTML5 game from a single text prompt in under 90 seconds — powered by 78 specialized IBM watsonx Orchestrate AI agents.**

Built by the University of Virginia for IBM TechXchange 2025.

---

## Hackathon Track: Best AI & Data Science

Hoos Gaming directly targets the **Best AI & Data Science** track by demonstrating every dimension of modern AI/ML system design at production scale:

| Criterion | How Hoos Gaming Delivers |
|---|---|
| **Novel AI Application** | Multi-agent pipeline that transforms natural language into runnable game code — an unsolved problem at this fidelity |
| **IBM AI Platform** | Deep integration with IBM watsonx Orchestrate: 78 agents, real API calls, IAM auth, thread continuity |
| **Multi-Agent Orchestration** | 14 specialized domains (Orchestration → Narrative → Mechanics → Physics → Art → Audio → Deploy) run in parallel with dependency gating |
| **Data-Driven Completion** | `isGameComplete()` — a code-validity classifier that inspects AST-level brace balance, bootstrap call presence, and HTML closure to decide whether to continue generating |
| **LLM Prompt Engineering** | 7 engine-specific system prompts with code-skeleton injection force structured, reproducible outputs from Llama 3 70B |
| **Real-Time Inference UX** | SSE streaming sends live pass/char/status events so users see the AI working, not a loading spinner |
| **Auto-Continuation Loop** | If the LLM truncates, the system automatically issues a thread-continuation prompt and re-assembles chunks — no hard output limit |
| **7 AI Engines Supported** | Phaser 3, Three.js, Babylon.js, p5.js, Kaboom.js, PixiJS, Python/Pyodide — each with a distinct AI persona and code spec |
| **Graceful Degradation** | When IBM is unavailable, a locally generated demo game (1,200+ lines) runs instantly — zero user-facing errors |

---

## What It Does

A user types one sentence. Hoos Gaming's 78-agent IBM AI pipeline produces a **complete, immediately playable HTML5 game** — with player physics, enemies with AI, sounds, HUD, boss fights, particle effects, win/lose screens, and adaptive music — in a single self-contained file.

The game runs directly in the browser via a sandboxed iframe. No installation, no server, no external assets needed.

**Generation is unlimited in length.** If the AI's output is cut off mid-code, the system automatically fires a continuation prompt on the same IBM thread and assembles all chunks into one valid game. This can run up to 20 passes, producing games well over 20,000 characters of output.

After a game is built, users can send follow-up prompts ("add a second boss", "add a shop menu", "increase enemy speed") and the same continuation loop applies the changes.

---

## Supported Game Engines

| Engine | Tech | Dimension | Best For | CDN Used |
|---|---|---|---|---|
| **Phaser 3** | JavaScript | 2D | Platformers, side-scrollers, bullet-hell, RPGs | cdnjs.cloudflare.com |
| **Three.js** | JavaScript | 3D | First-person shooters, dungeon crawlers, 3D adventures | cdnjs.cloudflare.com |
| **Babylon.js** | JavaScript | 3D | PBR rendering, physics-heavy 3D, AAA-quality scenes | cdn.babylonjs.com |
| **p5.js** | JavaScript | 2D | Creative coding, artistic games, generative art | cdnjs.cloudflare.com |
| **Kaboom.js** | JavaScript | 2D | Casual games, rapid prototyping, arcade | unpkg.com |
| **PixiJS** | JavaScript | 2D | Fast WebGL 2D, particle-heavy games | cdnjs.cloudflare.com |
| **Python** | Pyodide (WASM) | 2D | Python education, puzzle games, maze runners | jsdelivr CDN |

### What Each Engine Generates

**Phaser 3 (js-phaser)**
- Multi-scene architecture: Boot → Game → GameOver → Win
- Boot scene generates all textures procedurally using `graphics.generateTexture()`
- Arcade Physics for player, enemies, bullets
- 3+ enemy types: patrol (bounce), chaser (velocity tracking), flying (sine wave), boss
- Boss fight triggered at 500 points with 3 attack phases and escalating bullet spread
- Particle system for kills, hits, explosions
- Ambient music loop using AudioContext oscillator notes
- Responsive scaling via `Phaser.Scale.FIT + CENTER_BOTH`

**Three.js (js-three)**
- Full 3D scene with fog, shadows, ambient + directional lighting
- First-person camera with pointer-lock mouse look (WASD movement relative to yaw)
- 3D enemies: basic chaser, ranged (fires back), boss (large, rapid fire, phase 2 speed increase)
- 3D collision via `distanceTo()` checks in game loop
- `THREE.Points`-based particle explosions
- HTML overlay HUD with boss HP bar (CSS width transition)
- `THREE.Clock` delta-time for physics-accurate 60fps movement
- Window resize handling: `camera.aspect`, `renderer.setSize`

**Babylon.js (js-babylon)**
- `BABYLON.Engine` + `BABYLON.Scene` with gravity and collision
- `BABYLON.FreeCamera` with WASD + mouse look, `checkCollisions:true`
- PBR materials (`BABYLON.PBRMaterial`) for realistic surfaces
- `BABYLON.ParticleSystem` for explosions
- Shadow generator from DirectionalLight
- `engine.runRenderLoop` main loop + `engine.resize` on window resize

**p5.js (js-p5)**
- `setup()` / `draw()` game loop at 60fps
- Entity classes with `draw()` and `update()` methods
- State machine: `'start'` → `'playing'` → `'gameover'` → `'win'`
- Circular and AABB collision detection
- `windowResized()` for responsive canvas

**Kaboom.js (js-kaboom)**
- Component-based entities: `pos()`, `sprite()`, `area()`, `body()`, `health()`
- Scene system: `"game"` / `"gameover"` / `"win"` scenes
- `onCollide()` for all combat interactions
- `onUpdate()` for enemy AI
- `go()` for scene transitions

**PixiJS (js-pixi)**
- `PIXI.Application` with `app.ticker.add()` game loop
- All graphics via `PIXI.Graphics` API (no external images)
- AABB collision detection
- `PIXI.Text` HUD objects
- Particle pool: `PIXI.Graphics` circles with velocity + alpha fade

**Python/Pyodide (python)**
- Pyodide bootstrap with loading screen
- Python game logic via `pyodide.runPythonAsync()`
- Canvas drawing via `js.document.getElementById("c").getContext("2d")` interop
- Async game loop: `asyncio.ensure_future(game_loop())`
- Keyboard input via `js.document.addEventListener` from Python

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
isGameComplete() → if false: auto-continuation pass
    │
    ▼
assembleChunks() → merge all passes into valid HTML
    │
    ▼
Store in sessionStorage → /play iframe → Run in browser
```

### IAM Authentication & Token Caching

```typescript
// Module-level cache — one IAM exchange per 55 minutes
let _iamCache: { token: string; expiresAt: number } | null = null;

POST https://iam.cloud.ibm.com/identity/token
grant_type=urn:ibm:params:oauth:grant-type:apikey&apikey=<WXO_MANAGER_API_KEY>
→ { access_token, expires_in: 3600 }
```

### IBM API Request Flow

```typescript
// Step 1 — Start run (AskOrchestrate — no agent_id, most reliable route)
POST /v1/orchestrate/runs
Body: { message: { role: "user", content: "<full system prompt + user prompt>" } }
// For continuation on same thread:
Body: { message: ..., thread_id: "<existing_thread_id>" }
→ { thread_id, run_id }

// Step 2 — Poll until complete (gentle backoff: 2s → 4s, max 90s)
GET /v1/orchestrate/runs/<run_id>
→ { status: "running" | "completed" | "failed" }

// Step 3 — Fetch last assistant message
GET /v1/orchestrate/threads/<thread_id>/messages
→ messages array, take last where role === "assistant"
```

### Completion Detection Algorithm

The `isGameComplete(code: string)` function acts as an AI output classifier:

```typescript
function isGameComplete(code: string): boolean {
  // 1. Must end with </html>
  if (!/<\/html>\s*$/i.test(code)) return false;

  // 2. Must contain a game bootstrap call (engine-specific)
  const hasBootstrap =
    /new Phaser\.Game\(/.test(code) ||     // Phaser 3
    /requestAnimationFrame/.test(code) ||  // Three.js / PixiJS
    /pyodide\.runPythonAsync/.test(code) || // Python
    /kaboom\(/.test(code) ||               // Kaboom.js
    /BABYLON\.Engine/.test(code) ||        // Babylon.js
    /new PIXI\.Application/.test(code);    // PixiJS

  if (!hasBootstrap) return false;

  // 3. Count brace depth inside <script> blocks
  //    (strips strings, line comments, block comments first)
  //    Returns true only if depth === 0 (all functions closed)
}
```

### Code Assembly

When continuation is needed, `assembleChunks(chunks[])`:
1. Strips premature `</body></html>` from all non-final chunks
2. Strips repeated `<!DOCTYPE>`, `<html>`, `<head>` from continuations
3. Concatenates code contiguously (code flows naturally: chunk 1 ends mid-function, chunk 2 continues it)
4. Adds `</body></html>` if missing
5. Runs `fixCensoredUrls()` to repair IBM-censored `@version` CDN strings

### IBM URL Censorship Fix

IBM's content filters replace `@version` strings in CDN URLs (e.g., `phaser@3.60.0` → `*****`). The fix runs on every reply:

```typescript
function fixCensoredUrls(text: string): string {
  return text
    .replace(/<script[^>]+src="[^"]*\*+[^"]*phaser[^"]*"[^>]*><\/script>/gi,
      `<script src="${CDN.phaser}"></script>`)
    // ... similar patterns for Three.js, Pyodide
    .replace(/https:\/\/cdn[^"'\s]*\/npm\/[^"'\s]*\*+[^"'\s]*/g, m => {
      if (/phaser/i.test(m)) return CDN.phaser;
      // ...
    });
}
```

---

## Sound Architecture

Every generated game includes **Web Audio API** sound — no external files, no CORS issues, works offline:

```javascript
// Universal SFX pattern injected into all generated games
const actx = new AudioContext();
function sfx(freq, dur, type = 'square', vol = 0.22) {
  const o = actx.createOscillator(), g = actx.createGain();
  o.type = type; o.frequency.value = freq;
  g.gain.setValueAtTime(vol, actx.currentTime);
  g.gain.exponentialRampToValueAtTime(0.001, actx.currentTime + dur);
  o.connect(g); g.connect(actx.destination);
  o.start(); o.stop(actx.currentTime + dur);
}

// Typical usage in generated games:
sfx(580, 0.08, 'sine')      // jump
sfx(480, 0.06, 'sine')      // shoot
sfx(220, 0.06, 'sawtooth')  // enemy hit
sfx(70,  0.20, 'sawtooth')  // player hurt
sfx(50,  0.80, 'sawtooth')  // game over
sfx(880, 0.60, 'sine')      // victory
```

AudioContext is unlocked on first user click (browser security requirement), meaning sounds work from the very first interaction.

**Ambient music** is generated by a `time.delayedCall` loop with oscillator note sequences — adaptive (stops on game over, changes on boss spawn).

---

## Agent Pipeline Live Animation

During a build (typically 35–90 seconds), the UI animates 14 domain phases in realistic overlap:

| Elapsed | Domains Active | Agents Working |
|---|---|---|
| 0–8s | Orchestration | 13 |
| 5–16s | + Narrative | 19 |
| 10–22s | + Mechanics | 26 |
| 14–26s | + Physics | 30 |
| 16+ | + Bridge | 40 (sustained) |
| 20–32s | + Animation | 44 |
| 22–35s | + Art | 48 |
| 28–40s | + Rendering | 52 |
| 32–44s | + Level | 54 |
| 36–48s | + Audio | 58 |
| 40–52s | + UI | 61 |
| 42–54s | + AI/NPC | 65 |
| 50–60s | + QA | 70 |
| 55–65s | + Deploy | 74 |

Each domain shows a colored "RUNNING" badge, per-agent progress bars fill in real-time, and agent status updates `idle → running → ✓` as the pipeline advances.

---

## Environment Variables

| Variable | Required | Purpose |
|---|---|---|
| `WXO_MANAGER_API_KEY` | **Yes** | IBM watsonx Orchestrate Manager credential API key |
| `WXO_API_KEY` | No | Native WxO console key (backup auth) |
| `ELEVENLABS_API_KEY` | No | Reserved — AI voice narration (future feature) |

**Local setup:**
```bash
cp .env.example .env.local
# Fill in WXO_MANAGER_API_KEY from IBM Cloud → Service Credentials (Manager role)
npm install
npm run dev   # starts on port 5000
```

**On Replit:** Add keys via the Secrets panel (padlock icon in sidebar). They are read automatically.

---

## API Reference

### `POST /api/chat` — Game Generation (SSE Stream)

**Request:**
```json
{
  "prompt": "2D dark fantasy side-scroller with boss fights",
  "language": "js-phaser",
  "sessionId": "optional-ibm-thread-id-for-follow-ups"
}
```

`language` values: `"js-phaser"` | `"js-three"` | `"js-babylon"` | `"js-p5"` | `"js-kaboom"` | `"js-pixi"` | `"python"`

**Response:** Server-Sent Events stream

```
data: {"type":"progress","pass":1,"chars":0,"status":"Connecting to IBM watsonx Orchestrate…"}

data: {"type":"progress","pass":1,"chars":0,"status":"78 IBM agents generating your game…"}

data: {"type":"progress","pass":1,"chars":8432,"status":"Pass 1 complete — 8,432 chars"}

data: {"type":"progress","pass":2,"chars":8432,"status":"Continuing generation… pass 2"}

data: {"type":"progress","pass":2,"chars":16910,"status":"Pass 2 — 16,910 chars generated"}

data: {"type":"complete","reply":"```html\n<!DOCTYPE html>...\n```","sessionId":"ibm-thread-id","passes":2}
```

**Client reading the stream:**
```typescript
const res = await fetch("/api/chat", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ prompt, language, sessionId }),
});

const reader = res.body!.getReader();
const decoder = new TextDecoder();
let buffer = "";

while (true) {
  const { done, value } = await reader.read();
  if (done) break;
  buffer += decoder.decode(value, { stream: true });
  const parts = buffer.split("\n\n");
  buffer = parts.pop() ?? "";
  for (const part of parts) {
    if (!part.startsWith("data: ")) continue;
    const evt = JSON.parse(part.slice(6));
    if (evt.type === "progress") setPassInfo(evt);
    if (evt.type === "complete") handleGameReady(evt.reply, evt.sessionId);
  }
}
```

### `GET /api/agents` — Agent Registry

Returns all 78 IBM game agents grouped by domain, cached 55 minutes.

```json
{
  "agents": [
    {
      "id": "abc123",
      "name": "game_director",
      "cleanName": "Game Director",
      "domain": "Orchestration",
      "description": "Central orchestrator for the 78-agent game creation pipeline"
    }
  ],
  "count": 78,
  "mock": false
}
```

`mock: true` = IBM was unavailable, data is from the static agent manifest.

---

## Pages

### `/` — Landing Page
Full marketing homepage explaining the 78-agent IBM AI pipeline, 14 domain diagram, feature cards, workflow steps, and architecture visualization. Scroll-reveal animations, UVA color scheme.

### `/create` — Game Builder
Split-panel interface:
- **Left:** Engine selector (7 engines), example prompt chips, recent builds, IBM agent pipeline with live domain animation, fixed-bottom prompt textarea with always-visible send button
- **Right:** Conversation panel showing user messages, AI response, live pass/char count progress indicator, "▶ Play Game" button when code is ready

### `/play` — Game Runner
- Reads `hoos_game_code` from sessionStorage
- Creates `Blob URL` → sandboxed `<iframe>` (allow-scripts, allow-same-origin, allow-pointer-lock)
- Engine-appropriate controls bar (2D/3D/Python controls)
- Fullscreen toggle via `requestFullscreen` API (F key shortcut)
- **"⬇ HTML" button** — downloads the self-contained game file
- **"📦 ZIP" button** — packages `index.html` + `README.txt` using fflate
- Character count display in controls bar

---

## Export & Portability

Games are exported as **single, self-contained HTML files**. They:
- Run in any modern browser without a server
- Include all assets generated procedurally in code (no external images/sounds)
- Can be shared as email attachments or hosted anywhere
- Import into any website via `<iframe>`

The ZIP export (using `fflate`) adds:
- `index.html` — the complete game
- `README.txt` — engine info, controls, and credit

---

## Fallback / Demo Mode

When IBM watsonx Orchestrate is unavailable (or API key not set), the app generates a **fully playable local demo game instantly** (zero API calls):

**2D Demo (Phaser 3):** Multi-scene platformer with:
- Boot scene with procedural texture generation (player, 3 enemy types, boss, bullets, particles)
- 4 enemy types: patrol, chaser, flying (sine wave), boss
- Boss fight: 3 attack phases, homing projectiles, speed increase at low HP
- Particle effects on kills + confetti on win
- Adaptive ambient music loop
- Game-over (dark overlay) + Victory (golden text + confetti) screens
- Responsive scaling

**3D Demo (Three.js):** First-person shooter with:
- FogExp2 atmospheric depth, shadow-mapped directional light
- 12 random environment objects (pillars, crates)
- 9 enemies: basic chasers, ranged fighters that fire back, boss with rapid projectile bursts
- Boss HP bar (CSS width transition)
- `ShiftLeft` sprint modifier
- Full WASD + pointer-lock mouse look with jump

---

## Code Extraction Priority

IBM replies are parsed in this order:
1. ` ```html\n...\n``` ` block → extracted directly
2. Raw `<!DOCTYPE html>` position found → extract from that point
3. ` ```javascript\n...\n``` ` block → wrapped in Phaser 3 HTML template

sessionStorage keys:
- `hoos_game_code` — full HTML string
- `hoos_game_prompt` — original user prompt
- `hoos_game_engine` — detected engine label

---

## Known IBM Behaviors & Fixes

| Behavior | Cause | Fix |
|---|---|---|
| CDN URLs censored (`@3.60.0` → `*****`) | IBM content filter blocks `@version` npm patterns | `fixCensoredUrls()` regex repair after every reply |
| 35–90s response time | 78-agent pipeline with sequential domain gating | Poll with gentle backoff (2s→4s), animated pipeline shows progress |
| Truncated output | LLM context window exhausted | Auto-continuation loop: 20 passes max, `isGameComplete()` detects and `assembleChunks()` merges |
| `game_director` agent errors | IBM-side routing flow issue | Route through `AskOrchestrate` (no `agent_id` param) |
| IAM token 401 | Token expired | Module-level cache with 5-min early refresh |
| Timeout (90s) | IBM stall | Continue with whatever chunks collected, demo fallback |

---

## Tech Stack

| Layer | Technology | Purpose |
|---|---|---|
| Framework | Next.js 14 (App Router, TypeScript) | SSR + API routes + SSE streaming |
| Styling | Custom CSS design system | UVA Orange/Blue dark mode, 100+ classes |
| AI Backbone | IBM watsonx Orchestrate | 78-agent multi-domain game generation pipeline |
| 2D Engine (default) | Phaser 3.60 | 2D games with arcade physics |
| 3D Engine | Three.js r134 | WebGL 3D rendering |
| 3D Advanced | Babylon.js | PBR + physics-based 3D |
| Creative 2D | p5.js 1.9.0 | Generative/artistic games |
| Casual 2D | Kaboom.js 3000 | Component-based game framework |
| Fast 2D | PixiJS 7.2 | WebGL 2D renderer |
| Python Runtime | Pyodide v0.23.4 | Browser WASM Python |
| Audio | Web Audio API | Oscillator SFX + procedural music |
| ZIP Export | fflate | Client-side ZIP creation |
| Fonts | Orbitron (display), Cabinet Grotesk (body), JetBrains Mono | Typography |

---

## Design System Tokens

| Token | Value | Used For |
|---|---|---|
| `--c1` | `#E57200` UVA Orange | Primary CTA, accents, highlights |
| `--navy` | `#232D4B` UVA Navy | Gradients, backgrounds |
| `--c3` | `#F5A623` Gold | Secondary accents |
| `--bg` | `#0a0e1a` | Page background |
| `--s1/s2/s3` | `#111827`/`#1a2035`/`#232d42` | Surface layers |
| `--txt` | `#e8eaf0` | Body text |
| `--muted` | `#5a6280` | Secondary text |
| `--mono` | JetBrains Mono | Code, labels, HUD |

Effects: custom orange dot cursor + ring follower, CRT scanline overlay, scroll-reveal animations.

---

## Project Structure

```
src/
  app/
    api/
      chat/route.ts       IBM WxO client, 7 engine prompts, completion detection,
                          continuation loop, SSE streaming, URL repair, demo fallback
      agents/route.ts     IBM agent list, domain grouping, 55-min cache
    create/page.tsx        Game builder UI — SSE stream reader, engine selector,
                          live pass/char progress, agent pipeline animation
    play/page.tsx          Game runner — blob URL iframe, export HTML/ZIP, fullscreen
    page.tsx               Landing page — 14-domain explainer, IBM pipeline diagram
    globals.css            Design system — tokens, nav, hero, create/play pages
    layout.tsx             Root layout — cursor, scroll reveal
README.md                  This file
IBMOrchestra.md            Full 78-agent reference with AI/Data Science context
replit.md                  Internal dev notes
.env.example               Environment variable documentation
```

---

## Getting Started

### Replit (recommended)
1. Open the Replit project
2. Go to Secrets panel (padlock icon) → add `WXO_MANAGER_API_KEY`
3. Click Run — the app starts on port 5000

### Local Development
```bash
git clone <repo>
cd hoos-gaming
cp .env.example .env.local
# Add WXO_MANAGER_API_KEY to .env.local
npm install
npm run dev    # http://localhost:5000
```

### Without IBM Keys
The app works in **demo mode** without any API keys — it generates a full local Phaser 3 game instantly. Demo mode is indicated by the "DEMO" badge in the top-left of the Create page.

---

*Built for IBM TechXchange 2025 · Best AI & Data Science Track · University of Virginia · Hoos Gaming*
