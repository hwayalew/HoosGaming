import { NextRequest, NextResponse } from "next/server";

const IAM_URL  = "https://iam.cloud.ibm.com/identity/token";
const BASE_URL = "https://api.us-south.watson-orchestrate.cloud.ibm.com/instances/c8a9d776-460e-4c9a-b55f-0a2556febf8e";

const CDN = {
  phaser:  "https://cdnjs.cloudflare.com/ajax/libs/phaser/3.60.0/phaser.min.js",
  three:   "https://cdnjs.cloudflare.com/ajax/libs/three.js/r134/three.min.js",
  howler:  "https://cdnjs.cloudflare.com/ajax/libs/howler/2.2.3/howler.min.js",
  pyodide: "https://cdn.jsdelivr.net/pyodide/v0.23.4/full/pyodide.js",
};

// ── IAM token cache (tokens live 1 hour; refresh 5 min before expiry) ──────
let _iamCache: { token: string; expiresAt: number } | null = null;

async function getIAMToken(apiKey: string): Promise<string> {
  if (_iamCache && Date.now() < _iamCache.expiresAt - 300_000) {
    return _iamCache.token;
  }
  const res = await fetch(IAM_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ grant_type: "urn:ibm:params:oauth:grant-type:apikey", apikey: apiKey }),
  });
  if (!res.ok) throw new Error(`IAM error ${res.status}`);
  const data = await res.json() as { access_token?: string; expires_in?: number };
  if (!data.access_token) throw new Error("No access_token in IAM response");
  _iamCache = { token: data.access_token, expiresAt: Date.now() + ((data.expires_in ?? 3600) * 1000) };
  return data.access_token;
}

// ── Build system prompt based on language / engine choice ───────────────────
function buildPrompt(userPrompt: string, language: string): string {
  const is3D = language === "js-three" || /\b3d\b/i.test(userPrompt);

  if (language === "python") {
    return `You are HOOS AI, a game builder. Output a COMPLETE single-file HTML5 game that embeds Python via Pyodide.

Rules:
- Start with \`\`\`html, end with \`\`\`
- Begin with <!DOCTYPE html>, end with </html>
- Load Pyodide from: ${CDN.pyodide}
- Write the entire game in Python using pygame-ce style (draw to canvas via js.document APIs or use pyxel-style pixel drawing)
- Include: player movement, enemies, scoring, game-over screen
- All Python code goes inside a <script type="text/python"> tag or inline string passed to pyodide.runPythonAsync
- Never truncate — output the COMPLETE file

Game to build: ${userPrompt}`;
  }

  if (is3D) {
    return `You are HOOS AI, a 3D game builder. Output a COMPLETE single-file HTML5 3D game using Three.js.

Rules:
- Start with \`\`\`html, end with \`\`\`
- Begin with <!DOCTYPE html>, end with </html>
- Load Three.js from: ${CDN.three}
- Include Web Audio API for sounds (oscillators for SFX, not external files)
- Include: first-person or third-person player controller (WASD + mouse), 3D enemies with simple AI, health/score HUD (HTML overlay), collision detection, game-over screen with restart
- Use WebGLRenderer, PerspectiveCamera, ambient+point lighting, simple BoxGeometry/SphereGeometry shapes with MeshStandardMaterial
- Add particle effects using Points geometry
- Never truncate — output the COMPLETE file with all game logic

3D game to build: ${userPrompt}`;
  }

  // Default: Phaser 3 2D game
  return `You are HOOS AI, a Phaser 3 game code generator. Output a COMPLETE, immediately runnable single-file HTML5 game.

Rules:
- Start with \`\`\`html, end with \`\`\`
- Begin with <!DOCTYPE html>, end with </html>
- Load Phaser 3 from: ${CDN.phaser}
- Include Web Audio API sounds: use AudioContext for jump, hit, shoot, score SFX (no external audio files)
- Include: player movement+jump+attack, 2+ enemy types with AI, platforms, score+health HUD, boss fight, game-over screen, win screen, particle effects
- Use Phaser Arcade Physics, canvas auto-scaled to window
- Never truncate — output the COMPLETE file

2D game to build: ${userPrompt}`;
}

// ── Fix IBM-censored CDN URLs ────────────────────────────────────────────────
function fixCensoredUrls(text: string): string {
  return text
    .replace(/<script[^>]+src="[^"]*\*+[^"]*phaser[^"]*"[^>]*><\/script>/gi,
      `<script src="${CDN.phaser}"></script>`)
    .replace(/<script[^>]+src="[^"]*\*+[^"]*three[^"]*"[^>]*><\/script>/gi,
      `<script src="${CDN.three}"></script>`)
    .replace(/https:\/\/cdn[^"'\s]*\/npm\/[^"'\s]*\*+[^"'\s]*/g, (m) => {
      if (/phaser/i.test(m)) return CDN.phaser;
      if (/three/i.test(m)) return CDN.three;
      if (/pyodide/i.test(m)) return CDN.pyodide;
      return m;
    });
}

// ── IBM run helpers ──────────────────────────────────────────────────────────
async function startRun(token: string, content: string, threadId?: string) {
  const body: Record<string, unknown> = { message: { role: "user", content } };
  if (threadId) body.thread_id = threadId;
  const res = await fetch(`${BASE_URL}/v1/orchestrate/runs`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(20000),
  });
  if (!res.ok) throw new Error(`Start run error ${res.status}: ${await res.text()}`);
  return res.json() as Promise<{ thread_id: string; run_id: string }>;
}

async function pollRun(token: string, runId: string, maxMs = 90000): Promise<string> {
  const deadline = Date.now() + maxMs;
  let interval = 2000;
  while (Date.now() < deadline) {
    await new Promise(r => setTimeout(r, interval));
    interval = Math.min(interval * 1.15, 4000); // gentle back-off
    const res = await fetch(`${BASE_URL}/v1/orchestrate/runs/${runId}`, {
      headers: { Authorization: `Bearer ${token}` },
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) throw new Error(`Poll error ${res.status}`);
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
  if (!res.ok) throw new Error(`Messages error ${res.status}`);
  const msgs = await res.json() as Array<{ role: string; content: Array<{ text?: string }> }>;
  const last = [...msgs].reverse().find(m => m.role === "assistant");
  if (!last) return "";
  return fixCensoredUrls(last.content.map(c => c.text ?? "").join("\n").trim());
}

// ── Demo game generator (fallback) ──────────────────────────────────────────
function generateDemoGame(prompt: string, language: string): string {
  const is3D = language === "js-three" || /\b3d\b/i.test(prompt);
  const p = prompt.toLowerCase();
  const bgColor = p.includes("space") ? "#000011" : p.includes("dark") || p.includes("fantasy") ? "#0a0014" : "#001122";

  if (is3D) {
    return `\`\`\`html
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>${prompt.slice(0,40)} | HOOS Gaming</title>
<style>*{margin:0;padding:0}body{overflow:hidden;background:#000}#hud{position:fixed;top:10px;left:10px;color:#fff;font:bold 14px monospace;text-shadow:0 0 8px #00f;pointer-events:none}#info{position:fixed;bottom:10px;left:50%;transform:translateX(-50%);color:rgba(255,255,255,.5);font:10px monospace}</style>
</head>
<body>
<div id="hud">SCORE: <span id="score">0</span> &nbsp; HP: <span id="hp">100</span></div>
<div id="info">WASD Move · Mouse Look · SPACE Shoot · R Restart</div>
<script src="${CDN.three}"></script>
<script>
const W=innerWidth,H=innerHeight;
const scene=new THREE.Scene();scene.fog=new THREE.Fog(0x000011,10,80);
const cam=new THREE.PerspectiveCamera(75,W/H,.1,200);cam.position.set(0,2,0);
const renderer=new THREE.WebGLRenderer({antialias:true});
renderer.setSize(W,H);renderer.shadowMap.enabled=true;document.body.appendChild(renderer.domElement);

// Lights
scene.add(new THREE.AmbientLight(0x111133,.8));
const sun=new THREE.PointLight(0x4466ff,2,60);sun.position.set(0,20,0);scene.add(sun);

// Floor
const floor=new THREE.Mesh(new THREE.PlaneGeometry(100,100),new THREE.MeshStandardMaterial({color:0x111122}));
floor.rotation.x=-Math.PI/2;floor.receiveShadow=true;scene.add(floor);

// Walls
[[0,5,-50],[0,5,50],[-50,5,0],[50,5,0]].forEach(([x,y,z])=>{
  const wall=new THREE.Mesh(new THREE.BoxGeometry(x===0?100:2,10,z===0?2:100),new THREE.MeshStandardMaterial({color:0x221133}));
  wall.position.set(x,y,z);scene.add(wall);
});

// Enemies
const enemies=[];
const eMat=new THREE.MeshStandardMaterial({color:0xff2222,emissive:0x440000});
for(let i=0;i<8;i++){
  const e=new THREE.Mesh(new THREE.BoxGeometry(1.5,2,1.5),eMat.clone());
  e.position.set((Math.random()-.5)*60,(1),(Math.random()-.5)*60);
  e.hp=3;scene.add(e);enemies.push(e);
}

// Bullets
const bullets=[];
const bMat=new THREE.MeshStandardMaterial({color:0x00ffff,emissive:0x006666});

let score=0,hp=100,yVel=0,onGround=true,gameOver=false;
const keys={};
document.addEventListener('keydown',e=>{keys[e.code]=true;if(e.code==='Space'&&!gameOver)shoot();});
document.addEventListener('keyup',e=>{keys[e.code]=false;});

// Pointer lock
renderer.domElement.addEventListener('click',()=>renderer.domElement.requestPointerLock());
let yaw=0,pitch=0;
document.addEventListener('mousemove',e=>{
  if(document.pointerLockElement===renderer.domElement){
    yaw-=e.movementX*.002;pitch=Math.max(-1.2,Math.min(1.2,pitch-e.movementY*.002));
  }
});

// Audio
const actx=new AudioContext();
function beep(freq,dur,type='square'){
  const o=actx.createOscillator(),g=actx.createGain();
  o.type=type;o.frequency.value=freq;
  g.gain.setValueAtTime(.3,actx.currentTime);
  g.gain.exponentialRampToValueAtTime(.001,actx.currentTime+dur);
  o.connect(g);g.connect(actx.destination);
  o.start();o.stop(actx.currentTime+dur);
}

function shoot(){
  const b=new THREE.Mesh(new THREE.SphereGeometry(.15,8,8),bMat);
  b.position.copy(cam.position);
  const dir=new THREE.Vector3(0,0,-1).applyEuler(new THREE.Euler(pitch,yaw,0,'YXZ'));
  b.velocity=dir.multiplyScalar(30);
  b.life=60;scene.add(b);bullets.push(b);beep(440,.1);
}

const clock=new THREE.Clock();
function loop(){
  requestAnimationFrame(loop);
  if(gameOver){renderer.render(scene,cam);return;}
  const dt=Math.min(clock.getDelta(),.05);
  // Player movement
  const fwd=new THREE.Vector3(-Math.sin(yaw),0,-Math.cos(yaw));
  const right=new THREE.Vector3(Math.cos(yaw),0,-Math.sin(yaw));
  if(keys['KeyW'])cam.position.addScaledVector(fwd,5*dt);
  if(keys['KeyS'])cam.position.addScaledVector(fwd,-5*dt);
  if(keys['KeyA'])cam.position.addScaledVector(right,-5*dt);
  if(keys['KeyD'])cam.position.addScaledVector(right,5*dt);
  if(keys['Space']&&onGround){yVel=8;onGround=false;}
  yVel-=20*dt;cam.position.y+=yVel*dt;
  if(cam.position.y<2){cam.position.y=2;yVel=0;onGround=true;}
  cam.rotation.order='YXZ';cam.rotation.y=yaw;cam.rotation.x=pitch;

  // Bullets
  for(let i=bullets.length-1;i>=0;i--){
    const b=bullets[i];
    b.position.addScaledVector(b.velocity,dt);
    b.life--;
    if(b.life<=0){scene.remove(b);bullets.splice(i,1);continue;}
    for(let j=enemies.length-1;j>=0;j--){
      if(b.position.distanceTo(enemies[j].position)<1.5){
        enemies[j].hp--;beep(220,.08,'sawtooth');
        if(enemies[j].hp<=0){scene.remove(enemies[j]);enemies.splice(j,1);score+=100;document.getElementById('score').textContent=score;}
        scene.remove(b);bullets.splice(i,1);break;
      }
    }
  }

  // Enemy AI
  enemies.forEach(e=>{
    const d=cam.position.clone().sub(e.position);
    if(d.length()<30){e.position.addScaledVector(d.normalize(),2*dt);}
    e.rotation.y+=dt;
    if(e.position.distanceTo(cam.position)<2){
      hp-=10*dt;document.getElementById('hp').textContent=Math.max(0,Math.round(hp));
      if(hp<=0){gameOver=true;beep(80,.5,'sawtooth');
        const d=document.createElement('div');
        d.style.cssText='position:fixed;inset:0;background:rgba(0,0,0,.8);color:#ff2222;font:bold 48px monospace;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:16px';
        d.innerHTML='<div>GAME OVER</div><div style="font-size:24px;color:#fff">Score: '+score+'</div><div style="font-size:18px;color:#aaa">Press R to restart</div>';
        document.body.appendChild(d);
      }
    }
  });
  if(keys['KeyR']&&gameOver)location.reload();
  renderer.render(scene,cam);
}
loop();
window.addEventListener('resize',()=>{cam.aspect=innerWidth/innerHeight;cam.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight);});
</script>
</body>
</html>
\`\`\`

A fully playable 3D first-person shooter with 8 enemies, pointer-lock mouse look, Web Audio SFX, and a game-over screen built with Three.js.`;
  }

  return `\`\`\`html
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>${prompt.slice(0,40)} | HOOS Gaming</title>
<style>*{margin:0;padding:0;box-sizing:border-box}body{background:${bgColor};display:flex;align-items:center;justify-content:center;min-height:100vh;overflow:hidden}</style>
</head>
<body>
<script src="${CDN.phaser}"></script>
<script>
const W=800,H=500;
// Web Audio SFX
const actx=new AudioContext();
function sfx(freq,dur,type='square'){
  const o=actx.createOscillator(),g=actx.createGain();
  o.type=type;o.frequency.value=freq;
  g.gain.setValueAtTime(.25,actx.currentTime);
  g.gain.exponentialRampToValueAtTime(.001,actx.currentTime+dur);
  o.connect(g);g.connect(actx.destination);
  o.start();o.stop(actx.currentTime+dur);
}

class Boot extends Phaser.Scene{
  constructor(){super('Boot')}
  create(){
    // Generate textures procedurally
    const draw=(key,w,h,fn)=>{const g=this.make.graphics({x:0,y:0,add:false});fn(g);g.generateTexture(key,w,h);g.destroy()};
    draw('player',24,32,g=>{g.fillStyle(0xe57200);g.fillRect(0,0,24,32);g.fillStyle(0xf5a623);g.fillRect(4,4,16,12)});
    draw('enemy1',22,22,g=>{g.fillStyle(0xff2222);g.fillRect(0,0,22,22);g.fillStyle(0xff6666);g.fillCircle(11,11,7)});
    draw('enemy2',20,28,g=>{g.fillStyle(0x8800ff);g.fillTriangle(10,0,0,28,20,28);g.fillStyle(0xaa44ff);g.fillCircle(10,14,5)});
    draw('boss',64,52,g=>{g.fillStyle(0xcc0000);g.fillRect(0,0,64,52);g.fillStyle(0xff4400);g.fillRect(8,4,18,22);g.fillRect(38,4,18,22);g.fillStyle(0xffaa00);g.fillRect(14,30,36,14)});
    draw('bullet',10,4,g=>{g.fillStyle(0xffee00);g.fillRect(0,0,10,4)});
    draw('particle',6,6,g=>{g.fillStyle(0xe57200,1);g.fillCircle(3,3,3)});
    this.scene.start('Game');
  }
}

class Game extends Phaser.Scene{
  constructor(){super('Game')}
  create(){
    this.score=0;this.lives=3;this.gOver=false;this.bossSpawned=false;
    // Sky gradient
    const bg=this.add.graphics();
    bg.fillGradientStyle(0x0a0014,0x0a0014,0x1a0033,0x0d001f,1);bg.fillRect(0,0,W,H);
    // Stars
    for(let i=0;i<100;i++)this.add.circle(Phaser.Math.Between(0,W),Phaser.Math.Between(0,H/2),Math.random()*1.5+.5,0xffffff,Math.random()*.6+.2);

    // Platforms
    this.plats=this.physics.add.staticGroup();
    [[W/2,H-20,W,40,0x2d1a4a],[150,390,200,16,0x3d1f5a],[400,320,180,16,0x2d1a4a],[650,260,160,16,0x3d1f5a],[250,230,140,16,0x2d1a4a],[560,190,160,16,0x3d1f5a]].forEach(([x,y,w,h,c])=>{
      const p=this.add.rectangle(x,y,w,h,c);this.physics.add.existing(p,true);this.plats.add(p);
    });

    // Player
    this.player=this.physics.add.sprite(80,H-80,'player').setBounce(.05).setCollideWorldBounds(true);
    this.physics.add.collider(this.player,this.plats);
    this.invincible=false;

    // Bullets
    this.bullets=this.physics.add.group();

    // Enemy group 1: Patrol
    this.e1s=this.physics.add.group();
    [180,420,660].forEach(x=>{
      const e=this.e1s.create(x,H-60,'enemy1').setCollideWorldBounds(true).setBounceX(1);
      e.setVelocityX(Phaser.Math.Between(-70,-40));e.hp=2;
    });
    this.physics.add.collider(this.e1s,this.plats);

    // Enemy group 2: Chaser
    this.e2s=this.physics.add.group();
    [350,620].forEach(x=>{
      const e=this.e2s.create(x,H-150,'enemy2').setCollideWorldBounds(true);e.hp=3;
    });
    this.physics.add.collider(this.e2s,this.plats);

    // Particles
    this.parts=this.add.particles(0,0,'particle',{speed:{min:40,max:120},angle:{min:0,max:360},scale:{start:.5,end:0},lifespan:300,quantity:6,on:false});

    // HUD
    const hudStyle={font:'bold 13px monospace',fill:'#fff'};
    this.scoreTxt=this.add.text(12,10,'SCORE: 0',hudStyle).setDepth(10);
    this.livTxt=this.add.text(12,28,'LIVES: ♥♥♥',{font:'bold 13px monospace',fill:'#ff6666'}).setDepth(10);
    this.bossTxt=this.add.text(W-10,10,'',{font:'bold 11px monospace',fill:'#ff4400'}).setOrigin(1,0).setDepth(10);
    this.add.text(W/2,10,prompt.slice(0,35).toUpperCase(),{font:'9px monospace',fill:'rgba(255,255,255,.4)'}).setOrigin(.5,0).setDepth(10);

    // Overlaps: bullets vs enemies
    this.physics.add.overlap(this.bullets,this.e1s,(b,e)=>{b.destroy();e.hp--;if(e.hp<=0){this.parts.emitParticleAt(e.x,e.y);e.destroy();this.addScore(100);}else sfx(300,.08)});
    this.physics.add.overlap(this.bullets,this.e2s,(b,e)=>{b.destroy();e.hp--;if(e.hp<=0){this.parts.emitParticleAt(e.x,e.y);e.destroy();this.addScore(150);}else sfx(200,.08)});

    // Enemies hit player
    this.physics.add.overlap(this.player,this.e1s,()=>this.hurt());
    this.physics.add.overlap(this.player,this.e2s,()=>this.hurt());

    // Controls
    this.keys=this.input.keyboard.createCursorKeys();
    this.zKey=this.input.keyboard.addKey('Z');
    this.rKey=this.input.keyboard.addKey('R');
    this.lastShot=0;

    // Spawn boss at 500 score
    this.bossHp=0;this.boss=null;
    // Adaptive music
    this.startMusic();
  }

  startMusic(){
    const ctx=actx,notes=[110,130,155,110];let i=0;
    const tick=()=>{
      if(this.gOver)return;
      const o=ctx.createOscillator(),g=ctx.createGain();
      o.type='sawtooth';o.frequency.value=notes[i%notes.length];
      g.gain.setValueAtTime(.05,ctx.currentTime);
      g.gain.exponentialRampToValueAtTime(.001,ctx.currentTime+.4);
      o.connect(g);g.connect(ctx.destination);
      o.start();o.stop(ctx.currentTime+.4);
      i++;this.time.delayedCall(500,tick);
    };
    tick();
  }

  addScore(n){this.score+=n;this.scoreTxt.setText('SCORE: '+this.score);if(this.score>=500&&!this.bossSpawned)this.spawnBoss();}

  spawnBoss(){
    this.bossSpawned=true;sfx(80,.8,'sawtooth');
    this.boss=this.physics.add.sprite(W-80,H-90,'boss').setCollideWorldBounds(true).setBounceX(1);
    this.boss.setVelocityX(-100);this.bossHp=15;
    this.physics.add.collider(this.boss,this.plats);
    this.physics.add.overlap(this.bullets,this.boss,(b)=>{b.destroy();this.bossHp--;this.bossTxt.setText('BOSS HP: '+this.bossHp);sfx(180,.06);if(this.bossHp<=0)this.win();});
    this.physics.add.overlap(this.player,this.boss,()=>this.hurt());
    this.bossTxt.setText('BOSS HP: '+this.bossHp);
    // Boss fires projectiles
    this.bossFireTimer=this.time.addEvent({delay:1800,loop:true,callback:()=>{
      if(!this.boss||!this.boss.active)return;
      const b=this.add.rectangle(this.boss.x,this.boss.y,12,6,0xff4400);
      this.physics.add.existing(b);
      const ang=Phaser.Math.Angle.Between(this.boss.x,this.boss.y,this.player.x,this.player.y);
      b.body.setVelocity(Math.cos(ang)*200,Math.sin(ang)*200);
      this.physics.add.overlap(b,this.player,()=>{b.destroy();this.hurt();});
      this.time.delayedCall(2000,()=>{if(b.active)b.destroy();});
    }});
  }

  hurt(){
    if(this.invincible||this.gOver)return;
    this.invincible=true;this.lives--;sfx(80,.15,'sawtooth');
    this.livTxt.setText('LIVES: '+'♥'.repeat(Math.max(0,this.lives)));
    this.cameras.main.shake(150,.012);
    this.player.setTint(0xff4444);
    this.time.delayedCall(1200,()=>{this.player.clearTint();this.invincible=false;});
    if(this.lives<=0)this.gameOver();
  }

  shoot(){
    if(this.time.now-this.lastShot<260)return;
    this.lastShot=this.time.now;sfx(500,.07);
    const b=this.physics.add.image(this.player.x+14,this.player.y,'bullet');
    b.body.setVelocityX(450);b.setFlipX(this.player.flipX);
    this.bullets.add(b);
    this.time.delayedCall(1100,()=>{if(b.active)b.destroy();});
  }

  win(){
    this.gOver=true;sfx(880,.5,'sine');this.physics.pause();
    this.add.rectangle(W/2,H/2,W,H,0x000000,.75).setDepth(20);
    this.add.text(W/2,H/2-60,'🏆 VICTORY!',{font:'bold 44px monospace',fill:'#ffaa00'}).setOrigin(.5).setDepth(21);
    this.add.text(W/2,H/2,'Score: '+this.score,{font:'24px monospace',fill:'#fff'}).setOrigin(.5).setDepth(21);
    this.add.text(W/2,H/2+50,'Press R to restart',{font:'14px monospace',fill:'#aaa'}).setOrigin(.5).setDepth(21);
  }

  gameOver(){
    this.gOver=true;sfx(55,.6,'sawtooth');this.physics.pause();
    this.add.rectangle(W/2,H/2,W,H,0x000000,.8).setDepth(20);
    this.add.text(W/2,H/2-60,'GAME OVER',{font:'bold 44px monospace',fill:'#ff2222'}).setOrigin(.5).setDepth(21);
    this.add.text(W/2,H/2,'Score: '+this.score,{font:'24px monospace',fill:'#fff'}).setOrigin(.5).setDepth(21);
    this.add.text(W/2,H/2+50,'Press R to restart',{font:'14px monospace',fill:'#aaa'}).setOrigin(.5).setDepth(21);
  }

  update(){
    if(this.gOver){if(this.rKey.isDown)this.scene.restart();return;}
    const{left,right,up}=this.keys;
    if(left.isDown){this.player.setVelocityX(-210);this.player.setFlipX(true);}
    else if(right.isDown){this.player.setVelocityX(210);this.player.setFlipX(false);}
    else this.player.setVelocityX(0);
    if(up.isDown&&this.player.body.blocked.down){this.player.setVelocityY(-400);sfx(600,.07,'sine');}
    if(Phaser.Input.Keyboard.JustDown(this.zKey))this.shoot();
    // Chase AI
    this.e2s.getChildren().forEach(e=>{if(e.active)e.setVelocityX(e.x<this.player.x?95:-95);});
    // Boss AI
    if(this.boss&&this.boss.active){
      if(this.boss.body.blocked.right||this.boss.body.blocked.left)this.boss.setVelocityX(-this.boss.body.velocity.x);
    }
  }
}

new Phaser.Game({
  type:Phaser.AUTO,width:W,height:H,
  physics:{default:'arcade',arcade:{gravity:{y:500},debug:false}},
  scene:[Boot,Game],
  scale:{mode:Phaser.Scale.FIT,autoCenter:Phaser.Scale.CENTER_BOTH}
});
</script>
<div style="position:fixed;bottom:6px;left:50%;transform:translateX(-50%);font:9px monospace;color:rgba(255,255,255,.35)">← → Move &nbsp;|&nbsp; ↑ Jump &nbsp;|&nbsp; Z Shoot &nbsp;|&nbsp; R Restart &nbsp;|&nbsp; Reach 500pts to fight the BOSS</div>
</body>
</html>
\`\`\`

A fully playable Phaser 3 dark-fantasy side-scroller with patrol enemies, chaser AI, a boss fight, Web Audio SFX, adaptive music, and complete game-over/win screens.`;
}

export async function POST(req: NextRequest) {
  try {
    const { prompt, sessionId, language = "js-phaser" } = (await req.json()) as {
      prompt: string; sessionId?: string; language?: string;
    };
    if (!prompt?.trim()) return NextResponse.json({ error: "prompt is required" }, { status: 400 });

    const apiKey = (process.env.WXO_MANAGER_API_KEY ?? "").trim();
    const fullPrompt = buildPrompt(prompt, language);

    if (apiKey) {
      try {
        const token = await getIAMToken(apiKey);
        const { thread_id, run_id } = await startRun(token, fullPrompt, sessionId);
        console.log(`[chat] IBM run started — thread:${thread_id} run:${run_id} lang:${language}`);
        const finalStatus = await pollRun(token, run_id);
        if (finalStatus === "completed") {
          const reply = await getReply(token, thread_id);
          if (reply) {
            console.log(`[chat] IBM reply (${reply.length} chars)`);
            return NextResponse.json({ reply, sessionId: thread_id });
          }
          console.warn("[chat] IBM returned empty reply — using demo");
        } else {
          console.warn(`[chat] IBM run status: ${finalStatus}`);
        }
      } catch (ibmErr) {
        console.warn("[chat] IBM error:", ibmErr instanceof Error ? ibmErr.message : ibmErr);
      }
    }

    await new Promise(r => setTimeout(r, 1500 + Math.random() * 1000));
    const reply = generateDemoGame(prompt, language);
    return NextResponse.json({ reply, sessionId: "demo-session", demo: true });

  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("[chat] error:", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
