import { NextRequest } from "next/server";

const IAM_URL  = "https://iam.cloud.ibm.com/identity/token";
const BASE_URL = "https://api.us-south.watson-orchestrate.cloud.ibm.com/instances/c8a9d776-460e-4c9a-b55f-0a2556febf8e";

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

// ── Build system prompt per engine ───────────────────────────────────────────
function buildPrompt(userPrompt: string, language: string): string {
  const prompts: Record<string, string> = {
    "js-phaser": `CRITICAL: Use ONLY Phaser 3. No other engines. You are HOOS AI, a Phaser 3 expert.
Output a COMPLETE single-file HTML5 2D game. Rules:
• Wrap ALL code in \`\`\`html ... \`\`\` • Start <!DOCTYPE html> end </html>
• Load Phaser 3 ONLY from: ${CDN.phaser}
• Web Audio API for ALL sounds (AudioContext oscillators, no external files)
• Include: player movement/jump/shoot, 2+ enemy types with AI, platforms, score+HP HUD, boss fight (triggered at 500 pts), game-over + win screens, particle effects
• Arcade Physics, canvas fills window, never truncate
GAME: ${userPrompt}`,

    "js-three": `CRITICAL: Use ONLY Three.js r134. No Phaser, no other engines. You are HOOS AI, a Three.js 3D expert.
Output a COMPLETE single-file HTML5 3D game. Rules:
• Wrap ALL code in \`\`\`html ... \`\`\` • Start <!DOCTYPE html> end </html>
• Load Three.js ONLY from: ${CDN.three}
• Web Audio API oscillator SFX (no external audio files)
• WebGLRenderer, PerspectiveCamera, WASD movement, pointer-lock mouse look
• BoxGeometry/SphereGeometry shapes, MeshStandardMaterial, ambient+point lighting
• HTML overlay HUD (score, HP), 3D enemies with chase AI, boss enemy, game-over screen, restart (R key)
• Points-based particle effects, never truncate
3D GAME: ${userPrompt}`,

    "python": `CRITICAL: Use ONLY Python via Pyodide. No JavaScript game engines. You are HOOS AI, a Pyodide expert.
Output a COMPLETE single-file HTML5 Python game. Rules:
• Wrap ALL code in \`\`\`html ... \`\`\` • Start <!DOCTYPE html> end </html>
• Load Pyodide from: ${CDN.pyodide}
• All game logic written in Python passed to pyodide.runPythonAsync()
• Draw to HTML5 canvas using JavaScript interop (js.document, js.window)
• Include: player, enemies, score, game-over screen, keyboard input
• Never truncate — output the COMPLETE file
PYTHON GAME: ${userPrompt}`,

    "js-p5": `CRITICAL: Use ONLY p5.js. No other engines. You are HOOS AI, a p5.js expert.
Output a COMPLETE single-file HTML5 game. Rules:
• Wrap ALL code in \`\`\`html ... \`\`\` • Start <!DOCTYPE html> end </html>
• Load p5.js ONLY from: ${CDN.p5}
• Use p5.js setup()/draw() pattern with full canvas
• Web Audio API or p5.sound for SFX
• Include: player movement, enemies, score, collision, game-over/win screens
• Never truncate
P5.JS GAME: ${userPrompt}`,

    "js-kaboom": `CRITICAL: Use ONLY Kaboom.js. No other engines. You are HOOS AI, a Kaboom.js expert.
Output a COMPLETE single-file HTML5 game. Rules:
• Wrap ALL code in \`\`\`html ... \`\`\` • Start <!DOCTYPE html> end </html>
• Load Kaboom ONLY from: ${CDN.kaboom}
• kaboom({ width:800, height:500 }) initialization
• Use add(), onUpdate(), onKeyDown(), onCollide() Kaboom APIs
• Include: player sprite, enemies, platforms, score, game-over
• Never truncate
KABOOM GAME: ${userPrompt}`,

    "js-babylon": `CRITICAL: Use ONLY Babylon.js. No other engines. You are HOOS AI, a Babylon.js 3D expert.
Output a COMPLETE single-file HTML5 3D game. Rules:
• Wrap ALL code in \`\`\`html ... \`\`\` • Start <!DOCTYPE html> end </html>
• Load Babylon.js ONLY from: ${CDN.babylon}
• BABYLON.Engine, BABYLON.Scene, BABYLON.MeshBuilder, BABYLON.HemisphericLight
• WASD movement, 3D physics (BABYLON.PhysicsImpostor), enemies, HUD overlay
• Web Audio API SFX, game-over screen, never truncate
BABYLON 3D GAME: ${userPrompt}`,

    "js-pixi": `CRITICAL: Use ONLY PixiJS v7. No other engines. You are HOOS AI, a PixiJS expert.
Output a COMPLETE single-file HTML5 2D game. Rules:
• Wrap ALL code in \`\`\`html ... \`\`\` • Start <!DOCTYPE html> end </html>
• Load PixiJS ONLY from: ${CDN.pixi}
• PIXI.Application, PIXI.Graphics for all shapes (no external images)
• Web Audio API SFX, game loop via app.ticker.add()
• Include: player, enemies, score text, game-over, never truncate
PIXI GAME: ${userPrompt}`,
  };

  return prompts[language] ?? prompts["js-phaser"]!.replace("GAME:", "GAME:").replace(userPrompt, userPrompt);
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
    /new\s+p5\s*\(/.test(t);
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

// ── Extract game code from raw IBM reply text ─────────────────────────────────
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

// ── Assemble multiple continuation chunks into one valid HTML file ────────────
function assembleChunks(chunks: string[]): string {
  if (chunks.length === 0) return "";
  if (chunks.length === 1) return fixCensoredUrls(chunks[0].trim());

  // Base: remove premature closing tags (continuation will complete them)
  let base = chunks[0].trim()
    .replace(/\s*<\/html>\s*$/i, "")
    .replace(/\s*<\/body>\s*$/i, "");

  const parts: string[] = [base];

  for (let i = 1; i < chunks.length; i++) {
    let chunk = chunks[i].trim();

    // Strip code fences
    chunk = chunk
      .replace(/^```(?:html|javascript|js)?\s*/i, "")
      .replace(/\s*```\s*$/i, "")
      .trim();

    // Strip repeated HTML headers IBM sometimes re-emits
    chunk = chunk
      .replace(/^<!DOCTYPE[^>]*>\s*/i, "")
      .replace(/^<html[^>]*>\s*/i, "")
      .replace(/^<head[\s\S]*?<\/head>\s*/i, "")
      .replace(/^<body[^>]*>\s*/i, "");

    // Strip premature closing on non-final chunks
    if (i < chunks.length - 1) {
      chunk = chunk
        .replace(/\s*<\/body>\s*<\/html>\s*$/i, "")
        .replace(/\s*<\/html>\s*$/i, "");
    }

    if (chunk.trim()) parts.push(chunk.trim());
  }

  let assembled = parts.join("\n");

  // Ensure proper closure
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
  const res = await fetch(`${BASE_URL}/v1/orchestrate/runs`, {
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
    const res = await fetch(`${BASE_URL}/v1/orchestrate/runs/${runId}`, {
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
  const res = await fetch(`${BASE_URL}/v1/orchestrate/threads/${threadId}/messages`, {
    headers: { Authorization: `Bearer ${token}` },
    signal: AbortSignal.timeout(12000),
  });
  if (!res.ok) throw new Error(`getReply ${res.status}`);
  const msgs = await res.json() as Array<{ role: string; content: Array<{ text?: string }> }>;
  const last = [...msgs].reverse().find(m => m.role === "assistant");
  if (!last) return "";
  return last.content.map(c => c.text ?? "").join("\n").trim();
}

// ── Demo game fallback ────────────────────────────────────────────────────────
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
<style>*{margin:0;padding:0}body{overflow:hidden;background:#000}#hud{position:fixed;top:10px;left:10px;color:#fff;font:bold 14px monospace;text-shadow:0 0 8px #00f;pointer-events:none}#info{position:fixed;bottom:10px;left:50%;transform:translateX(-50%);color:rgba(255,255,255,.5);font:10px monospace}</style>
</head>
<body>
<div id="hud">SCORE: <span id="score">0</span> &nbsp; HP: <span id="hp">100</span></div>
<div id="info">WASD Move · Mouse Look (click) · SPACE Shoot · R Restart</div>
<script src="${CDN.three}"></script>
<script>
const scene=new THREE.Scene();scene.fog=new THREE.Fog(0x000011,10,80);
const cam=new THREE.PerspectiveCamera(75,innerWidth/innerHeight,.1,200);cam.position.set(0,2,0);
const renderer=new THREE.WebGLRenderer({antialias:true});renderer.setSize(innerWidth,innerHeight);renderer.shadowMap.enabled=true;document.body.appendChild(renderer.domElement);
scene.add(new THREE.AmbientLight(0x111133,.8));
const sun=new THREE.PointLight(0x4466ff,2,60);sun.position.set(0,20,0);scene.add(sun);
const floor=new THREE.Mesh(new THREE.PlaneGeometry(100,100),new THREE.MeshStandardMaterial({color:0x111122}));floor.rotation.x=-Math.PI/2;floor.receiveShadow=true;scene.add(floor);
[[0,5,-50],[0,5,50],[-50,5,0],[50,5,0]].forEach(([x,y,z])=>{const w=new THREE.Mesh(new THREE.BoxGeometry(x===0?100:2,10,z===0?2:100),new THREE.MeshStandardMaterial({color:0x221133}));w.position.set(x,y,z);scene.add(w);});
const enemies=[],eMat=new THREE.MeshStandardMaterial({color:0xff2222,emissive:0x440000});
for(let i=0;i<8;i++){const e=new THREE.Mesh(new THREE.BoxGeometry(1.5,2,1.5),eMat.clone());e.position.set((Math.random()-.5)*60,1,(Math.random()-.5)*60);e.hp=3;scene.add(e);enemies.push(e);}
const bullets=[],bMat=new THREE.MeshStandardMaterial({color:0x00ffff,emissive:0x006666});
let score=0,hp=100,yVel=0,onGround=true,gameOver=false,yaw=0,pitch=0;
const keys={};
document.addEventListener('keydown',e=>{keys[e.code]=true;if(e.code==='Space'&&!gameOver)shoot();if(e.code==='KeyR'&&gameOver)location.reload();});
document.addEventListener('keyup',e=>delete keys[e.code]);
renderer.domElement.addEventListener('click',()=>renderer.domElement.requestPointerLock());
document.addEventListener('mousemove',e=>{if(document.pointerLockElement===renderer.domElement){yaw-=e.movementX*.002;pitch=Math.max(-1.2,Math.min(1.2,pitch-e.movementY*.002));}});
const actx=new AudioContext();
function beep(f,d,t='square'){const o=actx.createOscillator(),g=actx.createGain();o.type=t;o.frequency.value=f;g.gain.setValueAtTime(.3,actx.currentTime);g.gain.exponentialRampToValueAtTime(.001,actx.currentTime+d);o.connect(g);g.connect(actx.destination);o.start();o.stop(actx.currentTime+d);}
function shoot(){const b=new THREE.Mesh(new THREE.SphereGeometry(.15,8,8),bMat);b.position.copy(cam.position);const dir=new THREE.Vector3(0,0,-1).applyEuler(new THREE.Euler(pitch,yaw,0,'YXZ'));b.vel=dir.multiplyScalar(30);b.life=60;scene.add(b);bullets.push(b);beep(440,.1);}
const clock=new THREE.Clock();
(function loop(){requestAnimationFrame(loop);if(gameOver){renderer.render(scene,cam);return;}
const dt=Math.min(clock.getDelta(),.05);
const fwd=new THREE.Vector3(-Math.sin(yaw),0,-Math.cos(yaw)),right=new THREE.Vector3(Math.cos(yaw),0,-Math.sin(yaw));
if(keys['KeyW'])cam.position.addScaledVector(fwd,5*dt);if(keys['KeyS'])cam.position.addScaledVector(fwd,-5*dt);
if(keys['KeyA'])cam.position.addScaledVector(right,-5*dt);if(keys['KeyD'])cam.position.addScaledVector(right,5*dt);
yVel-=20*dt;cam.position.y+=yVel*dt;if(cam.position.y<2){cam.position.y=2;yVel=0;onGround=true;}
cam.rotation.order='YXZ';cam.rotation.y=yaw;cam.rotation.x=pitch;
for(let i=bullets.length-1;i>=0;i--){const b=bullets[i];b.position.addScaledVector(b.vel,dt);if(--b.life<=0){scene.remove(b);bullets.splice(i,1);continue;}
for(let j=enemies.length-1;j>=0;j--){if(b.position.distanceTo(enemies[j].position)<1.5){if(--enemies[j].hp<=0){scene.remove(enemies[j]);enemies.splice(j,1);score+=100;document.getElementById('score').textContent=score;}beep(220,.08,'sawtooth');scene.remove(b);bullets.splice(i,1);break;}}}
enemies.forEach(e=>{const d=cam.position.clone().sub(e.position);if(d.length()<30)e.position.addScaledVector(d.normalize(),2*dt);e.rotation.y+=dt;if(e.position.distanceTo(cam.position)<2){hp-=10*dt;document.getElementById('hp').textContent=Math.max(0,Math.round(hp));if(hp<=0){gameOver=true;const el=document.createElement('div');el.style.cssText='position:fixed;inset:0;background:rgba(0,0,0,.85);color:#f33;font:bold 48px monospace;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:16px';el.innerHTML='<div>GAME OVER</div><div style="font-size:24px;color:#fff">Score: '+score+'</div><div style="font-size:16px;color:#aaa">Press R to restart</div>';document.body.appendChild(el);}}});
renderer.render(scene,cam);})();
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
<style>*{margin:0;padding:0;box-sizing:border-box}body{background:${bgColor};display:flex;align-items:center;justify-content:center;min-height:100vh;overflow:hidden}</style>
</head>
<body>
<script src="${CDN.phaser}"></script>
<script>
const W=800,H=500,actx=new AudioContext();
function sfx(f,d,t='square'){const o=actx.createOscillator(),g=actx.createGain();o.type=t;o.frequency.value=f;g.gain.setValueAtTime(.25,actx.currentTime);g.gain.exponentialRampToValueAtTime(.001,actx.currentTime+d);o.connect(g);g.connect(actx.destination);o.start();o.stop(actx.currentTime+d);}
class Boot extends Phaser.Scene{constructor(){super('Boot')}
  create(){const d=(k,w,h,fn)=>{const g=this.make.graphics({x:0,y:0,add:false});fn(g);g.generateTexture(k,w,h);g.destroy()};
  d('pl',24,32,g=>{g.fillStyle(0xe57200);g.fillRect(0,0,24,32);g.fillStyle(0xf5a623);g.fillRect(4,4,16,12)});
  d('e1',22,22,g=>{g.fillStyle(0xff2222);g.fillRect(0,0,22,22);g.fillStyle(0xff6666);g.fillCircle(11,11,7)});
  d('e2',20,28,g=>{g.fillStyle(0x8800ff);g.fillTriangle(10,0,0,28,20,28)});
  d('boss',64,52,g=>{g.fillStyle(0xcc0000);g.fillRect(0,0,64,52);g.fillStyle(0xffaa00);g.fillRect(14,30,36,14)});
  d('bul',10,4,g=>{g.fillStyle(0xffee00);g.fillRect(0,0,10,4)});
  d('prt',6,6,g=>{g.fillStyle(0xe57200,1);g.fillCircle(3,3,3)});
  this.scene.start('Game');}}
class Game extends Phaser.Scene{constructor(){super('Game')}
  create(){this.score=0;this.lives=3;this.gOver=false;this.bossSpawned=false;
  const bg=this.add.graphics();bg.fillGradientStyle(0x0a0014,0x0a0014,0x1a0033,0x0d001f,1);bg.fillRect(0,0,W,H);
  for(let i=0;i<80;i++)this.add.circle(Phaser.Math.Between(0,W),Phaser.Math.Between(0,H/2),Math.random()*1.5+.5,0xffffff,Math.random()*.5+.1);
  this.plats=this.physics.add.staticGroup();
  [[W/2,H-20,W,40,0x2d1a4a],[150,390,200,16,0x3d1f5a],[400,320,180,16,0x2d1a4a],[650,260,160,16,0x3d1f5a],[250,230,140,16,0x2d1a4a],[560,190,160,16,0x3d1f5a]].forEach(([x,y,w,h,c])=>{const p=this.add.rectangle(x,y,w,h,c);this.physics.add.existing(p,true);this.plats.add(p);});
  this.pl=this.physics.add.sprite(80,H-80,'pl').setBounce(.05).setCollideWorldBounds(true);
  this.physics.add.collider(this.pl,this.plats);this.invincible=false;
  this.bullets=this.physics.add.group();
  this.e1s=this.physics.add.group();[180,420,660].forEach(x=>{const e=this.e1s.create(x,H-60,'e1').setCollideWorldBounds(true).setBounceX(1);e.setVelocityX(Phaser.Math.Between(-70,-40));e.hp=2;});
  this.physics.add.collider(this.e1s,this.plats);
  this.e2s=this.physics.add.group();[350,620].forEach(x=>{const e=this.e2s.create(x,H-150,'e2').setCollideWorldBounds(true);e.hp=3;});
  this.physics.add.collider(this.e2s,this.plats);
  this.parts=this.add.particles(0,0,'prt',{speed:{min:40,max:120},angle:{min:0,max:360},scale:{start:.5,end:0},lifespan:300,quantity:6,on:false});
  this.scoreTxt=this.add.text(12,10,'SCORE: 0',{font:'bold 13px monospace',fill:'#fff'}).setDepth(10);
  this.livTxt=this.add.text(12,28,'LIVES: ♥♥♥',{font:'bold 13px monospace',fill:'#ff6666'}).setDepth(10);
  this.bossTxt=this.add.text(W-10,10,'',{font:'bold 11px monospace',fill:'#ff4400'}).setOrigin(1,0).setDepth(10);
  this.physics.add.overlap(this.bullets,this.e1s,(b,e)=>{b.destroy();e.hp--;if(e.hp<=0){this.parts.emitParticleAt(e.x,e.y);e.destroy();this.addScore(100);}else sfx(300,.08);});
  this.physics.add.overlap(this.bullets,this.e2s,(b,e)=>{b.destroy();e.hp--;if(e.hp<=0){this.parts.emitParticleAt(e.x,e.y);e.destroy();this.addScore(150);}else sfx(200,.08);});
  this.physics.add.overlap(this.pl,this.e1s,()=>this.hurt());this.physics.add.overlap(this.pl,this.e2s,()=>this.hurt());
  this.keys=this.input.keyboard.createCursorKeys();this.zKey=this.input.keyboard.addKey('Z');this.rKey=this.input.keyboard.addKey('R');this.lastShot=0;this.boss=null;
  const notes=[110,130,155,110];let ni=0;
  const tick=()=>{if(this.gOver)return;const o=actx.createOscillator(),g=actx.createGain();o.type='sawtooth';o.frequency.value=notes[ni++%notes.length];g.gain.setValueAtTime(.04,actx.currentTime);g.gain.exponentialRampToValueAtTime(.001,actx.currentTime+.35);o.connect(g);g.connect(actx.destination);o.start();o.stop(actx.currentTime+.35);this.time.delayedCall(500,tick);};tick();}
  addScore(n){this.score+=n;this.scoreTxt.setText('SCORE: '+this.score);if(this.score>=500&&!this.bossSpawned)this.spawnBoss();}
  spawnBoss(){this.bossSpawned=true;sfx(80,.8,'sawtooth');this.boss=this.physics.add.sprite(W-80,H-90,'boss').setCollideWorldBounds(true).setBounceX(1);this.boss.setVelocityX(-100);this.bossHp=15;this.physics.add.collider(this.boss,this.plats);this.physics.add.overlap(this.bullets,this.boss,(b)=>{b.destroy();this.bossHp--;this.bossTxt.setText('BOSS HP: '+this.bossHp);sfx(180,.06);if(this.bossHp<=0)this.win();});this.physics.add.overlap(this.pl,this.boss,()=>this.hurt());this.bossTxt.setText('BOSS HP: '+this.bossHp);this.time.addEvent({delay:1800,loop:true,callback:()=>{if(!this.boss||!this.boss.active)return;const b=this.add.rectangle(this.boss.x,this.boss.y,12,6,0xff4400);this.physics.add.existing(b);const ang=Phaser.Math.Angle.Between(this.boss.x,this.boss.y,this.pl.x,this.pl.y);b.body.setVelocity(Math.cos(ang)*200,Math.sin(ang)*200);this.physics.add.overlap(b,this.pl,()=>{b.destroy();this.hurt();});this.time.delayedCall(2e3,()=>{if(b.active)b.destroy();});}});}
  hurt(){if(this.invincible||this.gOver)return;this.invincible=true;this.lives--;sfx(80,.15,'sawtooth');this.livTxt.setText('LIVES: '+'♥'.repeat(Math.max(0,this.lives)));this.cameras.main.shake(150,.012);this.pl.setTint(0xff4444);this.time.delayedCall(1200,()=>{this.pl.clearTint();this.invincible=false;});if(this.lives<=0)this.gameOver();}
  shoot(){if(this.time.now-this.lastShot<260)return;this.lastShot=this.time.now;sfx(500,.07);const b=this.physics.add.image(this.pl.x+14,this.pl.y,'bul');b.body.setVelocityX(450);b.setFlipX(this.pl.flipX);this.bullets.add(b);this.time.delayedCall(1100,()=>{if(b.active)b.destroy();});}
  win(){this.gOver=true;sfx(880,.5,'sine');this.physics.pause();this.add.rectangle(W/2,H/2,W,H,0x0,.75).setDepth(20);this.add.text(W/2,H/2-60,'🏆 VICTORY!',{font:'bold 44px monospace',fill:'#ffaa00'}).setOrigin(.5).setDepth(21);this.add.text(W/2,H/2,'Score: '+this.score,{font:'24px monospace',fill:'#fff'}).setOrigin(.5).setDepth(21);this.add.text(W/2,H/2+50,'R to restart',{font:'14px monospace',fill:'#aaa'}).setOrigin(.5).setDepth(21);}
  gameOver(){this.gOver=true;sfx(55,.6,'sawtooth');this.physics.pause();this.add.rectangle(W/2,H/2,W,H,0x0,.8).setDepth(20);this.add.text(W/2,H/2-60,'GAME OVER',{font:'bold 44px monospace',fill:'#ff2222'}).setOrigin(.5).setDepth(21);this.add.text(W/2,H/2,'Score: '+this.score,{font:'24px monospace',fill:'#fff'}).setOrigin(.5).setDepth(21);this.add.text(W/2,H/2+50,'R to restart',{font:'14px monospace',fill:'#aaa'}).setOrigin(.5).setDepth(21);}
  update(){if(this.gOver){if(this.rKey.isDown)this.scene.restart();return;}
  const{left,right,up}=this.keys;
  if(left.isDown){this.pl.setVelocityX(-210);this.pl.setFlipX(true);}else if(right.isDown){this.pl.setVelocityX(210);this.pl.setFlipX(false);}else this.pl.setVelocityX(0);
  if(up.isDown&&this.pl.body.blocked.down){this.pl.setVelocityY(-400);sfx(600,.07,'sine');}
  if(Phaser.Input.Keyboard.JustDown(this.zKey))this.shoot();
  this.e2s.getChildren().forEach(e=>{if(e.active)e.setVelocityX(e.x<this.pl.x?95:-95);});
  if(this.boss&&this.boss.active&&(this.boss.body.blocked.right||this.boss.body.blocked.left))this.boss.setVelocityX(-this.boss.body.velocity.x);}}
new Phaser.Game({type:Phaser.AUTO,width:W,height:H,physics:{default:'arcade',arcade:{gravity:{y:500},debug:false}},scene:[Boot,Game],scale:{mode:Phaser.Scale.FIT,autoCenter:Phaser.Scale.CENTER_BOTH}});
</script>
<div style="position:fixed;bottom:6px;left:50%;transform:translateX(-50%);font:9px monospace;color:rgba(255,255,255,.3)">← → Move · ↑ Jump · Z Shoot · R Restart · Reach 500pts → BOSS</div>
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

      const apiKey = (process.env.WXO_MANAGER_API_KEY ?? "").trim();

      if (apiKey) {
        try {
          send({ type: "progress", pass: 1, chars: 0, status: "Connecting to IBM watsonx Orchestrate…" });

          const token = await getIAMToken(apiKey);
          const fullPrompt = buildPrompt(prompt, language);

          // ── Pass 1 ──────────────────────────────────────────────────────────
          const { thread_id: threadId, run_id } = await startRun(token, fullPrompt, sessionId);
          send({ type: "progress", pass: 1, chars: 0, status: "Generating…" });

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
            send({ type: "progress", pass, chars: totalChars, status: `Continuing… pass ${pass}` });

            const contPrompt = "Continue exactly where you left off. Output ONLY the continuation code, no explanations, no preamble.";
            const { run_id: cRunId } = await startRun(token, contPrompt, threadId);

            const cStatus = await pollRun(token, cRunId, 90000);
            if (cStatus !== "completed") { send({ type: "progress", pass, chars: totalChars, status: "IBM stalled — assembling what we have…" }); break; }

            const cReply = await getReply(token, threadId);
            if (!cReply || cReply.trim().length < 20) { send({ type: "progress", pass, chars: totalChars, status: "No more content — assembling…" }); break; }

            chunks.push(cReply);
            totalChars = chunks.reduce((s, c) => s + c.length, 0);
            send({ type: "progress", pass, chars: totalChars, status: `Pass ${pass} — ${totalChars.toLocaleString()} chars` });
          }

          send({ type: "progress", pass, chars: totalChars, status: "Assembling final game…" });

          const assembled = assembleChunks(chunks);
          const reply = `\`\`\`html\n${assembled}\n\`\`\``;

          console.log(`[chat] ✓ ${pass} pass${pass > 1 ? "es" : ""}, ${assembled.length} chars, thread:${threadId}`);

          send({ type: "complete", reply, sessionId: threadId, passes: pass });
          controller.close();
          return;

        } catch (err) {
          console.warn("[chat] IBM error:", err instanceof Error ? err.message : err);
          send({ type: "progress", pass: 1, chars: 0, status: "IBM unavailable — using built-in demo…" });
        }
      }

      // ── Demo fallback ────────────────────────────────────────────────────────
      await new Promise(r => setTimeout(r, 600));
      send({ type: "complete", reply: generateDemoGame(prompt, language), sessionId: "demo-session", demo: true });
      controller.close();
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
