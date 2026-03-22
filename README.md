# Hoos Gaming — AI Game Builder

Build a complete, playable HTML5 game from a single text prompt using 78 specialized IBM watsonx Orchestrate AI agents.

---

## What It Does

Hoos Gaming is a Next.js 14 web application that lets anyone describe a game idea in plain language and receive a fully playable HTML5 game — complete with player physics, enemies, sounds, HUD, boss fights, and win/game-over screens — in under 90 seconds.

**Supported game engines:**
| Engine | Tech | Best For |
|---|---|---|
| Phaser 3 | JavaScript | 2D platformers, side-scrollers, bullet-hell, top-down RPGs |
| Three.js | JavaScript | 3D shooters, dungeon crawlers, first-person games |
| Python | Pyodide (WASM) | Puzzle games, maze games, Python education |

---

## Architecture

```
Browser → /create page
  → POST /api/chat (prompt + language)
      → IBM IAM token (cached 55 min)
      → IBM watsonx Orchestrate: POST /v1/orchestrate/runs
      → Poll /v1/orchestrate/runs/{run_id} until completed (2–4s interval)
      → GET /v1/orchestrate/threads/{thread_id}/messages
      → Repair any censored CDN URLs (IBM censors @version strings)
      → Return complete HTML game code
  → Extract ```html block from reply
  → Store in sessionStorage
  → Show ▶ Play Game button

/play page
  → Read HTML from sessionStorage
  → Create Blob URL
  → Render in sandboxed iframe (allow-scripts, allow-same-origin, allow-pointer-lock)
```

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 14 (App Router, TypeScript) |
| Styling | Custom CSS design system — UVA Orange & Blue dark mode |
| AI Backbone | IBM watsonx Orchestrate (78 specialized agents) |
| 2D Engine | Phaser 3.60 (Cloudflare CDN) |
| 3D Engine | Three.js r134 (Cloudflare CDN) |
| Python Runtime | Pyodide v0.23.4 (browser WASM Python) |
| Audio | Web Audio API (oscillators — no external files needed) |
| Port | 5000 (development), auto on production |

---

## Environment Variables

| Variable | Purpose |
|---|---|
| `WXO_MANAGER_API_KEY` | IBM watsonx Orchestrate Manager API key — **primary auth** |
| `WXO_API_KEY` | IBM native console key — backup |
| `ELEVENLABS_API_KEY` | Reserved for AI voice narration (future feature) |

---

## IBM watsonx Orchestrate Integration

### Instance
- **ID:** `c8a9d776-460e-4c9a-b55f-0a2556febf8e`
- **Region:** `us-south`
- **Base URL:** `https://api.us-south.watson-orchestrate.cloud.ibm.com/instances/c8a9d776-460e-4c9a-b55f-0a2556febf8e`
- **Total agents in instance:** 88 (78 game-specific + 10 system/excluded)
- **Routing used:** `AskOrchestrate` (default agent, no `agent_id` param) — most reliable

### API Request Flow

```typescript
// Step 1 — Get IAM Bearer token (module-level cache, refreshed 5 min before expiry)
POST https://iam.cloud.ibm.com/identity/token
Content-Type: application/x-www-form-urlencoded
Body: grant_type=urn:ibm:params:oauth:grant-type:apikey&apikey=<WXO_MANAGER_API_KEY>
Response: { access_token, expires_in: 3600 }

// Step 2 — Start a run (AskOrchestrate route — no agent_id)
POST /v1/orchestrate/runs
Authorization: Bearer <token>
Body: { message: { role: "user", content: "<system_prompt + user_prompt>" } }
Response: { thread_id, run_id }

// Optional for follow-up prompts — pass thread_id to continue conversation
Body: { message: ..., thread_id: "<existing_thread_id>" }

// Step 3 — Poll for completion (gentle exponential backoff, 2s → 4s)
GET /v1/orchestrate/runs/<run_id>
Response: { status: "running" | "completed" | "failed" | "cancelled" }

// Step 4 — Fetch assistant reply
GET /v1/orchestrate/threads/<thread_id>/messages
Response: [{ role: "assistant", content: [{ text: "..." }] }]
// Take the LAST assistant message
```

### Known IBM Behaviors

| Issue | Cause | Fix Applied |
|---|---|---|
| CDN URLs censored (`phaser@3.60.0` → `*****`) | IBM censors `@version` npm patterns | Auto-repair with regex after every reply |
| Empty reply on long prompts | IBM has an input length filter | Keep system prompt under ~300 chars |
| `game_director` agent errors | IBM-side flow config issue | Route to AskOrchestrate instead (no `agent_id`) |
| ~35–60s response time | 78-agent pipeline | Poll with backoff, show domain animation to user |
| Timeout | IBM occasionally stalls | Max 90s poll, then local demo fallback |

### System Prompts (compact, under 300 chars)

**Phaser 3 (2D):**
> You are HOOS AI, a Phaser 3 game code generator. Output a COMPLETE, immediately runnable single-file HTML5 game. Rules: Start with ```html/end with ```; begin <!DOCTYPE html>/end </html>; load Phaser from cdnjs.cloudflare.com…; include Web Audio API sounds (no external files); include player, enemies, HUD, boss, game-over, win screen; Arcade Physics; never truncate.

**Three.js (3D):**
> Same structure but uses Three.js r134, WebGLRenderer, PerspectiveCamera, WASD + pointer-lock mouse look, Web Audio oscillator SFX, BoxGeometry/SphereGeometry shapes.

**Python (Pyodide):**
> Embeds Python via Pyodide loaded from jsdelivr CDN. Python game logic in `<script type="text/python">` or passed to `pyodide.runPythonAsync`.

---

## API Routes

### `POST /api/chat`
**Request:**
```json
{
  "prompt": "2D dark fantasy side-scroller with boss fights",
  "language": "js-phaser",
  "sessionId": "optional-thread-id-for-follow-ups"
}
```
`language`: `"js-phaser"` | `"js-three"` | `"python"`

**Response:**
```json
{
  "reply": "```html\n<!DOCTYPE html>...\n```\n",
  "sessionId": "ibm-thread-id",
  "demo": false
}
```
`demo: true` = IBM was unavailable, local fallback game returned.

### `GET /api/agents`
Returns all 78 IBM game agents grouped by domain, cached 55 minutes.

```json
{
  "agents": [
    {
      "id": "abc123",
      "name": "game_director",
      "cleanName": "Game Director",
      "domain": "Orchestration",
      "description": "Central orchestrator that decomposes game specs into agent tasks"
    }
  ],
  "count": 78,
  "mock": false
}
```

---

## Pages

### `/` — Landing
Marketing homepage with 14-domain pipeline explainer, IBM agent count, feature cards.

### `/create` — Game Builder
- Engine selector: Phaser 3 | Three.js | Python
- 8 example prompt chips (auto-set language based on keywords)
- Live IBM agent pipeline with **domain-based animation** showing which phase is running
- Thinking indicator showing active domain names
- Code badge with engine detection + char count + copy button
- "▶ Play Game" button appears when game code is ready

### `/play` — Game Runner
- Reads game code from `sessionStorage`
- Creates `Blob URL` → sandboxed `<iframe>`
- Engine-appropriate controls bar (2D vs 3D vs Python)
- Fullscreen toggle with `requestFullscreen` API
- "Click to enable keyboard & sound" prompt

---

## Sound System

All generated games use **Web Audio API** — no external audio files, no CORS issues, works offline:

```javascript
// Pattern used in generated games
const actx = new AudioContext();
function sfx(freq, dur, type = 'square') {
  const o = actx.createOscillator(), g = actx.createGain();
  o.type = type; o.frequency.value = freq;
  g.gain.setValueAtTime(0.3, actx.currentTime);
  g.gain.exponentialRampToValueAtTime(0.001, actx.currentTime + dur);
  o.connect(g); g.connect(actx.destination);
  o.start(); o.stop(actx.currentTime + dur);
}
// Usage: sfx(440, 0.1)  — jump
//        sfx(80, 0.5, 'sawtooth')  — game over
//        sfx(880, 0.3, 'sine')  — victory
```

AudioContext is unlocked on first user click (browser requirement).

---

## Agent Pipeline Timeline

During a build (~60s), the UI animates agents through realistic domain phases:

| Elapsed | Domains Active |
|---|---|
| 0–8s | Orchestration |
| 5–16s | + Narrative |
| 10–22s | + Mechanics |
| 14–26s | + Physics |
| 16–56s | + Bridge (runs throughout) |
| 20–32s | + Animation |
| 22–35s | + Art |
| 28–40s | + Rendering |
| 32–44s | + Level |
| 36–48s | + Audio |
| 40–52s | + UI |
| 42–54s | + AI/NPC |
| 50–60s | + QA |
| 55–65s | + Deploy |

Each domain shows colored "RUNNING" badge, per-agent progress bars fill in real-time, and status updates from `idle` → `running` → `done`.

---

## Game Code Extraction

The IBM reply is parsed in priority order:
1. ` ```html\n...\n``` ` block → extracted as-is
2. Raw `<!DOCTYPE html>` … `</html>` in text → extracted directly
3. ` ```javascript\n...\n``` ` block → wrapped in Phaser 3 HTML template

Stored in `sessionStorage`:
- `hoos_game_code` — full HTML string
- `hoos_game_prompt` — user's original prompt
- `hoos_game_engine` — detected engine label (`"PHASER 3 · 2D"`, `"THREE.JS 3D"`, `"PYTHON / PYODIDE"`)

---

## Demo / Fallback Mode

When IBM is unavailable, a **fully playable local game** is generated instantly:

- **2D (Phaser 3):** Platformer with Boot scene, procedural textures, patrol enemies, chaser AI, boss fight at 500 pts, particles, adaptive background music, game-over + win screens
- **3D (Three.js):** First-person shooter with pointer-lock mouse look, 8 enemies with chase AI, boss projectiles, full Web Audio SFX, minimap, game-over screen

---

## Development

```bash
npm install
npm run dev        # starts on port 5000
npm run build
npm start
```

---

## Project Structure

```
src/
  app/
    api/
      chat/route.ts    — IBM WxO API client, prompt builder, URL repair, demo fallback
      agents/route.ts  — IBM agent list, domain grouping, 55-min cache
    create/page.tsx     — Game builder UI with engine selector + agent animation
    play/page.tsx       — In-browser game runner (iframe + blob URL)
    globals.css         — Full design system (tokens, components, create/play pages)
    layout.tsx          — Root layout: cursor, nav, scroll reveal
README.md               — This file
IBMOrchestra.md         — Full reference for all 78 IBM agents
replit.md               — Internal dev notes
```

---

## Design System

| Token | Value |
|---|---|
| Primary | `#E57200` UVA Orange |
| Secondary | `#232D4B` UVA Navy |
| Background | `#0a0e1a` Near-black |
| Display font | Orbitron |
| Body font | Cabinet Grotesk |
| Code font | JetBrains Mono |

Effects: custom orange cursor + ring, subtle CRT scanline overlay, scroll-reveal animations.

---

*Built for IBM TechXchange · Hoos Gaming · University of Virginia*
