import { NextRequest, NextResponse } from "next/server";

const IAM_URL  = "https://iam.cloud.ibm.com/identity/token";
const BASE_URL = "https://api.us-south.watson-orchestrate.cloud.ibm.com/instances/c8a9d776-460e-4c9a-b55f-0a2556febf8e";

const PHASER_CDN = "https://cdnjs.cloudflare.com/ajax/libs/phaser/3.60.0/phaser.min.js";

const PHASER_INSTRUCTION = `You are HOOS AI, a Phaser 3 game code generator. Output a COMPLETE, immediately runnable single-file HTML5 game using Phaser 3 from CDN: ${PHASER_CDN}

Rules:
- Start with \`\`\`html, end with \`\`\`
- Begin file with <!DOCTYPE html>, end with </html>
- Never truncate — output the FULL file with all game logic
- Include: player movement+jump, 2+ enemy types with AI, platforms, score/health HUD, boss fight, game-over screen, win screen
- Use Phaser Arcade Physics, canvas auto-scaled to window

Game to build: `;

async function getIAMToken(apiKey: string): Promise<string> {
  const res = await fetch(IAM_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ grant_type: "urn:ibm:params:oauth:grant-type:apikey", apikey: apiKey }),
  });
  if (!res.ok) throw new Error(`IAM error ${res.status}`);
  const data = await res.json() as { access_token?: string };
  if (!data.access_token) throw new Error("No access_token in IAM response");
  return data.access_token;
}

async function startRun(token: string, content: string, threadId?: string): Promise<{ thread_id: string; run_id: string }> {
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

async function pollRun(token: string, runId: string, maxMs = 85000): Promise<string> {
  const deadline = Date.now() + maxMs;
  while (Date.now() < deadline) {
    await new Promise(r => setTimeout(r, 2500));
    const res = await fetch(`${BASE_URL}/v1/orchestrate/runs/${runId}`, {
      headers: { Authorization: `Bearer ${token}` },
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) throw new Error(`Poll error ${res.status}`);
    const data = await res.json() as { status: string };
    if (data.status === "completed") return "completed";
    if (data.status === "failed" || data.status === "cancelled") return data.status;
  }
  return "timeout";
}

function fixCensoredUrls(text: string): string {
  // IBM censors npm package versions with asterisks — restore Phaser CDN URL
  return text
    .replace(/https:\/\/cdn\.jsdelivr\.net\/npm\/[*]+\/dist\/phaser\.min\.js/g, PHASER_CDN)
    .replace(/https:\/\/cdnjs\.cloudflare\.com\/ajax\/libs\/phaser\/[*]+\/phaser\.min\.js/g, PHASER_CDN)
    .replace(/<script src="[^"]*\*+[^"]*phaser[^"]*"><\/script>/gi,
      `<script src="${PHASER_CDN}"></script>`);
}

async function getReply(token: string, threadId: string): Promise<string> {
  const res = await fetch(`${BASE_URL}/v1/orchestrate/threads/${threadId}/messages`, {
    headers: { Authorization: `Bearer ${token}` },
    signal: AbortSignal.timeout(10000),
  });
  if (!res.ok) throw new Error(`Messages error ${res.status}`);
  const msgs = await res.json() as Array<{ role: string; content: Array<{ text?: string }> }>;
  const assistantMsgs = msgs.filter(m => m.role === "assistant");
  if (!assistantMsgs.length) return "The agent did not return a response.";
  const last = assistantMsgs[assistantMsgs.length - 1];
  const raw = last.content.map(c => c.text ?? "").join("\n").trim();
  return fixCensoredUrls(raw);
}

function generateDemoGame(prompt: string): string {
  const p = prompt.toLowerCase();
  const isSpace  = p.includes("space") || p.includes("shoot");
  const isFantasy = p.includes("fantasy") || p.includes("dark") || p.includes("dungeon");
  const bgColor  = isSpace ? "#000011" : isFantasy ? "#0a0014" : "#001122";
  const accentR  = isSpace ? 0   : isFantasy ? 150 : 0;
  const accentG  = isSpace ? 200 : isFantasy ? 0   : 180;
  const accentB  = isSpace ? 255 : isFantasy ? 255 : 255;

  return `\`\`\`html
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>${prompt.slice(0, 40)} | HOOS Gaming</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { background: ${bgColor}; display: flex; align-items: center; justify-content: center; min-height: 100vh; overflow: hidden; }
  canvas { display: block; }
</style>
</head>
<body>
<script src="https://cdn.jsdelivr.net/npm/phaser@3.60.0/dist/phaser.min.js"></script>
<script>
const W = 800, H = 500;

class GameScene extends Phaser.Scene {
  constructor() { super('Game'); }

  create() {
    this.score = 0;
    this.lives = 3;
    this.gameOver = false;

    // Background gradient
    const bg = this.add.graphics();
    bg.fillGradientStyle(0x${(accentR*0.1).toString(16).padStart(6,'0')}, 0x000011, 0x001133, 0x000011, 1);
    bg.fillRect(0, 0, W, H);

    // Stars/particles background
    for (let i = 0; i < 80; i++) {
      const s = this.add.circle(Phaser.Math.Between(0, W), Phaser.Math.Between(0, H), Phaser.Math.FloatBetween(0.5,2), 0xffffff, Phaser.Math.FloatBetween(0.2,0.8));
    }

    // Platforms
    this.platforms = this.physics.add.staticGroup();
    const ground = this.add.rectangle(W/2, H-20, W, 40, 0x${(accentR).toString(16).padStart(2,'0')}${(accentG*0.4|0).toString(16).padStart(2,'0')}${(accentB*0.6|0).toString(16).padStart(2,'0')});
    this.physics.add.existing(ground, true);
    this.platforms.add(ground);

    const platData = [[150,380,200],[400,320,180],[650,260,160],[200,220,140],[550,180,160]];
    platData.forEach(([x,y,w]) => {
      const p = this.add.rectangle(x, y, w, 18, 0x${accentR.toString(16).padStart(2,'0')}${(accentG*0.6|0).toString(16).padStart(2,'0')}${accentB.toString(16).padStart(2,'0')});
      this.physics.add.existing(p, true);
      this.platforms.add(p);
    });

    // Player
    const pg = this.add.graphics();
    pg.fillStyle(0xe57200); pg.fillRect(0,0,24,32);
    pg.fillStyle(0xf5a623); pg.fillRect(4,4,16,12);
    pg.generateTexture('player', 24, 32); pg.destroy();

    this.player = this.physics.add.sprite(80, H-80, 'player');
    this.player.setBounce(0.1).setCollideWorldBounds(true);
    this.physics.add.collider(this.player, this.platforms);

    // Bullets
    this.bullets = this.physics.add.group();

    // Enemy 1: Patrol type
    const eg1 = this.add.graphics();
    eg1.fillStyle(0xff2222); eg1.fillRect(0,0,22,22); eg1.fillStyle(0xff6666); eg1.fillRect(3,3,8,8);
    eg1.generateTexture('enemy1', 22, 22); eg1.destroy();

    this.enemies1 = this.physics.add.group();
    [200,500,700].forEach(x => {
      const e = this.enemies1.create(x, H-60, 'enemy1');
      e.setCollideWorldBounds(true).setBounceX(1);
      e.setVelocityX(Phaser.Math.Between(-80,-40));
      e.hp = 2;
    });
    this.physics.add.collider(this.enemies1, this.platforms);

    // Enemy 2: Chaser type
    const eg2 = this.add.graphics();
    eg2.fillStyle(0x8800ff); eg2.fillTriangle(12,0,0,28,24,28); eg2.fillStyle(0xaa44ff); eg2.fillRect(8,10,8,10);
    eg2.generateTexture('enemy2', 24, 28); eg2.destroy();

    this.enemies2 = this.physics.add.group();
    [350, 650].forEach(x => {
      const e = this.enemies2.create(x, H-160, 'enemy2');
      e.setCollideWorldBounds(true);
      e.hp = 3;
    });
    this.physics.add.collider(this.enemies2, this.platforms);

    // Boss
    const bg2 = this.add.graphics();
    bg2.fillStyle(0xcc0000); bg2.fillRect(0,0,60,50);
    bg2.fillStyle(0xff4400); bg2.fillRect(10,5,15,20); bg2.fillRect(35,5,15,20);
    bg2.fillStyle(0xffaa00); bg2.fillRect(15,30,30,12);
    bg2.generateTexture('boss', 60, 50); bg2.destroy();

    this.boss = this.physics.add.sprite(W-100, H-80, 'boss');
    this.boss.setCollideWorldBounds(true).setBounceX(1).setVelocityX(-60);
    this.boss.hp = 15;
    this.bossDir = -1;
    this.physics.add.collider(this.boss, this.platforms);

    // Collisions: bullets hit enemies
    this.physics.add.overlap(this.bullets, this.enemies1, (b, e) => { b.destroy(); e.hp--; if(e.hp<=0){this.score+=100; this.updateScore(); e.destroy();} });
    this.physics.add.overlap(this.bullets, this.enemies2, (b, e) => { b.destroy(); e.hp--; if(e.hp<=0){this.score+=150; this.updateScore(); e.destroy();} });
    this.physics.add.overlap(this.bullets, this.boss, (b, _e) => { b.destroy(); this.boss.hp--; this.bossHPText.setText('BOSS HP: '+this.boss.hp); if(this.boss.hp<=0) this.winGame(); });

    // Enemies touch player
    this.physics.add.overlap(this.player, this.enemies1, () => this.hitPlayer());
    this.physics.add.overlap(this.player, this.enemies2, () => this.hitPlayer());
    this.physics.add.overlap(this.player, this.boss, () => this.hitPlayer());

    // HUD
    this.scoreTxt = this.add.text(12, 10, 'SCORE: 0', { font:'bold 14px monospace', fill:'#ffffff' }).setDepth(10);
    this.livesTxt = this.add.text(12, 30, 'LIVES: ♥♥♥', { font:'bold 14px monospace', fill:'#ff6666' }).setDepth(10);
    this.bossHPText = this.add.text(W-160, 10, 'BOSS HP: 15', { font:'bold 13px monospace', fill:'#ff4400' }).setDepth(10);
    this.add.text(W/2, 10, prompt.slice(0,30).toUpperCase(), { font:'11px monospace', fill:'#aaaaaa' }).setOrigin(0.5,0).setDepth(10);

    // Controls
    this.cursors = this.input.keyboard.createCursorKeys();
    this.fireKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
    this.lastFire = 0;

    // Particles
    this.particles = this.add.particles(0, 0, 'player', {
      speed: { min:30, max:80 }, angle: { min:0, max:360 },
      scale: { start:0.3, end:0 }, lifespan:400, quantity:3, on:false
    });
  }

  hitPlayer() {
    if (this.playerInvincible || this.gameOver) return;
    this.playerInvincible = true;
    this.lives--;
    this.livesTxt.setText('LIVES: ' + '♥'.repeat(Math.max(0, this.lives)));
    this.cameras.main.shake(200, 0.01);
    this.player.setTint(0xff0000);
    this.time.delayedCall(1200, () => { this.player.clearTint(); this.playerInvincible = false; });
    if (this.lives <= 0) this.endGame();
  }

  updateScore() {
    this.scoreTxt.setText('SCORE: ' + this.score);
  }

  fireBullet() {
    if (this.time.now - this.lastFire < 300) return;
    this.lastFire = this.time.now;
    const b = this.add.rectangle(this.player.x + 14, this.player.y, 10, 4, 0xffaa00);
    this.physics.add.existing(b);
    const body = b.body;
    body.setVelocityX(400);
    this.bullets.add(b);
    this.time.delayedCall(1200, () => { if(b.active) b.destroy(); });
  }

  winGame() {
    this.gameOver = true;
    this.physics.pause();
    const overlay = this.add.rectangle(W/2, H/2, W, H, 0x000000, 0.7).setDepth(20);
    this.add.text(W/2, H/2-60, '🏆 VICTORY!', { font:'bold 42px monospace', fill:'#ffaa00' }).setOrigin(0.5).setDepth(21);
    this.add.text(W/2, H/2, 'Score: '+this.score, { font:'24px monospace', fill:'#ffffff' }).setOrigin(0.5).setDepth(21);
    this.add.text(W/2, H/2+50, 'Press R to restart', { font:'16px monospace', fill:'#aaaaaa' }).setOrigin(0.5).setDepth(21);
    this.input.keyboard.once('keydown-R', () => this.scene.restart());
  }

  endGame() {
    this.gameOver = true;
    this.physics.pause();
    this.add.rectangle(W/2, H/2, W, H, 0x000000, 0.75).setDepth(20);
    this.add.text(W/2, H/2-60, 'GAME OVER', { font:'bold 42px monospace', fill:'#ff2222' }).setOrigin(0.5).setDepth(21);
    this.add.text(W/2, H/2, 'Score: '+this.score, { font:'24px monospace', fill:'#ffffff' }).setOrigin(0.5).setDepth(21);
    this.add.text(W/2, H/2+50, 'Press R to restart', { font:'16px monospace', fill:'#aaaaaa' }).setOrigin(0.5).setDepth(21);
    this.input.keyboard.once('keydown-R', () => this.scene.restart());
  }

  update() {
    if (this.gameOver) return;
    const { left, right, up } = this.cursors;
    if (left.isDown)  { this.player.setVelocityX(-200); }
    else if (right.isDown) { this.player.setVelocityX(200); }
    else { this.player.setVelocityX(0); }
    if (up.isDown && this.player.body.blocked.down) { this.player.setVelocityY(-380); }
    if (Phaser.Input.Keyboard.JustDown(this.fireKey)) { this.fireBullet(); }

    // Chase AI for enemy2
    this.enemies2.getChildren().forEach(e => {
      const ex = e.x, px = this.player.x;
      e.setVelocityX(ex < px ? 90 : -90);
    });

    // Boss AI
    if (this.boss && this.boss.active) {
      if (this.boss.body.blocked.right || this.boss.body.blocked.left) this.bossDir *= -1;
      this.boss.setVelocityX(this.bossDir * 120);
      if (Phaser.Math.Between(0,100) < 1) {
        const bx = this.boss.x, by = this.boss.y;
        const b = this.add.circle(bx, by, 5, 0xff4400);
        this.physics.add.existing(b);
        const angle = Phaser.Math.Angle.Between(bx, by, this.player.x, this.player.y);
        b.body.setVelocity(Math.cos(angle)*200, Math.sin(angle)*200);
        this.physics.add.overlap(b, this.player, () => { b.destroy(); this.hitPlayer(); });
        this.time.delayedCall(2000, () => { if(b.active) b.destroy(); });
      }
    }
  }
}

new Phaser.Game({
  type: Phaser.AUTO,
  width: W, height: H,
  backgroundColor: '${bgColor}',
  physics: { default:'arcade', arcade:{ gravity:{ y:500 }, debug:false } },
  scene: [GameScene],
  parent: document.body,
  scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH }
});
</script>
<div style="position:fixed;bottom:8px;left:50%;transform:translateX(-50%);font:11px monospace;color:rgba(255,255,255,.4)">← → MOVE &nbsp;|&nbsp; ↑ JUMP &nbsp;|&nbsp; SPACE SHOOT &nbsp;|&nbsp; R RESTART</div>
</body>
</html>
\`\`\`

A fully playable Phaser 3 HTML5 game with patrol enemies, a chaser AI, and a boss fight. Includes scoring, health/lives, game-over and victory screens.`;
}

export async function POST(req: NextRequest) {
  try {
    const { prompt, sessionId } = (await req.json()) as { prompt: string; sessionId?: string };
    if (!prompt?.trim()) return NextResponse.json({ error: "prompt is required" }, { status: 400 });

    const apiKey = (process.env.WXO_MANAGER_API_KEY ?? "").trim();
    const wrappedPrompt = PHASER_INSTRUCTION + prompt;

    if (apiKey) {
      try {
        const token = await getIAMToken(apiKey);
        const { thread_id, run_id } = await startRun(token, wrappedPrompt, sessionId);
        console.log(`[chat] IBM run started — thread:${thread_id} run:${run_id}`);

        const finalStatus = await pollRun(token, run_id);
        if (finalStatus === "completed") {
          const reply = await getReply(token, thread_id);
          console.log(`[chat] IBM reply (${reply.length} chars)`);
          return NextResponse.json({ reply, sessionId: thread_id });
        }
        console.warn(`[chat] IBM run status: ${finalStatus}`);
      } catch (ibmErr) {
        console.warn("[chat] IBM error:", ibmErr instanceof Error ? ibmErr.message : ibmErr);
      }
    }

    // Demo fallback — generates real runnable game code
    await new Promise(r => setTimeout(r, 2000 + Math.random() * 1500));
    const reply = generateDemoGame(prompt);
    return NextResponse.json({ reply, sessionId: "demo-session", demo: true });

  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("[chat] error:", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
