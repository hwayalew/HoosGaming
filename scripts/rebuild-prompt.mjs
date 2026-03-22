import { readFileSync, writeFileSync } from "fs";

const file = "src/app/api/chat/route.ts";
const src  = readFileSync(file, "utf8");

// ── Marker-based slicing (reliable across line-number changes) ────────────────
const START_MARKER = "// ── Character detail extractor";
const END_MARKER   = "function isGameComplete";
const si = src.indexOf(START_MARKER);
const ei = src.indexOf(END_MARKER);
if (si === -1 || ei === -1) {
  console.error("Markers not found! si=", si, "ei=", ei);
  process.exit(1);
}
const before = src.slice(0, si);
const after  = src.slice(ei);

// CDN URLs
const CDN_PHASER  = "https://cdnjs.cloudflare.com/ajax/libs/phaser/3.60.0/phaser.min.js";
const CDN_THREE   = "https://cdnjs.cloudflare.com/ajax/libs/three.js/r134/three.min.js";
const CDN_PYODIDE = "https://cdn.jsdelivr.net/pyodide/v0.23.4/full/pyodide.js";
const CDN_P5      = "https://cdnjs.cloudflare.com/ajax/libs/p5.js/1.9.0/p5.min.js";
const CDN_KABOOM  = "https://unpkg.com/kaboom@3000.0.1/dist/kaboom.js";
const CDN_BABYLON = "https://cdn.babylonjs.com/babylon.js";
const CDN_PIXI    = "https://cdnjs.cloudflare.com/ajax/libs/pixi.js/7.2.4/pixi.min.js";

function esc(s) { return s.replace(/`/g, "\\`").replace(/\$\{/g, "\\${"); }

// ─── World hint extractor — characters, animals, objects, vehicles, environments ─
const extractorSrc = `
// ── World detail extractor ────────────────────────────────────────────────────
function extractWorldHints(prompt: string): string {
  const p = prompt.toLowerCase();
  const hints: string[] = [];

  // ── Protagonist gender + race ────────────────────────────────────────────
  if (/\\b(woman|female|girl|her|she)\\b/.test(p)) hints.push("female protagonist");
  else if (/\\b(man|male|boy|his|he)\\b/.test(p)) hints.push("male protagonist");
  const races = ["human","elf","dwarf","orc","vampire","demon","angel","robot","cyborg","alien",
    "undead","ninja","samurai","knight","warrior","wizard","mage","assassin","soldier","marine",
    "zombie","mutant","pirate","hunter","monk","paladin","ranger","berserker","druid","sorcerer",
    "android","clone","ghost","witch","warlock","barbarian","gladiator","mercenary","bounty hunter"];
  races.forEach(r => { if (p.includes(r)) hints.push(r); });

  // ── Build / physique ─────────────────────────────────────────────────────
  if (/\\b(tall|large|giant|huge|muscular|buff|heavyset)\\b/.test(p)) hints.push("tall muscular build");
  if (/\\b(small|tiny|slim|lean|agile|lithe|petite)\\b/.test(p)) hints.push("slim agile build");

  // ── Clothing / armor ──────────────────────────────────────────────────────
  if (/\\barmor\\b|\\barmour\\b/.test(p)) hints.push("detailed armor: pauldrons, chest plate, gauntlets, greaves, visor");
  if (/\\brobe\\b/.test(p)) hints.push("flowing robes with mystical runes and ornate trim");
  if (/\\bcloak\\b|\\bhood\\b/.test(p)) hints.push("dramatic hooded cloak, face partially shadowed");
  if (/\\bsuit\\b|\\bexosuit\\b/.test(p)) hints.push("hi-tech exo-suit: panel seams, visor HUD, thruster vents");
  if (/\\bscarves\\b|\\bscarf\\b/.test(p)) hints.push("long flowing scarf trailing behind");
  if (/\\btuxedo\\b|\\bsuit.*jacket\\b/.test(p)) hints.push("sharp suit jacket with lapels and tie");

  // ── Weapons ───────────────────────────────────────────────────────────────
  if (/\\bsword\\b|\\bblade\\b|\\bkatana\\b/.test(p)) hints.push("sword: hilt guard, blade, edge highlight");
  if (/\\bgun\\b|rifle|pistol|sniper|shotgun|cannon/.test(p)) hints.push("firearm: barrel, stock, grip, sight, muzzle");
  if (/\\bbow\\b|arrow|quiver/.test(p)) hints.push("bow with drawn string and back quiver");
  if (/\\bstaff\\b|wand|magic/.test(p)) hints.push("magical staff with glowing orb at tip");
  if (/\\bshield\\b/.test(p)) hints.push("shield with decorative emblem");
  if (/\\baxe\\b|\\bhatchet\\b/.test(p)) hints.push("axe: wide head, notch, worn edge");
  if (/\\bhammer\\b|\\bmaul\\b/.test(p)) hints.push("war hammer: wide flat head, long handle");
  if (/\\bspear\\b|\\blance\\b/.test(p)) hints.push("spear: long shaft, angular head, tail fin");
  if (/\\bclaws?\\b/.test(p)) hints.push("retractable claws: three curved blades extending from knuckles");
  if (/\\benergy\\b|\\blaser\\b/.test(p)) hints.push("energy weapon: glowing barrel, plasma core, heat vent slits");

  // ── Hair colors ───────────────────────────────────────────────────────────
  if (/\\bblonde\\b|golden hair/.test(p)) hints.push("blonde hair (#FFD700)");
  if (/\\bbrunette\\b|brown hair/.test(p)) hints.push("brown hair (#6B3A2A)");
  if (/black hair/.test(p)) hints.push("black hair (#111111)");
  if (/red hair|redhead/.test(p)) hints.push("red hair (#CC2200)");
  if (/white hair|silver hair/.test(p)) hints.push("white/silver hair (#E8E8E8)");
  if (/blue hair/.test(p)) hints.push("blue hair (#2244CC)");
  if (/green hair/.test(p)) hints.push("green hair (#00AA44)");
  if (/purple hair|violet hair/.test(p)) hints.push("purple hair (#882299)");

  // ── Skin tones ────────────────────────────────────────────────────────────
  if (/dark skin|brown skin/.test(p)) hints.push("dark skin tone (#5C3D2E)");
  if (/pale skin|fair skin/.test(p)) hints.push("pale skin (#F5E6D3)");
  if (/olive skin|tan skin/.test(p)) hints.push("olive/tan skin (#C4945A)");
  if (/ashen|grey skin/.test(p)) hints.push("ashen grey skin (#9A9A9A)");

  // ── Color schemes ─────────────────────────────────────────────────────────
  if (/\\bred\\b/.test(p)) hints.push("red color scheme (#CC1100)");
  if (/\\bblue\\b/.test(p)) hints.push("blue color scheme (#1144CC)");
  if (/\\bgreen\\b/.test(p)) hints.push("green color scheme (#117733)");
  if (/\\bpurple\\b|\\bviolet\\b/.test(p)) hints.push("purple color scheme (#6622AA)");
  if (/\\bgold\\b|\\byellow\\b/.test(p)) hints.push("gold/yellow color scheme (#CCA800)");
  if (/\\bblack\\b/.test(p)) hints.push("black dark-tone scheme (#111111)");
  if (/\\bwhite\\b|\\bsilver\\b/.test(p)) hints.push("silver/white color scheme (#DDDDDD)");
  if (/\\bneon\\b|\\bglow\\b/.test(p)) hints.push("neon glow effects (drawingContext.shadowBlur=16)");
  if (/\\borange\\b/.test(p)) hints.push("orange fire color scheme (#FF5500)");

  // ── World / aesthetic themes ──────────────────────────────────────────────
  if (/\\bcyberpunk\\b/.test(p)) hints.push("cyberpunk: chrome panels, glowing implants, holographic visors, neon signs, rain-slicked streets");
  if (/\\bmediev\\b|\\bfantasy\\b/.test(p)) hints.push("medieval fantasy: stone castles, torches, heraldic emblems, forest canopies");
  if (/\\bspace\\b|\\bsci.fi\\b|\\bfutur/.test(p)) hints.push("sci-fi: stars, holographic displays, energy weapons, metal corridors");
  if (/\\bhorror\\b/.test(p)) hints.push("horror: decay, blood splatter, eerie lighting, shadow creatures");
  if (/\\bsteampunk\\b/.test(p)) hints.push("steampunk: brass gears, goggles, steam vents, iron rivets");
  if (/\\bwestern\\b|\\bcowboy\\b/.test(p)) hints.push("western: dust, wooden saloons, cowboy hats, cacti, tumbleweeds");
  if (/\\bocean\\b|\\bpirate\\b|\\bsea\\b/.test(p)) hints.push("ocean/pirate: ships, waves, treasure chests, coral, sea creatures");
  if (/\\bunderwater\\b|\\baquatic\\b/.test(p)) hints.push("underwater: caustic light rays, bubble particles, kelp forest, bioluminescent glow");
  if (/\\bjungle\\b|\\btropical\\b/.test(p)) hints.push("jungle: dense foliage layers, vines, exotic birds, stone ruins");
  if (/\\bdesert\\b|\\bsand\\b/.test(p)) hints.push("desert: sand dunes, heat shimmer particles, crumbling ruins, scorched sky");
  if (/\\bice\\b|\\bsnow\\b|\\bfrozen\\b|\\bwinter\\b/.test(p)) hints.push("ice/winter: snow particles, frozen platforms, icicles, aurora sky");
  if (/\\blava\\b|\\bvolcano\\b|\\bfire\\b/.test(p)) hints.push("volcanic: lava flows, ember particles, ash clouds, glowing magma cracks");
  if (/\\bzombie\\b|\\bapocalypse\\b|\\bpost.apoc/.test(p)) hints.push("post-apocalyptic: ruined buildings, burnt vehicles, overgrown roads, ash sky");

  // ── Animals ───────────────────────────────────────────────────────────────
  const animals = ["wolf","dragon","lion","tiger","bear","eagle","snake","spider","horse","shark",
    "panther","fox","raven","scorpion","elephant","gorilla","hawk","falcon","crocodile","demon wolf",
    "phoenix","griffin","hydra","cerberus","kraken"];
  animals.forEach(a => { if (p.includes(a)) hints.push(\`animal entity: \${a} — full anatomical draw (correct skeletal proportions, fur/scales/feathers in 3 shade layers, detailed eye with iris+pupil+highlight, animated gait cycle)\`); });

  // ── Vehicles ──────────────────────────────────────────────────────────────
  const vehicles = ["tank","car","spaceship","spacecraft","mech","robot mech","motorcycle","truck",
    "helicopter","drone","submarine","boat","ship","airship","train","hovercraft"];
  vehicles.forEach(v => { if (p.includes(v)) hints.push(\`vehicle: \${v} — mechanical detail (chassis body, wheel/track segments, window panes, exhaust particles, damage states, moving parts)\`); });

  // ── Structures ────────────────────────────────────────────────────────────
  const structures = ["castle","dungeon","tower","temple","ruins","city","village","cave","fort",
    "laboratory","spaceship interior","underwater base","haunted house","prison","arena"];
  structures.forEach(s => { if (p.includes(s)) hints.push(\`structure: \${s} — architectural detail (stone/wood/metal material simulation, window grids, doors, weathering, interior lighting glow)\`); });

  return hints.length > 0
    ? \`WORLD DETAILS FROM PROMPT: \${hints.join("; ")}.\\nDraw ALL entities (characters, animals, vehicles, objects, structures) with maximum anatomical/mechanical fidelity reflecting EVERY listed trait.\`
    : \`WORLD DETAILS: Invent richly detailed entities perfectly suited to the world — protagonist with face/hair/outfit/weapon, environment with 3 parallax layers, enemies with distinct silhouettes, environmental objects with material-accurate surface detail.\`;
}

// Legacy alias
function extractCharacterHints(prompt: string): string { return extractWorldHints(prompt); }
`;

// ─── Shared block inserted into EVERY engine prompt ──────────────────────────
const SHARED_API_BLOCK = esc(`
HOOS API BRIDGES (auto-available on window — call these in your game):
• window.hoosMath(theme, callback) — Wolfram|Alpha physics, call ONCE at init BEFORE game loop:
  var GRAVITY=580, WALK_SPD=240, RUN_SPD=400, JUMP_VEL=580, BULLET_SPD=900; // defaults always defined first
  hoosMath("\${userPrompt}", function(p){ if(p.gameGravityPxS2) GRAVITY=p.gameGravityPxS2; if(p.walkSpeedPxS) WALK_SPD=p.walkSpeedPxS; if(p.runSpeedPxS) RUN_SPD=p.runSpeedPxS; if(p.jumpVelocityPxS) JUMP_VEL=p.jumpVelocityPxS; if(p.bulletSpeedPxS) BULLET_SPD=p.bulletSpeedPxS; });

• window.hoosSpeech(text, character, emotion) — ElevenLabs AI voices for character dialogue:
  hoosSpeech("You DARE enter my domain?!", "boss", "angry");          // boss spawn
  hoosSpeech("I won't fall... not here!", "hero", "confident");        // player low HP (<25%)
  hoosSpeech("Phase two... NOW BEGINS!", "villain", "sinister");       // boss phase 2
  hoosSpeech("The final form AWAKENS!", "boss", "angry");              // boss phase 3
  hoosSpeech("Victory! The world is saved!", "hero", "excited");       // win screen
  Include at least 5 hoosSpeech calls at narrative moments (boss intro, each phase change, low HP, kill taunt, victory/defeat).

• window.hoosAnalytics(event, data) — Snowflake game analytics (fire at key events):
  hoosAnalytics("kill", {enemy:"boss", score:score, level:playerLevel, combo:combo});
  hoosAnalytics("death", {cause:"boss_attack", score:score, lives:lives});
  hoosAnalytics("level_up", {level:playerLevel, xp:totalXp});
  hoosAnalytics("boss_killed", {boss:"bossName", phase:bossPhase, time:Date.now()-bossSpawnTime});
  hoosAnalytics("win", {score:score, stars:starRating, time:Date.now()-startTime});

NON-CHARACTER ENTITY REALISM — draw ALL entities with same depth as characters:
• ANIMALS: correct skeletal proportions (quadruped shoulder=55% height, hip=35%); fur=3+ overlapping ellipses in dark/mid/highlight shades; eye=large iris circle+highlight dot+slit or round pupil+eyelid arc; tail=bezier curve or polygon; wing=layered feather rects diminishing outward; scale=small overlapping ellipses grid; animated gait (4-leg walk cycle, hop, dive, slither)
• VEHICLES: chassis fillRect body + wheel circles (dark outer tire ring + lighter inner + radial spoke lines); window = lighter semi-transparent fillRect; exhaust particles (grey/orange emitter at tailpipe); damage state = darker body + red-orange fire+smoke particles; type detail: tank=caterpillar track rect + turret rotate; spacecraft=engine cone glow (PointLight/gradient); boat=curved hull + wake wave lines; mech=cylindrical limb joints with pivot circles
• STRUCTURES: material simulation — stone=grey fillRect + dark crack lineStyle strokes; wood=brown + thin grain lines; metal=silver + rivet fillCircles at corners + weld seam line; window grids = inner rect array (warm #FFD060 fill if interior lit); door=rect + knob circle + frame lineStyle; roof detail (shingle rows/battlements/solar panels); weathering = darker bottom 20% + green/rust stain spots
• OBJECTS/ITEMS: 3D material illusion — highlight ellipse top-left (white alpha 0.5), shadow rect bottom-right (black alpha 0.3); crystal=fillRect with gradient fills + diagonal refraction lines; chest=rect body+lid rect+hinge rect+lock circle; barrel=oval body+stave lines+metal band rects; bomb=circle body+fuse rope curve+shine ellipse; treasure=gold fill+small gem insets; book=rect+spine line+page stack lines
• ENVIRONMENT: rain=vertical 2px alpha-faded line particles; snow=small white ellipses drifting at angle; fog=semi-transparent grey overlay rects; water=animated sine-wave strokePath surface + gradient fill depth (dark blue bottom); foliage=trunk rect + 5+ overlapping leaf ellipses (3 shades of green); grass=thin rect clusters with varied heights; fire=animated polygon vertices orange→yellow→white with shadowBlur glow; lava=slow sine-wave surface + orange glow particles
`);

// ─── Engine prompt builders ───────────────────────────────────────────────────
function buildPhaser(cdn) {
  return `\`You are HOOS AI — world-class AAA game developer. Build a COMPLETE, richly detailed Phaser 3 game from this prompt: "\${userPrompt}"

ABSOLUTE RULES:
• Wrap entire output in \\\`\\\`\\\`html ... \\\`\\\`\\\`
• Start <!DOCTYPE html>, end </html>
• Load Phaser ONLY from: ${cdn.phaser} (blocking <script src>, NO defer/async)
• html,body { width:100%; height:100%; margin:0; overflow:hidden }
• Web Audio API (AudioContext oscillators) for ALL sounds — zero external audio files
• NEVER truncate — write every line, class, function in full — NO length limit
• AAA quality target: Call of Duty / Dark Souls level of gameplay and visual detail

\${charHints}

${SHARED_API_BLOCK}

BOOT SCENE — generate ALL textures procedurally via this.make.graphics() → generateTexture() → destroy():

PLAYER TEXTURE (48×64):
  HEAD (y 0-14): flesh-toned circle; two dark eye dots; small nose dot; mouth arc; hair drawn on top in character's hair color
  NECK (y 14-18): thin flesh rect
  TORSO (y 18-38): outfit rect — armor=dark grey rect + silver fillStyle seam lines + pauldron bumps at top using fillRect; robe=colored rect + small rect rune patterns; uniform=solid color + rank stripe fillRect
  ARMS: left rect x 0-8 y 18-36 + hand circle; right arm x 40-48 y 18-36 (extends forward during attack)
  WEAPON right hand (y 36-56): sword=tall thin fillRect + cross guard fillRect; gun=horizontal fillRect + barrel; staff=thin tall fillRect + fillCircle at top; bow=arc strokePath
  LEGS (y 38-58): left leg fillRect x 8-22 + boot fillRect darker; right leg fillRect x 26-40 + boot fillRect
  ACCESSORIES: helmet visor line if warrior; mask lower-face if assassin; glowing orb near hand if mage

ENEMY TEXTURES (4 types — completely different silhouettes and faction colors):
  enemy_grunt (32×40): standard humanoid — head circle + armored body rect + arm rects + weapon shape; faction primary color
  enemy_ranger (28×44): tall lean sniper — elongated body, rifle barrel shape, scope detail rect
  enemy_heavy (52×56): massive — extra-wide body fillRect (3/4 width), thick arm rects, no visible neck, menacing brow line on head
  enemy_aerial (44×28): flying — wide flat body fillRect, swept triangle wings using fillTriangle on each side, large glowing eye circles, no legs
  boss (90×72): multi-part imposing — large head (circle + crown fillRect or horn fillTriangles), wide armored body fillRect (full width), two arm rects extending to sides with weapon shapes at ends, chest core fillCircle (glowing fill color), faction emblems

ENVIRONMENT TEXTURES: plat_stone, plat_metal, plat_glow (120×16 each, 3 visual styles with theme colors + edge highlight); bg_particle (4×4); item_hp, item_ammo, item_star, item_power (18×18 distinct icons); bul_player (14×5 ellipse), bul_enemy (9×9 circle), bul_boss (16×16 with inner glow circle)
NON-CHARACTER TEXTURES: any animal/vehicle/structure/object mentioned in the prompt — draw via generateTexture() using the entity realism rules above

GAME SCENE — implement EVERY system completely:

PARALLAX BACKGROUND (3 layers via setScrollFactor):
  Layer 0 (0.05): distant scenery — mountains/stars/city silhouettes drawn as filled graphics polygons
  Layer 1 (0.25): mid elements — cloud shapes/structures/foliage
  Layer 2 (0.55): near foreground details

LEVEL (3 zones, world width 9000px):
  this.physics.world.setBounds(0,0,9000,560); this.cameras.main.setBounds(0,0,9000,560)
  Zone 1 (x 0-2800): 12 wide platforms, 4 grunts, 2 rangers — intro pacing
  Zone 2 (x 2800-6000): 16 denser platforms, hazard zones (fillRect spike/lava graphics, overlap damages 10/s), 6 grunts, 4 rangers, 2 heavies
  Zone 3 (x 6000-9000): tight arena, 4 of each type, boss spawns at x 8200
  Camera follows player: this.cameras.main.startFollow(player, true, 0.12, 0.12)

PLAYER SYSTEM:
  Stats: hp=100, maxHp=100, lives=3, stamina=100, score=0, combo=0, comboTimer=0, ammo=30, level=1, xp=0, jumpsLeft=2
  State machine: 'idle' | 'walk' | 'run' | 'jump' | 'fall' | 'attack' | 'hurt' | 'dead'
  Controls: A/D or arrows=move; W/up=jump; SHIFT=sprint (speed×1.65, drain stamina 20/s); Z=melee (arc 65px, damage 30); X=ranged shoot (ammo--); C=special ability themed to game
  Double-jump: jumpsLeft=2, decrement on each jump, reset on blocked.down
  Wall-slide: when against wall mid-air, setVelocityY(Math.max(vy, 60))
  Dash: detect double-tap A or D (within 220ms), setVelocityX(±520) for 220ms, 400ms cooldown
  Invincibility: 1500ms after hit, alpha flicker tween every 80ms
  Combo: comboTimer resets on each hit; combo increments; score × multiplier (×1→×2→×3→×4→×5); comboTimer countdown in update
  XP/Level: every 220 xp = level up → maxHp+=18, damageBonus+=6, HUD badge update
  Stamina regen: +22/s when not sprinting

4 ENEMY AI TYPES (fully implemented with HP bars):
  Grunt: speed 130, patrol ±200px (setBounceX), aggro radius 320, chase player, 2HP, drops 80pts
  Ranger: speed 85, patrol, aggro 400, fires bul_enemy toward player every 2.6s (Angle.Between), strafes horizontally during combat, 4HP, drops 130pts
  Heavy: speed 60, patrol ±120px, when player within 200px → charge burst setVelocityX(±420) 550ms, 8HP, drops 220pts
  Aerial: no gravity (disableGravity), y = baseY + sin(time.now*0.002)*38, follows player x at 115/s, dive every 4200ms (setVelocityY(280) for 600ms), 3HP, drops 160pts
  All: HP bar (graphics rect above head, red fill scaled hp/maxHp), pain flash (setTint 0xff8888 100ms), death (tweenScale to 0 over 400ms + particle emitter burst)

BOSS (spawns at zone 3 trigger, hp=60):
  PHASE 1 (60-41 HP): traverse ±300px, 3-shot spread every 2s (Angle.Between ±0.25 rad spread), summon 2 grunts every 14s
  PHASE 2 (40-21 HP): faster ±240px, 5-shot spread + ground shockwave bul_boss sliding along floor at y=boss.y+40, summon rangers
  PHASE 3 (20-1 HP): setTint 0xff3300, 8-shot radial every 1.1s, charge at player (setVelocityX toward player ×380), summon heavies, camera.shake loop every 8s
  Boss HP bar: full-width graphics at top of screen (setScrollFactor 0), phase color, boss name text matching theme
  Death: camera.shake 2000ms + particle cascade + win screen

ITEM SYSTEM (25% enemy drop + fixed zone positions):
  item_hp: heal 28HP; item_ammo: +18 ammo; item_star: +180 score + 2s invincibility; item_power: 8s double damage (orange tint)

HUD (all setScrollFactor(0), depth 100):
  HP gradient bar (green→yellow→red), stamina bar (blue)
  Lives ♥ × lives
  Score large text (top center) + combo multiplier text (pulses, fades)
  Ammo "AMMO 28/30" + bar
  Level badge circle + XP arc
  Boss HP full-width bar (hidden until boss spawns), phase color, phase name
  Mini-map (80×55 bottom-right): player white dot, enemy red dots, boss yellow pulsing

AUDIO:
  bgm(): 12-note looping oscillator melody, theme-tuned pitches, triangle/sine waveforms
  sfxJump, sfxLand, sfxMeleeSwing, sfxMeleeHit, sfxShoot, sfxHit, sfxEnemyDeath, sfxBossHit, sfxPickup, sfxLevelUp, sfxBossPhase, sfxGameOver, sfxVictory

GAME STATES: 'intro' (2.5s animated title + character silhouette) → 'playing' → 'paused' (ESC) → 'gameover' / 'win' (star rating 1-3)

Phaser.Game config: type:AUTO, width:960, height:560, physics:{default:'arcade',arcade:{gravity:{y:580},debug:false}}, scene:[Boot,Game], scale:{mode:Phaser.Scale.FIT,autoCenter:Phaser.Scale.CENTER_BOTH}

ALL visuals, enemy designs, platform textures, color palette, lore text, music tone MUST authentically reflect: \${userPrompt}\``;
}

function buildThree(cdn) {
  return `\`You are HOOS AI — world-class AAA FPS developer. Build a COMPLETE, richly detailed 3D first-person game in Three.js r134 from: "\${userPrompt}"

ABSOLUTE RULES:
• Wrap entire output in \\\`\\\`\\\`html ... \\\`\\\`\\\`
• Load Three.js ONLY from: ${cdn.three} (blocking <script src>, NO defer/async)
• html,body { width:100%; height:100%; margin:0; overflow:hidden }
• Web Audio API for ALL sounds — zero external audio files
• NEVER truncate — write every line in full — NO length limit
• AAA quality: Call of Duty / Halo level of visual and gameplay richness for a browser FPS

\${charHints}

${SHARED_API_BLOCK}

RENDERER & SCENE:
  THREE.WebGLRenderer({antialias:true,powerPreference:'high-performance'}), shadowMap.enabled=true, PCFSoftShadowMap, setSize(innerWidth,innerHeight), setPixelRatio(Math.min(devicePixelRatio,2)), append to body
  scene.fog = new THREE.FogExp2(themeColor, 0.014)
  camera = new THREE.PerspectiveCamera(75, aspect, 0.1, 300); camera.position.set(0, 1.8, 0)

LIGHTING:
  AmbientLight(themeAmbientColor, 0.4)
  DirectionalLight(0xffffff, 1.8), castShadow, shadow.mapSize 2048×2048, position (30,50,20)
  2× PointLight with oscillating intensity (±0.3 sine wave in game loop) for atmosphere flicker
  Optional SpotLight for boss arena drama

PLAYER (full FPS with physicality):
  requestPointerLock on canvas click; mousemove → yaw (Y) and pitch (X, clamp ±1.3 rad)
  WASD: decompose yaw into fwd/right vectors, move camera per frame
  SHIFT = sprint: speed ×1.9; camera.position.y += sin(time*12)*0.055 (head-bob)
  C = crouch: camera.position.y lerps to 1.0; speed ÷1.55; restores on release
  SPACE = jump: yVel=9.5; gravity -26 /s²; ground at y=1.8; double-jump (jumpsLeft=2)
  F = melee: sphere check radius 2.2 in front, 65 damage, 0.7s cooldown; camera lurches forward 0.3 units then back over 0.35s
  G = grenade: arc throw (fwd×12 + up×7 velocity), explodes 2.4s later, radius 6.5, 80 damage; 3 grenades max
  Stats: hp=100, armor=50, stamina=100 (sprint drain/regen); health regen +1.8/s after 5.5s no damage

WEAPON SYSTEM (3 weapons, keys 1/2/3):
  PRIMARY: Viewmodel BoxGeometry mesh parented to camera (right+down offset, sways with mouse delta); damage 22, rate 0.12s, ammo 30/90, auto-fire; muzzle flash PointLight spike intensity 12 for 0.055s + 6 forward SphereGeometry particles
  SECONDARY: Different viewmodel geometry; damage 38, rate 0.45s, ammo 8/24, semi-auto
  MELEE (F): damage 65, sphere check 2.2 units, 0.65s cooldown; lunge animation camera forward/back

HITSCAN: THREE.Raycaster from cam position toward look direction, check enemy bounding spheres; hit plays impact effect + damage numbers

PROJECTILE BULLETS (enemy/boss): SphereGeometry(0.12,6,6) with emissive MeshStandardMaterial, velocity, 3s lifetime

ENVIRONMENT (3 connected arenas + corridors):
  FLOOR: PlaneGeometry(220,220), MeshStandardMaterial({roughness:0.88}), receiveShadow, rotation.x=-PI/2
  ARENA 1 (starting, z -30 to 30, x -30 to 30): 8 cover objects (crates/pillars), 4 PointLights
  ARENA 2 (mid, x 50-110): multi-level with BoxGeometry ramps (rotation.z ±0.35), 12 cover objects
  ARENA 3 (boss room, x 140-200): open arena, 4 symmetric pillars, boss spawn platform (CylinderGeometry glowing emissive), lockdown walls (invisible BoxGeometry, visible when boss spawns)
  CONNECTING CORRIDORS: BoxGeometry tunnel segments
  BOUNDARY WALLS: 4 invisible collision meshes
  25+ DECORATIVE MESHES: theme-appropriate geometry with PBR materials (metallic/roughness/emissive per theme)
  SKYBOX: scene.background = new THREE.Color(themeColor)
  Non-character entities (animals/vehicles/structures) as compound Three.js mesh groups per entity realism rules above

ENEMIES (4 types + boss, compound meshes):
  GRUNT (×8): body BoxGeometry(1,1.8,0.6) + head SphereGeometry(0.4) + 2 arm CylinderGeometry; hp=30, speed=3.8, melee at dist<2 → 9dmg/0.9s, patrol waypoints, aggro 42 units; HP bar div positioned via 3D→2D projection
  RANGER (×5): taller body + rifle BoxGeometry arm; hp=25, speed=2.2, hitscan every 2.1s at dist<55, damage 13, strafes; retreats when player advances
  HEAVY (×3): wide BoxGeometry(2,2.2,1.2) body + thick arm cylinders; hp=90, speed=1.6, charge (speed 7.5 for 1.2s) when dist<18; death spawns 2 grunts
  DRONE (×4): flies y=6+sin(t*2)*1.5; SphereGeometry(0.6)+fin BoxGeometry; hp=20, speed=5.5; drops bomb SphereGeometry downward every 3.5s → explodes radius 5, 55 damage
  BOSS: torso BoxGeometry(2.2,2.8,1.2) + head SphereGeometry(0.7) + 2 arm CylinderGeometry + shoulder pads + weapon-arm extension; hp=150
    PHASE 1 (150-100): slow, 3-way spread every 1.6s, summon 2 grunts every 12s
    PHASE 2 (99-50): faster, 5-way spread + ground shockwave disc particle effect, summon rangers
    PHASE 3 (49-1): emissive max red, 8-way radial every 0.85s, teleport behind player every 7s (position snap + PointLight flash), summon heavies
    Boss HP bar: top full-width HTML div, phase color transitions

COMBAT:
  Damage numbers: HTML div, 3D→2D projection via camera, float+fade 0.7s (red enemy, green player)
  Explosions: THREE.Points(BufferGeometry, 24 points, random velocity), fade alpha over 0.55s
  Blood: 12 small SphereGeometry meshes scattered on enemy death, removed after 3s

HUD (HTML position:fixed):
  Crosshair: 4 CSS div lines, spread on move (CSS transition width) and shoot (instant then shrink)
  HP + armor bars with gradient CSS; stamina bar
  Ammo "30/90" + reload arc on R key
  Radar 120×120 canvas (top-right): player center, enemy colored dots, boss pulsing
  Kill feed top-right list, fade after 4.5s
  Score + objective text
  Boss HP top full-width bar (phase color), hidden until boss spawns
  Death screen: red vignette CSS + respawn timer text; 3 lives total

AUDIO:
  ambient() looping oscillator drone, theme atmosphere
  sfxShootPrimary(), sfxShootSecondary(), sfxMelee(), sfxExplosion(), sfxGrenade(), sfxEnemyDeath(), sfxBossHit(), sfxBossRoar(), sfxBossPhase(), sfxPickup()
  Dynamic music: boss fight adds oscillator layer + increases tempo

GAME LOOP:
  const clock = new THREE.Clock();
  function loop() { requestAnimationFrame(loop); const dt=Math.min(clock.getDelta(),0.04); updatePlayer(dt); updateEnemies(dt); updateBullets(dt); updateParticles(dt); updateHUD(); renderer.render(scene,camera); }
  window.addEventListener('resize',()=>{ camera.aspect=innerWidth/innerHeight; camera.updateProjectionMatrix(); renderer.setSize(innerWidth,innerHeight); });

ALL visuals, enemy designs, arena architecture, materials, audio tone, HUD style match: \${userPrompt}\``;
}

function buildBabylon(cdn) {
  return `\`You are HOOS AI — world-class AAA 3D game developer. Build a COMPLETE, richly detailed Babylon.js game from: "\${userPrompt}"

ABSOLUTE RULES:
• Wrap entire output in \\\`\\\`\\\`html ... \\\`\\\`\\\`
• Load Babylon.js ONLY from: ${cdn.babylon} (blocking <script src>, NO defer/async)
• html,body { width:100%; height:100%; margin:0; overflow:hidden }
• Web Audio API for sounds
• NEVER truncate — full game, every system, no length limit
• AAA quality: Halo / Battlefield level of detail

\${charHints}

${SHARED_API_BLOCK}

<canvas id="c" style="width:100%;height:100%;display:block;touch-action:none">
const engine = new BABYLON.Engine(canvas, true, {adaptToDeviceRatio:true, stencil:true});
const scene = new BABYLON.Scene(engine);
scene.gravity = new BABYLON.Vector3(0,-28,0);
scene.collisionsEnabled = true;
scene.fogMode = BABYLON.Scene.FOGMODE_EXP2; scene.fogColor=themeColor; scene.fogDensity=0.016;

LIGHTING:
  HemisphericLight with sky/ground colors matching theme
  DirectionalLight: sun with ShadowGenerator(2048) castShadow ALL meshes; position (40,60,25)
  2× PointLight with oscillating intensity in render loop
  SpotLight for boss arena drama

CAMERA (FPS):
  BABYLON.UniversalCamera, WASD, mouse look, attachControl(canvas)
  Manual gravity: yVelocity tracked per frame, ground at y=2
  Sprint: speed doubles on Shift; camera.rotation.z lerps ±0.04
  Crouch: ellipsoid.y shrinks to 0.7, camera y lowers
  Jump: yVelocity=10.5; double-jump (jumpsLeft=2); gravity -30/s²
  Stats: hp=100, armor=50, stamina=100; health regen +2/s after 5s no damage

WEAPONS (3, switch 1/2/3):
  Each: damage, fireRate, ammo/reserve, muzzle PointLight spike (intensity 10, 0.06s), viewmodel mesh parented to camera
  PRIMARY: damage 24, rate 0.13s, ammo 28/84, auto
  SECONDARY: damage 42, rate 0.48s, ammo 7/21, semi
  MELEE (F): damage 70, 2.5m sphere check, 0.7s cooldown

ENVIRONMENT (3 arenas + corridors):
  Ground: MeshBuilder.CreateGround(200×200), PBRMaterial, checkCollisions, receiveShadows
  ARENA 1: 10 MeshBuilder objects with themed PBR materials, shadow casting
  ARENA 2: multi-level with CreateBox ramp segments (rotation.z ±0.35), 14 objects
  ARENA 3: open arena, 4 pillars, boss spawn CreateCylinder with emissive PBR
  CORRIDORS: CreateBox tunnel segments
  25+ DECORATIVE MESHES: theme-appropriate geometry; every mesh gets PBRMaterial({albedoColor, metallic, roughness, emissiveColor})
  BOUNDARY: 4 invisible checkCollisions boxes
  Non-character entities from prompt drawn as BABYLON compound mesh groups per entity realism rules above

ENEMIES (4 types + boss, compound meshes):
  GRUNT (×8): head SphereGeometry + body/arm boxes; hp=30, melee speed 3.5, aggro 40 units
  RANGER (×5): tall body + rifle appendage; hp=25, ranged 2s rate, strafes
  HEAVY (×3): wide body (scale 1.8×), hp=85, charge burst when close; spawns grunts on death
  DRONE (×4): fly at y=6+sin(t)*1.5, drop bombs every 3s; hp=20, speed 5.5
  BOSS: 6-part compound mesh; hp=150; 3 phases with full AI per phase
    Phase 1 (150-100): slow, 3-way spread 1.6s, summon grunts 12s
    Phase 2 (99-50): faster, 5-way + ground slam, summon rangers
    Phase 3 (49-1): max emissive, 8-way 0.85s, teleport every 7s, summon heavies

COMBAT:
  BABYLON.Ray hitscan; scene.pickWithRay() for enemy hit detection
  Projectiles: CreateSphere(r=0.12), velocity, 3s lifetime
  Explosions: BABYLON.ParticleSystem (150 particles, theme colors, sphere emitter)
  Damage numbers: BABYLON.GUI TextBlock, BillboardMode, float+fade

HUD (BABYLON.GUI.AdvancedDynamicTexture.CreateFullscreenUI):
  HP + armor bars; ammo counter + reload arc; crosshair (4 Rectangle lines, spread on shoot)
  Radar 130×130 canvas: player center, enemy dots, boss pulsing
  Boss HP full-width bar (phase color, phase name), hidden until boss spawns
  Kill feed StackPanel (4 entries, fade 4s); score + objective text

AUDIO: ambient() loop; sfxShoot(), sfxMelee(), sfxExplosion(), sfxPickup(), sfxBossRoar(), sfxBossPhase()

engine.runRenderLoop(() => { const dt=engine.getDeltaTime()/1000; updateEnemies(dt); updatePhysics(dt); updateHUD(); scene.render(); });
window.addEventListener('resize', () => engine.resize());

ALL visuals, enemy designs, materials, audio tone, HUD match: \${userPrompt}\``;
}

function buildP5(cdn) {
  return `\`You are HOOS AI — world-class AAA 2D game developer. Build a COMPLETE, richly detailed p5.js game from: "\${userPrompt}"

ABSOLUTE RULES:
• Wrap entire output in \\\`\\\`\\\`html ... \\\`\\\`\\\`
• Load p5.js ONLY from: ${cdn.p5} (blocking <script src>, NO defer/async)
• html,body { width:100%; height:100%; margin:0; overflow:hidden }
• Web Audio API for sounds
• NEVER truncate — full game, every class, every system, no length limit

\${charHints}

${SHARED_API_BLOCK}

PLAYER CLASS — full anatomical draw + rich stats:
  STATS: hp=100, maxHp=100, lives=3, stamina=100, score=0, combo=0, comboTimer=0, ammo=30, level=1, xp=0, facing=1, state='idle', invTimer=0, dashCd=0, attackTimer=0, onGround=false, jumpsLeft=2

  draw(camX) — full character portrait using p5 primitives:
    push(); translate(this.x - camX, this.y);
    HAIR: noStroke(); fill(hairColor); shape matching description (ellipse/rect polygon on top of head)
    HEAD: fill(skinColor); ellipse(0,-26,22,22); eyes: fill(eyeColor); two small ellipses; nose: point dot; mouth: arc
    NECK: fill(skinColor); rect(-3,-14,6,8)
    TORSO: fill(outfitColor); rect(-10,-6,20,22); overlay: stroke(seamColor); strokeWeight(1); armor seam lines or rune dots or uniform stripe
    LEFT ARM: fill(outfitColor); rect(-18,-4,7,16); hand: fill(skinColor); ellipse(-14,14,7,7)
    RIGHT ARM: fill(outfitColor); extended further if state==='attack'; rect(11,-4,7,16); hand: ellipse(15,14,7,7)
    WEAPON in right hand: sword=rect(16,-20,4,30)+rect(12,-22,12,4); gun=rect(12,0,20,8)+line(32,4,40,4); staff=rect(14,-28,4,40)+ellipse(16,-30,10,10); bow=arc(14,0,12,28,...)
    LEFT LEG: fill(outfitColor); rect(-8,16,7,18); boot: fill(bootColor); rect(-9,28,9,8)
    RIGHT LEG: rect(1,16,7,18); boot: rect(0,28,9,8)
    ACCESSORIES: cape: noFill(); beginShape(); curveVertex for flowing polygon behind; endShape(); helmet rect; belt: rect(-10,16,20,4)
    IDLE: translate(0, sin(frameCount*0.04)*1.8)
    WALK: left leg rotates via rotate() for alternating swing
    HURT: translate(random(-2,2), random(-2,2)) if invTimer>0
    HP bar above: rect(-15,-42,30,4); fill(green/yellow/red based on hp%); rect(-15,-42,30*hp/maxHp,4)
    pop()

  update(dt, platforms, enemies): full physics + state machine
    gravity vy+=680*dt; platform AABB; double-jump; wall-slide; dash (doubletap detect 220ms); sprint; combo/xp/level; inv timer

4 ENEMY CLASSES (full detailed draw + AI + entity realism for any animal/vehicle enemies):
  Scout: lean slim body, light faction color, speedy — patrol ±185px, aggro 305, chase speed 165
  Soldier: armored body with overlay rect detail lines, weapon prominent — patrol, aggro 390, fire every 2.7s, strafes
  Heavy: extra wide body (rectWidth*1.9), thick arm rects, angry brow line — slow patrol, charge when <195px, 8HP
  Aerial: flat wide body rect, triangle wings (triangle() both sides), glowing eye fill circles, no legs — sine Y movement, follow X, dive every 4s
  Animal/vehicle enemies (if in prompt): use entity realism drawing rules for full anatomical/mechanical detail

BOSS CLASS (full detailed multi-part draw, 3 phases):
  Large 80×90 draw: head with crown/horns/visor (theme-matched), wide armored body, extended arm appendages with weapons, chest core glowing (drawingContext.shadowBlur), faction emblem detail
  hp=60, maxHp=60; phase 1(60-41): traverse±300, 2-shot spread 2.1s; phase 2(40-21): 4-shot+ground shockwave; phase 3(20-1): 8-radial 1.1s+charge+summon

LEVEL (horizontal scroll, world 9500px):
  3 zones, hand-placed platform arrays [{x,y,w,h}], zone-specific parallax backgrounds
  Moving platforms: some oscillate Y via sin(); some move X back-and-forth
  Hazard zones: rect with drawingContext.shadowBlur glow (lava/electric/poison) — touching=11dmg/s
  Collectibles at fixed positions per zone
  Environmental entities (trees/vehicles/structures) drawn with entity realism rules

PARALLAX BACKGROUND (3 layers at speeds 0.08, 0.28, 0.58):
  Each layer: theme-appropriate scenery drawn as filled polygon silhouettes with entity realism details

FULL HUD:
  HP gradient bar (green→yellow→red), stamina bar (blue)
  Lives ♥×lives; Score large text + combo multiplier (pulses, fades); Ammo text + bar
  Level badge circle + XP fill arc
  Boss HP full-width top bar (appears when boss spawns, phase color)
  Mini-map bottom-right 105×68: player white dot, enemy red dots, boss yellow pulsing

GAME STATES: 'intro'→'playing'→'paused'→'gameover'/'win'(star rating 1-3)

AUDIO: bgm() 12-note oscillator melody loop; sfxJump, sfxMeleeSwing, sfxMeleeHit, sfxShoot, sfxHit, sfxEnemyDeath, sfxBossHit, sfxPickup, sfxLevelUp, sfxBossPhase

windowResized(): resizeCanvas(windowWidth, windowHeight)

ALL drawn elements, colors, enemy silhouettes, music tone match: \${userPrompt}\``;
}

function buildKaboom(cdn) {
  return `\`You are HOOS AI — world-class AAA game developer. Build a COMPLETE, richly detailed Kaboom.js game from: "\${userPrompt}"

ABSOLUTE RULES:
• Wrap entire output in \\\`\\\`\\\`html ... \\\`\\\`\\\`
• Load Kaboom ONLY from: ${cdn.kaboom} (blocking <script src>, NO defer/async)
• html,body { width:100%; height:100%; margin:0; overflow:hidden }
• Web Audio API for sounds
• NEVER truncate — every scene, every system, full code, no length limit

\${charHints}

${SHARED_API_BLOCK}

kaboom({ width:960, height:560, background:[10,14,26], canvas:document.getElementById('c') })

SPRITE GENERATION via loadSprite() with inline canvas dataURL — draw each sprite on an OffscreenCanvas or regular canvas using canvas 2D API, then toDataURL():

PLAYER SPRITE (48×64): complete human figure per character hints above —
  hair shape on top of head (color per hints), head ellipse with skin fill, eye circles, nose dot, mouth arc,
  torso rect with outfit detail (armor seams/rune patterns/stripes using strokeRect),
  left and right arm rects with hand circles, weapon in right hand (sword/gun/staff/bow shape),
  leg rects with boot shapes at bottom, accessories (cape polygon, helmet rect, belt)

ENEMY SPRITES (4 distinct canvas draws):
  "scout" (30×38): lean lightweight figure, alert posture, simple weapon
  "soldier" (36×46): armored medium figure, weapon prominent
  "heavy" (52×58): massive wide body, thick limbs, imposing stance
  "aerial" (44×28): wide flat body, triangle wing shapes, glowing eyes, no legs
  "boss" (96×80): multi-part: large head+crown/horns, wide armored body, arm extensions with weapons, chest glow core, faction details

NON-CHARACTER SPRITES: any animal/vehicle/structure/object from the prompt — drawn inline canvas per entity realism rules above

ENVIRONMENT: "plat_a", "plat_b", "plat_glow" (128×18); items "item_hp","item_ammo","item_star","item_power" (20×20); projectiles "bul_p","bul_e","bul_boss"

SCENE "game":
Level map via addLevel() spanning 3 zones (hand-crafted tile layout 9000px wide):
  Zone 1 (x 0-2800): intro wide platforms; Zone 2 (x 2800-6000): dense+hazards; Zone 3 (x 6000-9000): boss arena
  Tile types: "@"=plat_a, "#"=plat_b, "*"=plat_glow, "^"=spike hazard, "!"=lava (10dmg/s)

Player entity with full attrs: lives=3, stamina=100, ammo=30, score=0, combo=0, comboTimer=0, level=1, xp=0, invTimer=0, dashCd=0, facing=1, jumpsLeft=2, attackTimer=0

Controls:
  onKeyDown("left"/"a"): move(-220,0); facing=-1; flipX(true)
  onKeyDown("right"/"d"): move(220,0); facing=1
  onKeyHold("shift"): sprint ×1.65, drain stamina
  onKeyPress("up"/"w"/"space"): jump(); if jumpsLeft>0: second jump (doublejump)
  onKeyPress("z"/"j"): melee attack — area check 65px in facing direction, damage 30
  onKeyPress("x"/"k"): shoot bul_p if ammo>0, ammo--
  onKeyPress("c"/"l"): special ability (magic burst / dash-attack / shield-bash themed)

4 ENEMY TYPES spawned across zones with full onUpdate AI:
  Scout: patrol ±200px; aggro 290px → chase; attack on close overlap; 2HP
  Soldier: patrol; fire bul_e toward player every 2.6s when in range 400; strafes; 4HP
  Heavy: slow patrol; charge burst (vel ±430 for 0.55s) when player within 200px; 8HP
  Aerial: no body() (no gravity); y=baseY+Math.sin(time()*2.1)*35; follow player X; dive every 4.2s; 3HP

onCollide handlers: bul_p→enemy (damage+kill+score+xp), bul_p→boss (damage+phase check), player→enemy (damage+inv check), player→items (pickup effects), player→hazards (damage/s)

Boss scene trigger: when player.pos.x > 7200 → go("boss_fight")

SCENE "boss_fight":
  Boss entity with 3-phase onUpdate:
  Phase 1 (hp>40): traverse ±300px, 2-shot spread 2s, summon scouts 14s
  Phase 2 (hp>20): faster, 4-shot spread + ground shockwave bul_boss along floor
  Phase 3 (hp≤20): 8-shot radial 1.1s + charge at player + summon soldiers
  Boss HP bar via onDraw(): full-width top rect, phase color, phase name text
  Boss death: chain kaboom() explosions with wait() delays → go("win")

HUD via onDraw(): HP gradient bar+stamina bar; score; lives ♥; ammo; level+XP bar; combo multiplier (flash+fade); mini-map (player dot + enemy dots + boss dot)

SCENE "gameover": dark overlay, stats, R restart → onKeyPress("r") → go("game")
SCENE "win": star rating 1-3, full stats, R restart

AUDIO: bgm loop; sfxJump, sfxMeleeSwing, sfxMeleeHit, sfxShoot, sfxHit, sfxEnemyDeath, sfxBossHit, sfxPickup, sfxLevelUp, sfxBossPhase

go("game")

ALL sprites, level layout, enemy designs, colors, music match: \${userPrompt}\``;
}

function buildPixi(cdn) {
  return `\`You are HOOS AI — world-class AAA 2D game developer. Build a COMPLETE, richly detailed PixiJS v7 game from: "\${userPrompt}"

ABSOLUTE RULES:
• Wrap entire output in \\\`\\\`\\\`html ... \\\`\\\`\\\`
• Load PixiJS ONLY from: ${cdn.pixi} (blocking <script src>, NO defer/async)
• html,body { width:100%; height:100%; margin:0; overflow:hidden }
• Web Audio API for sounds
• NEVER truncate — every class, system, and line in full — no length limit

\${charHints}

${SHARED_API_BLOCK}

const app = new PIXI.Application({width:960,height:560,backgroundColor:0x0a0e1a,antialias:true,resolution:window.devicePixelRatio||1,autoDensity:true});
document.body.appendChild(app.view);
app.view.style.width='100%'; app.view.style.height='100%';

GRAPHICS FACTORY — function drawEntity(type): PIXI.Graphics — fully detailed per type:
  'player': head circle (skin tone), hair polygon on top (color per hints), two eye circles, nose dot, mouth arc, neck rect, torso rect with outfit detail (armor: lineStyle seam lines + pauldron bumps; robe: rune patterns; uniform: stripe lines), left arm rect + hand circle, right arm rect (extends for attack), weapon right hand (sword: tall rect+crossguard; gun: horizontal rect+barrel; staff: tall rect+glow circle with alpha fill; bow: arc), leg rects with boot shapes, accessories (cape polygon, helmet rect, belt line)
  'enemy_scout': lean figure, light faction color, simple weapon; distinct from player silhouette
  'enemy_soldier': wider armored body with lineStyle overlay, weapon prominent, helmet visor
  'enemy_heavy': extra-wide body (1.9× normal), thick arm rects, angry brow on face, heavy boot shapes
  'enemy_aerial': flat wide body, two swept triangle polygons as wings, large glowing eye circles (alpha 0.9), no legs
  'boss': multi-section — large head with crown rects or horn triangles or visor rect, wide torso with chest core circle (glow fill), two extended arm rects with weapon shapes, leg columns, faction emblem (small rect/polygon detail), decorative emissive elements
  ANY ANIMAL from prompt: correct skeletal proportions, fur=overlapping ellipses 3 shades, detailed eye, animated gait cycle — all per entity realism rules
  ANY VEHICLE from prompt: chassis+wheels+windows+exhaust, mechanical detail — per entity realism rules
  ANY STRUCTURE: material sim (stone/wood/metal), windows, doors, weathering — per entity realism rules

  'platform_a','platform_b','platform_glow': 128×18 rect variants; 'item_hp','item_ammo','item_star','item_power': 20×20 distinct shapes; 'proj_player': 14×5 ellipse; 'proj_enemy': 9×9 diamond; 'proj_boss': 16×16 with glow circle

ENTITY CLASSES:
class Player extends PIXI.Container: full physics+state machine+stats (hp,maxHp,lives,stamina,score,combo,ammo,level,xp); anatomical gfx via drawEntity('player'); draw HP bar above; draw stamina bar; update() with gravity+platform AABB+double-jump+wall-slide+dash+sprint+combo+xp/level
class Scout/Soldier/Heavy/Aerial extends Enemy: each with drawEntity(type) gfx, full AI onUpdate(), HP bar above, death effect (scale tween + particle burst)
class Boss: drawEntity('boss'), hp=60, 3-phase onUpdate (traverse/spread/charge/summon per phase), phase color tint transitions, boss HP bar full-width
class Projectile extends PIXI.Graphics: vx,vy,lifetime,team,damage; update(dt): move+lifetime+collision
class ParticleEmitter: pool of 200 PIXI.Graphics circles; emitExplosion(x,y,color,count); emitHit(x,y); emitTrail(x,y); update(dt): move+fade+recycle

LEVEL (3 zones, world 9000px):
  hand-placed platforms[{x,y,w,h,type}]; hazards[{x,y,w,h,type,dmg}]; collectibles[{x,y,type}]; enemySpawns[{x,y,type}]
  3-layer parallax PIXI.Container: scrolled at 0.08/0.28/0.58 of camX delta; theme scenery drawn with PIXI.Graphics per layer; environmental entities drawn with entity realism rules
  Moving platforms: PIXI.Graphics rects with sin X or Y oscillation each tick
  Camera: app.stage.pivot.x lerps toward player.x - app.screen.width/2; clamped to world

HUD LAYER (separate PIXI.Container, no camera influence):
  HP gradient bar PIXI.Graphics (0x22ff44→0xff2222 based on hp%); stamina bar (0x2244ff)
  Lives PIXI.Text ♥×lives; Score PIXI.Text (scale pulse on new points)
  Combo PIXI.Text ×2/×3/×4 (fade out if no recent hit); Ammo text + bar; Level badge + XP arc
  Boss HP full-width PIXI.Graphics bar (phase color, phase name PIXI.Text), hidden until boss
  Mini-map PIXI.Graphics 105×70 (bottom-right): player white dot, enemy red dots, boss yellow pulsing

GAME STATES: 'intro'(2.5s animated title+character silhouette) → 'playing' → 'paused'(ESC) → 'gameover'/'win'(star rating)

AUDIO: bgm() 12-note oscillator loop; sfxJump, sfxMeleeSwing, sfxMeleeHit, sfxShoot, sfxHit, sfxEnemyDeath, sfxBossHit, sfxPickup, sfxLevelUp, sfxBossPhase

app.ticker.add((delta) => { const dt=delta/60; update(dt); });
window.addEventListener('resize', () => { app.renderer.resize(window.innerWidth, window.innerHeight); });

ALL graphics, enemy designs, level aesthetics, colors, music match: \${userPrompt}\``;
}

function buildPython(cdn) {
  return `\`You are HOOS AI — world-class AAA game developer. Build a COMPLETE, richly detailed Python/Pyodide game from: "\${userPrompt}"

ABSOLUTE RULES:
• Wrap entire output in \\\`\\\`\\\`html ... \\\`\\\`\\\`
• Load Pyodide ONLY from: ${cdn.pyodide}
• ALL game logic in Python inside pyodide.runPythonAsync()
• Use js module for DOM/canvas interop; use single state dict — NO global keyword
• Use random module for RNG (never math.random — does not exist in Python)
• Keyboard: set window.hoosKeyDown={} in JS <script> BEFORE loadPyodide(); in Python each frame: k=getattr(js.window,"hoosKeyDown").to_py()
• ONLY use create_proxy with: from pyodide.ffi import create_proxy
• NEVER truncate — full game, every function, no length limit

\${charHints}

${SHARED_API_BLOCK}

HTML STRUCTURE:
<style>*{margin:0;padding:0}html,body{width:100%;height:100%;background:#000;overflow:hidden}</style>
<script>window.hoosKeyDown={};document.addEventListener("keydown",e=>window.hoosKeyDown[e.code]=true);document.addEventListener("keyup",e=>window.hoosKeyDown[e.code]=false);</script>
<canvas id="c" width="960" height="560" style="display:block;width:100%;height:100%"></canvas>
<div id="hud" style="position:fixed;top:0;left:0;width:100%;pointer-events:none;font-family:monospace"></div>
<script src="${cdn.pyodide}"></script>
<script>loadPyodide().then(async py=>{ await py.runPythonAsync(document.getElementById('hoos-py').textContent); });</script>
<script type="text/python" id="hoos-py">
import js, math, random, asyncio
W, H = 960, 560
GRAVITY = 700
canvas = js.document.getElementById("c")
ctx = canvas.getContext("2d")
hud = js.document.getElementById("hud")
def k(): return getattr(js.window,"hoosKeyDown").to_py()

state = {
  "mode":"playing","cam_x":0,"time":0,
  "player":{"x":100,"y":H-100,"vx":0,"vy":0,"hp":100,"maxHp":100,"lives":3,"stamina":100,
    "score":0,"combo":0,"combo_timer":0,"ammo":30,"level":1,"xp":0,"facing":1,
    "state":"idle","inv_timer":0,"dash_cd":0,"attack_timer":0,"on_ground":False,"jumps":2},
  "enemies":[],"boss":None,"projectiles":[],"particles":[],"items":[],
  "platforms":[],"hazards":[],
}

DRAW FUNCTIONS — full anatomical/mechanical detail per entity type:

def draw_player(ctx, p, cam_x, time):
  cx, cy = p["x"]-cam_x, p["y"]
  ctx.save(); ctx.translate(cx, cy)
  idle_bob = math.sin(time*3)*1.8 if p["state"]=="idle" else 0
  ctx.translate(0, idle_bob)
  # HAIR: ctx.fillStyle=hair_color; ctx.beginPath(); draw hair shape on top of head
  # HEAD: ctx.beginPath(); ctx.arc(0,-26,11,0,2*math.pi); ctx.fillStyle=skin_color; ctx.fill()
  # EYES: two ctx.arc() circles with eye_color
  # TORSO: ctx.fillStyle=outfit_color; ctx.fillRect(-10,-14,20,22)
  # ARMOR DETAIL: ctx.strokeStyle=seam_color; ctx.lineWidth=1; horizontal seam lines
  # LEFT ARM: ctx.fillRect(-18,-12,7,16); hand: ctx.arc(-14,6,4,0,2*math.pi)
  # RIGHT ARM: extended or normal based on attack state; weapon in right hand
  # LEGS: ctx.fillRect(-8,8,7,18) left + ctx.fillRect(1,8,7,18) right; boot rects
  # CAPE/ACCESSORIES: bezierCurveTo flowing shape
  ctx.restore()
  # HP bar above

def draw_enemy(ctx, e, cam_x):
  # "scout": slim agile figure, lighter faction colors, light weapon
  # "soldier": armored with lineStyle overlay detail, weapon prominent, helmet
  # "heavy": extra wide body (1.9× width), thick arm rects, angry brow, no neck
  # "aerial": wide flat body, triangle wings each side, glowing eye circles, no legs
  # Animal/vehicle enemies: full anatomical/mechanical draw per entity realism rules
  cx, cy = e["x"]-cam_x, e["y"]
  ctx.save(); ctx.translate(cx,cy)
  # per-type drawing
  ctx.restore()

def draw_boss(ctx, boss, cam_x, time):
  cx, cy = boss["x"]-cam_x, boss["y"]
  ctx.save(); ctx.translate(cx,cy)
  # LARGE MULTI-PART DRAW (80×90):
  # Head: large ctx.arc() with crown strips or horn triangles or visor rect
  # Body: wide ctx.fillRect(-40,-20,80,45) + chest core: ctx.arc(0,10,12,0,2*math.pi) with shadowBlur glow
  # Left/Right arms: ctx.fillRect with weapon shapes at ends
  # Decorative: faction emblem + mechanical joint lines
  # Phase colors: phase 1=orange, 2=red, 3=purple
  ctx.restore()

def draw_background(ctx, cam_x, time):
  # 3 parallax layers: speeds 0.08, 0.28, 0.58
  # Each layer: theme silhouettes using fillRect/beginPath/lineTo
  # Environmental entities (trees/structures/vehicles): entity realism rules

def draw_platform(ctx, plat, cam_x):
  # Material simulation: stone=grey+crack lines; wood=brown+grain; metal=silver+rivets
  ctx.fillStyle = plat_colors[plat.get("type","a")]; ctx.fillRect(plat["x"]-cam_x, plat["y"], plat["w"], plat["h"])
  ctx.fillStyle = edge_highlight; ctx.fillRect(plat["x"]-cam_x, plat["y"], plat["w"], 3)

LEVEL DESIGN — 3 zones, hand-crafted platform lists:
  Zone 1 (x 0-2800): 12 wide platforms, scouts and soldiers
  Zone 2 (x 2800-6000): 18 denser platforms (some move via sin), hazard zones, all 4 enemy types
  Zone 3 (x 6000-9000): arena layout, boss spawns at x=8200

ENEMY AI:
def update_enemy_scout(e, p, dt): patrol ±185px; aggro 305 → chase speed 160; attack on close; 2HP
def update_enemy_soldier(e, p, dt, projectiles): patrol; aggro 390; fire every 2.6s; strafe; 4HP
def update_enemy_heavy(e, p, dt): slow patrol; charge when <195px (vx ±420 for 0.52s); 8HP
def update_enemy_aerial(e, p, dt): e["y"]=e["base_y"]+math.sin(state["time"]*2.1)*36; follow player x at 115/s; dive every 4s

BOSS AI:
def update_boss(boss, player, dt, projectiles, enemies):
  if boss["hp"] > 40: # phase 1 behavior
  elif boss["hp"] > 20: # phase 2 (5-shot spread + ground shockwave)
  else: # phase 3 (8-radial + charge + summon)

COLLISION: def aabb(ax,ay,aw,ah,bx,by,bw,bh): return ax<bx+bw and ax+aw>bx and ay<by+bh and ay+ah>by

HUD via hud.innerHTML: HP bar, stamina, score, lives, ammo, level+XP, combo, boss HP bar, mini-map canvas

AUDIO: js.eval() to create AudioContext oscillators for each sfx (bgm loop, jump, shoot, hit, death, boss, pickup, levelup)

GAME STATES: "intro"→"playing"→"paused"→"gameover"/"win"

async def game_loop():
    last = js.Date.now()/1000
    while True:
        now = js.Date.now()/1000
        dt = min(now-last, 0.04); last = now
        state["time"] += dt
        update(dt); draw()
        await asyncio.sleep(1/60)

asyncio.ensure_future(game_loop())
</script>

ALL character visuals, animal/vehicle entities, enemy designs, platform aesthetics, audio match: \${userPrompt}\``;
}

// ─── Assemble the buildPrompt TypeScript function ─────────────────────────────
const cdn = {
  phaser: CDN_PHASER, three: CDN_THREE, pyodide: CDN_PYODIDE,
  p5: CDN_P5, kaboom: CDN_KABOOM, babylon: CDN_BABYLON, pixi: CDN_PIXI,
};

const buildPromptSrc = `
// ── Detailed engine-specific system prompts ───────────────────────────────────
function buildPrompt(userPrompt: string, language: string): string {
  const charHints = extractWorldHints(userPrompt);

  if (language === "js-phaser") {
    return ${buildPhaser(cdn)};
  }

  if (language === "js-three") {
    return ${buildThree(cdn)};
  }

  if (language === "js-babylon") {
    return ${buildBabylon(cdn)};
  }

  if (language === "js-p5") {
    return ${buildP5(cdn)};
  }

  if (language === "js-kaboom") {
    return ${buildKaboom(cdn)};
  }

  if (language === "js-pixi") {
    return ${buildPixi(cdn)};
  }

  if (language === "python") {
    return ${buildPython(cdn)};
  }

  return buildPrompt(userPrompt, "js-phaser");
}
`;

const newContent = before + extractorSrc + buildPromptSrc + "\n" + after;
writeFileSync(file, newContent, "utf8");
console.log("rebuild-prompt done — wrote", newContent.length, "chars to", file);
