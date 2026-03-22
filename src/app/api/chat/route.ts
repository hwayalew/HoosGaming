/**
 * Purpose: Stream game generation — IBM watsonx Orchestrate (multi-pass assembly), then Gemini, then built-in demo HTML.
 * Called by: create/page.tsx (POST, SSE)
 * Input: JSON { prompt, sessionId?, language }
 * Output: text/event-stream with JSON events: progress | complete (optional flags demo, gemini on complete)
 * Auth: None. IBM IAM uses WXO_MANAGER_API_KEY, or WXO_API_KEY if the manager key is unset (same pattern as optional backup).
 */
import { NextRequest } from "next/server";
import { WXO_INSTANCE_API_BASE } from "@/lib/app-config";

const IAM_URL  = "https://iam.cloud.ibm.com/identity/token";
const GEMINI_FALLBACK_MODEL = "gemini-2.5-flash";

const CDN = {
  phaser:  "https://cdnjs.cloudflare.com/ajax/libs/phaser/3.60.0/phaser.min.js",
  three:   "https://cdnjs.cloudflare.com/ajax/libs/three.js/r134/three.min.js",
  pyodide: "https://cdn.jsdelivr.net/pyodide/v0.23.4/full/pyodide.js",
  p5:      "https://cdnjs.cloudflare.com/ajax/libs/p5.js/1.9.0/p5.min.js",
  kaboom:  "https://unpkg.com/kaboom@3000.0.1/dist/kaboom.js",
  babylon: "https://cdn.babylonjs.com/babylon.js",
  pixi:    "https://cdnjs.cloudflare.com/ajax/libs/pixi.js/7.2.4/pixi.min.js",
};

// ── IAM token cache ───────────────────────────────────────────────────────────
let _iamCache: { token: string; expiresAt: number } | null = null;

async function getIAMToken(apiKey: string): Promise<string> {
  if (_iamCache && Date.now() < _iamCache.expiresAt - 300_000) return _iamCache.token;
  const res = await fetch(IAM_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ grant_type: "urn:ibm:params:oauth:grant-type:apikey", apikey: apiKey }),
  });
  if (!res.ok) throw new Error(`IAM ${res.status}`);
  const data = await res.json() as { access_token?: string; expires_in?: number };
  if (!data.access_token) throw new Error("No IAM access_token");
  _iamCache = { token: data.access_token, expiresAt: Date.now() + ((data.expires_in ?? 3600) * 1000) };
  return data.access_token;
}

// ── Fix IBM-censored CDN URLs ─────────────────────────────────────────────────
function fixCensoredUrls(text: string): string {
  return text
    .replace(/<script[^>]+src="[^"]*\*+[^"]*phaser[^"]*"[^>]*><\/script>/gi, `<script src="${CDN.phaser}"></script>`)
    .replace(/<script[^>]+src="[^"]*\*+[^"]*three[^"]*"[^>]*><\/script>/gi, `<script src="${CDN.three}"></script>`)
    .replace(/https:\/\/cdn[^"'\s]*\/npm\/[^"'\s]*\*+[^"'\s]*/g, (m) => {
      if (/phaser/i.test(m)) return CDN.phaser;
      if (/three/i.test(m)) return CDN.three;
      if (/pyodide/i.test(m)) return CDN.pyodide;
      return m;
    });
}

// ── Detailed engine-specific system prompts ───────────────────────────────────
function buildPrompt(userPrompt: string, language: string): string {

  if (language === "js-phaser") {
    return `You are HOOS AI, an expert Phaser 3 game developer. Build this game using ONLY Phaser 3: "${userPrompt}"

CRITICAL RULES:
• Wrap entire output in \`\`\`html ... \`\`\`
• Start <!DOCTYPE html>, end </html>
• Load Phaser from: ${CDN.phaser} — no other CDN
• Use Web Audio API (AudioContext oscillators) for ALL sounds — no external files
• NEVER truncate — output the full complete file

REQUIRED ARCHITECTURE — implement every item:
1. BOOT SCENE: class Boot extends Phaser.Scene { constructor(){super('Boot')} create(){ /* generate ALL textures with this.make.graphics().generateTexture(key,w,h); g.destroy() for each: player, enemy1, enemy2, boss, bullet, particle, platform */ this.scene.start('Game'); }}
2. GAME SCENE with full create() and update():
   • Background: gradient sky + stars (Phaser.Math.Between random circles)
   • 6+ platforms as staticGroup with varied heights
   • Player: physics sprite, setCollideWorldBounds, left/right velocity, jump on blocked.down, Z key shoots, invincibility frames on hit (1200ms tint flash)
   • Enemy type 1: patrol (setBounceX), bounces off walls, 2HP
   • Enemy type 2: chaser (update tracks player.x), 3HP
   • Boss: spawns when score >= 500, 15HP, fires targeted projectiles every 1.8s using Phaser.Math.Angle.Between
   • Bullet group: velocity-based, auto-destroy after 1.1s
   • Particles: this.add.particles emitter on kills
   • HUD: score text, lives text with ♥ symbols, boss HP text
   • Ambient music: time.delayedCall loop with oscillator notes
3. GAME-OVER: dark overlay rectangle + "GAME OVER" text + score + "Press R to restart" (rKey.isDown scene.restart())
4. WIN: triggered when boss HP <= 0, golden text + score + R restart
5. Phaser.Game config: type:AUTO, width:800, height:500, arcade physics gravity y:500, scene:[Boot,Game], scale FIT+CENTER_BOTH

GAME THEME — make all visuals, enemies, story match this theme:
${userPrompt}`;
  }

  if (language === "js-three") {
    return `You are HOOS AI, an expert Three.js 3D game developer. Build this 3D game using ONLY Three.js r134: "${userPrompt}"

CRITICAL RULES:
• Wrap entire output in \`\`\`html ... \`\`\`
• Start <!DOCTYPE html>, end </html>
• Load Three.js from: ${CDN.three} — ONLY this CDN, no other engines
• Use Web Audio API (AudioContext oscillators) for ALL sounds
• NEVER truncate — output the full complete file

REQUIRED 3D ARCHITECTURE — implement every item:
1. SCENE SETUP:
   • THREE.Scene with fog (Fog or FogExp2)
   • THREE.WebGLRenderer({antialias:true}), setSize(innerWidth,innerHeight), shadowMap.enabled=true, append to body
   • THREE.PerspectiveCamera(75, aspect, 0.1, 200), position y=2
   • Ambient light + PointLight/DirectionalLight with shadow casting
   
2. ENVIRONMENT:
   • Floor: large PlaneGeometry with MeshStandardMaterial, rotation.x=-PI/2, receiveShadow
   • 4 boundary walls to contain the play area
   • 5+ decorative objects (pillars, crates, trees using BoxGeometry/CylinderGeometry/SphereGeometry)
   • Skybox color or gradient background
   
3. PLAYER CONTROLLER:
   • Pointer lock: renderer.domElement.addEventListener('click', requestPointerLock)
   • Mouse look: document mousemove → update yaw/pitch (clamp pitch ±1.2 rad)
   • WASD movement relative to camera facing direction using sin/cos of yaw
   • Gravity + jump (yVel, ground detection at y<2)
   • SPACE key shoots bullets (SphereGeometry projectiles with velocity vector)
   
4. ENEMIES (at least 3 different types):
   • Basic: follows player when within 30 units, 3HP each
   • Ranged: fires back at player when within 25 units
   • Boss: spawns at score 500, 20HP, large BoxGeometry, fires rapid projectiles
   • All use BoxGeometry with MeshStandardMaterial and emissive glow
   
5. COMBAT SYSTEM:
   • Bullet-enemy distance collision checks in game loop
   • Enemy-player distance collision (damage + invincibility frames)
   • Particle explosions using THREE.Points with BufferGeometry
   
6. HUD (HTML overlay, position:fixed):
   • Score, HP, ammo counters (innerHTML updates)
   • Boss HP bar when boss alive (CSS width transition)
   • Game-over and win overlays (createElement div)
   
7. GAME LOOP: const clock = new THREE.Clock(); requestAnimationFrame(loop); dt = Math.min(clock.getDelta(), 0.05)
8. WINDOW RESIZE: update camera.aspect, renderer.setSize

GAME THEME — make all visuals, enemies, environment match this theme:
${userPrompt}`;
  }

  if (language === "js-babylon") {
    return `You are HOOS AI, an expert Babylon.js 3D game developer. Build this 3D game using ONLY Babylon.js: "${userPrompt}"

CRITICAL RULES:
• Wrap entire output in \`\`\`html ... \`\`\`
• Load Babylon.js from: ${CDN.babylon}
• Use Web Audio API for sounds (no external files)
• NEVER truncate — output the full complete file

REQUIRED BABYLON.JS ARCHITECTURE:
1. Canvas setup: <canvas id="c" style="width:100%;height:100%;display:block">
2. Engine: new BABYLON.Engine(canvas, true, {adaptToDeviceRatio:true})
3. Scene: new BABYLON.Scene(engine); scene.gravity = new BABYLON.Vector3(0,-20,0); scene.collisionsEnabled = true
4. Camera: BABYLON.FreeCamera with WASD keys and mouse look, attachControl(canvas), applyGravity=true, checkCollisions=true
5. Lights: HemisphericLight + DirectionalLight with shadow generator
6. Ground: MeshBuilder.CreateGround with checkCollisions=true
7. 5+ environmental meshes (MeshBuilder.CreateBox, CreateSphere, CreateCylinder) with random positions and materials
8. PBR materials (new BABYLON.PBRMaterial) for realistic surfaces
9. At least 6 enemies using CreateBox meshes with AI: move toward player, fire projectiles, track HP
10. Boss: large ScaleVector3(3,3,3) box, 20HP, fires every 2s
11. HTML overlay HUD: score, HP, boss HP bar
12. Particle systems: new BABYLON.ParticleSystem for explosions
13. Win/game-over screens: DOM overlays
14. engine.runRenderLoop(() => scene.render())
15. window.addEventListener("resize", () => engine.resize())

GAME THEME: ${userPrompt}`;
  }

  if (language === "js-p5") {
    return `You are HOOS AI, an expert p5.js game developer. Build this game using ONLY p5.js: "${userPrompt}"

CRITICAL RULES:
• Wrap entire output in \`\`\`html ... \`\`\`
• Load p5.js from: ${CDN.p5}
• Use Web Audio API or p5.js oscillators for sounds
• NEVER truncate — output the full complete file

REQUIRED P5.JS ARCHITECTURE:
1. setup(): createCanvas(windowWidth, windowHeight); background color; init game state
2. draw(): called 60fps — clear background, update all entities, draw all entities, draw HUD
3. Player class: position (PVector or {x,y}), velocity, draw() method using ellipse/rect, move with WASD/arrows, invincibility frames
4. Enemy classes (2+ types): patrol with direction flip, chaser that follows player; each with HP, draw(), update()
5. Boss class: large, 20HP, fires homing projectiles every 2s, phase 2 at 10HP (faster/more bullets)
6. Bullets: array of {x, y, vx, vy} objects, auto-remove when off-screen
7. Platforms or terrain features relevant to the game theme
8. Score/lives display in draw() using text()
9. States: 'start', 'playing', 'gameover', 'win' — switch on conditions
10. Start screen: title, "Press SPACE to start"
11. Game-over screen: "GAME OVER", score, "Press R to restart"
12. Win screen: "YOU WIN!", final score
13. Collision: dist(a.x, a.y, b.x, b.y) < threshold for circular; rectIntersect for platforms
14. Sound: AudioContext oscillator sfx() function for jump, shoot, hit, death, victory
15. windowResized(): resizeCanvas(windowWidth, windowHeight)

GAME THEME: ${userPrompt}`;
  }

  if (language === "js-kaboom") {
    return `You are HOOS AI, an expert Kaboom.js game developer. Build this game using ONLY Kaboom.js: "${userPrompt}"

CRITICAL RULES:
• Wrap entire output in \`\`\`html ... \`\`\`
• Load Kaboom from: ${CDN.kaboom}
• Use Web Audio API for sounds
• NEVER truncate — output the full complete file

REQUIRED KABOOM.JS ARCHITECTURE:
1. Initialize: kaboom({ width: 800, height: 500, background: [10, 14, 26] })
2. Load sprites procedurally using loadSprite with canvas/dataURL
3. Define components: pos(), sprite(), area(), body(), health(), scale(), opacity(), color()
4. SCENE "game":
   • Player: add([sprite("player"), pos(80,300), area(), body(), health(3), "player"])
   • onKeyDown("left"/"right"): move horizontally
   • onKeyPress("up"/"space"): player.jump()
   • onKeyPress("z"/"f"): shoot bullet in facing direction
   • Ground platform and 5+ floating platforms using addLevel or manual add()
   • At least 2 enemy types with distinct behavior using onUpdate
   • Boss: spawns at 500 score, high HP, fires back
   • Bullets: move(), auto-destroy on wall/enemy hit using onCollide
   • Score label: add([text("Score: 0"), pos(12,12), fixed(), {score:0}])
   • Lives label with ♥ symbols
5. onCollide("bullet","enemy"): enemy.hurt(1); if hp<=0 destroy+score++
6. onCollide("player","enemy"): player.hurt(1); if lives<=0 go("gameover")
7. SCENE "gameover": big text, score, onKeyPress("r") → go("game")
8. SCENE "win": triggered when boss dies, victory text + score
9. go("game") to start

GAME THEME: ${userPrompt}`;
  }

  if (language === "js-pixi") {
    return `You are HOOS AI, an expert PixiJS game developer. Build this game using ONLY PixiJS v7: "${userPrompt}"

CRITICAL RULES:
• Wrap entire output in \`\`\`html ... \`\`\`
• Load PixiJS from: ${CDN.pixi}
• Use Web Audio API for sounds (no external files)
• NEVER truncate — output the full complete file

REQUIRED PIXI.JS ARCHITECTURE:
1. App: const app = new PIXI.Application({width:800,height:500,backgroundColor:0x0a0e1a,antialias:true}); document.body.appendChild(app.view)
2. ALL graphics drawn with PIXI.Graphics (no external images):
   • createRect(color,w,h), createCircle(color,r), createTriangle() factory functions
3. Player: PIXI.Graphics sprite, position {x,y}, velocity {vx,vy}, HP=3
4. Platform container: PIXI.Container with 6+ PIXI.Graphics rectangles
5. Enemy class (2 types): chaser and patrol, each with PIXI.Graphics drawable, HP, update()
6. Boss: large PIXI.Graphics box, 15HP, fires homing bullets toward player
7. Bullet pool: array of PIXI.Graphics circles, move each tick, remove when offscreen or hits enemy
8. Particle system: on kill, spawn 8 PIXI.Graphics tiny circles with velocity, alpha fade
9. HUD: PIXI.Text objects for score, lives, boss HP — added to app.stage, fixed position
10. Game loop: app.ticker.add((delta) => { update(delta); })
11. Input: keyboard event listeners tracking which keys are held
12. Gravity: apply vy += GRAVITY each tick, clamp to ground
13. Collision: AABB checks between all interactive objects
14. Game states: 'playing', 'gameover', 'win' — show different PIXI.Container per state
15. RESIZE: app.renderer.resize(window.innerWidth, window.innerHeight)
16. Web Audio SFX for all game events

GAME THEME: ${userPrompt}`;
  }

  if (language === "python") {
    return `You are HOOS AI, an expert Python game developer using Pyodide. Build this Python game: "${userPrompt}"

CRITICAL RULES:
• Wrap entire output in \`\`\`html ... \`\`\`
• Load Pyodide from: ${CDN.pyodide}
• ALL game logic in Python (passed to pyodide.runPythonAsync)
• Use js module for browser interop (import js; js.document, js.window)
• NEVER truncate — output the full complete file

REQUIRED ARCHITECTURE:
HTML STRUCTURE:
<canvas id="c" width="800" height="500" style="display:block;margin:auto;background:#0a0e1a"></canvas>
<div id="hud" style="position:fixed;top:10px;left:10px;color:#e57200;font:bold 14px monospace"></div>
<script>loadPyodide().then(async(pyodide)=>{ await pyodide.runPythonAsync(PYTHON_GAME_CODE); });</script>

PYTHON GAME CODE (multi-line string in JS) must include:
1. import js, math, asyncio
2. canvas = js.document.getElementById("c"); ctx = canvas.getContext("2d")
3. Game state dataclass or dict: player {x,y,vx,vy,hp,score,lives}, enemies[], bullets[]
4. Keys dict tracking held keys: js.document.addEventListener("keydown", ...) via js.window
5. draw() function: ctx.clearRect, ctx.fillStyle/fillRect/arc/beginPath for all objects
6. update(dt) function: physics, AI movement, collision detection, spawn logic
7. Collision: AABB overlap function aabb(a,b) → bool
8. 2+ enemy types with patrol and chasing behavior
9. Boss at score 500: large rect, 15HP, fires at player
10. HUD update: js.document.getElementById("hud").innerHTML = f"SCORE:{score} HP:{player_hp}"
11. Game states: "playing", "gameover", "win" — draw different screens
12. Async game loop using asyncio:
    async def game_loop():
        while True:
            update(1/60)
            draw()
            await asyncio.sleep(1/60)
    asyncio.ensure_future(game_loop())

GAME THEME: ${userPrompt}`;
  }

  // Default fallback to Phaser 3
  return buildPrompt(userPrompt, "js-phaser");
}

// ── Completion detection ──────────────────────────────────────────────────────
function isGameComplete(code: string): boolean {
  const t = code.trim();
  if (!/<\/html>\s*$/i.test(t)) return false;

  const hasBootstrap =
    /new\s+Phaser\.Game\s*\(/.test(t) ||
    /requestAnimationFrame/.test(t) ||
    /pyodide\.runPythonAsync/.test(t) ||
    /kaboom\s*\(/.test(t) ||
    /BABYLON\.Engine/.test(t) ||
    /new\s+PIXI\.Application/.test(t) ||
    /new\s+p5\s*\(/.test(t) ||
    /app\.ticker\.add/.test(t) ||
    /engine\.runRenderLoop/.test(t) ||
    /asyncio\.ensure_future/.test(t);
  if (!hasBootstrap) return false;

  // Count braces only inside inline <script> blocks
  const scripts = [...t.matchAll(/<script(?![^>]*\bsrc\b)[^>]*>([\s\S]*?)<\/script>/gi)];
  const js = scripts.map(m => m[1]).join("\n");
  if (!js.trim()) return false;

  let depth = 0, inStr = false, strCh = "", inLC = false, inBC = false;
  for (let i = 0; i < js.length; i++) {
    const c = js[i], n = js[i + 1];
    if (inLC) { if (c === "\n") inLC = false; continue; }
    if (inBC) { if (c === "*" && n === "/") { inBC = false; i++; } continue; }
    if (inStr) { if (c === strCh && js[i - 1] !== "\\") inStr = false; continue; }
    if (c === "/" && n === "/") { inLC = true; continue; }
    if (c === "/" && n === "*") { inBC = true; continue; }
    if (c === '"' || c === "'" || c === "`") { inStr = true; strCh = c; continue; }
    if (c === "{") depth++;
    if (c === "}") depth--;
  }
  return depth === 0;
}

// ── Extract game code from raw IBM reply ──────────────────────────────────────
function extractCode(text: string): string {
  const htmlBlock = text.match(/```html\s*([\s\S]*?)(?:```\s*$|```\s*\n|$)/i);
  if (htmlBlock) return htmlBlock[1].trim();

  const doctypeIdx = text.search(/<!DOCTYPE\s+html/i);
  if (doctypeIdx >= 0) return text.slice(doctypeIdx).trim();

  const jsBlock = text.match(/```(?:javascript|js)\s*([\s\S]*?)(?:```|$)/i);
  if (jsBlock) return `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Game</title>
<style>*{margin:0;padding:0}body{background:#000;overflow:hidden}</style>
</head><body><script src="${CDN.phaser}"></script>
<script>${jsBlock[1]}</script></body></html>`;

  return text;
}

// ── Assemble continuation chunks into one valid HTML file ─────────────────────
function assembleChunks(chunks: string[]): string {
  if (chunks.length === 0) return "";
  if (chunks.length === 1) return fixCensoredUrls(chunks[0].trim());

  let base = chunks[0].trim()
    .replace(/\s*<\/html>\s*$/i, "")
    .replace(/\s*<\/body>\s*$/i, "");

  const parts: string[] = [base];

  for (let i = 1; i < chunks.length; i++) {
    let chunk = chunks[i].trim()
      .replace(/^```(?:html|javascript|js)?\s*/i, "")
      .replace(/\s*```\s*$/i, "")
      .trim()
      .replace(/^<!DOCTYPE[^>]*>\s*/i, "")
      .replace(/^<html[^>]*>\s*/i, "")
      .replace(/^<head[\s\S]*?<\/head>\s*/i, "")
      .replace(/^<body[^>]*>\s*/i, "");

    if (i < chunks.length - 1) {
      chunk = chunk
        .replace(/\s*<\/body>\s*<\/html>\s*$/i, "")
        .replace(/\s*<\/html>\s*$/i, "");
    }

    if (chunk.trim()) parts.push(chunk.trim());
  }

  let assembled = parts.join("\n");
  if (!/<\/html>/i.test(assembled)) {
    if (!/<\/body>/i.test(assembled)) assembled += "\n</body>";
    assembled += "\n</html>";
  }

  return fixCensoredUrls(assembled);
}

// ── IBM run helpers ───────────────────────────────────────────────────────────
async function startRun(token: string, content: string, threadId?: string) {
  const body: Record<string, unknown> = { message: { role: "user", content } };
  if (threadId) body.thread_id = threadId;
  const res = await fetch(`${WXO_INSTANCE_API_BASE}/v1/orchestrate/runs`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(20000),
  });
  if (!res.ok) throw new Error(`startRun ${res.status}: ${await res.text()}`);
  return res.json() as Promise<{ thread_id: string; run_id: string }>;
}

async function pollRun(token: string, runId: string, maxMs = 90000): Promise<string> {
  const deadline = Date.now() + maxMs;
  let interval = 2000;
  while (Date.now() < deadline) {
    await new Promise(r => setTimeout(r, interval));
    interval = Math.min(interval * 1.15, 4000);
    const res = await fetch(`${WXO_INSTANCE_API_BASE}/v1/orchestrate/runs/${runId}`, {
      headers: { Authorization: `Bearer ${token}` },
      signal: AbortSignal.timeout(12000),
    });
    if (!res.ok) throw new Error(`pollRun ${res.status}`);
    const { status } = await res.json() as { status: string };
    if (status === "completed") return "completed";
    if (status === "failed" || status === "cancelled") return status;
  }
  return "timeout";
}

async function getReply(token: string, threadId: string): Promise<string> {
  const res = await fetch(`${WXO_INSTANCE_API_BASE}/v1/orchestrate/threads/${threadId}/messages`, {
    headers: { Authorization: `Bearer ${token}` },
    signal: AbortSignal.timeout(12000),
  });
  if (!res.ok) throw new Error(`getReply ${res.status}`);
  const msgs = await res.json() as Array<{ role: string; content: Array<{ text?: string }> }>;
  const last = [...msgs].reverse().find(m => m.role === "assistant");
  if (!last) return "";
  return last.content.map(c => c.text ?? "").join("\n").trim();
}

// ── Demo fallback games ───────────────────────────────────────────────────────
function generateDemoGame(prompt: string, language: string): string {
  const is3D = language === "js-three" || language === "js-babylon" || /\b3d\b/i.test(prompt);
  const p = prompt.toLowerCase();
  const bgColor = p.includes("space") ? "#000011" : p.includes("dark") || p.includes("fantasy") ? "#0a0014" : "#001122";

  if (is3D) {
    return `\`\`\`html
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>${prompt.slice(0, 40)} | HOOS Gaming</title>
<style>*{margin:0;padding:0}body{overflow:hidden;background:#000}#hud{position:fixed;top:10px;left:10px;color:#fff;font:bold 14px monospace;text-shadow:0 0 8px #00f;pointer-events:none}#bossbar{position:fixed;top:40px;left:10px;width:200px;height:6px;background:#333;border-radius:3px;display:none}#bosshp{height:100%;background:#f00;border-radius:3px;transition:width .3s}#info{position:fixed;bottom:10px;left:50%;transform:translateX(-50%);color:rgba(255,255,255,.5);font:10px monospace}</style>
</head>
<body>
<div id="hud">SCORE: <span id="score">0</span> &nbsp; HP: <span id="hp">100</span></div>
<div id="bossbar"><div id="bosshp"></div></div>
<div id="info">WASD Move · Click for Mouse Look · SPACE Shoot · R Restart</div>
<script src="${CDN.three}"></script>
<script>
const scene=new THREE.Scene();scene.fog=new THREE.FogExp2(0x000033,.015);scene.background=new THREE.Color(0x000011);
const cam=new THREE.PerspectiveCamera(75,innerWidth/innerHeight,.1,200);cam.position.set(0,2,0);
const renderer=new THREE.WebGLRenderer({antialias:true});renderer.setSize(innerWidth,innerHeight);renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;document.body.appendChild(renderer.domElement);
scene.add(new THREE.AmbientLight(0x112244,.5));
const sun=new THREE.DirectionalLight(0x4466ff,1.5);sun.position.set(10,20,5);sun.castShadow=true;sun.shadow.mapSize.set(1024,1024);scene.add(sun);

// Floor
const floorMat=new THREE.MeshStandardMaterial({color:0x111133,roughness:.9});
const floor=new THREE.Mesh(new THREE.PlaneGeometry(100,100),floorMat);floor.rotation.x=-Math.PI/2;floor.receiveShadow=true;scene.add(floor);

// Environment objects
const envColors=[0x221144,0x112244,0x221133,0x331122];
for(let i=0;i<12;i++){
  const h=Math.random()*8+2,w=Math.random()*3+1;
  const mesh=new THREE.Mesh(new THREE.BoxGeometry(w,h,w),new THREE.MeshStandardMaterial({color:envColors[i%4],roughness:.8}));
  mesh.position.set((Math.random()-.5)*70,(h/2),(Math.random()-.5)*70);
  mesh.castShadow=true;mesh.receiveShadow=true;scene.add(mesh);
}
// Boundary walls
[[0,5,-50,'x'],[0,5,50,'x'],[-50,5,0,'z'],[50,5,0,'z']].forEach(([x,y,z,ax])=>{
  const w=ax==='x'?100:2,d=ax==='x'?2:100;
  const wall=new THREE.Mesh(new THREE.BoxGeometry(w,10,d),new THREE.MeshStandardMaterial({color:0x221133}));
  wall.position.set(x,y,z);scene.add(wall);
});

// Enemy factory
const eMats=[new THREE.MeshStandardMaterial({color:0xff2222,emissive:0x440000}),new THREE.MeshStandardMaterial({color:0xaa00ff,emissive:0x220044}),new THREE.MeshStandardMaterial({color:0xff6600,emissive:0x441100})];
const enemies=[];
function spawnEnemy(type=0,x,z,hp=3){
  const sizes=[[1.2,2,1.2],[.8,1.2,.8],[2,3,2]];const s=sizes[type]||sizes[0];
  const e=new THREE.Mesh(new THREE.BoxGeometry(...s),eMats[type%3].clone());
  e.position.set(x??((Math.random()-.5)*60),s[1]/2,z??((Math.random()-.5)*60));
  e.castShadow=true;e.hp=hp;e.maxHp=hp;e.type=type;e.shootTimer=0;scene.add(e);enemies.push(e);return e;
}
for(let i=0;i<6;i++)spawnEnemy(0);
for(let i=0;i<3;i++)spawnEnemy(1);

// Bullets
const bullets=[],eBullets=[],bMat=new THREE.MeshStandardMaterial({color:0x00ffff,emissive:0x006666}),eBMat=new THREE.MeshStandardMaterial({color:0xff4400,emissive:0x440000});
let boss=null,bossSpawned=false;

function spawnBoss(){
  bossSpawned=true;
  boss=spawnEnemy(2,30,0,20);
  boss.hp=20;boss.maxHp=20;boss.isBoss=true;
  document.getElementById('bossbar').style.display='block';
  sfx(80,1,'sawtooth');
}

// Game state
let score=0,hp=100,yVel=0,onGround=true,gameOver=false,won=false,invTimer=0;
let yaw=0,pitch=0;
const keys={};
document.addEventListener('keydown',e=>{keys[e.code]=true;if(e.code==='Space'&&!gameOver)shoot();if(e.code==='KeyR'&&(gameOver||won))location.reload();});
document.addEventListener('keyup',e=>delete keys[e.code]);
renderer.domElement.addEventListener('click',()=>renderer.domElement.requestPointerLock());
document.addEventListener('mousemove',e=>{if(document.pointerLockElement===renderer.domElement){yaw-=e.movementX*.002;pitch=Math.max(-1.2,Math.min(1.2,pitch-e.movementY*.002));}});

// Audio
const actx=new AudioContext();
function sfx(f,d,t='square',vol=.25){const o=actx.createOscillator(),g=actx.createGain();o.type=t;o.frequency.value=f;g.gain.setValueAtTime(vol,actx.currentTime);g.gain.exponentialRampToValueAtTime(.001,actx.currentTime+d);o.connect(g);g.connect(actx.destination);o.start();o.stop(actx.currentTime+d);}

function shoot(){
  if(gameOver||won)return;
  const b=new THREE.Mesh(new THREE.SphereGeometry(.18,6,6),bMat);b.position.copy(cam.position);
  const dir=new THREE.Vector3(0,0,-1).applyEuler(new THREE.Euler(pitch,yaw,0,'YXZ'));
  b.vel=dir.multiplyScalar(35);b.life=80;scene.add(b);bullets.push(b);sfx(520,.07,'sine',.2);
}

function spawnEBullet(from,target){
  const b=new THREE.Mesh(new THREE.SphereGeometry(.15,5,5),eBMat.clone());b.position.copy(from);
  const dir=target.clone().sub(from).normalize();b.vel=dir.multiplyScalar(12);b.life=90;scene.add(b);eBullets.push(b);
}

function updateHUD(){
  document.getElementById('score').textContent=score;
  document.getElementById('hp').textContent=Math.max(0,Math.round(hp));
  if(boss&&boss.hp>0)document.getElementById('bosshp').style.width=(boss.hp/boss.maxHp*100)+'%';
}

function showOverlay(title,sub,color='#ff2222'){
  const d=document.createElement('div');
  d.style.cssText='position:fixed;inset:0;background:rgba(0,0,0,.88);display:flex;flex-direction:column;align-items:center;justify-content:center;gap:20px;z-index:100';
  d.innerHTML='<div style="font:bold 56px monospace;color:'+color+'">'+title+'</div><div style="font:24px monospace;color:#fff">Score: '+score+'</div><div style="font:16px monospace;color:#aaa">Press R to restart</div>';
  document.body.appendChild(d);
}

const clock=new THREE.Clock();
(function loop(){
  requestAnimationFrame(loop);
  if(gameOver||won){renderer.render(scene,cam);return;}
  const dt=Math.min(clock.getDelta(),.05);
  invTimer=Math.max(0,invTimer-dt);

  // Player movement
  const fwd=new THREE.Vector3(-Math.sin(yaw),0,-Math.cos(yaw)),right=new THREE.Vector3(Math.cos(yaw),0,-Math.sin(yaw));
  const spd=keys['ShiftLeft']?8:5;
  if(keys['KeyW'])cam.position.addScaledVector(fwd,spd*dt);
  if(keys['KeyS'])cam.position.addScaledVector(fwd,-spd*dt);
  if(keys['KeyA'])cam.position.addScaledVector(right,-spd*dt);
  if(keys['KeyD'])cam.position.addScaledVector(right,spd*dt);
  if((keys['Space']||keys['KeyE'])&&onGround){yVel=9;onGround=false;}
  yVel-=22*dt;cam.position.y+=yVel*dt;
  if(cam.position.y<2){cam.position.y=2;yVel=0;onGround=true;}
  cam.position.x=Math.max(-48,Math.min(48,cam.position.x));cam.position.z=Math.max(-48,Math.min(48,cam.position.z));
  cam.rotation.order='YXZ';cam.rotation.y=yaw;cam.rotation.x=pitch;

  // Player bullets
  for(let i=bullets.length-1;i>=0;i--){
    const b=bullets[i];b.position.addScaledVector(b.vel,dt);b.life--;
    if(b.life<=0){scene.remove(b);bullets.splice(i,1);continue;}
    for(let j=enemies.length-1;j>=0;j--){
      const e=enemies[j];if(!e.parent)continue;
      if(b.position.distanceTo(e.position)<(e.isBoss?3:1.5)){
        e.hp--;
        if(e.hp<=0){
          scene.remove(e);enemies.splice(j,1);
          const pts=e.isBoss?500:100;score+=pts;sfx(300,.1,'square');
          if(e.isBoss){won=true;showOverlay('YOU WIN!','',  '#ffaa00');return;}
          if(!bossSpawned&&score>=500)spawnBoss();
        }else sfx(220,.06,'sawtooth');
        scene.remove(b);bullets.splice(i,1);break;
      }
    }
  }

  // Enemy AI + enemy bullets
  enemies.forEach((e,idx)=>{
    if(!e.parent)return;
    const d=cam.position.clone().sub(e.position);const dist=d.length();
    if(dist<35)e.position.addScaledVector(d.normalize(),(e.isBoss?3.5:2)*dt);
    e.rotation.y+=dt*.5;
    // Enemy shooting
    if(dist<25){
      e.shootTimer=(e.shootTimer||0)+dt;
      const rate=e.isBoss?.8:2.5;
      if(e.shootTimer>rate){e.shootTimer=0;spawnEBullet(e.position,cam.position);}
    }
    // Enemy touches player
    if(dist<(e.isBoss?3.5:2)&&invTimer<=0){hp-=e.isBoss?15:8;invTimer=1.2;sfx(80,.15,'sawtooth');if(hp<=0){gameOver=true;showOverlay('GAME OVER','','#ff2222');}}
  });

  // Enemy bullets
  for(let i=eBullets.length-1;i>=0;i--){
    const b=eBullets[i];b.position.addScaledVector(b.vel,dt);b.life--;
    if(b.life<=0){scene.remove(b);eBullets.splice(i,1);continue;}
    if(b.position.distanceTo(cam.position)<1.5&&invTimer<=0){hp-=10;invTimer=.8;sfx(100,.1,'sawtooth');scene.remove(b);eBullets.splice(i,1);if(hp<=0){gameOver=true;showOverlay('GAME OVER','','#ff2222');}}
  }

  updateHUD();
  renderer.render(scene,cam);
})();
window.addEventListener('resize',()=>{cam.aspect=innerWidth/innerHeight;cam.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight);});
</script>
</body>
</html>
\`\`\``;
  }

  // Phaser 3 2D fallback
  return `\`\`\`html
<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><title>${prompt.slice(0,40)} | HOOS Gaming</title>
<style>*{margin:0;padding:0;box-sizing:border-box}body{background:${bgColor};overflow:hidden}</style>
</head>
<body>
<script src="${CDN.phaser}"></script>
<script>
const W=800,H=500,actx=new AudioContext();
function sfx(f,d,t='square',vol=.22){const o=actx.createOscillator(),g=actx.createGain();o.type=t;o.frequency.value=f;g.gain.setValueAtTime(vol,actx.currentTime);g.gain.exponentialRampToValueAtTime(.001,actx.currentTime+d);o.connect(g);g.connect(actx.destination);o.start();o.stop(actx.currentTime+d);}

class Boot extends Phaser.Scene{
  constructor(){super('Boot')}
  create(){
    const d=(k,w,h,fn)=>{const g=this.make.graphics({x:0,y:0,add:false});fn(g);g.generateTexture(k,w,h);g.destroy()};
    d('pl',24,32,g=>{g.fillStyle(0xe57200);g.fillRect(4,0,16,12);g.fillStyle(0xf5a623);g.fillRect(6,3,12,8);g.fillStyle(0xe57200);g.fillRect(0,12,24,20);g.fillStyle(0xcc5500);g.fillRect(4,12,6,20);g.fillRect(14,12,6,20)});
    d('e1',22,22,g=>{g.fillStyle(0xff2233);g.fillRect(0,0,22,22);g.fillStyle(0xff6677);g.fillCircle(11,8,6);g.fillStyle(0xffaaaa);g.fillRect(6,14,4,6);g.fillRect(12,14,4,6)});
    d('e2',18,24,g=>{g.fillStyle(0x8800ff);g.fillTriangle(9,0,0,24,18,24);g.fillStyle(0xaa44ff);g.fillCircle(9,14,5)});
    d('e3',26,20,g=>{g.fillStyle(0x0088ff);g.fillRect(0,6,26,8);g.fillStyle(0x44aaff);g.fillEllipse(13,10,22,12)});
    d('boss',72,56,g=>{g.fillStyle(0xcc0000);g.fillRect(0,0,72,56);g.fillStyle(0xff2200);g.fillRect(8,4,20,26);g.fillRect(44,4,20,26);g.fillStyle(0xffcc00);g.fillRect(16,34,40,14);g.fillStyle(0xff6600);g.fillCircle(36,20,8)});
    d('bul',12,5,g=>{g.fillStyle(0xffee22);g.fillEllipse(6,2.5,12,5)});
    d('ebul',8,8,g=>{g.fillStyle(0xff4400);g.fillCircle(4,4,4)});
    d('prt',7,7,g=>{g.fillStyle(0xffa500,1);g.fillCircle(3.5,3.5,3.5)});
    d('prt2',5,5,g=>{g.fillStyle(0x88eeff,1);g.fillCircle(2.5,2.5,2.5)});
    d('star',3,3,g=>{g.fillStyle(0xffffff,.8);g.fillRect(0,0,3,3)});
    d('plat',120,14,g=>{g.fillStyle(0x2d1a4a);g.fillRect(0,0,120,14);g.fillStyle(0x3d2060);g.fillRect(0,0,120,3)});
    this.scene.start('Game');
  }
}

class Game extends Phaser.Scene{
  constructor(){super('Game')}
  create(){
    this.score=0;this.lives=3;this.gOver=false;this.bossSpawned=false;this.bossHp=0;this.boss=null;this.invincible=false;

    // Sky
    const bg=this.add.graphics();bg.fillGradientStyle(0x050010,0x050010,0x1a0044,0x0d0022,1);bg.fillRect(0,0,W,H);
    // Stars
    for(let i=0;i<120;i++){const s=this.add.image(Phaser.Math.Between(0,W),Phaser.Math.Between(0,H/2),'star');s.setAlpha(Math.random()*.7+.1);}
    // Scrolling nebula cloud
    this.nebulaG=this.add.graphics().setAlpha(.12);
    [0xaa00ff,0x0044ff,0xff4400].forEach((c,i)=>{this.nebulaG.fillStyle(c);this.nebulaG.fillEllipse(W*.2+i*W*.3,H*.35,200,100);});

    // Platforms
    this.plats=this.physics.add.staticGroup();
    [[W/2,H-16,W*1.4,32],[130,390,160,14],[330,330,140,14],[550,270,150,14],[200,210,130,14],[600,190,140,14],[380,150,100,14]].forEach(([x,y,w])=>{
      const p=this.physics.add.staticImage(x,y,'plat').setDisplaySize(w,14);p.refreshBody();this.plats.add(p);
    });

    // Player
    this.pl=this.physics.add.sprite(80,H-80,'pl').setBounce(.05).setCollideWorldBounds(true).setDepth(5);
    this.physics.add.collider(this.pl,this.plats);

    // Enemy groups
    this.e1s=this.physics.add.group();
    this.e2s=this.physics.add.group();
    this.e3s=this.physics.add.group();
    for(let i=0;i<4;i++){
      const e=this.e1s.create(Phaser.Math.Between(150,700),H-80,'e1').setCollideWorldBounds(true).setBounceX(1);
      e.setVelocityX(Phaser.Math.Between(-80,-50));e.hp=2;this.physics.add.collider(e,this.plats);
    }
    [300,600].forEach(x=>{const e=this.e2s.create(x,H-160,'e2').setCollideWorldBounds(true);e.hp=3;this.physics.add.collider(e,this.plats);});
    [200,580].forEach(x=>{const e=this.e3s.create(x,160,'e3').setCollideWorldBounds(true);e.hp=2;e.angle=Phaser.Math.Between(0,360);});

    // Bullets
    this.bullets=this.physics.add.group();
    this.eBullets=this.physics.add.group();

    // Particles
    this.pE=this.add.particles(0,0,'prt',{speed:{min:60,max:150},angle:{min:0,max:360},scale:{start:.8,end:0},lifespan:350,quantity:8,on:false});
    this.pE2=this.add.particles(0,0,'prt2',{speed:{min:40,max:100},angle:{min:0,max:360},scale:{start:.6,end:0},lifespan:280,quantity:5,on:false});

    // HUD
    const hs={font:'bold 13px monospace',fill:'#fff'};
    this.scoreTxt=this.add.text(12,10,'SCORE: 0',hs).setDepth(10);
    this.livTxt=this.add.text(12,28,'LIVES: ♥♥♥',{font:'bold 13px monospace',fill:'#ff6666'}).setDepth(10);
    this.bossTxt=this.add.text(W/2,8,'',{font:'bold 11px monospace',fill:'#ff3300'}).setOrigin(.5,0).setDepth(10);
    this.phseTxt=this.add.text(W-10,8,'',{font:'bold 10px monospace',fill:'#ffaa00'}).setOrigin(1,0).setDepth(10);
    this.add.text(W/2,10,prompt.slice(0,34).toUpperCase(),{font:'8px monospace',fill:'rgba(255,255,255,.25)'}).setOrigin(.5,0).setDepth(10);

    // Overlaps: bullets hit enemies
    this.physics.add.overlap(this.bullets,this.e1s,(b,e)=>this.hitEnemy(b,e,100));
    this.physics.add.overlap(this.bullets,this.e2s,(b,e)=>this.hitEnemy(b,e,150));
    this.physics.add.overlap(this.bullets,this.e3s,(b,e)=>this.hitEnemy(b,e,120));
    // Player hit by enemies
    this.physics.add.overlap(this.pl,this.e1s,()=>this.hurt());
    this.physics.add.overlap(this.pl,this.e2s,()=>this.hurt());
    this.physics.add.overlap(this.pl,this.e3s,()=>this.hurt());
    this.physics.add.overlap(this.pl,this.eBullets,(_,b)=>{b.destroy();this.hurt();});

    // Input
    this.ckeys=this.input.keyboard.createCursorKeys();
    this.wKey=this.input.keyboard.addKey('W');
    this.aKey=this.input.keyboard.addKey('A');
    this.dKey=this.input.keyboard.addKey('D');
    this.zKey=this.input.keyboard.addKey('Z');
    this.rKey=this.input.keyboard.addKey('R');
    this.lastShot=0;

    // Music loop
    const notes=[98,110,130,146,196,220];let ni=0;
    const tick=()=>{if(this.gOver)return;const o=actx.createOscillator(),g=actx.createGain();o.type='triangle';o.frequency.value=notes[ni++%notes.length];g.gain.setValueAtTime(.035,actx.currentTime);g.gain.exponentialRampToValueAtTime(.001,actx.currentTime+.45);o.connect(g);g.connect(actx.destination);o.start();o.stop(actx.currentTime+.45);this.time.delayedCall(480,tick);};tick();
  }

  hitEnemy(b,e,pts){
    b.destroy();e.hp--;
    if(e.hp<=0){this.pE.emitParticleAt(e.x,e.y);e.destroy();this.addScore(pts);sfx(360,.1);}
    else{sfx(200,.05);e.setTint(0xff8888);this.time.delayedCall(120,()=>{if(e.active)e.clearTint();});}
  }

  addScore(n){this.score+=n;this.scoreTxt.setText('SCORE: '+this.score);
    if(this.score>=500&&!this.bossSpawned)this.spawnBoss();
    if(this.score>=200&&!this.spawnedExtra){this.spawnedExtra=true;const e=this.e2s.create(W-80,H-160,'e2').setCollideWorldBounds(true);e.hp=4;this.physics.add.collider(e,this.plats);this.physics.add.overlap(this.pl,e,()=>this.hurt());this.physics.add.overlap(this.bullets,e,(b,en)=>this.hitEnemy(b,en,150));}
  }

  spawnBoss(){
    this.bossSpawned=true;sfx(60,1.2,'sawtooth');sfx(80,.8,'square');
    this.boss=this.physics.add.sprite(W/2,80,'boss').setCollideWorldBounds(true).setBounceX(1).setDepth(6);
    this.boss.setVelocityX(-120);this.bossHp=20;
    this.physics.add.collider(this.boss,this.plats);
    this.physics.add.overlap(this.pl,this.boss,()=>this.hurt());
    this.physics.add.overlap(this.bullets,this.boss,(b)=>{b.destroy();this.bossHp--;this.bossTxt.setText('⚠ BOSS HP: '+this.bossHp+' ⚠');sfx(140,.08,'sawtooth');if(this.bossHp<=0)this.win();});
    this.bossTxt.setText('⚠ BOSS HP: 20 ⚠');
    // Boss fires in 3 phases
    this.bossTimer=this.time.addEvent({delay:1200,loop:true,callback:()=>{
      if(!this.boss||!this.boss.active)return;
      const phase=this.bossHp<7?3:this.bossHp<14?2:1;
      this.phseTxt.setText('PHASE '+phase);
      const count=phase;const spread=phase===3?40:phase===2?25:0;
      for(let i=0;i<count;i++){
        const b=this.eBullets.create(this.boss.x+(i-count/2)*spread,this.boss.y+20,'ebul');
        const ang=Phaser.Math.Angle.Between(this.boss.x,this.boss.y,this.pl.x,this.pl.y)+(i-count/2)*.25;
        b.body.setVelocity(Math.cos(ang)*220,Math.sin(ang)*220);
        this.time.delayedCall(2500,()=>{if(b.active)b.destroy();});
      }
      if(phase===3){this.boss.setVelocityX(-160*(this.boss.body.velocity.x<0?-1:1));}
    }});
  }

  hurt(){
    if(this.invincible||this.gOver)return;
    this.invincible=true;this.lives--;sfx(70,.2,'sawtooth');
    this.livTxt.setText('LIVES: '+'♥'.repeat(Math.max(0,this.lives)));
    this.cameras.main.shake(200,.018);this.pl.setTint(0xff4444);
    this.time.delayedCall(1400,()=>{this.pl.clearTint();this.invincible=false;});
    if(this.lives<=0)this.gameOver();
  }

  shoot(){
    if(this.time.now-this.lastShot<220)return;
    this.lastShot=this.time.now;sfx(480,.06,'sine');
    const dir=this.pl.flipX?-1:1;
    const b=this.physics.add.image(this.pl.x+dir*14,this.pl.y-4,'bul');
    b.body.setVelocityX(500*dir);b.setFlipX(dir<0);
    this.time.delayedCall(900,()=>{if(b.active)b.destroy();});
  }

  win(){
    this.gOver=true;sfx(880,.6,'sine');sfx(1100,.4,'sine');this.physics.pause();
    if(this.bossTimer)this.bossTimer.remove();
    this.add.rectangle(W/2,H/2,W,H,0x0,.82).setDepth(20);
    this.add.text(W/2,H/2-70,'🏆 VICTORY!',{font:'bold 52px monospace',fill:'#ffaa00'}).setOrigin(.5).setDepth(21);
    this.add.text(W/2,H/2-10,'Final Score: '+this.score,{font:'26px monospace',fill:'#fff'}).setOrigin(.5).setDepth(21);
    this.add.text(W/2,H/2+40,'Press R to play again',{font:'14px monospace',fill:'#aaa'}).setOrigin(.5).setDepth(21);
    // Confetti
    this.add.particles(0,0,'prt',{x:{min:0,max:W},y:-10,speedY:{min:80,max:200},speedX:{min:-60,max:60},scale:{start:1,end:0},lifespan:1800,quantity:3,frequency:80,on:true}).setDepth(22);
  }

  gameOver(){
    this.gOver=true;sfx(50,.8,'sawtooth');this.physics.pause();
    this.add.rectangle(W/2,H/2,W,H,0x0,.88).setDepth(20);
    this.add.text(W/2,H/2-60,'GAME OVER',{font:'bold 52px monospace',fill:'#ff2222'}).setOrigin(.5).setDepth(21);
    this.add.text(W/2,H/2,'Score: '+this.score,{font:'26px monospace',fill:'#fff'}).setOrigin(.5).setDepth(21);
    this.add.text(W/2,H/2+50,'Press R to restart',{font:'14px monospace',fill:'#aaa'}).setOrigin(.5).setDepth(21);
  }

  update(){
    if(this.gOver){if(this.rKey.isDown)this.scene.restart();return;}
    const{left,right,up}=this.ckeys;
    const goLeft=left.isDown||this.aKey.isDown,goRight=right.isDown||this.dKey.isDown,goUp=up.isDown||this.wKey.isDown;
    if(goLeft){this.pl.setVelocityX(-220);this.pl.setFlipX(true);}
    else if(goRight){this.pl.setVelocityX(220);this.pl.setFlipX(false);}
    else this.pl.setVelocityX(0);
    if(goUp&&this.pl.body.blocked.down){this.pl.setVelocityY(-430);sfx(580,.08,'sine');}
    if(Phaser.Input.Keyboard.JustDown(this.zKey))this.shoot();
    // E1 patrol
    this.e1s.getChildren().forEach(e=>{if(e.active&&(e.body.blocked.right||e.body.blocked.left))e.setVelocityX(-e.body.velocity.x);});
    // E2 chase
    this.e2s.getChildren().forEach(e=>{if(e.active)e.setVelocityX(e.x<this.pl.x?100:-100);});
    // E3 float
    this.e3s.getChildren().forEach(e=>{if(e.active){e.angle+=.8;e.y=140+Math.sin(this.time.now*.002+e.x*.01)*30;}});
    // Boss AI
    if(this.boss&&this.boss.active){
      if(this.boss.body.blocked.right||this.boss.body.blocked.left)this.boss.setVelocityX(-this.boss.body.velocity.x);
      if(this.bossHp<10){const dir=this.boss.x<this.pl.x?1:-1;this.boss.setVelocityX(dir*(140+((10-this.bossHp)*8)));}
    }
    if(this.rKey.isDown&&this.gOver)this.scene.restart();
  }
}

new Phaser.Game({type:Phaser.AUTO,width:W,height:H,physics:{default:'arcade',arcade:{gravity:{y:520},debug:false}},scene:[Boot,Game],scale:{mode:Phaser.Scale.FIT,autoCenter:Phaser.Scale.CENTER_BOTH}});
</script>
<div style="position:fixed;bottom:6px;left:50%;transform:translateX(-50%);font:9px monospace;color:rgba(255,255,255,.28)">← → / A D Move · ↑ / W Jump · Z Shoot · R Restart · Reach 500pts → BOSS FIGHT</div>
</body>
</html>
\`\`\``;
}

// ── SSE streaming POST handler ────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  let body: { prompt?: string; sessionId?: string; language?: string };
  try { body = await req.json(); }
  catch { body = {}; }

  const { prompt, sessionId, language = "js-phaser" } = body;
  if (!prompt?.trim()) {
    return new Response(JSON.stringify({ error: "prompt required" }), { status: 400 });
  }

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      const send = (data: object) => {
        try { controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`)); } catch { /* closed */ }
      };

      const apiKey = (process.env.WXO_MANAGER_API_KEY ?? process.env.WXO_API_KEY ?? "").trim();

      if (apiKey) {
        try {
          send({ type: "progress", pass: 1, chars: 0, status: "Connecting to IBM watsonx Orchestrate…" });

          const token = await getIAMToken(apiKey);
          const fullPrompt = buildPrompt(prompt, language);

          // ── Pass 1 ──────────────────────────────────────────────────────────
          const { thread_id: threadId, run_id } = await startRun(token, fullPrompt, sessionId);
          send({ type: "progress", pass: 1, chars: 0, status: "78 IBM agents generating your game…" });

          const s1 = await pollRun(token, run_id, 90000);
          if (s1 !== "completed") throw new Error(`IBM run returned: ${s1}`);

          const reply1 = await getReply(token, threadId);
          if (!reply1) throw new Error("Empty reply from IBM");

          const code1 = extractCode(reply1);
          const chunks: string[] = [code1];
          let totalChars = code1.length;

          send({ type: "progress", pass: 1, chars: totalChars, status: `Pass 1 complete — ${totalChars.toLocaleString()} chars` });

          // ── Continuation loop ────────────────────────────────────────────────
          let pass = 1;
          const MAX_PASSES = 20;

          while (!isGameComplete(assembleChunks(chunks)) && pass < MAX_PASSES) {
            pass++;
            send({ type: "progress", pass, chars: totalChars, status: `Continuing generation… pass ${pass}` });

            const contPrompt = "Continue exactly where you left off. Output ONLY the continuation code, no explanations, no preamble.";
            const { run_id: cRunId } = await startRun(token, contPrompt, threadId);

            const cStatus = await pollRun(token, cRunId, 90000);
            if (cStatus !== "completed") {
              send({ type: "progress", pass, chars: totalChars, status: "IBM stalled — assembling what we have…" });
              break;
            }

            const cReply = await getReply(token, threadId);
            if (!cReply || cReply.trim().length < 20) {
              send({ type: "progress", pass, chars: totalChars, status: "No more content — assembling…" });
              break;
            }

            chunks.push(cReply);
            totalChars = chunks.reduce((s, c) => s + c.length, 0);
            send({ type: "progress", pass, chars: totalChars, status: `Pass ${pass} — ${totalChars.toLocaleString()} chars generated` });
          }

          send({ type: "progress", pass, chars: totalChars, status: "Assembling final game file…" });

          const assembled = assembleChunks(chunks);
          const reply = `\`\`\`html\n${assembled}\n\`\`\``;

          console.log(`[chat] ✓ ${pass} pass${pass > 1 ? "es" : ""}, ${assembled.length} chars, thread:${threadId}`);

          send({ type: "complete", reply, sessionId: threadId, passes: pass });
          try { controller.close(); } catch { /* client disconnected */ }
          return;

        } catch (err) {
          console.warn("[chat] IBM error:", err instanceof Error ? err.message : err);
          send({ type: "progress", pass: 1, chars: 0, status: "IBM unavailable — switching to Gemini AI…" });
        }
      }

      // ── Gemini fallback ───────────────────────────────────────────────────────
      const geminiKey = (process.env.GEMINI_API_KEY ?? "").trim();
      if (geminiKey) {
        try {
          send({ type: "progress", pass: 1, chars: 0, status: `Generating with Google ${GEMINI_FALLBACK_MODEL}…` });
          const geminiRes = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_FALLBACK_MODEL}:generateContent?key=${geminiKey}`,
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                contents: [{ parts: [{ text: buildPrompt(prompt, language) }] }],
                generationConfig: { temperature: 0.8, topK: 40, topP: 0.95, maxOutputTokens: 8192 },
              }),
              signal: AbortSignal.timeout(60000),
            }
          );
          if (geminiRes.ok) {
            const geminiData = await geminiRes.json() as {
              candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
            };
            const geminiText = geminiData.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
            if (geminiText.length > 200) {
              console.log(`[chat] ✓ Gemini fallback, ${geminiText.length} chars`);
              send({ type: "progress", pass: 1, chars: geminiText.length, status: `Gemini complete — ${geminiText.length.toLocaleString()} chars` });
              send({ type: "complete", reply: geminiText, sessionId: "gemini-session", passes: 1, gemini: true });
              try { controller.close(); } catch { /* client disconnected */ }
              return;
            }
          }
        } catch (gemErr) {
          console.warn("[chat] Gemini error:", gemErr instanceof Error ? gemErr.message : gemErr);
          send({ type: "progress", pass: 1, chars: 0, status: "Gemini unavailable — loading built-in demo game…" });
        }
      }

      // ── Demo fallback ────────────────────────────────────────────────────────
      await new Promise(r => setTimeout(r, 500));
      send({ type: "complete", reply: generateDemoGame(prompt, language), sessionId: "demo-session", demo: true });
      try { controller.close(); } catch { /* client disconnected */ }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      "Connection": "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
