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

// ─── World hint + Style hint extractors ──────────────────────────────────────
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
    hints.push("full tactical kit: multicam camo, plate carrier MOLLE, helmet+NVG mount, balaclava, tactical gloves, knee pads, boots, backpack");
  }
  if (/\\barmor\\b|\\barmour\\b/.test(p)) hints.push("detailed armor: pauldrons, chest plate+rivets, gauntlets, greaves, visor, backplate");
  if (/\\brobe\\b/.test(p)) hints.push("flowing robes with mystical runes and ornate trim");
  if (/\\bcloak\\b|\\bhood\\b/.test(p)) hints.push("dramatic hooded cloak with cloth physics segments");
  if (/\\bexosuit\\b|\\bmech.?suit\\b/.test(p)) hints.push("hi-tech exo-suit: panel seams, glowing HUD visor, thruster vents, articulated joints");

  // Weapons
  if (/\\bassault.?rifle\\b|\\bm4\\b|\\bak.?47\\b|rifle/.test(p)) hints.push("assault rifle: receiver+barrel+handguard+magazine+stock+sights+muzzle flash");
  if (/\\bsniper\\b/.test(p)) hints.push("sniper rifle: long barrel+bipod+scope+bolt handle");
  if (/\\bshotgun\\b/.test(p)) hints.push("shotgun: wide barrel+pump grip+stock");
  if (/\\bpistol\\b|handgun/.test(p)) hints.push("pistol: compact frame+slide+trigger guard+grip");
  if (/\\bsword\\b|\\bblade\\b|\\bkatana\\b/.test(p)) hints.push("sword: hilt+cross guard+blade with edge highlight and fuller groove");
  if (/\\bbow\\b|arrow|quiver/.test(p)) hints.push("bow with recurve limb+drawn string+quiver with arrows");
  if (/\\bstaff\\b|wand|magic/.test(p)) hints.push("magical staff: carved shaft+glowing orb+rune engravings");
  if (/\\baxe\\b/.test(p)) hints.push("battle axe: crescent head with notch+long handle");
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
  if (/war|battle|conflict/.test(p)) hints.push("war zone: smoke columns, craters, burning structures, dramatic overcast sky");

  // Animals
  ["wolf","dragon","lion","tiger","bear","eagle","snake","spider","horse","shark","panther",
   "fox","raven","scorpion","phoenix","griffin","hydra","cerberus","kraken","dinosaur","raptor"]
    .forEach(a => { if (p.includes(a)) hints.push(\`animal: \${a} — anatomical proportions, fur/scales/feathers 3-layer, iris+highlight+slit pupil, gait cycle\`); });

  // Vehicles
  ["tank","car","truck","helicopter","drone","spaceship","submarine","boat","ship","mech",
   "motorcycle","train","hovercraft","jet","fighter","bomber"]
    .forEach(v => { if (p.includes(v)) hints.push(\`vehicle: \${v} — chassis gradient, wheels/tracks, windows semi-transparent, exhaust particles, damage state\`); });

  // Structures
  ["castle","dungeon","tower","temple","ruins","city","bunker","fortress","base","cave",
   "laboratory","arena","prison","skyscraper","warehouse"]
    .forEach(s => { if (p.includes(s)) hints.push(\`structure: \${s} — material simulation (stone/metal/wood), windows with glow, weathering, damaged variant\`); });

  return hints.length > 0
    ? \`WORLD DETAIL: \${hints.join("; ")}.\`
    : "WORLD DETAIL: Invent a richly detailed world — protagonist with layered gear/weapon, distinct enemy types, atmospheric effects, detailed environment.";
}

function extractCharacterHints(prompt: string): string { return extractWorldHints(prompt); }

// ── Style + quality extractor ─────────────────────────────────────────────────
function extractStyleHints(prompt: string, detailLevel: string): string {
  const p = prompt.toLowerCase();
  const hints: string[] = [];

  // Visual style detection
  if (/cartoon|cel.?shad|toon|styliz|fortnite|overwatch|pixar|anime|animated|comic/.test(p)) {
    hints.push("VISUAL STYLE: CARTOON/STYLIZED — bold outlines strokeStyle 2-3px dark color, bright saturated palette, Fortnite-like proportions (head 1/4 body height, rounded limbs), cel-shading (flat fill + 1 shadow stripe NO complex gradients on characters), expressive large eyes, smooth rounded shapes, exaggerated idle animations");
  } else if (/pixel|8.bit|16.bit|retro|nostalg|nes|snes|gameboy/.test(p)) {
    hints.push("VISUAL STYLE: PIXEL ART — pixel-perfect crisp rendering using fillRect at integer coordinates, limited palette 8-16 colors, ctx.imageSmoothingEnabled=false everywhere, sprite animations via frame grid arrays, NO anti-aliasing, tile-based environment, chunky character sprites");
  } else if (/neon|synthwave|vaporwave|glow|luminescent|tron/.test(p)) {
    hints.push("VISUAL STYLE: NEON/GLOW — dark backgrounds #000-#050510, high-saturation neon colors, ctx.shadowBlur=15-25 on all entities set shadowColor before draw, globalCompositeOperation='screen' for light overlap, lens flare ellipses at light sources, scan line overlay semi-transparent horizontal lines");
  } else if (/watercolor|paint|impressionist|artistic|brush/.test(p)) {
    hints.push("VISUAL STYLE: PAINTERLY — soft edges via shadowBlur 6-10, color bleeding semi-transparent overlapping fills, irregular rect brush strokes, muted analogous palette, light noise texture");
  } else if (/minimalist|minimal|flat design|clean|geometric/.test(p)) {
    hints.push("VISUAL STYLE: MINIMALIST — flat solid fills only NO gradients or textures, geometric shapes circles/rects/triangles, bold primary palette, thick outlines 3-4px, simple position/scale animations only");
  } else if (/runner|subway|endless|infinite.?run/.test(p)) {
    hints.push("VISUAL STYLE: CARTOON RUNNER — bright warm palette, smooth cartoon proportions, coin sparkle burst on collect, speed lines horizontal streaks at motion blur, 3/4 perspective tilt, vibrant environment color blocks");
  } else if (/photorealist|realistic|hitman|assassin|gritty|cinematic|hyper.?real/.test(p)) {
    hints.push("VISUAL STYLE: PHOTOREALISTIC — muted desaturated palette, gradient-based 3D form on ALL entities NO flat fills, material simulation every surface, depth-of-field atmospheric haze, cinematic letterbox bars top+bottom 28px black");
  } else {
    hints.push("VISUAL STYLE: HIGH-QUALITY STYLIZED — gradient-based character volumes, detailed environment, atmospheric effects, AAA indie quality");
  }

  // Quality tier
  const dl = (detailLevel || "detailed").toLowerCase();
  if (dl === "prototype") {
    hints.push("QUALITY TIER: PROTOTYPE — colored shapes and rects acceptable for characters. Focus entirely on core game loop and mechanics. Basic HUD. Skip all photorealism agents except ParticleSystem for impacts.");
  } else if (dl === "standard") {
    hints.push("QUALITY TIER: STANDARD — sprite-level art with basic gradient fills. Implement CharacterRenderer layers 1-3 only. Simple atmospheric overlay 1 fog layer. 2-3 enemy types. Standard HUD.");
  } else if (dl === "ultra") {
    hints.push("QUALITY TIER: ULTRA AAA — MAXIMUM visual quality. ALL 8 rendering agents at FULL specification. Every character all 6 CharacterRenderer layers. Every surface MaterialSimulator. Full AtmosphericRenderer 100+ particles. LightingEngine with bloom. WindPhysics on cloth. 300-particle pool. Full draw order 15 layers. Target quality: Call of Duty / Hitman / Assassin's Creed.");
  } else {
    hints.push("QUALITY TIER: HIGH DETAIL — Implement CharacterRenderer all 6 layers, AtmosphericRenderer smoke+fire+fog, MaterialSimulator metal/stone/fabric, LightingEngine point+muzzle+ambient, ParticleSystem 150-particle pool. 4+ detailed enemy types, full HUD, boss fight.");
  }

  // Character sheet / multi-view mode
  if (/character.*sheet|char.*sheet|multiple.*view|front.*back.*side|3.*view|turn.?around|reference.*sheet|all.*angle/.test(p)) {
    hints.push("CHARACTER SHEET MODE: Render a CHARACTER VIEWER. Canvas split: LEFT=FRONT view full body, CENTER=3/4 view slight turn, RIGHT=SIDE/BACK view. Below: FACE CLOSE-UP panel, WEAPON DETAIL panel, EQUIPMENT BREAKDOWN panel. Labels for body parts and gear. Click/arrow key to cycle between CHARACTER VIEWS, ABILITY SHOWCASE animated loop, EQUIPMENT COMPARISONS. Display character lore/stats text below viewer.");
  }

  // Multi-character team
  if (/\\bteam\\b|squad|party|co.?op|multiplayer|4.*player/.test(p)) {
    hints.push("MULTI-CHARACTER: Generate 4 distinct hero characters with different silhouettes, color palettes, and weapon archetypes. Character select screen before game start.");
  }

  return hints.join("\\n");
}
`;

// ─── Shared photorealism agents block ─────────────────────────────────────────
const SHARED_FULL_BLOCK = esc(`
═══════════════════════════════════════════════════════════════════
HOOS AI SPECIALIZED RENDERING AGENTS — implement ALL that match quality tier
═══════════════════════════════════════════════════════════════════

AGENT StyleAgent: Apply the VISUAL STYLE hint to EVERY entity.
  CARTOON: bold outlines, rounded shapes, bright fills + 1 shadow stripe, large eyes.
  PIXEL ART: fillRect integer coords, imageSmoothingEnabled=false, limited palette, NO AA.
  NEON: shadowBlur on all draws, screen blend mode, dark background.
  PHOTOREALISTIC: gradient fills for 3D form, muted palette, material textures, atmospheric haze.
  MINIMALIST: geometric shapes only, no gradients, bold primary colors.
  RUNNER: 3/4 perspective, coin collectibles with sparkle burst, speed lines.

AGENT NarrativeAgent: Generate from the prompt:
  TITLE: Game title matching the theme
  LORE: 2-sentence backstory shown on intro screen (2.5s cinematic)
  MISSION: Primary objective as "MISSION: ..." HUD text
  OBJECTIVES: 3 objectives (eliminate X / reach Y / collect Z)
  DIALOGUE: 6+ speech lines for hoosSpeech() at boss spawn, boss phase 2, boss phase 3, player low HP, player win, player lose
  NPC NAMES: Thematic name for each enemy type
  GAME OVER message: 2-line defeat text. WIN message: 2-line victory text.

AGENT CharacterSheetAgent (activate only if CHARACTER SHEET MODE is in style hints):
  Draw character from multiple angles in dedicated viewer panels.
  front_view(), side_view(), back_view(), face_closeup(), weapon_detail() functions.
  Keyboard navigation between views. Animate idle breathing.

AGENT CharacterRenderer: Multi-layer pipeline for EVERY humanoid entity:
  L0: Contact shadow ellipse (black alpha 0.18) at feet
  L1: Gradient body volumes — createLinearGradient() for each body part (NOT flat fills)
      Skin lit to shadow; Metal armor #9AACBB to #1A2028 + specular; Fabric crosshatch texture
  L2: Surface patterns — camo polygon patches, MOLLE webbing lines, outfit seam details
  L3: Fine detail — scratches, insignia, weapon attachment points
  L4: Lighting overlay (globalCompositeOperation='overlay', colored by nearest light)
  L5: Rim light (bright arc on backlit edge, alpha 0.4)
  L6: Specular glint (bright ellipse on metal/glass surfaces)
  ANATOMY: hair + head + facial features + neck + torso + arms + weapon (full detail) + legs + boots

AGENT AtmosphericRenderer: class AtmosphericRenderer with smoke[], fire[], wind, fog[]:
  SMOKE: 100+ particles, per-particle physics (wind drift+buoyancy+drag+growing radius+alpha fade)
    Colors: young rgba(55,45,35,a) to mid rgba(110,108,105,a) to old rgba(195,198,202,a)
    ctx.filter='blur(2px)' on smoke layer pass; reset after
  FIRE: orange-yellow particles rising fast, inner base glow radial gradient, ember sparks with gravity
  VOLUMETRIC FOG: 3 large semi-transparent rect layers scrolling at wind speed, alpha 0.05-0.12
  EXPLOSION: 5-phase (flash / fireball / debris / smoke cloud / shockwave ring)
  WIND: windX = 0.9 + Math.sin(time*0.28)*0.6; applied to all smoke/fire/debris particles

AGENT MaterialSimulator: Per surface type apply to ALL platforms, structures, objects:
  metal: gradient #111 to #2A2A2A, specular stripe, white ellipse glint, scratch lineStyle
  stone: gradient #5A5550 to #3A3533, noise rects 35 scattered dots, crack lineTo paths
  concrete: lighter stone + skid marks + bullet hole circles
  wood: gradient #8B5E3C to #5A3520, sinusoidal grain lineStyle passes
  fabric: flat fill + setLineDash weave at 45 degrees alpha 0.12
  glass: alpha fill 0.2, reflection arc, edge lineStyle
  skin: gradient lit to shadow, subsurface scatter hint
  water: animated sine-wave strokes, depth gradient fill

AGENT LightingEngine: lights array with x, y, color, intensity, radius, type:
  ambient: dark fillRect fullscreen multiply blend, alpha 0.22-0.35
  point lights: radial gradient from source screen blend for fire/explosions/lamps
  muzzle flash: PointLight spike intensity 12, radius 65px, duration 55ms plus 6 spark particles
  shadow: offset dark ellipse behind each entity, stretched per light angle
  bloom: extra semi-transparent glow draw 120% size alpha 0.15 on bright elements

AGENT WindPhysics: Verlet cloth for capes, hair, flags, scarves (12-20 segments each):
  Update: temp=x; x=x+(x-oldX)*0.98+windX*0.08; oldX=temp; add gravity per segment
  Draw: quadraticCurveTo through segment points for smooth cloth curve
  Apply to: hair 8 segments from head, capes, banners, smoke wisps

AGENT AnimationRigger:
  WALK cycle: leg/arm sin(time*freq) alternation. RUN: larger amplitude + forward lean.
  IDLE: breathing scaleY 1.5% at 0.4Hz, weight shift sway
  AIM: weapon arm extended, recoil 4px over 60ms on shoot
  HURT: translate +-3 +-3 200ms + red tint overlay
  DEATH: ragdoll — each part has vx, vy, rot, rotVel with gravity, bounce, come to rest
  ENVIRONMENT: foliage sin oscillation with wind, water surface animated sine-waves

AGENT EnvironmentPainter:
  SKY: multi-stop gradient overcast #060810 to #0E1520 to #1C2535 to #283040 plus cloud ellipses with blur
  TERRAIN: material-accurate ground via MaterialSimulator per surface type
  WEATHER: rain=angled line particles; snow=white dot particles; ash=grey falling
  DEPTH: far objects desaturated toward fog color, ctx.filter='blur(1px)' at extreme distance

DRAW ORDER (strictly follow):
  1.Sky 2.Far-BG parallax 0.04 3.Fog-BACK 4.Mid-BG parallax 0.22 5.Fog-MID
  6.Near-terrain 7.Environment-props 8.Entity-shadows 9.Enemies back to front
  10.Player 11.Projectiles+muzzle 12.Explosion-effects 13.Fog-FRONT 14.Weather 15.HUD

AGENT ParticleSystem: class ParticlePool pre-allocated 300 particles:
  types: smoke / fire / ember / spark / blood / debris / dust / muzzle / explosion
  emit(config): find inactive particle, initialize
  update(dt): physics gravity+drag+wind, age, deactivate if dead
  render(ctx): batch by color group, fillStyle once per group

HOOS API BRIDGES (required in every game):
  window.hoosMath(theme,cb) — Wolfram physics constants, call ONCE at init:
    hoosMath("gameTheme", function(p){
      if(p.gameGravityPxS2) GRAVITY = p.gameGravityPxS2;
      if(p.walkSpeedPxS) WALK_SPD = p.walkSpeedPxS;
    });

  window.hoosSpeech(text,char,emotion) — ElevenLabs character voice (minimum 5 calls per game):
    hoosSpeech("Stand down. This ends now.", "boss", "sinister");     // boss spawn
    hoosSpeech("Phase two begins NOW!", "boss", "angry");             // boss phase 2
    hoosSpeech("I'm not done yet.", "hero", "confident");             // player low HP
    hoosSpeech("Target neutralized. Good work.", "npc", "excited");   // kill streak
    hoosSpeech("Victory is ours!", "hero", "excited");                // win

  window.hoosAnalytics(event,data) — Snowflake events:
    hoosAnalytics("kill", {enemy:"boss", score, level, combo});
    hoosAnalytics("win", {score, stars, time: Date.now()-startTime});
    hoosAnalytics("death", {cause, level, score});

═══════════════════════════════════════════════════════════════════
`);

// ─── Engine builders ──────────────────────────────────────────────────────────
// NOTE: In Node.js template literals, \${ is an escape for literal ${
// So \${charHints} in Node.js → ${charHints} in TypeScript (interpolated at TS runtime)

function buildPhaser(cdn) {
  return `\`You are HOOS AI — elite AAA game studio. Build a COMPLETE, fully playable Phaser 3 game from: "\${userPrompt}"
Apply VISUAL STYLE, QUALITY TIER, and WORLD DETAIL from the hints below.
Wrap output in \\\`\\\`\\\`html ... \\\`\\\`\\\`. Start with <!DOCTYPE html>, end with </html>.
Load Phaser from: ${cdn.phaser} (blocking <script src>, NO defer/async)
html,body{width:100%;height:100%;margin:0;overflow:hidden}
Web Audio API for ALL sounds. NEVER truncate — implement every system fully.

\${charHints}
\${styleHints}

${SHARED_FULL_BLOCK}

PHASER 3 IMPLEMENTATION:

LORE INTRO: 2.5s cinematic (NarrativeAgent title+lore text over dark overlay, then transition to game)

PLAYER SPRITE (48x64 canvas texture) — CharacterRenderer adapted to VISUAL STYLE:
  CARTOON: bold outlines, rounded forms, bright fills + shadow stripe, large eyes
  PHOTOREALISTIC: gradient volumes per body part, material simulation, specular glints
  PIXEL: integer-aligned fillRects, limited palette, ctx.imageSmoothingEnabled=false
  Anatomy: hair, face, neck, torso (outfit per world hints), arms, weapon (full detail), legs, boots
  Animations: idle breathing, walk, run, aim, shoot recoil, hurt flash, death ragdoll

4 ENEMY TYPES (CharacterRenderer each, NarrativeAgent names, distinct silhouettes):
  Grunt: small+fast patrol; Ranger: tall+ranged attack; Heavy: wide+armored charge; Aerial: flying
  Each: hp bar, pain flash, death particle burst, AI patrol+aggro+attack+retreat state machine

BOSS (96x80 multi-part sprite): glow core (shadowBlur=20+sin pulse), chest eye, armor plates
  3-phase AI: phase1 patrol+projectiles, phase2 charge+summon minions, phase3 berserk+speed
  NarrativeAgent: hoosSpeech at spawn, phase2, phase3 transitions; camera shake on each

ENVIRONMENT TEXTURES via MaterialSimulator:
  plat_concrete, plat_metal, plat_dirt, plat_wood — all material-accurate surface detail
  Pickups: hp, ammo, star, power, shield, speed — detailed icons with glow

ATMOSPHERIC via AtmosphericRenderer + Phaser particles:
  4-6 smoke emitters; fire at hazard zones; 3-layer fog scrolling; weather per theme
  EnvironmentPainter SKY: dramatic gradient + parallax clouds + light rays

PARALLAX 3 layers (setScrollFactor): sky+clouds 0.04, mid structures 0.22, near foreground 0.55
LEVEL: 9000px wide, 3 zones (intro zone / combat zone / boss zone)
  this.physics.world.setBounds(0,0,9000,560); cameras.main.setBounds(0,0,9000,560)
  cameras.main.startFollow(player,true,0.1,0.1); setDeadzone(200,100)

PLAYER STATS: hp=100, maxHp=100, lives=3, stamina=100, score=0, combo=0, ammo=30, level=1, xp=0, jumpsLeft=2, dashCd=0, invTimer=0
  WASD/arrows=move, SHIFT=sprint (x1.65+stamina drain), W/UP=jump (double-jump available)
  Z=melee (65px arc 30dmg), X=shoot, C=special/dash (double-tap 220ms +-520vel, 400ms cd)
  Wall-slide, invincibility 1500ms post-hit (alpha flicker), XP/Level up (+18 maxHp +6 dmg)
  Combo x1 to x5 multiplier with score pulse text

HUD (setScrollFactor 0, depth 100):
  HP gradient bar, stamina bar, score counter, lives, ammo, level+XP arc, combo xN display
  Boss HP full-width bar hidden until boss arena, mini-map 85x55 (player+enemies+boss dots)
  Kill feed showing last 3 kills

AUDIO: bgm() 12-note loop in minor key + NarrativeAgent theme + 12+ distinct sfx functions
WOLFRAM: hoosMath("\${userPrompt}", function(p){ if(p.gameGravityPxS2) GRAVITY=p.gameGravityPxS2; if(p.walkSpeedPxS) WALK_SPD=p.walkSpeedPxS; });
SPEECH: 5+ hoosSpeech NarrativeAgent dialogue calls at boss spawn, phase2, phase3, low HP, win
ANALYTICS: hoosAnalytics("kill",{...}); hoosAnalytics("win",{...}); hoosAnalytics("death",{...});

config: {type:AUTO, width:960, height:560, physics:{default:'arcade',arcade:{gravity:{y:580},debug:false}}, scene:[Boot,Preload,Game], scale:{mode:Phaser.Scale.FIT, autoCenter:Phaser.Scale.CENTER_BOTH}}

IMPLEMENT ALL 8 AGENTS + NarrativeAgent + StyleAgent. ALL visuals/audio match the prompt.\``;
}

function buildThree(cdn) {
  return `\`You are HOOS AI — elite AAA 3D game studio. Build a COMPLETE Three.js r134 first-person game from: "\${userPrompt}"
Apply VISUAL STYLE, QUALITY TIER hints. Target: Call of Duty / Hitman / Halo quality.
Wrap in \\\`\\\`\\\`html ... \\\`\\\`\\\`. Load Three.js from: ${cdn.three} (blocking <script src>)
html,body{width:100%;height:100%;margin:0;overflow:hidden} Web Audio API. NEVER truncate.

\${charHints}
\${styleHints}

${SHARED_FULL_BLOCK}

THREE.JS FPS IMPLEMENTATION:

RENDERER: THREE.WebGLRenderer({antialias:true}), PCFSoftShadowMap, setPixelRatio(Math.min(devicePixelRatio,2)), ACESFilmicToneMapping exposure 1.2
LORE INTRO: NarrativeAgent title+mission briefing as HTML overlay (2.5s then dismiss on click)
LIGHTING (LightingEngine): AmbientLight 0.35, DirectionalLight castShadow mapSize 2048, 2 PointLights fire flicker, SpotLight boss arena, HemisphericLight bounce
PLAYER: PointerLockControls; WASD move; mouse look; head-bob; SHIFT sprint; C crouch; SPACE double-jump; F melee; G grenade
  hp=100, armor=50, stamina=100; regen+1.8/s after 5s no damage; HUD all stats
3 WEAPONS (keys 1/2/3): MeshStandardMaterial({metalness:0.92,roughness:0.12}) compound viewmodel geometry
  Weapon sway; muzzle PointLight spike; shell ejection particles; reload animation
PARTICLES (ParticleSystem THREE.Points): smoke 100 particles rising+wind; fire orange-yellow; explosion 5-phase; blood; muzzle sparks
ENVIRONMENT (MaterialSimulator as MeshStandardMaterial): concrete roughness 0.95, metal roughness 0.08 metalness 0.95, stone roughness 0.9
  3 ARENAS connected by corridors; 30+ decorative meshes all PBR; boundary collision walls
4 ENEMY TYPES + BOSS: compound THREE.Group meshes, PBR materials per body part
  HP bars via CSS positioned using camera.project(); pain flash emissive spike; death fragment scatter
  BOSS: 6-part compound, emissive pulse, hp=150, 3-phase AI + NarrativeAgent dialogue + hoosSpeech
COMBAT: Raycaster hitscan; damage numbers float+fade; projectile SphereGeometry; explosion 5-phase
HUD: Crosshair CSS divs spread on move, HP/armor/stamina bars, ammo counter, radar 125x125 canvas, kill feed, boss HP bar, objective text
GAME LOOP: clock.getDelta(), dt=Math.min(delta,0.04); updateAll; renderer.render(scene,camera)
hoosMath("\${userPrompt}", function(p){ if(p.gameGravityPxS2) GRAVITY=p.gameGravityPxS2; });
5+ hoosSpeech NarrativeAgent dialogue calls. hoosAnalytics on kills/win/death.
ALL visuals/atmosphere/audio match: \${userPrompt}\``;
}

function buildBabylon(cdn) {
  return `\`You are HOOS AI — elite AAA 3D studio. Build a COMPLETE Babylon.js game from: "\${userPrompt}"
Apply VISUAL STYLE, QUALITY TIER hints. Target: Halo / Battlefield quality.
Wrap in \\\`\\\`\\\`html ... \\\`\\\`\\\`. NEVER truncate. Web Audio API.

\${charHints}
\${styleHints}

${SHARED_FULL_BLOCK}

BABYLON.JS IMPLEMENTATION — follow this exact HTML scaffold:

<!DOCTYPE html>
<html><head>
<meta charset="UTF-8">
<style>*{margin:0;padding:0}html,body{width:100%;height:100%;background:#000;overflow:hidden}#c{width:100%;height:100%;display:block;touch-action:none}</style>
</head><body>
<canvas id="c"></canvas>
<script src="${cdn.babylon}"></script>
<script src="https://cdn.babylonjs.com/gui/babylon.gui.min.js"></script>
<script>
window.addEventListener("DOMContentLoaded", function() {
  const canvas = document.getElementById("c");
  const engine = new BABYLON.Engine(canvas, true, { adaptToDeviceRatio: true, stencil: true });
  const scene = new BABYLON.Scene(engine);
  scene.clearColor = new BABYLON.Color4(0.04, 0.05, 0.1, 1);
  scene.collisionsEnabled = true;
  scene.gravity = new BABYLON.Vector3(0, -28, 0);
  scene.fogMode = BABYLON.Scene.FOGMODE_EXP2;
  scene.fogDensity = 0.018;
  scene.fogColor = new BABYLON.Color3(0.04, 0.05, 0.1);

  // ── Camera
  const camera = new BABYLON.UniversalCamera("cam", new BABYLON.Vector3(0, 5, -10), scene);
  camera.setTarget(BABYLON.Vector3.Zero());
  camera.applyGravity = true;
  camera.checkCollisions = true;
  camera.ellipsoid = new BABYLON.Vector3(0.5, 1, 0.5);
  camera.minZ = 0.1;
  camera.speed = 0.5;

  // ── Lighting (LightingEngine)
  const hemi = new BABYLON.HemisphericLight("hemi", new BABYLON.Vector3(0,1,0), scene);
  hemi.intensity = 0.3;
  const sun = new BABYLON.DirectionalLight("sun", new BABYLON.Vector3(-1,-2,-1), scene);
  sun.intensity = 1.2;
  sun.position = new BABYLON.Vector3(20, 40, 20);
  const shadowGen = new BABYLON.ShadowGenerator(2048, sun);
  shadowGen.useExponentialShadowMap = true;
  shadowGen.bias = 0.001;

  // ── Post-processing (GlowLayer replaces deprecated VolumetricLightScatteringPostProcess)
  const glow = new BABYLON.GlowLayer("glow", scene);
  glow.intensity = 0.4;
  const pipeline = new BABYLON.DefaultRenderingPipeline("pp", true, scene, [camera]);
  pipeline.bloomEnabled = true; pipeline.bloomThreshold = 0.6; pipeline.bloomWeight = 0.2;
  pipeline.chromaticAberrationEnabled = true; pipeline.chromaticAberration.aberrationAmount = 1.5;
  pipeline.grainEnabled = true; pipeline.grain.intensity = 8;
  pipeline.imageProcessingEnabled = true;
  pipeline.imageProcessing.toneMappingEnabled = true;
  pipeline.imageProcessing.contrast = 1.15;
  pipeline.imageProcessing.exposure = 1.05;

  // ── GUI (BABYLON.GUI is loaded — use it freely)
  const ui = BABYLON.GUI.AdvancedDynamicTexture.CreateFullscreenUI("HUD");

  // ── Game state
  let hp=100, maxHp=100, armor=50, stamina=100, score=0, ammo=30, lives=3;
  let yVelocity=0, onGround=false, jumpsLeft=2, sprinting=false;
  let phase="intro", bossHp=150, bossMaxHp=150, killCount=0;
  const keys={};
  window.addEventListener("keydown", e=>{ keys[e.code]=true; e.preventDefault(); });
  window.addEventListener("keyup",   e=>{ keys[e.code]=false; });

  // ── NarrativeAgent intro overlay (2.5s)
  const introPanel = new BABYLON.GUI.Rectangle("intro");
  introPanel.width="100%"; introPanel.height="100%";
  introPanel.background="rgba(0,0,0,0.85)"; introPanel.thickness=0;
  ui.addControl(introPanel);
  const introText = new BABYLON.GUI.TextBlock("introText");
  introText.text="HOOS GAMING\\n\\n\${userPrompt}\\n\\nPRESS ANY KEY";
  introText.color="#E57200"; introText.fontSize=22; introText.textWrapping=true;
  introPanel.addControl(introText);
  const startFn = ()=>{ introPanel.isVisible=false; phase="play"; window.removeEventListener("keydown",startFn); };
  setTimeout(()=>{ window.addEventListener("keydown",startFn); }, 600);

  // IMPLEMENT BELOW — match StyleAgent VISUAL STYLE from \${styleHints}:
  // CharacterRenderer: PBRMaterial + 6-layer appearance per visual style
  // MaterialSimulator: metal=roughness0.05 metallic0.95, stone=rough0.8 met0.1, etc.
  // AtmosphericRenderer: BABYLON.ParticleSystem smoke/fire/fog (smoke=120,fire=80)
  // AnimationRigger: BABYLON.Animation clips walk/run/idle/hurt/death on TransformNodes
  // WindPhysics: Verlet on cape/hair nodes each frame
  // EnvironmentPainter: 3-zone terrain MeshBuilder.CreateGround+boxes, PBRMaterials per zone
  // ParticleSystem: explosion=200, blood=30, muzzle=15 particles
  // 4 ENEMY TYPES: TransformNode groups, PBRMaterials, AI state machines (patrol/chase/attack/dead)
  // BOSS: 3-phase AI, GlowLayer emissive spike phase 3, hp=150, NarrativeAgent dialogue each phase
  // COMBAT: BABYLON.Ray hitscan, projectile meshes, ExplosionSystem, BABYLON.GUI damage numbers
  // HUD: hp/armor/stamina bars, score, ammo, lives, crosshair, radar (adt Rectangle stack), boss bar
  // WEAPONS (3): PBRMaterial, muzzle PointLight spike, reload animation
  // AUDIO: Web Audio bgm + 12 sfx (shoot/jump/hit/explode/reload/footstep/death/pickup/boss_roar)

  function update(dt) {
    if (phase !== "play") return;
    // movement
    const fwd = camera.getDirection(BABYLON.Vector3.Forward());
    const right = camera.getDirection(BABYLON.Vector3.Right());
    const spd = (keys["ShiftLeft"]?10:5)*dt;
    if (keys["KeyW"]) camera.position.addInPlace(fwd.scale(spd));
    if (keys["KeyS"]) camera.position.subtractInPlace(fwd.scale(spd));
    if (keys["KeyA"]) camera.position.subtractInPlace(right.scale(spd));
    if (keys["KeyD"]) camera.position.addInPlace(right.scale(spd));
    // gravity + jump
    yVelocity -= 28*dt;
    if (keys["Space"] && jumpsLeft>0) { yVelocity=10.5; jumpsLeft--; }
    camera.position.y += yVelocity*dt;
    if (camera.position.y <= 2) { camera.position.y=2; yVelocity=0; onGround=true; jumpsLeft=2; }
    // clamp bounds
    camera.position.x = Math.max(-48,Math.min(48,camera.position.x));
    camera.position.z = Math.max(-48,Math.min(300,camera.position.z));
  }

  engine.runRenderLoop(()=>{
    const dt = engine.getDeltaTime()/1000;
    update(dt);
    scene.render();
  });
  window.addEventListener("resize", ()=>engine.resize());
  hoosMath("\${userPrompt}", function(p){ if(p.gameGravityPxS2) scene.gravity.y=-Math.abs(p.gameGravityPxS2); });
  if(typeof hoosSpeech==="function") hoosSpeech("Game ready. " + "\${userPrompt}");
});
</script></body></html>

ALL entity visuals, post-FX, audio match: \${userPrompt}\``;
}

function buildP5(cdn) {
  return `\`You are HOOS AI — elite AAA 2D game studio. Build a COMPLETE p5.js game from: "\${userPrompt}"
Apply VISUAL STYLE, QUALITY TIER hints. Target: near-photorealistic 2D or ultra-stylized per style.
Wrap in \\\`\\\`\\\`html ... \\\`\\\`\\\`. Load p5 from: ${cdn.p5} (blocking <script src>)
html,body{width:100%;height:100%;margin:0;overflow:hidden} Web Audio API. NEVER truncate.

\${charHints}
\${styleHints}

${SHARED_FULL_BLOCK}

P5.JS IMPLEMENTATION:

Access Canvas 2D API via drawingContext: drawingContext.createLinearGradient(), shadowBlur, globalCompositeOperation, setLineDash()
LORE INTRO: NarrativeAgent title+lore on splash screen (2.5s then game starts)

class CharacterRenderer with StyleAgent adaptations:
  CARTOON: bold outlines strokeStyle 2-3px, round shapes, flat fills + shadow stripe, exaggerated proportions
  PHOTOREALISTIC: 6-layer gradient pipeline per body part, material simulation, atmospheric lighting
  PIXEL: integer fillRect, drawingContext.imageSmoothingEnabled=false, limited palette
  drawPlayer(x,y,state,frame,facing), drawEnemy(e,camX) per type, drawBoss(boss,camX,time)

class AtmosphericRenderer: smoke[]+fire[]+fog[]+wind; blur filter; screen blend fire; 3 fog layers
class ParticlePool: 300-particle pre-allocated array; 9 particle types; physics per type
class LightingEngine: applyPointLight, applyMuzzleFlash, applyShadow, applyBloom
class WindPhysics: Verlet segments for cloth/hair (12-20 segments, quadraticCurveTo draw)
class AnimationSystem: walk/run/idle/aim/hurt/death-ragdoll cycles via sin(time)

PLAYER: hp=100, maxHp=100, lives=3, stamina=100, score=0, combo=0, ammo=30, level=1, xp=0, jumpsLeft=2, dashCd=0
  Double-jump, wall-slide, dash, sprint, combo multiplier x1-x5, XP/level system
4 ENEMY CLASSES (CharacterRenderer each): distinct silhouettes, colors, AI behaviors, NarrativeAgent names
BOSS: multi-part draw, 3-phase AI, NarrativeAgent dialogue, hoosSpeech at each transition

LEVEL 9000px 3 zones: drawBackground (EnvironmentPainter), drawTerrain (MaterialSimulator platforms), 3-layer parallax
HUD: gradient HP/stamina bars, score pulse, combo xN, lives, ammo, level+XP arc, boss bar full-width, mini-map 105x68
AUDIO: bgm() 12-note oscillator loop in minor key + 12+ sfx functions

hoosMath("\${userPrompt}", function(p){ if(p.gameGravityPxS2) GRAVITY=p.gameGravityPxS2; });
5+ hoosSpeech NarrativeAgent calls. hoosAnalytics. windowResized(): resizeCanvas(windowWidth, windowHeight)
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

KABOOM.JS IMPLEMENTATION:

kaboom({width:960, height:560, background:[10,14,26], canvas:document.getElementById('c')})

SPRITE GENERATION via OffscreenCanvas: For each sprite, create OffscreenCanvas, draw via CharacterRenderer pipeline adapted per VISUAL STYLE:
  CARTOON: bold outlines fillStyle dark + rounded shapes. PHOTOREALISTIC: multi-layer gradient shapes. PIXEL: integer rects limited palette.
  loadSprite from OffscreenCanvas.toDataURL()

Player sprite (48x64): CharacterRenderer all layers per style + anatomy per world hints
4 enemy sprites (distinct silhouettes): grunt/ranger/heavy/aerial + CharacterRenderer each
Boss sprite (96x80): multi-part with glowing core shadowBlur=20
Environment sprites: MaterialSimulator per surface type

SCENE "game":
  3-zone level, addLevel() 9000px; player full attrs lives=3, stamina=100, ammo=30, score=0, combo=0
  4 ENEMY TYPES + BOSS: onUpdate() AI state machines; HP bars via onDraw(); NarrativeAgent names
  AtmosphericRenderer in onDraw() pass — smoke, fire, fog drawn ABOVE terrain, BELOW HUD
  Full HUD via onDraw(): HP/stamina bars, score, lives, ammo, level, combo, boss bar, mini-map

hoosMath("\${userPrompt}", function(p){ if(p.gameGravityPxS2) setGravity(p.gameGravityPxS2); });
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

PIXI.JS IMPLEMENTATION:

const app=new PIXI.Application({width:960,height:560,backgroundColor:0x0A0C14,antialias:true,resolution:window.devicePixelRatio||1,autoDensity:true});
document.body.appendChild(app.view); app.view.style.cssText='width:100%;height:100%';

class EntityRenderer: bakes textures to PIXI.RenderTexture via PIXI.Graphics + CharacterRenderer pipeline adapted per VISUAL STYLE:
  CARTOON: bold fillColor + lineStyle outlines. PHOTOREALISTIC: multi-layer overlapping shapes simulating gradients. PIXEL: integer coordinates only.
class AtmosphericSystem extends PIXI.Container: smoke/fire PIXI.Graphics pools, PIXI.BLEND_MODES.SCREEN for fire, fog layers, PIXI.filters.BlurFilter on smoke container
class PixiParticlePool: PIXI.Graphics[300]; 9 types; physics; batch render
class LightingEngine: PIXI.Graphics overlay (MULTIPLY ambient), radial gradient circles (SCREEN point lights)
class WindPhysics: Verlet cloth segments for capes/hair

PLAYER extends PIXI.Container: EntityRenderer texture + walk cycle child rotation + WindPhysics cape
4 ENEMY TYPES + BOSS: EntityRenderer per type; full AI; HP PIXI.Graphics bars; death fragments
BOSS: multi-part PIXI.Container + PIXI.filters.GlowFilter on core; 3-phase AI + NarrativeAgent dialogue

LEVEL (3 zones 9000px): platform array, 3 PIXI.Container parallax layers
HUD: separate PIXI.Container z=top: HP/stamina bars, score, combo, ammo, level+XP arc, boss bar, mini-map canvas

app.ticker.add((delta)=>{ const dt=delta/60; update(dt); });
window.addEventListener('resize',()=>{ app.renderer.resize(innerWidth,innerHeight); });
hoosMath("\${userPrompt}", function(p){ if(p.gameGravityPxS2) GRAVITY=p.gameGravityPxS2; });
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

PYTHON / PYODIDE IMPLEMENTATION:

CRITICAL PYTHON RULES — follow exactly or game will not run:
1. NEVER use the global keyword. Instead, declare ONE module-level dict: state = {"score":0,"lives":3,...} and mutate keys: state["score"] += 1
2. Use "import random" — there is NO math.random() in Python.
3. Import create_proxy ONLY from pyodide.ffi: "from pyodide.ffi import create_proxy"
4. NEVER call js.create_proxy() — it does not exist.
5. Always "import js" for canvas and DOM.

HTML structure:
<style>*{margin:0;padding:0}html,body{width:100%;height:100%;background:#000;overflow:hidden}</style>
<canvas id="c" width="960" height="560" style="display:block;width:100%;height:100%"></canvas>
<script>
window.hoosKeyDown={};
document.addEventListener("keydown",e=>window.hoosKeyDown[e.code]=true);
document.addEventListener("keyup",e=>window.hoosKeyDown[e.code]=false);
</script>
<script src="${cdn.pyodide}"></script>
<script>
loadPyodide().then(async py => { await py.runPythonAsync(document.getElementById('hoos-py').textContent); });
</script>
<script type="text/python" id="hoos-py">
import js, math, random, asyncio
from pyodide.ffi import create_proxy
W, H = 960, 560
canvas = js.document.getElementById("c")
ctx = canvas.getContext("2d")
def keys(): return getattr(js.window, "hoosKeyDown").to_py()

# ALL mutable game data lives here — no global keyword anywhere.
state = {
    "score": 0, "lives": 3, "health": 100, "phase": "intro",
    "player_x": 100, "player_y": 400, "vel_x": 0, "vel_y": 0,
    "on_ground": False, "facing": 1, "frame": 0,
    "camera_x": 0, "level": 1, "enemies": [], "bullets": [], "particles": [],
}

# Implement CharacterRenderer, AtmosphericRenderer, MaterialSimulator,
# LightingEngine, ParticlePool, AnimationSystem, EnvironmentPainter,
# WindPhysics as Python classes adapted per VISUAL STYLE in style hints.
# NarrativeAgent: implement lore intro overlay + 5+ hoosSpeech calls.
# StyleAgent: detect style from hints and apply in all draw functions.
# Player, 4 enemy types, boss 3-phase AI. 9000px level 3 zones. Full HUD.
# 12+ sfx via Web Audio. hoosMath, hoosAnalytics integrated.

GRAVITY, WALK_SPD, RUN_SPD, JUMP_VEL = 700, 240, 400, 580
js.window.hoosMath("\${userPrompt}", create_proxy(lambda p: None))

async def game_loop():
    last = js.Date.now() / 1000
    while True:
        now = js.Date.now() / 1000
        dt = min(now - last, 0.04)
        last = now
        update(dt)
        draw()
        await asyncio.sleep(1/60)

asyncio.ensure_future(game_loop())
</script>

ALL entity visuals, atmospheric effects, audio match: \${userPrompt}\``;
}

// ─── Assemble buildPrompt TypeScript function ─────────────────────────────────
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
console.log("rebuild-prompt done —", newContent.length, "chars written to", file);
