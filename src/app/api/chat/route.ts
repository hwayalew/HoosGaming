/**
 * Purpose: Stream game generation — IBM watsonx Orchestrate (multi-pass assembly), then Gemini, then built-in demo HTML.
 * Called by: create/page.tsx (POST, SSE)
 * Input: JSON { prompt, sessionId?, language }
 * Output: text/event-stream with JSON events: progress | complete (optional flags demo, gemini on complete)
 * Auth: None. IBM IAM uses WXO_MANAGER_API_KEY, or WXO_API_KEY if the manager key is unset (same pattern as optional backup).
 *
 * IBM targeting: every run includes `agent_id` and `environment_id` from `@/lib/app-config` (defaults + NEXT_PUBLIC_WXO_* overrides) so Create, Play refine, and the WxO embed/health config stay aligned.
 */
import { NextRequest } from "next/server";
import {
  WXO_INSTANCE_API_BASE,
  WXO_AGENT_ID,
  WXO_AGENT_ENVIRONMENT_ID,
} from "@/lib/app-config";
import { wxoThreadIdForApi } from "@/lib/wxo-session";

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










// ── World detail extractor ────────────────────────────────────────────────────
function extractWorldHints(prompt: string): string {
  const p = prompt.toLowerCase();
  const hints: string[] = [];

  // Protagonist gender + archetype
  if (/\b(woman|female|girl|her|she)\b/.test(p)) hints.push("female protagonist");
  else if (/\b(man|male|boy|his|he)\b/.test(p)) hints.push("male protagonist");
  const races = ["human","elf","dwarf","orc","vampire","demon","angel","robot","cyborg","alien",
    "undead","ninja","samurai","knight","warrior","wizard","mage","assassin","soldier","marine",
    "zombie","mutant","pirate","hunter","monk","paladin","ranger","berserker","druid","sorcerer",
    "android","ghost","witch","warlock","barbarian","gladiator","mercenary","bounty hunter",
    "special forces","spec ops","commando","sniper","ghost operative","resistance fighter"];
  races.forEach(r => { if (p.includes(r)) hints.push(r); });

  // Build / physique
  if (/\b(tall|large|giant|huge|muscular|buff|heavyset)\b/.test(p)) hints.push("tall muscular build");
  if (/\b(small|tiny|slim|lean|agile|lithe|petite)\b/.test(p)) hints.push("slim agile build");

  // Military / tactical gear
  if (/\bmilitary\b|combat|tactical|operator|spec.?ops|soldier|marine|commando/.test(p)) {
    hints.push("full tactical kit: multicam camo, plate carrier MOLLE, helmet+NVG mount, balaclava, tactical gloves, knee pads, boots, backpack");
  }
  if (/\barmor\b|\barmour\b/.test(p)) hints.push("detailed armor: pauldrons, chest plate+rivets, gauntlets, greaves, visor, backplate");
  if (/\brobe\b/.test(p)) hints.push("flowing robes with mystical runes and ornate trim");
  if (/\bcloak\b|\bhood\b/.test(p)) hints.push("dramatic hooded cloak with cloth physics segments");
  if (/\bexosuit\b|\bmech.?suit\b/.test(p)) hints.push("hi-tech exo-suit: panel seams, glowing HUD visor, thruster vents, articulated joints");

  // Weapons
  if (/\bassault.?rifle\b|\bm4\b|\bak.?47\b|rifle/.test(p)) hints.push("assault rifle: receiver+barrel+handguard+magazine+stock+sights+muzzle flash");
  if (/\bsniper\b/.test(p)) hints.push("sniper rifle: long barrel+bipod+scope+bolt handle");
  if (/\bshotgun\b/.test(p)) hints.push("shotgun: wide barrel+pump grip+stock");
  if (/\bpistol\b|handgun/.test(p)) hints.push("pistol: compact frame+slide+trigger guard+grip");
  if (/\bsword\b|\bblade\b|\bkatana\b/.test(p)) hints.push("sword: hilt+cross guard+blade with edge highlight and fuller groove");
  if (/\bbow\b|arrow|quiver/.test(p)) hints.push("bow with recurve limb+drawn string+quiver with arrows");
  if (/\bstaff\b|wand|magic/.test(p)) hints.push("magical staff: carved shaft+glowing orb+rune engravings");
  if (/\baxe\b/.test(p)) hints.push("battle axe: crescent head with notch+long handle");
  if (/\bshield\b/.test(p)) hints.push("shield: decorative emblem+metal rim+grip handle");

  // Hair color
  if (/\bblonde\b|golden hair/.test(p)) hints.push("blonde hair #FFD700");
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
    .forEach(a => { if (p.includes(a)) hints.push(`animal: ${a} — anatomical proportions, fur/scales/feathers 3-layer, iris+highlight+slit pupil, gait cycle`); });

  // Vehicles
  ["tank","car","truck","helicopter","drone","spaceship","submarine","boat","ship","mech",
   "motorcycle","train","hovercraft","jet","fighter","bomber"]
    .forEach(v => { if (p.includes(v)) hints.push(`vehicle: ${v} — chassis gradient, wheels/tracks, windows semi-transparent, exhaust particles, damage state`); });

  // Structures
  ["castle","dungeon","tower","temple","ruins","city","bunker","fortress","base","cave",
   "laboratory","arena","prison","skyscraper","warehouse"]
    .forEach(s => { if (p.includes(s)) hints.push(`structure: ${s} — material simulation (stone/metal/wood), windows with glow, weathering, damaged variant`); });

  return hints.length > 0
    ? `WORLD DETAIL: ${hints.join("; ")}.`
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
  if (/\bteam\b|squad|party|co.?op|multiplayer|4.*player/.test(p)) {
    hints.push("MULTI-CHARACTER: Generate 4 distinct hero characters with different silhouettes, color palettes, and weapon archetypes. Character select screen before game start.");
  }

  return hints.join("\n");
}

// ── Engine-specific system prompts ────────────────────────────────────────────
function buildPrompt(userPrompt: string, language: string, detailLevel = "detailed"): string {
  const charHints = extractWorldHints(userPrompt);
  const styleHints = extractStyleHints(userPrompt, detailLevel);

  if (language === "js-phaser") {
    return `You are HOOS AI — elite AAA game studio. Build a COMPLETE, fully playable Phaser 3 game from: "${userPrompt}"
Apply VISUAL STYLE, QUALITY TIER, and WORLD DETAIL from the hints below.
Wrap output in \`\`\`html ... \`\`\`. Start with <!DOCTYPE html>, end with </html>.
Load Phaser from: https://cdnjs.cloudflare.com/ajax/libs/phaser/3.60.0/phaser.min.js (blocking <script src>, NO defer/async)
Web Audio API for ALL sounds. NEVER truncate — implement every system fully.
HTML scaffold — output EXACTLY this structure (fill in the game logic; keep the scaffold):

<!DOCTYPE html>
<html><head>
<meta charset="UTF-8">
<style>
  *{margin:0;padding:0;box-sizing:border-box}
  html,body{width:100%;height:100%;background:#000;overflow:hidden}
  canvas{display:block}
</style>
</head><body>
<script src="https://cdnjs.cloudflare.com/ajax/libs/phaser/3.60.0/phaser.min.js"></script>
<script>
const config = {
  type: Phaser.AUTO,
  width: window.innerWidth,
  height: window.innerHeight,
  backgroundColor: '#0A0C14',
  physics: { default: 'arcade', arcade: { gravity: { y: 580 }, debug: false } },
  scale: { mode: Phaser.Scale.RESIZE, autoCenter: Phaser.Scale.CENTER_BOTH },
  scene: [Boot, Preload, Game]
};
let GRAVITY = 580, WALK_SPD = 260, RUN_SPD = 430, JUMP_VEL = -620;
// define Boot, Preload, Game classes above config
new Phaser.Game(config);
</script></body></html>

${charHints}
${styleHints}


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
  this.physics.world.setBounds(0,0,9000,window.innerHeight); cameras.main.setBounds(0,0,9000,window.innerHeight)
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
WOLFRAM: hoosMath("${userPrompt}", function(p){ if(p.gameGravityPxS2) GRAVITY=p.gameGravityPxS2; if(p.walkSpeedPxS) WALK_SPD=p.walkSpeedPxS; });
SPEECH: 5+ hoosSpeech NarrativeAgent dialogue calls at boss spawn, phase2, phase3, low HP, win
ANALYTICS: hoosAnalytics("kill",{...}); hoosAnalytics("win",{...}); hoosAnalytics("death",{...});


IMPLEMENT ALL 8 AGENTS + NarrativeAgent + StyleAgent. ALL visuals/audio match the prompt.`;
  }
  if (language === "js-three") {
    return `You are HOOS AI — elite AAA 3D game studio. Build a COMPLETE Three.js r134 first-person game from: "${userPrompt}"
Apply VISUAL STYLE, QUALITY TIER hints. Target: Call of Duty / Hitman / Halo quality.
Wrap in \`\`\`html ... \`\`\`. NEVER truncate. Web Audio API.

${charHints}
${styleHints}


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


THREE.JS r134 IMPLEMENTATION — follow this exact HTML scaffold; DO NOT change it:

<!DOCTYPE html>
<html><head>
<meta charset="UTF-8">
<style>
  *{margin:0;padding:0;box-sizing:border-box}
  html,body{width:100%;height:100%;background:#000;overflow:hidden}
  canvas{display:block;width:100%!important;height:100%!important}
  #hud{position:fixed;top:0;left:0;width:100%;height:100%;pointer-events:none;z-index:10;font-family:monospace}
  #crosshair{position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);width:20px;height:20px}
  #crosshair::before,#crosshair::after{content:"";position:absolute;background:#fff;opacity:.8}
  #crosshair::before{width:2px;height:100%;left:9px;top:0}
  #crosshair::after{width:100%;height:2px;top:9px;left:0}
  #intro{position:fixed;inset:0;background:rgba(0,0,0,.88);display:flex;flex-direction:column;align-items:center;justify-content:center;z-index:20;color:#E57200;font-family:monospace;text-align:center;cursor:pointer}
  #intro h2{font-size:28px;letter-spacing:4px;text-transform:uppercase;margin-bottom:16px}
  #intro p{font-size:14px;color:#aaa;max-width:540px;line-height:1.7}
  #intro .sub{margin-top:24px;font-size:12px;color:#555;letter-spacing:2px}
</style>
</head><body>
<div id="intro">
  <h2 id="intro-title">HOOS GAMING</h2>
  <p id="intro-lore">${userPrompt}</p>
  <div class="sub">CLICK TO ENTER</div>
</div>
<div id="hud"><div id="crosshair"></div></div>
<script src="https://cdnjs.cloudflare.com/ajax/libs/three.js/r134/three.min.js"></script>
<script src="https://cdn.jsdelivr.net/npm/three@0.134.0/examples/js/controls/PointerLockControls.js"></script>
<script>
(function() {
  // ── Renderer (MUST be first — appended to body before anything else)
  const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: "high-performance" });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.2;
  renderer.outputEncoding = THREE.sRGBEncoding;
  document.body.insertBefore(renderer.domElement, document.getElementById("hud"));

  // ── Scene + Clock
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x0a0c14);
  scene.fog = new THREE.FogExp2(0x0a0c14, 0.018);
  const clock = new THREE.Clock();

  // ── Camera + Controls
  const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 800);
  camera.position.set(0, 1.7, 0);
  const controls = new THREE.PointerLockControls(camera, renderer.domElement);
  scene.add(controls.getObject());
  document.getElementById("intro").addEventListener("click", function() {
    controls.lock();
  });
  controls.addEventListener("lock", function() {
    document.getElementById("intro").style.display = "none";
  });
  controls.addEventListener("unlock", function() {
    if (phase === "play") document.getElementById("intro").style.display = "flex";
  });

  // ── Lighting (LightingEngine)
  const ambient = new THREE.AmbientLight(0xffffff, 0.35);
  scene.add(ambient);
  const sun = new THREE.DirectionalLight(0xffeedd, 1.4);
  sun.position.set(30, 60, 20);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  sun.shadow.camera.near = 0.5;
  sun.shadow.camera.far = 400;
  sun.shadow.camera.left = sun.shadow.camera.bottom = -80;
  sun.shadow.camera.right = sun.shadow.camera.top = 80;
  sun.shadow.bias = -0.0003;
  scene.add(sun);
  const fill = new THREE.HemisphereLight(0x8899cc, 0x223311, 0.4);
  scene.add(fill);

  // ── Input
  const keys = {};
  document.addEventListener("keydown", e => { keys[e.code] = true; });
  document.addEventListener("keyup",   e => { keys[e.code] = false; });

  // ── Resize
  window.addEventListener("resize", function() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });

  // ── Game state (expand as needed)
  let phase = "intro";
  let hp = 100, maxHp = 100, armor = 50, stamina = 100, score = 0, ammo = 30, lives = 3;
  let yVelocity = 0, onGround = true, jumpsLeft = 2;
  let GRAVITY = 28;
  const PLAYER_HEIGHT = 1.7;
  const WALK_SPD = 8, RUN_SPD = 14, JUMP_VEL = 9;
  const raycaster = new THREE.Raycaster();

  // IMPLEMENT BELOW — match StyleAgent VISUAL STYLE from ${styleHints}:
  // NarrativeAgent: set #intro-title = game title, #intro-lore = 2-sentence mission briefing
  // CharacterRenderer: compound THREE.Group per entity (head/torso/arms/legs/weapon), MeshStandardMaterial per part
  // MaterialSimulator: concrete={roughness:0.95,metalness:0}, metal={roughness:0.08,metalness:0.95}, stone={roughness:0.9,metalness:0.05}
  // AtmosphericRenderer: THREE.Points smoke/fire/debris; BufferGeometry + Float32Array positions; update in loop
  // AnimationRigger: sin(t) oscillation on limb groups for walk/run cycle; lerp for aim/hurt/death
  // WindPhysics: Verlet on geometry vertices (cape/hair/cloth) mutating position BufferAttribute each frame
  // EnvironmentPainter: BoxGeometry/PlaneGeometry terrain, 3 zones with MeshStandardMaterial PBR per zone, parallax sky
  // ParticleSystem: pre-allocate Float32Array[300*3]; active count; update pos each frame; draw with THREE.Points
  // 4 ENEMY TYPES: patrol/chase/attack/dead FSM; hp bars via CSS #hud positioned with camera.project(worldPos, canvas)
  // BOSS: 6-part compound group, emissive pulse on phase 3, hp=150, 3-phase AI, NarrativeAgent per-phase dialogue
  // COMBAT: raycaster.setFromCamera(center, camera); intersectObjects(enemies); damage numbers CSS #hud
  // 3 WEAPONS (1/2/3 keys): compound viewmodel group child of camera; muzzle PointLight spike; shell particles
  // HUD: HP/armor/stamina bars (#hud CSS divs), score, ammo, kill feed, boss bar, mini-map (#hud canvas 105x68)
  // AUDIO: Web Audio bgm (oscillator minor key loop) + 12+ sfx (shoot/jump/hit/explode/reload/footstep/boss)

  function update(dt) {
    if (phase !== "play") return;
    // Movement
    const spd = keys["ShiftLeft"] ? RUN_SPD : WALK_SPD;
    const vel = new THREE.Vector3();
    if (keys["KeyW"]) vel.z = -1;
    if (keys["KeyS"]) vel.z =  1;
    if (keys["KeyA"]) vel.x = -1;
    if (keys["KeyD"]) vel.x =  1;
    if (vel.length() > 0) {
      vel.normalize().multiplyScalar(spd * dt);
      controls.moveRight(vel.x);
      controls.moveForward(-vel.z);
    }
    // Gravity + jump
    yVelocity -= GRAVITY * dt;
    if ((keys["Space"]) && jumpsLeft > 0) { yVelocity = JUMP_VEL; jumpsLeft--; }
    const obj = controls.getObject();
    obj.position.y += yVelocity * dt;
    if (obj.position.y < PLAYER_HEIGHT) {
      obj.position.y = PLAYER_HEIGHT;
      yVelocity = 0;
      onGround = true;
      jumpsLeft = 2;
    }
    // Clamp
    obj.position.x = Math.max(-80, Math.min(80, obj.position.x));
    obj.position.z = Math.max(-80, Math.min(80, obj.position.z));
  }

  // ── Render loop
  function animate() {
    requestAnimationFrame(animate);
    const dt = Math.min(clock.getDelta(), 0.04);
    update(dt);
    renderer.render(scene, camera);
  }

  // Start — Wolfram physics + speech wired in
  if (typeof hoosMath === "function") hoosMath("${userPrompt}", function(p) { if (p.gameGravityPxS2) GRAVITY = Math.abs(p.gameGravityPxS2); });
  if (typeof hoosSpeech === "function") hoosSpeech("Game ready. " + "${userPrompt}");
  controls.addEventListener("lock", function onFirstLock() { phase = "play"; controls.removeEventListener("lock", onFirstLock); });
  animate();
})();
</script></body></html>

ALL entity visuals, post-FX, fog, audio theme must match: ${userPrompt}`;
  }
  if (language === "js-babylon") {
    return `You are HOOS AI — elite AAA 3D studio. Build a COMPLETE Babylon.js game from: "${userPrompt}"
Apply VISUAL STYLE, QUALITY TIER hints. Target: Halo / Battlefield quality.
Wrap in \`\`\`html ... \`\`\`. NEVER truncate. Web Audio API.

${charHints}
${styleHints}


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


BABYLON.JS IMPLEMENTATION — follow this exact HTML scaffold:

<!DOCTYPE html>
<html><head>
<meta charset="UTF-8">
<style>*{margin:0;padding:0}html,body{width:100%;height:100%;background:#000;overflow:hidden}#c{width:100%;height:100%;display:block;touch-action:none}</style>
</head><body>
<canvas id="c"></canvas>
<script src="https://cdn.babylonjs.com/babylon.js"></script>
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
  introText.text="HOOS GAMING\n\n${userPrompt}\n\nPRESS ANY KEY";
  introText.color="#E57200"; introText.fontSize=22; introText.textWrapping=true;
  introPanel.addControl(introText);
  const startFn = ()=>{ introPanel.isVisible=false; phase="play"; window.removeEventListener("keydown",startFn); };
  setTimeout(()=>{ window.addEventListener("keydown",startFn); }, 600);

  // IMPLEMENT BELOW — match StyleAgent VISUAL STYLE from ${styleHints}:
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
  hoosMath("${userPrompt}", function(p){ if(p.gameGravityPxS2) scene.gravity.y=-Math.abs(p.gameGravityPxS2); });
  if(typeof hoosSpeech==="function") hoosSpeech("Game ready. " + "${userPrompt}");
});
</script></body></html>

ALL entity visuals, post-FX, audio match: ${userPrompt}`;
  }
  if (language === "js-p5") {
    return `You are HOOS AI — elite AAA 2D game studio. Build a COMPLETE p5.js game from: "${userPrompt}"
Apply VISUAL STYLE, QUALITY TIER hints. Target: near-photorealistic 2D or ultra-stylized per style.
Wrap in \`\`\`html ... \`\`\`. Load p5 from: https://cdnjs.cloudflare.com/ajax/libs/p5.js/1.9.0/p5.min.js (blocking <script src>)
html,body{width:100%;height:100%;margin:0;overflow:hidden} Web Audio API. NEVER truncate.

${charHints}
${styleHints}


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


P5.JS IMPLEMENTATION:

ALWAYS: setup(){ createCanvas(windowWidth, windowHeight); } — NEVER use fixed 960x560.
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

hoosMath("${userPrompt}", function(p){ if(p.gameGravityPxS2) GRAVITY=p.gameGravityPxS2; });
5+ hoosSpeech NarrativeAgent calls. hoosAnalytics. windowResized(): resizeCanvas(windowWidth, windowHeight) — required, DO NOT omit
ALL visuals/audio match: ${userPrompt}`;
  }
  if (language === "js-kaboom") {
    return `You are HOOS AI — elite AAA game studio. Build a COMPLETE Kaboom.js game from: "${userPrompt}"
Apply VISUAL STYLE, QUALITY TIER hints. Target: high-quality stylized 2D.
Wrap in \`\`\`html ... \`\`\`. Load Kaboom from: https://unpkg.com/kaboom@3000.0.1/dist/kaboom.js (blocking <script src>, NO defer/async). Web Audio API. NEVER truncate.
HTML scaffold — use EXACTLY this structure:

<!DOCTYPE html>
<html><head>
<meta charset="UTF-8">
<style>*{margin:0;padding:0}html,body{width:100%;height:100%;background:#000;overflow:hidden}canvas{display:block;width:100%!important;height:100%!important}</style>
</head><body>
<script src="https://unpkg.com/kaboom@3000.0.1/dist/kaboom.js"></script>
<script>
kaboom({ width: window.innerWidth, height: window.innerHeight, background: [10, 14, 26], stretch: true, letterbox: false });
// game code follows
</script></body></html>

${charHints}
${styleHints}


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


KABOOM.JS IMPLEMENTATION:

kaboom({ width: window.innerWidth, height: window.innerHeight, background: [10, 14, 26], stretch: true, letterbox: false })

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

hoosMath("${userPrompt}", function(p){ if(p.gameGravityPxS2) setGravity(p.gameGravityPxS2); });
5+ hoosSpeech NarrativeAgent dialogue calls. hoosAnalytics.
ALL visuals match: ${userPrompt}`;
  }
  if (language === "js-pixi") {
    return `You are HOOS AI — elite AAA 2D studio. Build a COMPLETE PixiJS v7 game from: "${userPrompt}"
Apply VISUAL STYLE, QUALITY TIER hints. Target: near-photorealistic cinematic 2D.
Wrap in \`\`\`html ... \`\`\`. Load PixiJS from: https://cdnjs.cloudflare.com/ajax/libs/pixi.js/7.2.4/pixi.min.js (blocking <script src>)
html,body{width:100%;height:100%;margin:0;overflow:hidden} Web Audio API. NEVER truncate.

${charHints}
${styleHints}


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


PIXI.JS IMPLEMENTATION:

const app=new PIXI.Application({width:window.innerWidth,height:window.innerHeight,backgroundColor:0x0A0C14,antialias:true,resolution:window.devicePixelRatio||1,autoDensity:true,resizeTo:window});
document.body.appendChild(app.view); app.view.style.cssText='position:fixed;top:0;left:0;width:100%;height:100%';

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
hoosMath("${userPrompt}", function(p){ if(p.gameGravityPxS2) GRAVITY=p.gameGravityPxS2; });
5+ hoosSpeech NarrativeAgent calls. hoosAnalytics.
ALL visuals match: ${userPrompt}`;
  }
  if (language === "python") {
    return `You are HOOS AI — elite AAA game studio. Build a COMPLETE Python/Pyodide canvas game from: "${userPrompt}"
Apply VISUAL STYLE, QUALITY TIER hints.
Wrap in \`\`\`html ... \`\`\`. Load Pyodide from: https://cdn.jsdelivr.net/pyodide/v0.23.4/full/pyodide.js
ALL game logic in Python inside pyodide.runPythonAsync(). NEVER truncate.

${charHints}
${styleHints}


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
<script src="https://cdn.jsdelivr.net/pyodide/v0.23.4/full/pyodide.js"></script>
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
js.window.hoosMath("${userPrompt}", create_proxy(lambda p: None))

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

ALL entity visuals, atmospheric effects, audio match: ${userPrompt}`;
  }
  return buildPrompt(userPrompt, "js-phaser", detailLevel);
}

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
<style>*{margin:0;padding:0;box-sizing:border-box}html,body{width:100%;height:100%;background:#000;overflow:hidden}</style>
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
function wxoRunPayload(content: string, threadId?: string): Record<string, unknown> {
  const body: Record<string, unknown> = {
    message: { role: "user", content },
  };
  const tid = wxoThreadIdForApi(threadId);
  if (tid) body.thread_id = tid;
  const agentId = WXO_AGENT_ID.trim();
  const envId = WXO_AGENT_ENVIRONMENT_ID.trim();
  if (agentId) body.agent_id = agentId;
  if (envId) body.environment_id = envId;
  return body;
}

async function startRun(token: string, content: string, threadId?: string) {
  const body = wxoRunPayload(content, threadId);
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
/** Pyodide demo: module-level `state` dict only — no `global` (matches generator contract). */
function buildPythonDemoSource(theme: string): string {
  const title = theme.slice(0, 40).replace(/\\/g, "\\\\").replace(/"/g, '\\"');
  return `import js, math, random, asyncio

W, H = 800, 500
canvas = js.document.getElementById("c")
ctx = canvas.getContext("2d")
hud = js.document.getElementById("hud")

state = {
    "theme": "${title}",
    "px": 100, "py": H - 80, "pvx": 0, "pvy": 0, "on_ground": True,
    "score": 0, "lives": 3, "mode": "playing",
    "shoot_cd": 0,
    "enemies": [
        {"x": 380, "y": H - 100, "vx": -2.5, "hp": 3, "w": 32, "h": 32},
        {"x": 520, "y": H - 160, "vx": 0, "hp": 4, "w": 28, "h": 28, "chase": True},
    ],
    "bullets": [],
    "stars": [{"x": (i * 47) % W, "y": (i * 19) % (H // 2)} for i in range(50)],
}

def keys_now():
    try:
        return getattr(js.window, "hoosKeyDown").to_py()
    except Exception:
        return {}

def aabb(ax, ay, aw, ah, bx, by, bw, bh):
    return ax < bx + bw and ax + aw > bx and ay < by + bh and ay + ah > by

def draw():
    ctx.fillStyle = "#0a0e1a"
    ctx.fillRect(0, 0, W, H)
    for s in state["stars"]:
        ctx.fillStyle = "#ffffff22"
        ctx.fillRect(s["x"], s["y"], 2, 2)
    ctx.fillStyle = "#2a3a2a"
    ctx.fillRect(0, H - 24, W, 24)
    ctx.fillStyle = "#e57200"
    ctx.fillRect(state["px"], state["py"], 28, 36)
    for e in state["enemies"]:
        if e["hp"] > 0:
            ctx.fillStyle = "#ff4466"
            ctx.fillRect(e["x"], e["y"], e["w"], e["h"])
    for b in state["bullets"]:
        ctx.fillStyle = "#00ffff"
        ctx.beginPath()
        ctx.arc(b["x"], b["y"], 5, 0, 2 * math.pi)
        ctx.fill()
    if state["mode"] == "gameover":
        ctx.fillStyle = "rgba(0,0,0,0.75)"
        ctx.fillRect(0, 0, W, H)
        ctx.fillStyle = "#ff4444"
        ctx.font = "bold 42px monospace"
        ctx.fillText("GAME OVER", W // 2 - 160, H // 2)
    elif state["mode"] == "win":
        ctx.fillStyle = "rgba(0,0,0,0.75)"
        ctx.fillRect(0, 0, W, H)
        ctx.fillStyle = "#ffaa00"
        ctx.font = "bold 42px monospace"
        ctx.fillText("YOU WIN", W // 2 - 120, H // 2)
    hud.innerHTML = (
        f'{state["theme"]} · SCORE {state["score"]} · LIVES {state["lives"]} · '
        "Arrows/WASD · Z shoot · R restart"
        if state["mode"] == "playing"
        else "Press R to restart"
    )

def update(_dt):
    if state["shoot_cd"] > 0:
        state["shoot_cd"] -= 1
    k = keys_now()
    if state["mode"] != "playing":
        if k.get("KeyR"):
            state.update({
                "px": 100, "py": H - 80, "pvx": 0, "pvy": 0, "on_ground": True,
                "score": 0, "lives": 3, "mode": "playing", "shoot_cd": 0,
                "bullets": [],
                "enemies": [
                    {"x": 380, "y": H - 100, "vx": -2.5, "hp": 3, "w": 32, "h": 32},
                    {"x": 520, "y": H - 160, "vx": 0, "hp": 4, "w": 28, "h": 28, "chase": True},
                ],
            })
        return
    sp = 4.5
    state["pvx"] = 0
    if k.get("ArrowLeft") or k.get("KeyA"):
        state["pvx"] = -sp
    if k.get("ArrowRight") or k.get("KeyD"):
        state["pvx"] = sp
    state["px"] = max(0, min(W - 28, state["px"] + state["pvx"]))
    if (k.get("ArrowUp") or k.get("KeyW") or k.get("Space")) and state["on_ground"]:
        state["pvy"] = -11
        state["on_ground"] = False
    state["pvy"] += 0.5
    state["py"] += state["pvy"]
    floor_y = H - 24 - 36
    if state["py"] >= floor_y:
        state["py"] = floor_y
        state["pvy"] = 0
        state["on_ground"] = True
    if k.get("KeyZ") and state["shoot_cd"] == 0:
        state["bullets"].append({"x": state["px"] + 24, "y": state["py"] + 12, "vx": 9})
        state["shoot_cd"] = 14
    for b in list(state["bullets"]):
        b["x"] += b["vx"]
        if b["x"] > W + 10:
            state["bullets"].remove(b)
    px, py = state["px"], state["py"]
    for e in state["enemies"]:
        if e["hp"] <= 0:
            continue
        if e.get("chase"):
            step = 1.2 if e["x"] < px else -1.2
            e["x"] = max(40, min(W - 40, e["x"] + step))
        else:
            e["x"] += e["vx"]
            if e["x"] < 60 or e["x"] > W - 60:
                e["vx"] *= -1
        for b in list(state["bullets"]):
            if e["hp"] <= 0:
                break
            if aabb(b["x"] - 5, b["y"] - 5, 10, 10, e["x"], e["y"], e["w"], e["h"]):
                e["hp"] -= 1
                state["bullets"].remove(b)
                if e["hp"] <= 0:
                    state["score"] += 120
                break
        if e["hp"] > 0 and aabb(px, py, 28, 36, e["x"], e["y"], e["w"], e["h"]):
            state["lives"] -= 1
            state["px"] = 80
            state["pvy"] = 0
            if state["lives"] <= 0:
                state["mode"] = "gameover"
    if state["score"] >= 500:
        state["mode"] = "win"

async def game_loop():
    while True:
        update(1 / 60)
        draw()
        await asyncio.sleep(1 / 60)

asyncio.ensure_future(game_loop())
`;
}

function pythonDemoGameWrapped(prompt: string): string {
  const py = buildPythonDemoSource(prompt);
  return `\`\`\`html
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>${prompt.slice(0, 40)} | HOOS · Pyodide</title>
<style>*{margin:0;padding:0}body{background:#000;overflow:hidden}</style>
<script src="${CDN.pyodide}"></script>
</head>
<body>
<script>
window.hoosKeyDown = {};
document.addEventListener("keydown", function (e) { window.hoosKeyDown[e.code] = true; });
document.addEventListener("keyup", function (e) { window.hoosKeyDown[e.code] = false; });
</script>
<canvas id="c" width="800" height="500" style="display:block;margin:auto;background:#111"></canvas>
<div id="hud" style="position:fixed;top:10px;left:10px;color:#e57200;font:bold 13px monospace;max-width:90vw"></div>
<script type="text/python" id="hoos-py-demo">
${py}
</script>
<script>
loadPyodide().then(function(pyodide) {
  var el = document.getElementById("hoos-py-demo");
  return pyodide.runPythonAsync(el ? el.textContent : "");
});
</script>
<div style="position:fixed;bottom:8px;left:50%;transform:translateX(-50%);font:9px monospace;color:rgba(255,255,255,.28)">Python · Pyodide · HOOS Gaming demo</div>
</body>
</html>
\`\`\``;
}

function generateDemoGame(prompt: string, language: string): string {
  if (language === "python") {
    return pythonDemoGameWrapped(prompt);
  }
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
<style>*{margin:0;padding:0;box-sizing:border-box}html,body{width:100%;height:100%;background:${bgColor};overflow:hidden}</style>
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
    this.score=0;this.lives=3;this.gOver=false;this.bossSpawned=false;this.spawnedExtra=false;this.bossHp=0;this.boss=null;this.invincible=false;

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
  let body: { prompt?: string; sessionId?: string; language?: string; detailLevel?: string };
  try { body = await req.json(); }
  catch { body = {}; }

  const { prompt, sessionId, language = "js-phaser", detailLevel = "detailed" } = body;
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
          const fullPrompt = buildPrompt(prompt, language, detailLevel);

          // ── Pass 1 ──────────────────────────────────────────────────────────
          const { thread_id: threadId, run_id } = await startRun(token, fullPrompt, sessionId);
          send({ type: "progress", pass: 1, chars: 0, status: "89 AI agents generating your game…" });

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
                contents: [{ parts: [{ text: buildPrompt(prompt, language, detailLevel) }] }],
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
