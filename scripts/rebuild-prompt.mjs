import { readFileSync, writeFileSync } from "fs";

const file = "src/app/api/chat/route.ts";
const src  = readFileSync(file, "utf8");

const START_MARKER = "// ── World detail extractor";
const END_MARKER   = "function isGameComplete";
const si = src.indexOf(START_MARKER);
const ei = src.indexOf(END_MARKER);
if (si === -1 || ei === -1) { console.error("Markers not found! si=", si, "ei=", ei); process.exit(1); }
const before = src.slice(0, si);
const after  = src.slice(ei);

const CDN_PHASER  = "https://cdnjs.cloudflare.com/ajax/libs/phaser/3.60.0/phaser.min.js";
const CDN_THREE   = "https://cdnjs.cloudflare.com/ajax/libs/three.js/r134/three.min.js";
const CDN_PYODIDE = "https://cdn.jsdelivr.net/pyodide/v0.23.4/full/pyodide.js";
const CDN_P5      = "https://cdnjs.cloudflare.com/ajax/libs/p5.js/1.9.0/p5.min.js";
const CDN_KABOOM  = "https://unpkg.com/kaboom@3000.0.1/dist/kaboom.js";
const CDN_BABYLON = "https://cdn.babylonjs.com/babylon.js";
const CDN_PIXI    = "https://cdnjs.cloudflare.com/ajax/libs/pixi.js/7.2.4/pixi.min.js";

function esc(s) { return s.replace(/`/g, "\\`").replace(/\$\{/g, "\\${"); }

// ─── World hint extractor + Style hint extractor ──────────────────────────────
const extractorSrc = `
// ── World detail extractor ────────────────────────────────────────────────────
function extractWorldHints(prompt: string): string {
  const p = prompt.toLowerCase();
  const hints: string[] = [];

  // Protagonist gender + archetype
  if (/\\b(woman|female|girl|her|she)\\b/.test(p)) hints.push("female protagonist");
  else if (/\\b(man|male|boy|his|he)\\b/.test(p)) hints.push("male protagonist");
  const races = ["human","elf","dwarf","orc","vampire","demon","angel","robot","cyborg","alien",
    "undead","ninja","samurai","knight","warrior","wizard","mage","assassin","soldier","marine",
    "zombie","mutant","pirate","hunter","monk","paladin","ranger","berserker","druid","sorcerer",
    "android","ghost","witch","warlock","barbarian","gladiator","mercenary","bounty hunter",
    "special forces","spec ops","commando","sniper","ghost operative","resistance fighter"];
  races.forEach(r => { if (p.includes(r)) hints.push(r); });

  // Build / physique
  if (/\\b(tall|large|giant|huge|muscular|buff|heavyset)\\b/.test(p)) hints.push("tall muscular build");
  if (/\\b(small|tiny|slim|lean|agile|lithe|petite)\\b/.test(p)) hints.push("slim agile build");

  // Military / tactical gear
  if (/\\bmilitary\\b|combat|tactical|operator|spec.?ops|soldier|marine|commando/.test(p)) {
    hints.push("full tactical kit: multicam camo pattern, plate carrier with MOLLE webbing, helmet with NVG mount, balaclava/mask, tactical gloves, knee pads, boots, backpack");
  }
  if (/\\barmor\\b|\\barmour\\b/.test(p)) hints.push("detailed full-body armor: pauldrons, chest plate with rivets, gauntlets, greaves, visor, backplate");
  if (/\\brobe\\b/.test(p)) hints.push("flowing robes with mystical runes and ornate trim, cloth physics");
  if (/\\bcloak\\b|\\bhood\\b/.test(p)) hints.push("dramatic hooded cloak, cloth segment physics");
  if (/\\bexosuit\\b|\\bmech.?suit\\b/.test(p)) hints.push("hi-tech exo-suit: panel seams, glowing HUD visor, thruster vents, articulated joints");

  // Weapons
  if (/\\bassault.?rifle\\b|\\bm4\\b|\\bak.?47\\b|rifle/.test(p)) hints.push("assault rifle: detailed receiver+barrel+handguard+magazine+stock+sights+muzzle flash");
  if (/\\bsniper\\b/.test(p)) hints.push("sniper rifle: long barrel+bipod+scope+bolt handle");
  if (/\\bshotgun\\b/.test(p)) hints.push("shotgun: wide barrel+pump grip+stock");
  if (/\\bpistol\\b|handgun/.test(p)) hints.push("pistol: compact frame+slide+trigger guard+grip");
  if (/\\bsword\\b|\\bblade\\b|\\bkatana\\b/.test(p)) hints.push("sword: hilt+cross guard+blade with edge highlight and fuller groove");
  if (/\\bbow\\b|arrow|quiver/.test(p)) hints.push("bow with recurve limb+drawn string+quiver with arrows");
  if (/\\bstaff\\b|wand|magic/.test(p)) hints.push("magical staff: carved shaft+glowing orb+rune engravings");
  if (/\\baxe\\b/.test(p)) hints.push("battle axe: wide crescent head with notch+long handle");
  if (/\\bshield\\b/.test(p)) hints.push("shield: decorative emblem+metal rim+grip handle");

  // Hair color
  if (/\\bblonde\\b|golden hair/.test(p)) hints.push("blonde hair #FFD700");
  if (/brunette|brown hair/.test(p)) hints.push("brown hair #6B3A2A");
  if (/black hair/.test(p)) hints.push("black hair #111111");
  if (/red hair|redhead/.test(p)) hints.push("red hair #CC2200");
  if (/white hair|silver hair/.test(p)) hints.push("white/silver hair #E8E8E8");

  // Skin tones
  if (/dark skin|brown skin/.test(p)) hints.push("dark skin #5C3D2E lit, #2A1A0E shadow");
  if (/pale skin|fair skin/.test(p)) hints.push("pale skin #F5E6D3 lit, #C4956A shadow");

  // World themes
  if (/cyberpunk/.test(p)) hints.push("cyberpunk: chrome panels, glowing implants, holographic HUDs, neon signs, rain reflections");
  if (/mediev|fantasy/.test(p)) hints.push("medieval fantasy: stone castles, torch fire, heraldic emblems");
  if (/space|sci.fi|futur/.test(p)) hints.push("sci-fi: stars, holographic displays, energy weapon trails");
  if (/horror/.test(p)) hints.push("horror: decay textures, blood splatter, shadow vignette");
  if (/steampunk/.test(p)) hints.push("steampunk: brass gears, steam vents, iron rivets");
  if (/western|cowboy/.test(p)) hints.push("western: dust clouds, wood plank textures, heat shimmer");
  if (/ocean|pirate|sea/.test(p)) hints.push("ocean: wave sine-surface, foam spray, water depth gradient");
  if (/underwater/.test(p)) hints.push("underwater: caustic light rays, bubble streams, bioluminescent glow");
  if (/jungle/.test(p)) hints.push("jungle: layered canopy 5+ green shades, vine curves, dappled light");
  if (/desert|sand/.test(p)) hints.push("desert: sand particle drift, heat shimmer, dune silhouettes");
  if (/ice|snow|winter/.test(p)) hints.push("winter: snowflake fall, frozen surface blue-white gradient");
  if (/lava|volcano/.test(p)) hints.push("volcanic: lava glow orange radial gradient, ember streams");
  if (/apocalypse|post.apoc/.test(p)) hints.push("post-apocalyptic: ash sky, rubble piles, burnt vehicles");
  if (/war|battle|conflict/.test(p)) hints.push("war zone: smoke columns, explosion craters, burning structures, helicopters, dramatic overcast sky");

  // Animals
  ["wolf","dragon","lion","tiger","bear","eagle","snake","spider","horse","shark","panther",
   "fox","raven","scorpion","phoenix","griffin","hydra","cerberus","kraken","dinosaur","raptor"]
    .forEach(a => { if (p.includes(a)) hints.push(\`animal: \${a} — anatomical proportions, fur/scales/feathers 3-layer, iris+highlight+slit pupil, gait cycle\`); });

  // Vehicles
  ["tank","car","truck","helicopter","drone","spaceship","submarine","boat","ship","mech",
   "motorcycle","train","hovercraft","jet","fighter","bomber","aircraft carrier"]
    .forEach(v => { if (p.includes(v)) hints.push(\`vehicle: \${v} — chassis gradient, wheels/tracks, windows semi-transparent, exhaust particles, damage state\`); });

  // Structures
  ["castle","dungeon","tower","temple","ruins","city","building","bunker","fortress","base",
   "cave","laboratory","arena","prison","skyscraper","warehouse"]
    .forEach(s => { if (p.includes(s)) hints.push(\`structure: \${s} — material simulation (stone/metal/wood), windows with glow, weathering, damaged variant\`); });

  return hints.length > 0
    ? \`WORLD DETAIL: \${hints.join("; ")}.\`
    : \`WORLD DETAIL: Invent a richly detailed world — protagonist with layered gear/clothing/weapon, enemy types with distinct silhouettes, atmospheric effects, detailed environment.\`;
}

function extractCharacterHints(prompt: string): string { return extractWorldHints(prompt); }

// ── Style + quality extractor ─────────────────────────────────────────────────
function extractStyleHints(prompt: string, detailLevel: string): string {
  const p = prompt.toLowerCase();
  const hints: string[] = [];

  // Visual style
  if (/cartoon|cel.?shad|toon|styliz|fortnite|overwatch|pixar|anime|animated|comic/.test(p)) {
    hints.push("VISUAL STYLE: CARTOON/STYLIZED — bold outlines (strokeStyle 2-3px, dark color), bright saturated colors, Fortnite-style proportions (head 1/4 of body height, rounded limbs), cel-shading (flat fill + 1 shadow stripe, NO complex gradients on characters), expressive large eyes, smooth rounded shapes, exaggerated idle animations");
  } else if (/pixel|8.bit|16.bit|retro|nostalg|nes|snes|gameboy/.test(p)) {
    hints.push("VISUAL STYLE: PIXEL ART — pixel-perfect crisp rendering using fillRect at integer coordinates, limited palette (8-16 colors), ctx.imageSmoothingEnabled=false everywhere, sprite animations via frame grid arrays, NO anti-aliasing, tile-based environment, chunky character sprites");
  } else if (/neon|synthwave|vaporwave|glow|luminescent|tron/.test(p)) {
    hints.push("VISUAL STYLE: NEON/GLOW — dark backgrounds (#000-#050510), high-saturation neon colors, ctx.shadowBlur=15-25 on all entities (set shadowColor before draw), globalCompositeOperation='screen' for light overlap, lens flare ellipses at light sources, scan line overlay (semi-transparent horizontal lines)");
  } else if (/watercolor|paint|impressionist|artistic|brush/.test(p)) {
    hints.push("VISUAL STYLE: PAINTERLY — soft edges via shadowBlur 6-10, color bleeding via semi-transparent overlapping fills, visible brush stroke irregular rects, muted analogous palette, light texture via noise rects");
  } else if (/minimalist|minimal|flat design|clean|geometric/.test(p)) {
    hints.push("VISUAL STYLE: MINIMALIST — flat solid fills only, NO gradients or textures, geometric shapes (circles/rects/triangles), bold primary palette, thick outlines 3-4px, simple animation (position/scale only)");
  } else if (/runner|subway|endless|infinite.?run/.test(p)) {
    hints.push("VISUAL STYLE: CARTOON RUNNER — bright warm palette, smooth cartoon character proportions, coin sparkle particle burst on collect, speed lines (horizontal streaks at motion blur), 3/4 perspective tilt, vibrant environment color blocks");
  } else if (/photorealist|realistic|hitman|assassin.?creed|gritty|cinematic|hyper.?real/.test(p)) {
    hints.push("VISUAL STYLE: PHOTOREALISTIC — muted desaturated palette, gradient-based 3D form on ALL entities (NO flat fills), material simulation for every surface, depth of field atmospheric haze, cinematic letterbox bars (top+bottom black bars 28px)");
  } else {
    hints.push("VISUAL STYLE: HIGH-QUALITY STYLIZED — gradient-based character volumes, detailed environment, atmospheric effects, aim for AAA indie quality");
  }

  // Detail level spec
  const dl = (detailLevel || "detailed").toLowerCase();
  if (dl === "prototype") {
    hints.push("QUALITY TIER: PROTOTYPE — colored shapes and rects acceptable for characters. Focus entirely on core game loop and mechanics. Basic HUD only. Skip all photorealism agents except ParticleSystem for impacts.");
  } else if (dl === "standard") {
    hints.push("QUALITY TIER: STANDARD — sprite-level art with basic gradient fills. Implement CharacterRenderer LAYERS 1-3 only. Simple atmospheric overlay (1 fog layer). 2-3 enemy types. Standard HUD.");
  } else if (dl === "ultra") {
    hints.push("QUALITY TIER: ULTRA AAA — MAXIMUM visual quality. ALL 8 rendering agents at FULL specification. Every character: all 6 CharacterRenderer layers. Every surface: MaterialSimulator. Full AtmosphericRenderer (100+ particles). LightingEngine with bloom. WindPhysics on cloth. 300-particle pool. Full draw order 15 layers. Target quality: Call of Duty / Hitman / Assassin's Creed level.");
  } else {
    hints.push("QUALITY TIER: HIGH DETAIL — Implement CharacterRenderer (all 6 layers), AtmosphericRenderer (smoke+fire+fog), MaterialSimulator (metal/stone/fabric), LightingEngine (point+muzzle+ambient), ParticleSystem (150-particle pool). Detailed 4+ enemy types, full HUD, boss fight.");
  }

  // Character sheet / multi-view mode
  if (/character.*sheet|char.*sheet|multiple.*view|front.*back.*side|3.*view|turn.?around|reference.*sheet|all.*angle/.test(p)) {
    hints.push("CHARACTER SHEET MODE: Render a CHARACTER VIEWER instead of a standard combat game. Canvas split into panels: LEFT=FRONT view (full body, facing camera), CENTER=3/4 view (slight turn), RIGHT=SIDE/BACK view. Below panels: FACE CLOSE-UP panel, WEAPON DETAIL panel, EQUIPMENT BREAKDOWN panel. Labels for body parts and gear. Click/arrow key to cycle between CHARACTER VIEWS, ABILITY SHOWCASE (show special moves in animation loop), EQUIPMENT COMPARISONS. Display character lore/stats text below viewer.");
  }

  // Multi-NPC / team
  if (/\\bteam\\b|squad|party|co.?op|multiplayer|4.*player/.test(p)) {
    hints.push("MULTI-CHARACTER: Generate 4 distinct hero characters with different silhouettes, color palettes, and weapon archetypes. Each selectable on a character select screen before game start.");
  }

  return hints.join("\\n");
}
`;

// ─── Shared quality + photorealism agents block ────────────────────────────────
const SHARED_FULL_BLOCK = esc(`
═══════════════════════════════════════════════════════════════════
HOOS AI SPECIALIZED RENDERING AGENTS — implement ALL that apply
═══════════════════════════════════════════════════════════════════

━━━ AGENT: StyleAgent ━━━
Detect and apply the visual style from VISUAL STYLE hint above to EVERY entity.
CARTOON: Use bold outlines, flat fills + 1 shadow stripe, rounded shapes, bright palette.
PIXEL ART: fillRect integer coordinates, ctx.imageSmoothingEnabled=false, limited palette, tile grid.
NEON: shadowBlur on all draws, screen blend, dark background.
PHOTOREALISTIC: gradient fills for 3D form, muted palette, material textures, atmospheric haze.
MINIMALIST: geometric shapes only, no gradients, bold primary colors.
RUNNER: 3/4 perspective, coin collectibles with sparkle burst, speed lines.

━━━ AGENT: NarrativeAgent ━━━
Generate from the prompt:
  TITLE: Game title (dramatic, matches theme)
  LORE: 2-sentence backstory shown on intro screen
  MISSION: Primary objective shown as "MISSION: ..." HUD text
  OBJECTIVES: 3 mission objectives (eliminate X / reach Y / collect Z)
  DIALOGUE: 6+ character speech lines for hoosSpeech() calls at: boss spawn, boss phase 2, boss phase 3, player low HP, player win, player lose
  NPC NAMES: Give each enemy type a thematic name (grunt=name, heavy=name, etc.)
  GAME OVER message: 2-line defeat text matching story
  WIN message: 2-line victory text matching story

━━━ AGENT: CharacterSheetAgent ━━━ (activate if CHARACTER SHEET MODE detected)
Draw characters from multiple angles in dedicated viewer panels. Implement:
  front_view(): character facing forward, all gear visible
  side_view(): character facing left, silhouette + depth
  back_view(): character from behind, backpack + hood detail
  face_closeup(): enlarged face panel with detailed features
  weapon_detail(): full weapon isolated in panel with label
  Allow keyboard navigation between views, animate idle breathing

━━━ AGENT: CharacterRenderer ━━━
Multi-layer pipeline for EVERY humanoid entity:
  L0: Contact shadow ellipse (black alpha 0.18) at feet
  L1: Gradient body volumes — createLinearGradient() for each body part (NOT flat fills)
      Skin lit→shadow; Metal armor #9AACBB→#1A2028 + specular; Fabric crosshatch texture
  L2: Surface patterns — camo polygon patches, MOLLE webbing, outfit seam details
  L3: Fine detail — scratches, insignia, weapon attachment points
  L4: Lighting overlay (globalCompositeOperation='overlay', colored by nearest light)
  L5: Rim light (bright arc on backlit edge, alpha 0.4)
  L6: Specular glint (bright ellipse on metal/glass)
  MILITARY GEAR: helmet+NVG bracket, balaclava mesh-dot, plate carrier MOLLE lines, pouches, gloves, boots
  ANATOMY: hair+head+facial features+neck+torso+arms+weapon+legs+boots

━━━ AGENT: AtmosphericRenderer ━━━
class AtmosphericRenderer with smoke[], fire[], wind={x:0.9}, fog[]:
  SMOKE: 100+ particles, per-particle physics (wind drift+buoyancy+drag+growing radius+alpha fade)
    Colors: young rgba(55,45,35,a) → mid rgba(110,108,105,a) → old rgba(195,198,202,a)
    ctx.filter='blur(2px)' on smoke layer pass; reset after
  FIRE: orange-yellow particles rising fast, inner base glow radial gradient, ember sparks with gravity
  VOLUMETRIC FOG: 3 large semi-transparent rect layers scrolling at wind speed, alpha 0.05-0.12
  EXPLOSION: 5-phase (flash→fireball→debris→smoke cloud→shockwave ring)
  WIND: windX = 0.9 + Math.sin(time*0.28)*0.6; applied to all smoke/fire/debris

━━━ AGENT: MaterialSimulator ━━━
Per surface type (apply to ALL platforms, structures, objects):
  metal: gradient #111→#2A2A2A, specular stripe, white ellipse glint, scratch lineStyle
  stone: gradient #5A5550→#3A3533, noise rects (35 scattered dots), crack lineTo paths
  concrete: lighter stone + skid marks + bullet hole circles
  wood: gradient #8B5E3C→#5A3520, sinusoidal grain lineStyle passes
  fabric: flat fill + setLineDash weave at ±45° alpha 0.12
  glass: alpha fill 0.2, reflection arc, edge lineStyle
  skin: gradient lit→shadow, subsurface scatter hint
  water: animated sine-wave strokes, depth gradient fill

━━━ AGENT: LightingEngine ━━━
lights array [{x,y,color,intensity,radius,type}]:
  ambient: dark fillRect fullscreen (multiply blend, alpha 0.22-0.35)
  point lights: radial gradient from source (screen blend) for fire/explosions/lamps
  muzzle flash: PointLight spike (intensity 12, radius 65px, duration 55ms) + 6 spark particles
  shadow: offset dark ellipse behind each entity, stretched per light angle
  bloom: extra semi-transparent glow draw (120% size, alpha 0.15) on bright elements

━━━ AGENT: WindPhysics ━━━
Verlet cloth simulation for capes, hair, flags, scarves (12-20 segments each):
  Update: temp=x; x=x+(x-oldX)*0.98+windX*0.08; oldX=temp; add gravity per segment
  Draw: quadraticCurveTo through segment points (smooth cloth curve)
  Apply to: hair (8 segments from head), capes, banners, smoke wisps

━━━ AGENT: AnimationRigger ━━━
WALK cycle: leg/arm sin(time*freq) alternation; RUN: larger amplitude+forward lean
IDLE: breathing scaleY ±1.5% at 0.4Hz, weight shift sin sway
AIM: weapon arm extended, recoil 4px over 60ms on shoot
HURT: translate(±3,±3) 200ms + red tint overlay
DEATH: ragdoll — each part {vx,vy,rot,rotVel}, gravity, bounce, come to rest
VEHICLE: wheel rotation from velocity, helicopter rotor blur (6-angle draw), tank turret lerp
ENVIRONMENT: foliage sin oscillation with wind, water surface animated sine-waves

━━━ AGENT: EnvironmentPainter ━━━
SKY: multi-stop gradient (overcast: #060810→#0E1520→#1C2535→#283040) + cloud ellipses with blur
TERRAIN: material-accurate ground (MaterialSimulator per surface type)
WEATHER: rain=angled line particles; snow=white dot particles; ash=grey falling
DEPTH: far objects desaturated toward fog color, ctx.filter='blur(1px)' at extreme distance

DRAW ORDER (strictly follow):
  1.Sky 2.Far-BG(parallax 0.04) 3.Fog-BACK 4.Mid-BG(parallax 0.22) 5.Fog-MID
  6.Near-terrain 7.Environment-props 8.Entity-shadows 9.Enemies(back→front)
  10.Player 11.Projectiles+muzzle 12.Explosion-effects 13.Fog-FRONT 14.Weather 15.HUD

━━━ AGENT: ParticleSystem ━━━
class ParticlePool: pre-allocated pool of 300 particles (avoid GC):
  types: smoke|fire|ember|spark|blood|debris|dust|muzzle|explosion
  emit(config): find inactive particle, initialize with config
  update(dt): apply physics (gravity, drag, wind for smoke/fire), age, deactivate if dead
  render(ctx): batch by color group, fillStyle once per group

━━━ HOOS API BRIDGES ━━━
window.hoosMath(theme,cb) — Wolfram physics (call ONCE at init BEFORE game loop):
  var GRAVITY=580,WALK_SPD=240,RUN_SPD=400,JUMP_VEL=580,BULLET_SPD=900;
  hoosMath("gameTheme",function(p){if(p.gameGravityPxS2)GRAVITY=p.gameGravityPxS2;if(p.walkSpeedPxS)WALK_SPD=p.walkSpeedPxS;});

window.hoosSpeech(text,char,emotion) — ElevenLabs character voice (minimum 5 calls per game):
  hoosSpeech("Stand down! This is my territory.", "boss", "sinister");   // boss spawn
  hoosSpeech("Phase two begins NOW!", "boss", "angry");                   // boss phase 2
  hoosSpeech("I'm not done yet...", "hero", "confident");                 // player low HP
  hoosSpeech("Target neutralized. Good work.", "npc", "excited");         // kill streak
  hoosSpeech("Victory is ours!", "hero", "excited");                      // win

window.hoosAnalytics(event,data) — Snowflake events:
  hoosAnalytics("kill",{enemy:"boss",score,level,combo});
  hoosAnalytics("win",{score,stars,time:Date.now()-startTime});
  hoosAnalytics("death",{cause,level,score});

═══════════════════════════════════════════════════════════════════
`);

// ─── Engine builders ──────────────────────────────────────────────────────────
function buildPhaser(cdn) {
  return `\`You are HOOS AI — elite AAA game studio. Build a COMPLETE, fully playable Phaser 3 game from: "\${userPrompt}"
Apply VISUAL STYLE, QUALITY TIER, and WORLD DETAIL from hints below.
Wrap output in \\\`\\\`\\\`html ... \\\`\\\`\\\`. <!DOCTYPE html> open, </html> close.
Load Phaser from: ${cdn.phaser} (blocking <script src>, NO defer/async)
html,body{width:100%;height:100%;margin:0;overflow:hidden}
Web Audio API for ALL sounds. NEVER truncate — implement every system in full.

\${charHints}
\${styleHints}

${SHARED_FULL_BLOCK}

═══ PHASER 3 IMPLEMENTATION ═══

LORE INTRO: 2.5s cinematic (NarrativeAgent title+lore text, character silhouette reveal, mission briefing)

PLAYER SPRITE (48×64 canvas texture) — CharacterRenderer all 6 layers per VISUAL STYLE above:
  If CARTOON: bold outlines, rounded shapes, bright fills + 1 shadow stripe
  If PHOTOREALISTIC: gradient volumes per body part, material simulation, specular glints
  If PIXEL: integer-aligned fillRects, limited palette, no AA
  Full anatomy: hair, facial features, neck, torso (outfit per world hints), arms, weapon (full detail), legs, boots

4 ENEMY TYPES with distinct silhouettes (CharacterRenderer each, NarrativeAgent names):
  Type 1 Grunt: smaller, faster; Type 2 Ranger: tall+ranged; Type 3 Heavy: wide+armored; Type 4 Aerial: flying
  Boss: 96×80 multi-part sprite, chest glow, 3-phase AI, NarrativeAgent phase dialogue

ENVIRONMENT TEXTURES — MaterialSimulator per surface:
  plat_concrete, plat_metal, plat_dirt, plat_wood — all with material-appropriate surface detail
  Item pickups: hp, ammo, star, power, shield, speed (detailed icons)

ATMOSPHERIC SYSTEM — AtmosphericRenderer as Phaser particles + custom draw:
  4-6 smoke emitters across level; fire at hazard zones; 3-layer fog scrolling; weather per theme

PARALLAX (3 layers setScrollFactor): sky+clouds (0.04), mid structures (0.22), near foreground (0.55)
  EnvironmentPainter SKY: dramatic gradient + clouds with blur + god rays

LEVEL: 9000px, 3 zones (light→medium→hard)
  12+ platforms zone 1; hazards + moving platforms zone 2; boss lock-in zone 3
  this.physics.world.setBounds(0,0,9000,560); cameras.main.setBounds(0,0,9000,560)
  cameras.main.startFollow(player,true,0.1,0.1); setDeadzone(200,100)

PLAYER: hp=100,maxHp=100,lives=3,stamina=100,score=0,combo=0,ammo=30,level=1,xp=0,jumpsLeft=2,dashCd=0,invTimer=0
  WASD/arrows=move, SHIFT=sprint (×1.65+stamina drain), W/UP=jump (double-jump), Z=melee (65px arc+30dmg), X=shoot, C=special/dash
  Wall-slide, dash (double-tap 220ms ±520vel, 400ms cd), invincibility 1500ms post-hit (alpha flicker)
  XP/Level up: +18 maxHp, +6 damage; combo ×1-×5 multiplier + score pulse text

4 ENEMY AI: patrol+aggro+attack patterns; HP bars; death particle burst; NarrativeAgent names + taunts
BOSS 3-phase: summon enemies, camera.shake, phase transitions with hoosSpeech + NarrativeAgent dialogue

HUD (setScrollFactor 0, depth 100): HP gradient bar, stamina bar, score, lives, ammo, level+XP arc, combo ×N
  Boss HP full-width (hidden until boss), mini-map 85×55 (player+enemies+boss dots), kill feed last 3

AUDIO: bgm() 12-note loop in minor key + NarrativeAgent theme + 12+ sfx functions
WOLFRAM: hoosMath("\\${userPrompt}",function(p){if(p.gameGravityPxS2)GRAVITY=p.gameGravityPxS2;});
SPEECH: minimum 5 hoosSpeech calls from NarrativeAgent dialogue at: boss spawn, phase2, phase3, low HP, win
ANALYTICS: hoosAnalytics("kill"), hoosAnalytics("win"), hoosAnalytics("death")

config: {type:AUTO,width:960,height:560,physics:{default:'arcade',arcade:{gravity:{y:580},debug:false}},scene:[Boot,Game],scale:{mode:Phaser.Scale.FIT,autoCenter:Phaser.Scale.CENTER_BOTH}}

IMPLEMENT ALL 8 AGENTS + NarrativeAgent + StyleAgent. ALL visuals/audio match: \${userPrompt}\``;
}

function buildThree(cdn) {
  return `\`You are HOOS AI — elite AAA 3D game studio. Build a COMPLETE Three.js r134 FPS from: "\${userPrompt}"
Apply VISUAL STYLE, QUALITY TIER hints. Target: Call of Duty / Halo / Hitman quality.
Wrap in \\\`\\\`\\\`html ... \\\`\\\`\\\`. Load Three.js from: ${cdn.three} (blocking <script src>)
html,body{width:100%;height:100%;margin:0;overflow:hidden} Web Audio API. NEVER truncate.

\${charHints}
\${styleHints}

${SHARED_FULL_BLOCK}

═══ THREE.JS FPS IMPLEMENTATION ═══

RENDERER: THREE.WebGLRenderer({antialias:true}), shadowMap PCFSoft, setPixelRatio(Math.min(devicePixelRatio,2)), ACESFilmic tonemapping 1.2

LORE INTRO: NarrativeAgent title+mission briefing as HTML overlay (2.5s, then dismiss)

LIGHTING (LightingEngine): AmbientLight 0.35, DirectionalLight castShadow mapSize 2048, 2 PointLights (fire flicker), SpotLight boss arena, HemisphericLight bounce

PLAYER: PointerLock; WASD+mouse look; head-bob; SHIFT sprint; C crouch; SPACE double-jump; F melee; G grenade
  hp=100,armor=50,stamina=100; regen+1.8/s after 5s no damage; HUD all stats

3 WEAPONS (keys 1/2/3): MeshStandardMaterial({metalness:0.92,roughness:0.12}) compound viewmodel
  Weapon sway; muzzle PointLight spike; shell ejection particles; reload animation
  Ammo casings: small gold CylinderGeometry ejecting right at fire with gravity

PARTICLES (ParticleSystem): THREE.Points smoke (100 particles, rising, wind); fire (orange-yellow); explosion 5-phase; blood; muzzle flash sparks

ENVIRONMENT (MaterialSimulator as MeshStandardMaterial): concrete roughness 0.95, metal roughness 0.08/metalness 0.95, stone roughness 0.9
  3 ARENAS connected by corridors: Arena1 (cover objects), Arena2 (multi-level ramps), Arena3 (boss room, pillar CylinderGeometry)
  30+ decorative meshes, all PBR materials; boundary collision walls

4 ENEMY TYPES + BOSS: compound THREE.Group meshes, PBR materials per body part
  HP bars via CSS positioned via camera.project(); pain flash emissive spike; death fragment scatter
  BOSS: 6-part compound, emissive pulse, hp=150, 3-phase AI + NarrativeAgent dialogue + hoosSpeech

COMBAT: Raycaster hitscan; damage numbers float+fade; projectile SphereGeometry; explosion full 5-phase

HUD: Crosshair CSS divs (spread on move), HP bar, armor bar, stamina, ammo counter, radar 125×125 canvas, kill feed, boss HP bar, objective text

GAME LOOP: clock.getDelta(), dt=Math.min(delta,0.04); updateAll; renderer.render

hoosMath("\\${userPrompt}",function(p){if(p.gameGravityPxS2)GRAVITY=p.gameGravityPxS2;});
Minimum 5 hoosSpeech NarrativeAgent dialogue calls. hoosAnalytics on kills/win/death.

ALL visuals/atmosphere/audio match: \${userPrompt}\``;
}

function buildBabylon(cdn) {
  return `\`You are HOOS AI — elite AAA 3D studio. Build a COMPLETE Babylon.js game from: "\${userPrompt}"
Apply VISUAL STYLE, QUALITY TIER hints. Target: Halo / Battlefield quality.
Wrap in \\\`\\\`\\\`html ... \\\`\\\`\\\`. Load Babylon from: ${cdn.babylon} (blocking <script src>)
html,body{width:100%;height:100%;margin:0;overflow:hidden} Web Audio API. NEVER truncate.

\${charHints}
\${styleHints}

${SHARED_FULL_BLOCK}

═══ BABYLON.JS IMPLEMENTATION ═══

<canvas id="c" style="width:100%;height:100%;display:block;touch-action:none">
const engine=new BABYLON.Engine(canvas,true,{adaptToDeviceRatio:true,stencil:true});
const scene=new BABYLON.Scene(engine);
scene.gravity=new BABYLON.Vector3(0,-28,0); scene.collisionsEnabled=true;
scene.fogMode=BABYLON.Scene.FOGMODE_EXP2; scene.fogDensity=0.018;

LORE INTRO: NarrativeAgent overlay (BABYLON.GUI.TextBlock)

LIGHTING (LightingEngine): HemisphericLight sky+ground, DirectionalLight castShadow (ShadowGenerator 2048), 2 PointLights fire flicker, SpotLight boss

CAMERA: UniversalCamera WASD+mouse; yVelocity gravity -30/s²; jump=10.5; double-jump; sprint×2
  hp=100,armor=50,stamina=100; regen+2/s after 5s; all stats in HUD

WEAPONS (3): PBRMaterial({metallic:0.95,roughness:0.05}); muzzle flash PointLight spike; reload anim
PARTICLES (BABYLON.ParticleSystem): smoke 120, fire 80, explosion 200, blood 30, muzzle 15

ENVIRONMENT (MaterialSimulator as PBRMaterial): roughness/metallic per surface type
  Ground, 3 arenas with themed PBRMaterials, 30+ decorative meshes
  BABYLON.VolumetricLightScatteringPostProcess for god rays

4 ENEMY TYPES + BOSS: BABYLON.TransformNode compound groups; PBRMaterials; full 4-type+boss AI
  BOSS: BABYLON.GlowLayer on emissive parts phase3; hp=150; 3-phase + NarrativeAgent dialogue

COMBAT: BABYLON.Ray hitscan; projectiles; ExplosionSystem 5-phase; damage numbers BABYLON.GUI

HUD: BABYLON.GUI.AdvancedDynamicTexture.CreateFullscreenUI; all bars, crosshair, radar, boss bar, kill feed

engine.runRenderLoop(()=>{ const dt=engine.getDeltaTime()/1000; update(dt); scene.render(); });
window.addEventListener('resize',()=>engine.resize());

hoosMath("\\${userPrompt}",function(p){if(p.gameGravityPxS2)GRAVITY=p.gameGravityPxS2;});
5+ hoosSpeech NarrativeAgent calls. hoosAnalytics on kill/win/death.
ALL visuals/atmosphere/audio match: \${userPrompt}\``;
}

function buildP5(cdn) {
  return `\`You are HOOS AI — elite AAA 2D game studio. Build a COMPLETE p5.js game from: "\${userPrompt}"
Apply VISUAL STYLE, QUALITY TIER hints. Target: near-photorealistic 2D or ultra-stylized per style.
Wrap in \\\`\\\`\\\`html ... \\\`\\\`\\\`. Load p5 from: ${cdn.p5} (blocking <script src>)
html,body{width:100%;height:100%;margin:0;overflow:hidden} Web Audio API. NEVER truncate.

\${charHints}
\${styleHints}

${SHARED_FULL_BLOCK}

═══ P5.JS IMPLEMENTATION ═══

Access canvas 2D API via drawingContext: drawingContext.createLinearGradient(), .shadowBlur, .globalCompositeOperation, .setLineDash()

LORE INTRO: NarrativeAgent title+lore on a splash screen (2.5s, then game starts)

class CharacterRenderer with StyleAgent adaptations:
  CARTOON mode: bold outlines, round shapes, flat fills + shadow stripe, exaggerated proportions
  PHOTOREALISTIC mode: 6-layer gradient pipeline, material simulation, atmospheric lighting
  PIXEL mode: integer fillRect, imageSmoothingEnabled=false, limited palette
  drawPlayer(x,y,state,frame,facing,hints): adapts per style
  drawEnemy(e,camX): per e.type with distinct silhouette
  drawBoss(boss,camX,time): multi-part large draw, phase color, glowing core

class AtmosphericRenderer: smoke[]+fire[]+fog[]+wind; blur filter; screen blend fire; 3 fog layers
class ParticlePool: 300-particle pre-allocated; 9 types; physics per type
class LightingEngine: applyPointLight, applyMuzzleFlash, applyShadow, applyBloom
class WindPhysics: Verlet segments for cloth/hair simulation
class AnimationSystem: walk/run/idle/aim/hurt/death-ragdoll cycles

PLAYER: full stats + double-jump + wall-slide + dash + sprint + combo
4 ENEMY CLASSES (CharacterRenderer each): different silhouettes, colors, AI behaviors
BOSS: multi-part draw, 3-phase AI, NarrativeAgent dialogue, 5 hoosSpeech calls

LEVEL 9000px 3 zones: draw_background (EnvironmentPainter), draw_terrain (MaterialSimulator platforms), parallax 3 layers
HAZARD zones: glowing shadowBlur zones (lava/ice/electricity themed)

HUD: gradient HP bar, stamina, score pulse, combo ×N, lives, ammo, level+XP arc, boss bar full-width, mini-map 105×68
AUDIO: bgm() 12-note dramatic oscillator + 12+ sfx functions

hoosMath("\\${userPrompt}",function(p){if(p.gameGravityPxS2)GRAVITY=p.gameGravityPxS2;});
5+ hoosSpeech NarrativeAgent calls. hoosAnalytics. windowResized(): resizeCanvas(windowWidth,windowHeight)
ALL visuals/audio match: \${userPrompt}\``;
}

function buildKaboom(cdn) {
  return `\`You are HOOS AI — elite AAA game studio. Build a COMPLETE Kaboom.js game from: "\${userPrompt}"
Apply VISUAL STYLE, QUALITY TIER hints. Target: high-quality stylized 2D.
Wrap in \\\`\\\`\\\`html ... \\\`\\\`\\\`. Load Kaboom from: ${cdn.kaboom} (blocking <script src>)
html,body{width:100%;height:100%;margin:0;overflow:hidden} Web Audio API. NEVER truncate.

\${charHints}
\${styleHints}

${SHARED_FULL_BLOCK}

═══ KABOOM.JS IMPLEMENTATION ═══

kaboom({width:960,height:560,background:[10,14,26],canvas:document.getElementById('c')})

SPRITE GENERATION via OffscreenCanvas: for each sprite, create canvas, apply CharacterRenderer pipeline adapted per VISUAL STYLE:
  CARTOON: bold outlines + flat fills; PHOTOREALISTIC: gradient volumes; PIXEL: integer rects + limited palette

PLAYER SPRITE (48×64): CharacterRenderer all relevant layers per style + anatomy per world hints
4 ENEMY SPRITES (distinct silhouettes + CharacterRenderer each): grunt, ranger, heavy, aerial
BOSS SPRITE (96×80): multi-part with glowing core (shadowBlur=20)
ENVIRONMENT SPRITES: MaterialSimulator per surface type

SCENE "game":
  3-zone level, addLevel() 9000px; player full attrs (lives=3,stamina=100,ammo=30,score=0,combo=0,level=1,xp=0,jumpsLeft=2)
  4 ENEMY TYPES + BOSS: onUpdate() AI; HP bars via onDraw()

ATMOSPHERIC: AtmosphericRenderer in onDraw() pass — smoke, fire, fog layers drawn ABOVE terrain, BELOW HUD
HUD: onDraw() — HP gradient bar, stamina, score, lives, ammo, level, combo, boss bar, mini-map

hoosMath("\\${userPrompt}",function(p){if(p.gameGravityPxS2)setGravity(p.gameGravityPxS2);});
5+ hoosSpeech NarrativeAgent dialogue calls. hoosAnalytics.
ALL visuals match: \${userPrompt}\``;
}

function buildPixi(cdn) {
  return `\`You are HOOS AI — elite AAA 2D studio. Build a COMPLETE PixiJS v7 game from: "\${userPrompt}"
Apply VISUAL STYLE, QUALITY TIER hints. Target: near-photorealistic cinematic 2D.
Wrap in \\\`\\\`\\\`html ... \\\`\\\`\\\`. Load PixiJS from: ${cdn.pixi} (blocking <script src>)
html,body{width:100%;height:100%;margin:0;overflow:hidden} Web Audio API. NEVER truncate.

\${charHints}
\${styleHints}

${SHARED_FULL_BLOCK}

═══ PIXI.JS IMPLEMENTATION ═══

const app=new PIXI.Application({width:960,height:560,backgroundColor:0x0A0C14,antialias:true,resolution:window.devicePixelRatio||1,autoDensity:true});
document.body.appendChild(app.view); app.view.style.cssText='width:100%;height:100%';

class EntityRenderer: bakes textures to PIXI.RenderTexture via PIXI.Graphics + CharacterRenderer pipeline adapted per VISUAL STYLE
  CARTOON: bold fillColor + strokeColor outlines; PHOTOREALISTIC: multi-layer overlapping shapes simulating gradients; PIXEL: integer coordinates

class AtmosphericSystem extends PIXI.Container:
  smoke/fire PIXI.Graphics[] pools; PIXI.BLEND_MODES.SCREEN for fire; fog layers; PIXI.filters.BlurFilter on smoke container
class PixiParticlePool: PIXI.Graphics[300]; 9 types; physics; batch render
class LightingEngine: PIXI.Graphics overlay rects (MULTIPLY ambient), radial gradient circles (SCREEN point lights)
class WindPhysics: Verlet cloth segments

PLAYER extends PIXI.Container: EntityRenderer texture + walk cycle child rotation + WindPhysics cape
4 ENEMY TYPES + BOSS: EntityRenderer per type; full AI; HP PIXI.Graphics bars; death fragments
BOSS: multi-part PIXI.Container + PIXI.filters.GlowFilter on core; 3-phase AI + NarrativeAgent dialogue

LEVEL (3 zones 9000px): platform array, 3 PIXI.Container parallax layers
HUD: separate PIXI.Container (z=top): HP bar, stamina, score, combo, ammo, level+XP, boss bar, mini-map canvas

app.ticker.add((delta)=>{ const dt=delta/60; update(dt); });
window.addEventListener('resize',()=>{ app.renderer.resize(innerWidth,innerHeight); });

hoosMath("\\${userPrompt}",function(p){if(p.gameGravityPxS2)GRAVITY=p.gameGravityPxS2;});
5+ hoosSpeech NarrativeAgent calls. hoosAnalytics.
ALL visuals match: \${userPrompt}\``;
}

function buildPython(cdn) {
  return `\`You are HOOS AI — elite AAA game studio. Build a COMPLETE Python/Pyodide canvas game from: "\${userPrompt}"
Apply VISUAL STYLE, QUALITY TIER hints.
Wrap in \\\`\\\`\\\`html ... \\\`\\\`\\\`. Load Pyodide from: ${cdn.pyodide}
ALL game logic in Python inside pyodide.runPythonAsync(). NEVER truncate.

\${charHints}
\${styleHints}

${SHARED_FULL_BLOCK}

═══ PYTHON / PYODIDE IMPLEMENTATION ═══

HTML:
<style>*{margin:0;padding:0}html,body{width:100%;height:100%;background:#000;overflow:hidden}</style>
<script>window.hoosKeyDown={};document.addEventListener("keydown",e=>window.hoosKeyDown[e.code]=true);document.addEventListener("keyup",e=>window.hoosKeyDown[e.code]=false);</script>
<canvas id="c" width="960" height="560" style="display:block;width:100%;height:100%"></canvas>
<div id="hud" style="position:fixed;top:0;left:0;width:100%;pointer-events:none"></div>
<script src="${cdn.pyodide}"></script>
<script>loadPyodide().then(async py=>{ await py.runPythonAsync(document.getElementById('hoos-py').textContent); });</script>
<script type="text/python" id="hoos-py">
import js, math, random, asyncio
from pyodide.ffi import create_proxy
W,H=960,560
canvas=js.document.getElementById("c"); ctx=canvas.getContext("2d"); hud=js.document.getElementById("hud")
def keys(): return getattr(js.window,"hoosKeyDown").to_py()

# CharacterRenderer (adapted per VISUAL STYLE in style hints)
# StyleAgent: detect style from hints and apply appropriate rendering in each draw function
# NarrativeAgent: implement lore from hints as intro overlay + hoosSpeech calls
# AtmosphericRenderer: smoke particles, fire, fog, wind as class
# MaterialSimulator: draw_platform() with surface-type gradients
# LightingEngine: draw_light_overlay() with composite operations
# ParticlePool: 150-particle pre-allocated array
# AnimationSystem: walk/run/idle cycles via sin(time)
# EnvironmentPainter: draw_background() with sky gradient + clouds

# All 8 agents implemented as Python classes/functions.
# Player, 4 enemy types, boss with 3-phase AI.
# 9000px level, 3 zones; parallax background; HUD; 12+ audio sfx.
# hoosMath, hoosSpeech (5+ NarrativeAgent dialogue calls), hoosAnalytics integrated.
# COMPLETE async game loop at 60fps.

GRAVITY=700; WALK_SPD=240; RUN_SPD=400; JUMP_VEL=580
js.window.hoosMath("\\${userPrompt}", create_proxy(lambda p: None))

async def game_loop():
  last=js.Date.now()/1000
  while True:
    now=js.Date.now()/1000; dt=min(now-last,0.04); last=now
    update(dt); draw()
    await asyncio.sleep(1/60)

asyncio.ensure_future(game_loop())
</script>

ALL entity visuals, atmospheric effects, audio match: \${userPrompt}\``;
}

// ─── Assemble TypeScript source ───────────────────────────────────────────────
const cdn = { phaser:CDN_PHASER, three:CDN_THREE, pyodide:CDN_PYODIDE, p5:CDN_P5, kaboom:CDN_KABOOM, babylon:CDN_BABYLON, pixi:CDN_PIXI };

const buildPromptSrc = `
// ── Engine-specific system prompts ────────────────────────────────────────────
function buildPrompt(userPrompt: string, language: string, detailLevel = "detailed"): string {
  const charHints = extractWorldHints(userPrompt);
  const styleHints = extractStyleHints(userPrompt, detailLevel);

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
  return buildPrompt(userPrompt, "js-phaser", detailLevel);
}
`;

const newContent = before + extractorSrc + buildPromptSrc + "\n" + after;
writeFileSync(file, newContent, "utf8");
console.log("rebuild-prompt done —", newContent.length, "chars →", file);
