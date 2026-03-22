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

// ─── World hint extractor ─────────────────────────────────────────────────────
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
    hints.push("full tactical kit: multicam camo pattern (base tan #7B6B4E + olive patches #4A5240 + dark brown spots #3D2B1F + khaki highlights #C4A265), plate carrier with MOLLE webbing (horizontal lines 6px apart + front ammo pouches + cummerbund straps + shoulder pads), helmet (low-profile with NVG mount bracket + chin strap line + rear attachment point), balaclava/mask covering lower face (dark fill + mesh-dot pattern overlay), tactical gloves (dark #1A1A1A + knuckle highlight circles + finger seam lines), knee pads (oval shapes on legs), boots (heavy dark rect + thick sole + lace detail lines), backpack/ruck (rect behind torso + horizontal compression straps + side pockets + ALICE clip details)");
  }
  if (/\\barmor\\b|\\barmour\\b/.test(p)) hints.push("detailed full-body armor: pauldrons, chest plate (rivets + seam lines), gauntlets, greaves, visor, backplate");
  if (/\\brobe\\b/.test(p)) hints.push("flowing robes with mystical runes and ornate trim, fabric wrinkle lines at joints");
  if (/\\bcloak\\b|\\bhood\\b/.test(p)) hints.push("dramatic hooded cloak, face partially shadowed, cloth segment physics simulation");
  if (/\\bexosuit\\b|\\bmech suit\\b/.test(p)) hints.push("hi-tech exo-suit: panel seams, glowing HUD visor, thruster vents, articulated joints, mechanical fingers");

  // Weapons
  if (/\\bassault rifle\\b|\\bar.\\b|\\bm4\\b|\\bak.?47\\b|\\brifle\\b/.test(p)) hints.push("assault rifle: detailed receiver body (dark grey gradient) + barrel (cylinder highlight) + handguard with rail slots + trigger guard + pistol grip + magazine (curved lower) + stock (adjustable folded detail) + iron sights or scope + suppressor option + muzzle flash particles on fire");
  if (/\\bsniper\\b/.test(p)) hints.push("sniper rifle: long barrel (full width) + bipod legs + large scope with lens glint + bolt handle detail");
  if (/\\bshotgun\\b/.test(p)) hints.push("shotgun: wide barrel + pump grip + stock + shell ejection port");
  if (/\\bpistol\\b|\\bhandgun\\b/.test(p)) hints.push("pistol: compact frame + slide + trigger guard + grip with crosshatch pattern");
  if (/\\bsword\\b|\\bblade\\b|\\bkatana\\b/.test(p)) hints.push("sword: hilt with leather-wrap grip + cross guard (metal gradient) + blade (bright edge highlight + fuller groove line)");
  if (/\\bbow\\b|arrow|quiver/.test(p)) hints.push("bow with recurve limb detail + drawn string (tension line) + back quiver with fletched arrows");
  if (/\\bstaff\\b|wand|magic/.test(p)) hints.push("magical staff: carved wood shaft + glowing orb (radial gradient + shadowBlur) + rune engravings");
  if (/\\baxe\\b/.test(p)) hints.push("battle axe: wide crescent head with notch + long handle (wood grain lines)");
  if (/\\bshield\\b/.test(p)) hints.push("shield: decorative emblem (painted surface detail) + metal rim + grip handle on back");

  // Hair
  if (/\\bblonde\\b|golden hair/.test(p)) hints.push("blonde hair (#FFD700, gradient to #DAA520 shadow)");
  if (/\\bbrunette\\b|brown hair/.test(p)) hints.push("brown hair (#6B3A2A, gradient to #3D1F10 shadow)");
  if (/black hair/.test(p)) hints.push("black hair (#111111, gradient to #000000 shadow)");
  if (/red hair|redhead/.test(p)) hints.push("red hair (#CC2200, gradient to #881100 shadow)");
  if (/white hair|silver hair/.test(p)) hints.push("white/silver hair (#E8E8E8, gradient to #AAAAAA shadow)");

  // Skin
  if (/dark skin|brown skin/.test(p)) hints.push("dark skin tone (#5C3D2E lit, #2A1A0E shadow, subsurface scatter: slight red tint at lit edge)");
  if (/pale skin|fair skin/.test(p)) hints.push("pale skin (#F5E6D3 lit, #C4956A shadow)");

  // Color schemes
  if (/\\bred\\b/.test(p)) hints.push("red color scheme (#CC1100)");
  if (/\\bblue\\b/.test(p)) hints.push("blue color scheme (#1144CC)");
  if (/\\bgreen\\b/.test(p)) hints.push("green color scheme (#117733)");
  if (/\\bpurple\\b|\\bviolet\\b/.test(p)) hints.push("purple color scheme (#6622AA)");
  if (/\\bgold\\b|\\byellow\\b/.test(p)) hints.push("gold/yellow color scheme (#CCA800)");
  if (/\\bneon\\b|\\bglow\\b/.test(p)) hints.push("neon glow (ctx.shadowBlur=18, emissive materials)");

  // World themes
  if (/\\bcyberpunk\\b/.test(p)) hints.push("cyberpunk: chrome panels, glowing implants, holographic HUDs, neon signs on wet streets (rain reflections)");
  if (/\\bmediev\\b|\\bfantasy\\b/.test(p)) hints.push("medieval fantasy: stone castles (crack textures), torch fire particles, heraldic emblems");
  if (/\\bspace\\b|\\bsci.fi\\b|\\bfutur/.test(p)) hints.push("sci-fi: stars (dot particles), holographic displays, energy weapon trails");
  if (/\\bhorror\\b/.test(p)) hints.push("horror: decay textures (dark rot splotches), blood splatter particles, shadow vignette overlay");
  if (/\\bsteampunk\\b/.test(p)) hints.push("steampunk: brass gears (concentric circles + tooth geometry), steam vent particle plumes, iron rivets");
  if (/\\bwestern\\b|\\bcowboy\\b/.test(p)) hints.push("western: dust particle clouds, wood plank grain textures, heat shimmer overlay");
  if (/\\bocean\\b|\\bpirate\\b|\\bsea\\b/.test(p)) hints.push("ocean: wave sine-surface animation, foam particle spray, water depth gradient");
  if (/\\bunderwater\\b/.test(p)) hints.push("underwater: caustic light ray overlays (animated diagonal beams), bubble particle streams, bioluminescent glow");
  if (/\\bjungle\\b/.test(p)) hints.push("jungle: layered canopy foliage (5+ green shades), vine curves, dappled light patches");
  if (/\\bdesert\\b|\\bsand\\b/.test(p)) hints.push("desert: sand particle drift, heat shimmer (wavy overlay), dune silhouettes");
  if (/\\bice\\b|\\bsnow\\b|\\bwinter\\b/.test(p)) hints.push("winter: snowflake particle fall, frozen surface (blue-white gradient + crack lines), ice refraction glints");
  if (/\\blava\\b|\\bvolcano\\b/.test(p)) hints.push("volcanic: lava glow (orange radial gradient), ember particle streams, heat distortion overlay");
  if (/\\bapocalypse\\b|\\bpost.apoc/.test(p)) hints.push("post-apocalyptic: ash sky gradient, rubble debris piles, burnt vehicle hulks, atmospheric dust haze");
  if (/\\bwar\\b|\\bbattle\\b|\\bconflict\\b/.test(p)) hints.push("war zone: artillery smoke columns (multi-layer particle emitters), explosion craters, burning structures, helicopter silhouettes, dramatic overcast sky");

  // Animals
  const animals = ["wolf","dragon","lion","tiger","bear","eagle","snake","spider","horse","shark","panther","fox","raven","scorpion","phoenix","griffin","hydra","cerberus","kraken","dinosaur","raptor"];
  animals.forEach(a => { if (p.includes(a)) hints.push(\`animal: \${a} — anatomical skeleton proportions, fur/scales/feathers in 3 shade layers, eye with iris+highlight+slit pupil, animated gait cycle, breath particles if fire-breathing\`); });

  // Vehicles
  const vehicles = ["tank","car","truck","helicopter","drone","spaceship","submarine","boat","ship","mech","motorcycle","train","hovercraft","jet","fighter jet","bomber","aircraft carrier"];
  vehicles.forEach(v => { if (p.includes(v)) hints.push(\`vehicle: \${v} — chassis gradient fill, rotating wheels/tracks (fillRect segments), windows (semi-transparent), exhaust particles, damage state (darker + fire particles), type detail: tank=turret rotation+tracks; helicopter=rotor blur ellipses+landing gear; spacecraft=engine glow cones\`); });

  // Structures
  const structures = ["castle","dungeon","tower","temple","ruins","city","building","bunker","fortress","base","cave","laboratory","arena","prison","skyscraper","warehouse"];
  structures.forEach(s => { if (p.includes(s)) hints.push(\`structure: \${s} — material simulation (stone crack lineStyle, metal rivets, wood grain), window grids (warm interior glow), door frames, weathering (darker bottom 25% + stain splotches), damaged variant (rubble chunks, broken walls)\`); });

  return hints.length > 0
    ? \`WORLD DETAIL BRIEF: \${hints.join("; ")}.\\nIMPLEMENT ALL listed traits with maximum visual fidelity — every entity (character, animal, vehicle, object, structure, environment) must be rendered with material-accurate surfaces, atmospheric effects, and appropriate animation.\`
    : \`WORLD DETAIL: Invent a richly detailed world — protagonist with layered gear/clothing/weapon, enemy types with distinct silhouettes and material-accurate bodies, atmospheric effects (smoke, fog, particles), environment with material textures and ambient animation. AIM FOR NEAR-PHOTOREALISTIC QUALITY.\`;
}

function extractCharacterHints(prompt: string): string { return extractWorldHints(prompt); }
`;

// ─── Shared API + Photorealism block (injected into ALL 7 engine prompts) ─────
const SHARED_FULL_BLOCK = esc(`
═══════════════════════════════════════════════════════════════════
HOOS AI RENDERING AGENTS — 8 SPECIALIZED SYSTEMS (implement ALL)
═══════════════════════════════════════════════════════════════════
You are orchestrating 8 specialized rendering agents. Each must be implemented as a class or module in the game code:

━━━ AGENT 1: CharacterRenderer ━━━
Multi-layer pipeline for EVERY humanoid entity (characters, NPCs, enemies):
  LAYER 0 — Contact shadow: offset filled ellipse (black alpha 0.18) at feet
  LAYER 1 — 3D Form volumes: NO flat fills — use createLinearGradient() for every body part:
    Lit side → shadow side angle matches scene light direction (usually top-left)
    Skin lit: #E8C49A → shadow: #7A4020 (gradient across face/neck/hands)
    Metal armor lit: #9AACBB → shadow: #1A2028; specular highlight: white ellipse alpha 0.7
    Fabric lit: outfit color → 40% darker shadow; crosshatch texture (setLineDash([2,4]), lineStyle at ±45deg, alpha 0.12)
    Leather: dark gradient + sheen arc (lighter semi-transparent ellipse alpha 0.25)
  LAYER 2 — Camo/surface patterns (for military): irregular polygon patches using beginPath/moveTo/lineTo/closePath:
    Multicam: base #7B6B4E, patches in #4A5240 (olive), #3D2B1F (dark brown), #C4A265 (khaki) — 8-14 shapes total
    MOLLE webbing: horizontal lines at 5px intervals across vest area, alpha 0.6
    Front pouches: 2-3 darker rects with velcro dot grid (tiny dots 3px apart)
  LAYER 3 — Fine detail: scratches (diagonal lineStyle darker shade), seams (strokeRect thinner), insignia (small filled shapes), wear at edges
  LAYER 4 — Lighting overlay: globalCompositeOperation='overlay', semi-transparent colored rect from nearest light source (orange near fire, blue in shade, white in sun)
  LAYER 5 — Rim light: bright thin arc on the backlit edge (opposite from main light), white alpha 0.4-0.6
  LAYER 6 — Specular: bright white ellipse (alpha 0.65) on metal/glass/wet surfaces at light reflection point

MILITARY GEAR SPEC (implement when character is soldier/operator/military):
  HELMET: rounded rect + NVG mount bracket (small rect front-center) + bump stop rects + chin strap arc; multicam painted surface
  BALACLAVA: dark #111 fillRect covering lower face + nose bridge notch + skull/mesh overlay (tiny dot grid)
  PLATE CARRIER: dark grey #252525 rect body + horizontal MOLLE lines + 3 front pouch rects (with velcro dot texture) + shoulder pad arcs + side cummerbund straps; add small radio pouch on shoulder
  GLOVES: dark #1A1A1A fill + lighter knuckle highlight circles (3-4) + finger seam lineStyle
  BOOTS: heavy dark rect + thick bottom sole rect + lace panel lineStyle

━━━ AGENT 2: AtmosphericRenderer (100+ particle smoke, fire, wind, fog) ━━━
class AtmosphericRenderer {
  constructor(): smoke[], fire[], debris[], fog[], wind={x:0.9,y:0} with gentle sine variation
  
  SMOKE EMITTER (emit per active source each frame):
    New particle: {x, y, vx:rand(±0.4)+windX, vy:rand(-0.8,-2.2), r:rand(4,9), alpha:rand(0.4,0.7), age:0, maxAge:rand(180,280), phase:'rise'|'drift'}
    Update: x+=vx+windX*0.6; y+=vy; vx*=0.985; vy*=0.978; r*=1.0065; alpha-=0.0025; age++
    Color gradient by age: young='rgba(55,45,35,a)' → mid='rgba(110,108,105,a)' → old='rgba(195,198,202,a)'
    Draw: ctx.globalAlpha=alpha; radial gradient fill or flat fill; rotate(age*0.008)
    Use ctx.filter='blur(2px)' on smoke layer for soft edges; reset after
    
  FIRE EMITTER:
    Flame particles: {vx:rand(±1.5), vy:rand(-5,-9), r:rand(3,8), alpha:0.9, hue:'fire'}
    Color: young='rgba(255,200,40,a)' → mid='rgba(255,100,10,a)' → old='rgba(160,40,5,a)'
    Inner glow: large soft circle at base (r=25, alpha=0.12, orange) via radial gradient
    Embers: slow-falling, r=1-2, orange-red, gravity +0.06/frame, long life, trail 2px behind
    
  WIND EFFECT:
    windX = 0.9 + Math.sin(time*0.28)*0.6; applied to all smoke/fire/debris
    Wind streak particles: horizontal, length rand(18,55), alpha rand(0.08,0.18), color '#DDD8CC', drifting
    Dust wisps: small ellipse clusters drifting right, alpha 0.1-0.22
    
  VOLUMETRIC FOG (3 large layers):
    Each layer: 3-5 large semi-transparent rects (width*2 tall) at different x offsets, scroll at wind speed, alpha 0.04-0.12
    Colors: grey-white day '#E8E5DF', blue-grey night '#8090A8', orange-tinted near fire '#D4A870'
    Layers: far (alpha 0.05, slow scroll), mid (alpha 0.09, mid scroll), near (alpha 0.12, fast scroll)
    
  EXPLOSION SYSTEM:
    Phase 0-120ms: white flash — fillRect fullscreen alpha 0.6, fade
    Phase 0-400ms: fireball — 60 particles radial outward at high velocity, orange→dark
    Phase 100ms+: debris — 20 dark irregular shapes (fillRect rotated) with gravity+bounce
    Phase 200ms+: smoke cloud — 80+ grey smoke particles rising from impact point
    Shockwave: expanding strokeStyle circle, thin lineWidth 2, alpha 0.7→0 over 500ms

━━━ AGENT 3: MaterialSimulator ━━━
function renderMaterial(ctx, type, x, y, w, h, options):
  'metal': gradient #111→#2A2A2A, specular stripe via createLinearGradient at 30deg angle #888→#CCC, ellipse glint #FFF alpha 0.7, scratch lineStyle #444 alpha 0.35 (2-3 diagonal lines), muzzle heat: purple-blue tint at barrel tip
  'stone': gradient #5A5550→#3A3533, noise via 35 tiny circles/rects (2-4px, alpha 0.18) scattered randomly, crack paths: irregular lineTo sequences dark #222 width 1.2
  'concrete': like stone but lighter #7A7570, rubber skid marks (thin dark arcs), bullet hole circles with debris ring
  'wood': gradient #8B5E3C→#5A3520, grain: 8 horizontal sinusoidal lineStyle at y offsets (alpha 0.35, #5A3520), knot circle optional
  'fabric': flat outfit fill, weave: setLineDash([2,3]), two diagonal lineStyle passes at ±45deg, alpha 0.1-0.15
  'glass': alpha fill 0.2, reflection arc (bright thin arc upper-left), edge lineStyle #88AACC
  'skin': gradient lit→shadow, subsurface scatter (faint red-tinted gradient at thin areas)
  'water': animated sine-wave horizontal strokePaths (5-8 lines), depth gradient fill (dark blue bottom), caustic light dots

━━━ AGENT 4: LightingEngine ━━━
class LightingEngine {
  lights: [{x, y, color, intensity, radius, type:'point'|'spot'|'sun'}]
  
  applyAmbient(ctx, w, h): fillRect fullscreen with ambient color (dark blue/grey, alpha 0.22-0.35) using globalCompositeOperation='multiply'
  
  applyPointLight(ctx, light): radial gradient at light position, inner transparent, outer light.color at alpha light.intensity/2
    Apply with globalCompositeOperation='screen' for additive lighting
    
  applyMuzzleFlash(ctx, x, y): radial gradient #FFF→#FF8800→transparent, radius 45-75px, alpha 0.9, duration 55ms; PointLight spike
  
  applyShadow(ctx, entity): offset dark ellipse at entity feet (black alpha 0.25), stretched based on light direction
  
  applyBloom(ctx, elements): for each bright element, draw extra semi-transparent glow 120% size, alpha 0.15, with blur filter
}

━━━ AGENT 5: WindPhysics ━━━
Cloth segment simulation (capes, scarves, flags, hair):
  segments[]: [{x, y, oldX, oldY, pinned:bool}], length=12-20 per cloth
  Update: VERLET integration — temp=x; x=x+(x-oldX)*0.98+windX*0.08; oldX=temp; add gravity segment
  Constrain: foreach pair: adjust positions to maintain fixed link distance
  Draw: quadraticCurveTo through segment points for smooth cloth curve
  Apply to: character capes, hair (10 segments), banners, smoke shapes

Hair physics: 8 segments from head, gravity +0.3, wind offset ±windX*0.2, drawn as bezier curve

━━━ AGENT 6: AnimationRigger ━━━
class AnimationSystem {
  WALK CYCLE: legs alternate sin(time*walkFreq)*legAmp; arms counter-swing sin(time*walkFreq+PI)*armAmp
  RUN CYCLE: larger amplitude, torso forward lean -12deg, head bob
  IDLE: breathing (torso scaleY ±1.5% at 0.4Hz), subtle weight shift (slow sin sway ±2px)
  AIM: weapon arm extended forward, support arm angled up, slight lean forward, recoil on shoot (push back 4px over 60ms then return)
  HURT: translate(rand(±3), rand(±3)) for 200ms, red tint overlay alpha 0.5
  DEATH (ragdoll): each body part gets {vx, vy, rot, rotVel}; apply gravity; bounce on ground; come to rest
  
  VEHICLE ANIMATIONS:
    Wheel: rotation += velocity/wheelRadius; draw with ctx.rotate(wheelAngle)
    Helicopter rotors: draw ellipse at 6 different angles each frame (blur effect), spin 240deg/s
    Tank turret: smooth rotation toward target using lerp on angle
    Exhaust: particle emit rate = throttle * 3 per frame
    
  ENVIRONMENTAL ANIMATION:
    Foliage: leaf clusters oscillate via sin(time + x*0.3)*windStrength
    Water surface: 6-8 sine-wave strokePaths, animated phase offset each frame
    Fire: each particle physics per AGENT 2
    Flags/cloth: WindPhysics segments

━━━ AGENT 7: EnvironmentPainter ━━━
DRAMATIC SKY (render as first background layer):
  Overcast war zone: gradient #060810 top → #0E1520 upper-mid → #1C2535 mid → #283040 horizon
  Clouds: 15-25 large overlapping ellipses (w 80-200, h 30-70), grey shades #404550→#6A7080, drawn with filter='blur(4px)', alpha 0.7-0.9
  Sun/moon: soft radial gradient glowing disc, appropriate color temperature
  God rays/light shafts: thin wedge shapes from light source, alpha 0.04-0.08, overlay blend
  Debris in sky: small dark polygon shapes with gentle falling physics (battle scenes)

TERRAIN MATERIALS:
  Asphalt/concrete: #2A2825 base, crack network (lineStyle irregular paths, dark #111), skid marks (arc lineStyle dark)
  Dirt/mud: #3D2E1A base, dark patches #25180A, rock objects (small filled ellipses), tire track depressions
  Grass: dense rect clusters h=5-14px, 4 color variants (#2A5220, #3A6830, #1E4018, #4A7840), varying heights

DEPTH OF FIELD simulation:
  Far objects (x>5000 world): desaturate by blending toward fog color, reduce alpha by 15%
  Very far (x>7500): additional ctx.filter='blur(1px)' pass, alpha reduction 30%
  Near foreground: sharp, full contrast, slight vignette at screen edges

DRAW ORDER (strictly follow for correct compositing):
  1. Sky gradient + clouds + god rays
  2. Far background scenery (parallax 0.04) — draw with fog desaturation
  3. Volumetric fog layer BACK (alpha 0.06)
  4. Mid-ground environment (parallax 0.22) — structures, terrain features
  5. Volumetric fog layer MID (alpha 0.09)
  6. Near environment / platforms / ground terrain
  7. Environment objects (vehicles, structures, props)
  8. Entity shadows (before entities)
  9. Entities sorted back→front (entities further right drawn first for side-scroller depth)
  10. Player
  11. Projectiles + muzzle flashes (globalCompositeOperation='screen')
  12. Explosion effects (fire particles, smoke, shockwave)
  13. Volumetric fog layer FRONT (alpha 0.12)
  14. Wind streaks + weather (rain lines, snow dots)
  15. HUD (top layer, setScrollFactor(0) or fixed position)

━━━ AGENT 8: ParticleSystem ━━━
class ParticlePool {
  pool: Particle[N] — pre-allocated pool of N=300 particles (avoid GC)
  active: number
  
  emit(config:{x,y,vx,vy,r,alpha,color,gravity,drag,life,type}): find inactive particle, initialize
  update(dt): forEach active particle: apply physics; age; deactivate if dead
  render(ctx): batch similar particles; set fillStyle once per color group; draw all
  
  PARTICLE TYPES:
    'smoke': growing, fading, grey, rises, wind-affected
    'fire': shrinking, color-shift orange→red, rises fast, short life
    'ember': tiny, orange-red, gravity, long life, faint trail
    'spark': bright white-yellow, fast radial, gravity, very short life
    'blood': dark red, gravity, splat on ground (flatten on y=groundY)
    'debris': dark grey, irregular, gravity, bounce once, rotation
    'dust': tan/grey, spreads low to ground, fades quickly
    'muzzle': bright flash, fast, very short life, front of barrel
    'explosion': radial outward, large, color-shift orange→dark

━━━ HOOS API HOOKS ━━━
window.hoosMath(theme, callback) — call ONCE at game init for Wolfram physics:
  var GRAVITY=580,WALK_SPD=240,RUN_SPD=400,JUMP_VEL=580,BULLET_SPD=900; // define defaults FIRST
  hoosMath("gameThemeHere", function(p){ if(p.gameGravityPxS2) GRAVITY=p.gameGravityPxS2; if(p.walkSpeedPxS) WALK_SPD=p.walkSpeedPxS; if(p.bulletSpeedPxS) BULLET_SPD=p.bulletSpeedPxS; });

window.hoosSpeech(text, character, emotion) — ElevenLabs AI voices:
  hoosSpeech("CONTACT! All units advance!", "boss", "angry");       // Boss spawn
  hoosSpeech("I won't fall here... not today.", "hero", "confident"); // Low HP
  hoosSpeech("Phase two... this ends NOW!", "villain", "sinister");  // Boss phase 2
  hoosSpeech("Nicely done, soldier. Push forward.", "npc", "excited"); // Kill streak
  hoosSpeech("Objective secured. Victory!", "hero", "excited");      // Win
  MINIMUM 5 hoosSpeech calls: boss intro, each phase change, low HP moment, kill taunt, win/lose

window.hoosAnalytics(event, data) — Snowflake analytics:
  hoosAnalytics("kill",{enemy:"boss",score,level,combo}); hoosAnalytics("win",{score,stars,time:Date.now()-startTime});

═══════════════════════════════════════════════════════════════════
`);

// ─── Engine builders ──────────────────────────────────────────────────────────
function buildPhaser(cdn) {
  return `\`You are HOOS AI — elite AAA game studio. Build a COMPLETE, fully playable Phaser 3 game from: "\${userPrompt}"
Target quality: CALL OF DUTY / BATTLEFIELD — photorealistic characters, volumetric atmosphere, cinematic lighting.

ABSOLUTE RULES:
• Wrap entire output in \\\`\\\`\\\`html ... \\\`\\\`\\\`
• <!DOCTYPE html> open, </html> close
• Load Phaser from: ${cdn.phaser} (blocking <script src>, NO defer/async)
• html,body { width:100%; height:100%; margin:0; overflow:hidden }
• Web Audio API for ALL sounds — zero external audio files
• NEVER truncate — implement every agent, every system, every function in full

\${charHints}

${SHARED_FULL_BLOCK}

═══ PHASER 3 IMPLEMENTATION ═══

BOOT SCENE — generateTextures() using this.make.graphics():

PLAYER (48×64px) — implement CharacterRenderer pipeline:
  this.make.graphics() → apply all 6 rendering layers:
  L1: createLinearGradient from top-left to bottom-right for each body part volume
  L2: camo polygon patches via fillPoints() if military; outfit weave via lineStyle setLineDash
  L3: fine detail: fillRect seam lines, fillCircle rivets, small insignia
  L4: tint overlay via setFillStyle with composite blend
  L5+L6: specular dot (1 fillCircle, lighter color, top-left of metal parts)
  Full anatomy: hair shape on head, facial features (eye dots, nose, mouth arc), neck, torso with gear/outfit detail, left+right arms+hands, weapon (full detail per weapon type), legs+boots, accessories

4 ENEMY TYPES — completely different silhouettes, each with CharacterRenderer pipeline:
  enemy_grunt (34×44): standard soldier — multicam body, helmet, rifle shape
  enemy_ranger (28×48): lean sniper — tall, long rifle barrel, scope rect
  enemy_heavy (58×58): massive — wide armored body (3/4 canvas width), heavy weapons, no visible neck
  enemy_aerial (48×28): flying — wide flat body, rotor ellipses or wing shapes, camera turret eye
  boss (96×72): imposing multi-part — large head+headgear, wide armored body (full width), extended weapon arms, chest core glowing circle (emissive fill), rank insignia

ENVIRONMENT TEXTURES — MaterialSimulator for each:
  plat_concrete: grey gradient + crack lineStyle paths + edge chip
  plat_metal: dark gradient + specular stripe + rivet dots
  plat_dirt: brown gradient + rock scatter + root lines
  bg_smoke_particle: soft grey circle with radial gradient (transparent center, grey edge)
  bg_debris: small dark grey irregular fillPoints polygon
  All item textures (hp=red cross, ammo=bullets stack, star=star shape, power=orange lightning)
  Bullet textures: bul_player=bright elongated ellipse with trail; bul_enemy=dark; bul_boss=glowing

ATMOSPHERIC SYSTEM (implement AtmosphericRenderer as Phaser Graphics/Particle system):
  Smoke columns (4-6 emitters across level): use Phaser particle emitter OR draw 100+ manual particles
  Fire sources: orange-yellow particles emitting upward
  Volumetric fog: 3 large semi-transparent rectangles per layer, scrolling at wind speed
  Wind: global windX=0.9, applied each update to smoke/fire/debris particles
  Weather: if themed (rain=angled line particles, snow=white dot particles, ash=grey falling)

PARALLAX (3 layers via setScrollFactor + tileSprite or manual camera offset):
  Layer 0 (0.04): dramatic sky + clouds + distant silhouettes + god rays
  Layer 1 (0.22): mid-ground structures/terrain features (drawn with MaterialSimulator)
  Layer 2 (0.55): near foreground debris/foliage

LEVEL (3 zones, 9000px wide):
  this.physics.world.setBounds(0,0,9000,560); this.cameras.main.setBounds(0,0,9000,560)
  Zone 1 (0-2800): 12+ platforms, 4 grunts + 2 rangers, ammo/hp items, intro set pieces
  Zone 2 (2800-6000): 16 platforms, hazard zones (lava/electricity/fire: overlap → 11dmg/s), 6 grunts+4 rangers+2 heavies, moving platforms (tweenY/tweenX)
  Zone 3 (6000-9000): dense arena, all 4 types, boss trigger at x=8200, lock-in walls
  Camera: startFollow(player, true, 0.1, 0.1); setDeadzone(200, 100)

PLAYER SYSTEM:
  hp=100,maxHp=100,lives=3,stamina=100,score=0,combo=0,comboTimer=0,ammo=30,level=1,xp=0,jumpsLeft=2
  dashCd=0, attackTimer=0, invTimer=0, state='idle'
  Controls: WASD/arrows=move, SHIFT=sprint (speed×1.65, stamina drain), W/UP=jump, Z=melee (65px arc, 30dmg), X=shoot (ammo--), C=special
  Double-jump, wall-slide (vy→max(vy,60) when against wall), dash (double-tap 220ms, vel±520, 400ms cd)
  Invincibility 1500ms post-hit (alpha flicker every 80ms)
  XP/Level: 220xp=level up; maxHp+=18, damageBonus+=6
  Combo: ×1-×5 multiplier; comboTimer 3s; score×multiplier; pulse text

4 ENEMY AI TYPES:
  grunt: speed 130, patrol ±200px, aggro 320px, hp=2, drops 80pts+xp
  ranger: speed 85, patrol, aggro 400px, fires every 2.6s (angle.between), strafes, hp=4
  heavy: speed 58, patrol ±120px, charge burst ±420px when player<200px for 550ms, hp=8
  aerial: disableGravity, y=baseY+sin(t*0.002)*38, follow playerX at 115/s, dive every 4.2s, hp=3
  All: HP bar (graphics rect above head red/green), pain flash (setTint), death (tween scale→0, particle burst)

BOSS (hp=60):
  phase1(60-41): traverse ±300px, 3-shot spread 2s, summon 2 grunts 14s
  phase2(40-21): faster, 5-shot+ground shockwave bul_boss at floor height, summon rangers, camera.shake 0.004
  phase3(20-1): setTint(0xff3300), 8-radial 1.1s, charge ×380, summon heavies, camera.shake loop 8s
  Boss bar: full-width top (setScrollFactor 0), phase color, phase name, boss portrait icon

FULL HUD (setScrollFactor(0), depth 100):
  HP gradient bar (green→yellow→red), stamina bar (blue), armor bar if applicable
  Lives ♥×3, Score (pulse on point), Combo multiplier (fade), Ammo text+bar, Level+XP arc
  Boss HP full-width (hidden until boss), phase color, phase name
  Mini-map 85×55 (bottom-right): player white, enemies red, boss yellow pulse
  Kill feed (right edge): last 3 kills, fade after 4s
  Objective text (top center)

AUDIO:
  bgm(): 12-note looping oscillator, dramatic minor key, bass drone + melody + percussion
  sfxGunshot(): sharp attack, noise burst, short decay — realistic gun sound
  sfxMelee(), sfxExplosion(), sfxEnemyDeath(), sfxBossHit(), sfxBossRoar(), sfxBossPhase(),
  sfxPickup(), sfxLevelUp(), sfxJump(), sfxLand(), sfxVictory(), sfxGameOver(), sfxAlert()

GAME STATES: intro(2.5s cinematic title+character reveal) → playing → paused(ESC) → gameover/win(star rating 1-3+stats)

config: {type:AUTO, width:960, height:560, physics:{default:'arcade',arcade:{gravity:{y:GRAVITY},debug:false}}, scene:[Boot,Game], scale:{mode:Phaser.Scale.FIT, autoCenter:Phaser.Scale.CENTER_BOTH}}

ALL 8 RENDERING AGENTS must be implemented as functions/classes in the Boot/Game scene code.
EVERYTHING — visuals, enemies, environment, atmosphere, audio tone — must authentically reflect: \${userPrompt}\``;
}

function buildThree(cdn) {
  return `\`You are HOOS AI — elite AAA 3D game studio. Build a COMPLETE, fully playable Three.js r134 FPS from: "\${userPrompt}"
Target quality: CALL OF DUTY / HALO — PBR materials, volumetric atmosphere, cinematic FPS feel.

ABSOLUTE RULES:
• Wrap in \\\`\\\`\\\`html ... \\\`\\\`\\\`; <!DOCTYPE html> open, </html> close
• Load Three.js from: ${cdn.three} (blocking <script src>)
• html,body { width:100%; height:100%; margin:0; overflow:hidden }
• Web Audio API for all sounds; NEVER truncate

\${charHints}

${SHARED_FULL_BLOCK}

═══ THREE.JS IMPLEMENTATION ═══

RENDERER:
  THREE.WebGLRenderer({antialias:true,powerPreference:'high-performance'}), shadowMap.enabled=true, PCFSoftShadowMap
  setSize(innerWidth,innerHeight), setPixelRatio(Math.min(devicePixelRatio,2)), setToneMapping(THREE.ACESFilmicToneMapping), toneMappingExposure=1.2

SCENE ATMOSPHERE (EnvironmentPainter Agent):
  scene.fog = new THREE.FogExp2(fogColor, 0.018) — thick for war zones, thin for sci-fi
  scene.background = new THREE.Color(skyColor) or CubeCamera skybox
  PMREMGenerator for environment map reflections

LIGHTING (LightingEngine Agent):
  AmbientLight(ambientColor, 0.35)
  DirectionalLight(#FFF8F0, 1.6), castShadow, shadow.mapSize=2048, position(30,55,20), shadow bias -0.0005
  2 PointLights with oscillating intensity (fire flicker: ±0.4 sine wave, 1.2Hz)
  SpotLight for boss arena: castShadow, penumbra 0.4, angle 0.4
  HemisphereLight(skyColor, groundColor, 0.25) for bounce light

PLAYER (CharacterRenderer Agent for viewmodel):
  requestPointerLock; mousemove → yaw(camera Y) + pitch(camera X, clamp ±1.3rad)
  WASD movement, decompose from yaw; head-bob sin(t*11)*0.05 when moving
  SHIFT=sprint (×1.9), C=crouch (camera.y lerp 1.0), SPACE=jump (vel=9.5, double-jump)
  F=melee (sphere 2.2m, 65dmg, 0.7s cd, camera lurch anim), G=grenade (arc throw, 2.4s fuse, r=6.5, 80dmg)
  Stats: hp=100, armor=50, stamina=100, regen +1.8/s after 5s no damage
  
WEAPONS (3, keys 1/2/3):
  Each viewmodel: BoxGeometry compound mesh (receiver+barrel+stock+grip+mag) in MeshStandardMaterial({metalness:0.92,roughness:0.12})
  Weapon sway: position.lerp(targetPos + mouseXdelta*0.015, 0.08) per frame
  PRIMARY: damage 22, rate 0.12s, ammo 30/90, auto; muzzle PointLight (intensity 18, 0.055s spike); 6 SphereGeometry spark particles; shell ejection particle
  SECONDARY: damage 38, rate 0.45s, ammo 8/24, semi
  MELEE F: damage 65, sphere check 2.2, 0.65s cd; animate camera forward/back
  Reload: 2.2s animation (weapon tilts, mag drops, new mag inserts)
  Ammo casing particles: small gold CylinderGeometry, ejects right at fire, gravity+bounce

PARTICLES (ParticleSystem Agent):
  Smoke emitters (4+ across level): THREE.Points(BufferGeometry, 100 particles), ShaderMaterial with alphaTest, grey gradient, rising+wind drift
  Fire emitters: orange-yellow Points, shrinking, short life
  Explosion system: Phase flash (fullscreen HTML overlay white alpha 0.9) + radial THREE.Points burst + debris BoxGeometry fragments + smoke cloud + shockwave expanding ring (THREE.RingGeometry, opacity→0)
  Blood splatter: 8 small SphereGeometry, dark red, scatter on enemy death, gravity, removed 4s
  Muzzle flash: PointLight spike + 6 small SphereGeometry sparks at barrel tip

ENVIRONMENT (EnvironmentPainter Agent):
  FLOOR: PlaneGeometry(240,240), MeshStandardMaterial({color, roughness:0.88, metalness:0.0}), receiveShadow, rotation.x=-PI/2
  MaterialSimulator as MeshStandardMaterial settings:
    Concrete: roughness 0.95, metalness 0; Stone: roughness 0.9, metalness 0.05; Metal: roughness 0.08, metalness 0.95
  3 ARENAS: Arena1 (z -35 to 35): 10 cover objects; Arena2 (x 55-115): multi-level ramps; Arena3 boss room (x 145-205): open+4 pillars+boss platform CylinderGeometry(emissive)
  CORRIDORS: BoxGeometry tunnel segments connecting arenas
  30+ DECORATIVE MESHES: theme-appropriate; EVERY mesh: PBRMaterial({albedoColor, metallic, roughness, emissiveColor, emissiveIntensity})
  BOUNDARY: 4 invisible BoxGeometry collision walls

ENEMIES (4 types + boss, compound THREE.Group meshes — CharacterRenderer logic as PBR geometry):
  GRUNT (×8): body Box(1,1.8,0.6)+head Sphere(0.42)+arm Cylinders; hp=30,speed=3.8; HP bar div via CSS3D
  RANGER (×5): tall Box(0.8,2,0.5)+rifle arm; hp=25; hitscan 2.1s, distance 55; strafes; retreats
  HEAVY (×3): wide Box(2.1,2.2,1.2)+thick Cylinders; hp=90; charge burst speed 7.5 for 1.2s; death spawns 2 grunts
  DRONE (×4): Sphere(0.6)+fin Boxes; y=6+sin(t*2)*1.5; hp=20; drops bomb every 3.5s (Sphere falling, explode radius 5)
  BOSS: 6-part compound Group (torso Box+head Sphere+shoulder pads+weapon arm extensions); hp=150; 3-phase AI; emissive material pulses on damage
  All enemies: HP bar div positioned via camera.project(pos)→CSS; pain flash (material.emissive red spike); death: scatter fragments

COMBAT:
  Raycaster hitscan from camera; damage numbers: HTML div positioned via 3D→CSS, float+fade
  Projectiles: SphereGeometry(0.12), emissive MeshStandardMaterial, velocity, 3s life; onCollide with enemies
  Explosions: full 5-phase system (flash+fireball+debris+smoke+shockwave)

HUD (HTML position:fixed, CSS):
  Crosshair: 4 CSS divs, gap spreads on move (transition), widens on shoot
  HP gradient CSS bar + armor bar; stamina bar; ammo "28/84" + reload arc SVG
  Radar 125×125 canvas (top-right): center=player, enemies=colored dots+distance fade, boss=pulsing ring
  Kill feed (top-right list): last 4 kills, slide-in, fade 5s
  Boss HP full-width gradient bar (top), phase name, phase color, hidden until spawns
  Objective text, score, grenade count

GAME LOOP: clock.getDelta(), dt=Math.min(delta,0.04); updatePlayer+updateEnemies+updateParticles+updateAtmosphere+updateHUD; renderer.render(scene,camera)

ALL visuals, materials, atmosphere, audio, level design match: \${userPrompt}\``;
}

function buildBabylon(cdn) {
  return `\`You are HOOS AI — elite AAA 3D game studio. Build a COMPLETE Babylon.js 3D game from: "\${userPrompt}"
Target: HALO / BATTLEFIELD level of visual richness.

ABSOLUTE RULES:
• Wrap in \\\`\\\`\\\`html ... \\\`\\\`\\\`
• Load Babylon.js from: ${cdn.babylon} (blocking <script src>)
• html,body { width:100%; height:100%; margin:0; overflow:hidden }
• Web Audio API sounds; NEVER truncate

\${charHints}

${SHARED_FULL_BLOCK}

═══ BABYLON.JS IMPLEMENTATION ═══

<canvas id="c" style="width:100%;height:100%;display:block;touch-action:none">
const engine=new BABYLON.Engine(canvas,true,{adaptToDeviceRatio:true,stencil:true});
const scene=new BABYLON.Scene(engine);
scene.gravity=new BABYLON.Vector3(0,-28,0); scene.collisionsEnabled=true;
scene.fogMode=BABYLON.Scene.FOGMODE_EXP2; scene.fogDensity=0.018;

LIGHTING (LightingEngine Agent):
  HemisphericLight({skyColor, groundColor, intensity:0.4})
  DirectionalLight: sun castShadow, ShadowGenerator(2048) ALL meshes; position(40,65,25)
  2 PointLights oscillating (fire flicker: sin*0.45 at 1.2Hz)
  SpotLight for boss arena drama

CAMERA: BABYLON.UniversalCamera; WASD+mouse; manual yVelocity gravity -30/s²; jump=10.5; double-jump; sprint×2
Stats: hp=100,armor=50,stamina=100; regen+2/s after 5s no-damage

WEAPONS (3): each=damage+fireRate+ammo+viewmodel mesh+muzzle PointLight spike; 3 types as before
PRIMARY: PBRMaterial({metallic:0.95,roughness:0.05}), damage 24, auto; muzzle flash PointLight intensity 12 spike 0.06s
SECONDARY: damage 42, semi; MELEE F: damage 70, 2.5m pick

PARTICLES (ParticleSystem Agent via BABYLON.ParticleSystem):
  Smoke: 120 capacity, SphereParticleEmitter(0.5); grey, rising, wind drift; alpha fade
  Fire: 80 capacity, BoxParticleEmitter; orange-yellow, shrink, short life
  Explosion: BABYLON.ParticleSystem 200 particles, radial outward, color1=orange color2=dark
  Blood: 30 capacity, scatter on enemy death
  Muzzle: 15 capacity, bright white-yellow, very fast, very short life

ENVIRONMENT (EnvironmentPainter + MaterialSimulator Agents):
  Ground: MeshBuilder.CreateGround(200×200), PBRMaterial({roughness:0.9}), receiveShadow
  Arena1/2/3: MeshBuilder objects, themed PBRMaterials per MaterialSimulator spec
  30+ DECORATIVE MESHES: PBRMaterial per surface type (metal/stone/wood/fabric)
  Atmosphere: BABYLON.VolumetricLightScatteringPostProcess for god rays (sun direction)

ENEMIES (4 types+boss): compound BABYLON.TransformNode groups; PBRMaterials; same 4-type+boss AI as Three.js above
BOSS: 6-part compound; hp=150; 3-phase AI; BABYLON.GlowLayer on emissive parts during phase3

COMBAT: BABYLON.Ray hitscan; ProjectileSystem; ExplosionSystem full 5-phase; damage numbers BABYLON.GUI

HUD: BABYLON.GUI.AdvancedDynamicTexture.CreateFullscreenUI; all bars, crosshair, radar, boss bar, kill feed

engine.runRenderLoop(()=>{ const dt=engine.getDeltaTime()/1000; update(dt); scene.render(); });
window.addEventListener('resize',()=>engine.resize());
All visuals/atmosphere/audio match: \${userPrompt}\``;
}

function buildP5(cdn) {
  return `\`You are HOOS AI — elite AAA 2D game studio. Build a COMPLETE p5.js game from: "\${userPrompt}"
Target quality: NEAR-PHOTOREALISTIC 2D — multi-layer gradient characters, volumetric atmosphere, cinematic effects.

ABSOLUTE RULES:
• Wrap in \\\`\\\`\\\`html ... \\\`\\\`\\\`
• Load p5.js from: ${cdn.p5} (blocking <script src>)
• html,body { width:100%; height:100%; margin:0; overflow:hidden }
• Web Audio API sounds; NEVER truncate

\${charHints}

${SHARED_FULL_BLOCK}

═══ P5.JS IMPLEMENTATION ═══

RENDER ALL ENTITIES using CharacterRenderer pipeline (drawingContext = canvas 2D API):
  Access via: drawingContext.createLinearGradient(), .shadowBlur, .globalCompositeOperation, .setLineDash()

class CharacterRenderer {
  static drawPlayer(x, y, state, frame, facing, charHints):
    push(); translate(x, y); if(facing<0) scale(-1,1);
    // LAYER 0 — shadow
    drawingContext.shadowBlur=0; fill(0,0,0,46); ellipse(0, 30, 28, 8);
    // LAYER 1 — body volumes via gradients:
    var skinGrad = drawingContext.createLinearGradient(-6,-20,6,20); skinGrad.addColorStop(0,'#E8C49A'); skinGrad.addColorStop(1,'#7A4020');
    drawingContext.fillStyle=skinGrad; // head
    ellipse(0,-28,22,22);
    var torsoGrad = drawingContext.createLinearGradient(-12,-10,12,18); torsoGrad.addColorStop(0,outfitLit); torsoGrad.addColorStop(1,outfitDark);
    drawingContext.fillStyle=torsoGrad; rect(-10,-18,20,28);
    // LAYER 2 — outfit texture
    drawingContext.setLineDash([2,3]); drawingContext.strokeStyle='rgba(0,0,0,0.12)'; stroke();
    for(var xi=-10;xi<10;xi+=5) line(xi,-18,xi-4,10); // fabric weave
    drawingContext.setLineDash([]);
    // MOLLE webbing (military): for(var wi=-18;wi<10;wi+=6) line(-10,wi,10,wi);
    // LAYER 2b — camo patches (military): beginShape(); fill(66,82,64,180); irregular vertex(); endShape();
    // LAYER 3 — detail lines: stroke(outfitSeam); strokeWeight(0.8); seam rects, pocket lines
    // LAYER 4 — lighting overlay: drawingContext.globalCompositeOperation='overlay'; fill(255,180,80,18); rect(...)
    // LAYER 5 — rim light: stroke(255,255,255,100); arc backlit edge
    // LAYER 6 — specular on metal: fill(255,255,255,165); ellipse(weaponX,weaponY,4,6);
    // HAIR: fill(hairColor); ellipse/polygon on head top
    // EYES, NOSE, MOUTH: small detailed features
    // ARMS with AnimationRigger walk/run angles
    // WEAPON: full detail with renderMaterial('metal',...)
    // LEGS with walk cycle rotation
    pop()
  
  static drawEnemy(e, camX): full CharacterRenderer pipeline per e.type
  static drawBoss(boss, camX, time): multi-part large draw (80×90px), phase color, chest glow with shadowBlur
}

class AtmosphericRenderer {
  smoke=[], fire=[], wind={x:0.9,y:0}, fog=[]
  addEmitter(x,y,type): spawn 3 particles/frame from this position
  update(): per particle: x+=vx+wind.x*0.6; y+=vy; r*=1.006; alpha-=0.0024
  draw(camX): drawingContext.filter='blur(2px)'; draw smoke; drawingContext.filter='none';
    draw fire (globalCompositeOperation='screen' for additive); draw fog layers
  drawFog(camX): 3 large semi-transparent rects scrolling at wind speed
  drawWindStreaks(): short horizontal lines drifting right, alpha 0.1-0.2
}

class ParticlePool { ... 300-particle pool, full physics per Agent 8 spec ... }
class LightingEngine { applyPointLight(x,y,color,r), applyMuzzleFlash(x,y), applyShadow(entity) }
class WindPhysics { segments[], update(), draw() } // for capes/hair

PLAYER CLASS: full stats (hp,stamina,combo,xp,level,ammo,lives,jumpsLeft=2,dashCd,invTimer)
  draw(camX): CharacterRenderer.drawPlayer(this.x-camX, this.y, ...)
  update(dt,platforms,enemies): gravity, AABB, double-jump, wall-slide, dash, sprint, combat

4 ENEMY CLASSES (full CharacterRenderer draw each):
  Scout: lean figure, light colors, speedy; Soldier: armored+weapon prominent; Heavy: wide×1.9+thick arms; Aerial: flat+triangle wings
  Each: drawEnemyGradient with 6 rendering layers, HP bar above, AI patrol/aggro/attack, death particles
  
BOSS CLASS: CharacterRenderer.drawBoss(); hp=60; 3-phase AI; drawingContext.shadowBlur=20 on chest glow

ATMOSPHERIC (AtmosphericRenderer active throughout):
  Smoke columns at 3-4 fixed world positions, fire emitters at lava/fire hazards
  Fog: 3 layers scrolling, opacity 0.05-0.12
  Weather particles per theme (rain/snow/ash/sand)

LEVEL (9000px, 3 zones):
  3-layer parallax: draw sky+clouds(EnvironmentPainter), mid structures, near foreground
  Platform array with MaterialSimulator surfaces: stone/metal/dirt/wood
  Moving platforms (sin oscillation X or Y)
  Hazard zones: glowing rect (drawingContext.shadowBlur=12, shadowColor themed)

HUD: drawHUD() — HP gradient bar (lerpColor), stamina bar, score (textSize pulse), combo ×N (fade), ammo, level+XP arc, boss bar (full-width, phase color), mini-map 105×68 (bottom-right, player+enemy+boss dots)

AUDIO: bgm() dramatic 12-note oscillator; 12+ sfx functions using AudioContext

GAME STATES: 'intro'(cinematic title+char reveal) → 'playing' → 'paused' → 'gameover'/'win'(star rating)
windowResized(): resizeCanvas(windowWidth,windowHeight)

IMPLEMENT ALL 8 AGENTS as classes/functions in the sketch. ALL visuals match: \${userPrompt}\``;
}

function buildKaboom(cdn) {
  return `\`You are HOOS AI — elite AAA game studio. Build a COMPLETE Kaboom.js game from: "\${userPrompt}"
Target: near-photorealistic 2D with volumetric atmosphere and detailed entity rendering.

ABSOLUTE RULES:
• Wrap in \\\`\\\`\\\`html ... \\\`\\\`\\\`
• Load Kaboom from: ${cdn.kaboom} (blocking <script src>)
• html,body { width:100%; height:100%; margin:0; overflow:hidden }
• Web Audio API sounds; NEVER truncate

\${charHints}

${SHARED_FULL_BLOCK}

═══ KABOOM.JS IMPLEMENTATION ═══

kaboom({ width:960, height:560, background:[10,14,26], canvas:document.getElementById('c') })

SPRITE GENERATION via inline canvas rendering (loadSprite with DataURL):
For EACH sprite, create OffscreenCanvas or canvas element, get 2D context, implement CharacterRenderer pipeline:

PLAYER SPRITE (48×64): CharacterRenderer all 6 layers:
  L0: shadow ellipse; L1: gradient body volumes (createLinearGradient per body part); L2: outfit texture (setLineDash crosshatch, camo patches for military); L3: detail lines; L4-L6: lighting overlay + rim + specular
  Anatomy: hair+head+face features+neck+torso with gear detail+arms+weapon (full detail)+legs+boots+accessories

4 ENEMY SPRITES: each OffscreenCanvas with CharacterRenderer pipeline (different silhouettes):
  "grunt": military look, multicam pattern, rifle; "ranger": tall+sniper; "heavy": massive+wide; "aerial": flat+wings
  "boss": 96×80 multi-part with glowing core

ENVIRONMENT SPRITES: each with MaterialSimulator:
  "plat_concrete": grey+cracks; "plat_metal": dark+specular; "plat_dirt": brown+rocks
  Items: hp=red cross icon, ammo=stacked bullets, star=gold star, power=lightning bolt (all detailed)

ATMOSPHERIC SYSTEM (as onDraw() custom rendering layer):
  AtmosphericRenderer: smoke[], fire[], fog[], wind
  drawSmoke(ctx,camX): 100+ particles, gradient colors, blur filter
  drawFire(ctx): orange-yellow particles, globalCompositeOperation='screen'
  drawFog(ctx): 3 large semi-transparent overlay rects
  drawWeather(ctx): rain/snow/ash per theme

SCENE "game":
  3-zone level via addLevel() (9000px wide tiled map), zone-specific tile themes
  Player entity: full attrs (lives=3, stamina=100, ammo=30, score=0, combo=0, level=1, xp=0, invTimer=0, jumpsLeft=2, dashCd=0)
  Controls: all keys as before; CharacterRenderer draw in onDraw(); AI loop in onUpdate()

4 ENEMY TYPES + BOSS: full onUpdate() AI as before; HP bars via onDraw(); death particles

SCENE "boss_fight": boss 3-phase onUpdate(); boss HP bar full-width via onDraw()

HUD via onDraw(): HP gradient bar+stamina; score; lives; ammo; level+XP; combo; mini-map; boss bar
ATMOSPHERIC overlays drawn LAST in onDraw() before HUD

AUDIO: bgm loop + 12 sfx functions

IMPLEMENT ALL 8 AGENTS as functions/closures. ALL visuals match: \${userPrompt}\``;
}

function buildPixi(cdn) {
  return `\`You are HOOS AI — elite AAA 2D game studio. Build a COMPLETE PixiJS v7 game from: "\${userPrompt}"
Target: near-photorealistic 2D, cinematic atmosphere, CoD-level detail on all entities.

ABSOLUTE RULES:
• Wrap in \\\`\\\`\\\`html ... \\\`\\\`\\\`
• Load PixiJS from: ${cdn.pixi} (blocking <script src>)
• html,body { width:100%; height:100%; margin:0; overflow:hidden }
• Web Audio API sounds; NEVER truncate

\${charHints}

${SHARED_FULL_BLOCK}

═══ PIXI.JS IMPLEMENTATION ═══

const app=new PIXI.Application({width:960,height:560,backgroundColor:0x0A0C14,antialias:true,resolution:window.devicePixelRatio||1,autoDensity:true});
document.body.appendChild(app.view); app.view.style.cssText='width:100%;height:100%';

ENTITY RENDERING (CharacterRenderer Agent via PIXI.Graphics + HTML5 Canvas texture baking):
class EntityRenderer {
  static bakeTexture(type, charHints): bake to PIXI.RenderTexture via PIXI.Graphics CharacterRenderer pipeline:
    PIXI.Graphics supports: beginFill, lineStyle, drawCircle, drawRect, drawPolygon, drawEllipse, lineTo, moveTo
    Simulate gradient fills: draw multiple overlapping shapes at decreasing alpha (light→mid→dark layers = gradient sim)
    Draw all 6 CharacterRenderer layers for each entity type
  
  static createSmoke(): PIXI.Graphics soft circle, grey, low alpha (smoke particle visual)
  static createFire(): PIXI.Graphics bright circle, orange-yellow
}

ATMOSPHERIC SYSTEM (PIXI.Container with PIXI.Graphics particles + PIXI.BlendMode):
class AtmosphericSystem extends PIXI.Container {
  smoke: PIXI.Graphics[]; fire: PIXI.Graphics[]; fog: PIXI.Graphics[]; wind={x:0.9}
  smokePool: pool of 150 PIXI.Graphics circles (pre-created, recycled)
  update(dt): particle physics; fog layer scroll
  fog layers: 3 large PIXI.Graphics rects, alpha 0.05-0.12, blendMode PIXI.BLEND_MODES.NORMAL
  fire: PIXI.BLEND_MODES.SCREEN for additive fire glow
  drawingContext access: app.renderer.context for blur filter if needed, or PIXI.filters.BlurFilter on smoke container
}

PARTICLE POOL (ParticleSystem Agent):
class PixiParticlePool { pool: PIXI.Graphics[300]; emit(config); update(dt); render() }

LIGHTING (LightingEngine Agent via PIXI.filters or overlay PIXI.Graphics):
  Ambient: large dark PIXI.Graphics rect over scene, blendMode MULTIPLY, alpha 0.25
  Point lights: radial gradient PIXI.Graphics circles, blendMode SCREEN, alpha 0.5
  Muzzle flash: bright PIXI.Graphics circle, SCREEN blend, spike alpha 0.9, decay 55ms

ENTITY CLASSES:
class Player extends PIXI.Container: stats+physics+draw (EntityRenderer.bakeTexture('player', charHints)); walk cycle by rotating arm/leg children; cloth sim for cape via WindPhysics
class Enemy (Scout/Soldier/Heavy/Aerial): EntityRenderer texture per type; full AI; HP bar PIXI.Graphics above
class Boss: multi-part PIXI.Container; glowing core (SCREEN blend + PIXI.filters.GlowFilter); 3-phase AI
class Projectile: PIXI.Graphics + velocity + lifetime + collision

LEVEL (3 zones, 9000px): platform array + parallax layers (3 PIXI.Container, pivot.x at 0.04/0.22/0.55 of camera)
MaterialSimulator: each platform PIXI.Graphics with simulated gradient (layered shapes)
EnvironmentPainter: sky gradient (multiple colored rects), cloud ellipses, terrain features

HUD (separate PIXI.Container, z=top): HP bar, stamina, score, combo, ammo, level+XP arc, boss bar, mini-map

GAME STATES: intro→playing→paused→gameover/win
app.ticker.add((delta)=>{ const dt=delta/60; update(dt); });
window.addEventListener('resize',()=>{ app.renderer.resize(innerWidth,innerHeight); });

IMPLEMENT ALL 8 AGENTS. ALL visuals match: \${userPrompt}\``;
}

function buildPython(cdn) {
  return `\`You are HOOS AI — elite AAA game studio. Build a COMPLETE Python/Pyodide game from: "\${userPrompt}"
Target: near-photorealistic 2D detail using canvas 2D API via js module.

ABSOLUTE RULES:
• Wrap in \\\`\\\`\\\`html ... \\\`\\\`\\\`; Load Pyodide from: ${cdn.pyodide}
• ALL game logic in Python inside pyodide.runPythonAsync()
• use random module (NOT math.random); keyboard: window.hoosKeyDown dict; create_proxy from pyodide.ffi
• NEVER truncate

\${charHints}

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
W,H=960,560; canvas=js.document.getElementById("c"); ctx=canvas.getContext("2d"); hud=js.document.getElementById("hud")
def keys(): return getattr(js.window,"hoosKeyDown").to_py()

# ── CharacterRenderer Agent (Python implementation) ──────────────────────────
def draw_player(p, cam_x, time_val):
  cx,cy=p["x"]-cam_x,p["y"]
  ctx.save(); ctx.translate(cx,cy)
  if p["facing"]<0: ctx.scale(-1,1)
  bob=math.sin(time_val*3)*1.8 if p["state"]=="idle" else 0
  ctx.translate(0,bob)
  # LAYER 0 — contact shadow
  ctx.globalAlpha=0.18; ctx.fillStyle="#000"; ctx.beginPath(); ctx.ellipse(0,30,14,4,0,0,2*math.pi); ctx.fill(); ctx.globalAlpha=1
  # LAYER 1 — skin gradient (head)
  g=ctx.createLinearGradient(-6,-36,6,-16); g.addColorStop(0,"#E8C49A"); g.addColorStop(1,"#7A4020"); ctx.fillStyle=g
  ctx.beginPath(); ctx.arc(0,-28,11,0,2*math.pi); ctx.fill()
  # EYES + NOSE + MOUTH (facial features)
  ctx.fillStyle="#1A1008"; ctx.beginPath(); ctx.arc(-4,-29,1.8,0,2*math.pi); ctx.fill()
  ctx.beginPath(); ctx.arc(4,-29,1.8,0,2*math.pi); ctx.fill()
  ctx.fillStyle="#6A3010"; ctx.beginPath(); ctx.arc(0,-25,0.9,0,2*math.pi); ctx.fill()
  ctx.strokeStyle="#7A3515"; ctx.lineWidth=1; ctx.beginPath(); ctx.arc(0,-23,3,0.1,math.pi-0.1); ctx.stroke()
  # HAIR (color per world hints)
  ctx.fillStyle=HAIR_COLOR; ctx.beginPath(); ctx.ellipse(0,-35,9,6,0,math.pi,2*math.pi); ctx.fill()
  # TORSO gradient
  tg=ctx.createLinearGradient(-12,-18,12,10); tg.addColorStop(0,OUTFIT_LIT); tg.addColorStop(1,OUTFIT_DARK); ctx.fillStyle=tg
  ctx.fillRect(-12,-18,24,28)
  # LAYER 2 — outfit texture (crosshatch weave)
  ctx.save(); ctx.strokeStyle="rgba(0,0,0,0.12)"; ctx.lineWidth=0.7
  ctx.setLineDash([2,3])
  for xi in range(-12,12,4): ctx.beginPath(); ctx.moveTo(xi,-18); ctx.lineTo(xi-4,10); ctx.stroke()
  ctx.restore()
  # LAYER 3 — tactical gear detail (MOLLE lines if military)
  ctx.strokeStyle="rgba(0,0,0,0.35)"; ctx.lineWidth=0.8
  for wi in range(-16,10,5): ctx.beginPath(); ctx.moveTo(-12,wi); ctx.lineTo(12,wi); ctx.stroke()
  # ARMS (AnimationRigger walk angles)
  arm_ang=math.sin(time_val*p.get("walk_spd",8))*0.5 if p.get("moving") else 0
  ctx.save(); ctx.rotate(-arm_ang); ag=ctx.createLinearGradient(-19,-12,-12,4); ag.addColorStop(0,OUTFIT_LIT); ag.addColorStop(1,OUTFIT_DARK); ctx.fillStyle=ag; ctx.fillRect(-19,-12,7,16)
  ctx.fillStyle=SKIN_LIT; ctx.beginPath(); ctx.arc(-15,6,3.5,0,2*math.pi); ctx.fill(); ctx.restore()
  ctx.save(); ctx.rotate(arm_ang)
  # WEAPON in right hand (full detail per weapon type)
  ctx.fillStyle=WEAPON_COLOR; ctx.fillRect(12,-18,4,32); ctx.fillRect(9,-20,10,4) # sword: blade+guard
  ctx.restore()
  # LEGS with walk cycle
  la=math.sin(time_val*p.get("walk_spd",8))*0.45 if p.get("moving") else 0
  ctx.save(); ctx.rotate(la); lg=ctx.createLinearGradient(-8,8,0,26); lg.addColorStop(0,OUTFIT_LIT); lg.addColorStop(1,OUTFIT_DARK); ctx.fillStyle=lg; ctx.fillRect(-8,10,8,18)
  ctx.fillStyle=BOOT_COLOR; ctx.fillRect(-9,24,10,7); ctx.restore()
  ctx.save(); ctx.rotate(-la); ctx.fillStyle=OUTFIT_LIT; ctx.fillRect(0,10,8,18)
  ctx.fillStyle=BOOT_COLOR; ctx.fillRect(0,24,10,7); ctx.restore()
  # LAYER 4 — lighting overlay
  ctx.save(); ctx.globalCompositeOperation="overlay"; ctx.globalAlpha=0.12
  ctx.fillStyle=LIGHT_COLOR; ctx.fillRect(-12,-36,24,60); ctx.restore()
  # LAYER 5 — rim light (backlit edge)
  ctx.save(); ctx.globalAlpha=0.45; ctx.strokeStyle="#FFFFFF"; ctx.lineWidth=1.2
  ctx.beginPath(); ctx.arc(0,-28,12,math.pi*0.8,math.pi*1.2); ctx.stroke(); ctx.restore()
  # HP bar
  ctx.fillStyle="#1A1A1A"; ctx.fillRect(-15,-48,30,5)
  pct=p["hp"]/p["maxHp"]; hp_col="#22FF44" if pct>0.6 else "#FF8822" if pct>0.3 else "#FF2222"
  ctx.fillStyle=hp_col; ctx.fillRect(-15,-48,30*pct,5)
  ctx.restore()

def draw_enemy(e, cam_x, time_val):
  # Full CharacterRenderer pipeline per e["type"] — different silhouettes
  # "grunt": multicam military, rifle, helmet
  # "ranger": tall lean, long barrel, scope
  # "heavy": extra wide (scale 1.9x), thick arms, no neck visible
  # "aerial": flat wide body, triangle wings, glowing eyes, no legs
  cx,cy=e["x"]-cam_x,e["y"]
  ctx.save(); ctx.translate(cx,cy)
  if e.get("facing",-1)<0: ctx.scale(-1,1)
  # draw per type with CharacterRenderer gradient layers + HP bar
  ctx.restore()

def draw_boss(boss, cam_x, time_val):
  cx,cy=boss["x"]-cam_x,boss["y"]
  ctx.save(); ctx.translate(cx,cy)
  # MULTI-PART LARGE DRAW (80×90): head+crown+torso+chest_glow+arms+weapons+emblem
  phase=boss.get("phase",1); phase_cols=["#FF8800","#FF2200","#AA00FF"]
  ctx.shadowBlur=22; ctx.shadowColor=phase_cols[phase-1]
  # head (large), body (wide rect), arms (extended rects+weapons), chest glow circle
  ctx.shadowBlur=0
  ctx.restore()

# ── AtmosphericRenderer ────────────────────────────────────────────────────────
atmosphere={"smoke":[],"fire":[],"wind_x":0.9,"time":0,"fog_x":0}

def update_atmosphere(dt):
  atmosphere["time"]+=dt
  atmosphere["wind_x"]=0.9+math.sin(atmosphere["time"]*0.28)*0.6
  atmosphere["fog_x"]+=atmosphere["wind_x"]*0.4
  # update smoke particles
  wx=atmosphere["wind_x"]
  for p in atmosphere["smoke"][:]:
    p["x"]+=p["vx"]+wx*0.6; p["y"]+=p["vy"]; p["vx"]*=0.985; p["vy"]*=0.978
    p["r"]*=1.006; p["alpha"]-=0.0024; p["age"]+=1
    if p["alpha"]<=0: atmosphere["smoke"].remove(p)

def emit_smoke(x,y):
  if len(atmosphere["smoke"])<150:
    atmosphere["smoke"].append({"x":x,"y":y,"vx":random.uniform(-0.4,0.4),"vy":random.uniform(-0.8,-2.2),
      "r":random.uniform(4,9),"alpha":random.uniform(0.4,0.65),"age":0})

def draw_atmosphere(cam_x):
  # smoke
  ctx.save()
  for p in atmosphere["smoke"]:
    a=p["age"]; mx=min(1,a/80); col=f"rgba({int(55+mx*140)},{int(45+mx*163)},{int(35+mx*170)},{p['alpha']})"
    ctx.fillStyle=col; ctx.globalAlpha=p["alpha"]
    ctx.beginPath(); ctx.arc(p["x"]-cam_x,p["y"],p["r"],0,2*math.pi); ctx.fill()
  ctx.globalAlpha=1
  # fog layers (3 large semi-transparent rects)
  fog_colors=["rgba(200,198,194,0.06)","rgba(190,188,184,0.09)","rgba(200,195,188,0.12)"]
  for i,fc in enumerate(fog_colors):
    fx=(atmosphere["fog_x"]*(i+1)*0.4)%(W*2)-W
    ctx.fillStyle=fc; ctx.fillRect(fx,0,W*2,H)
  ctx.restore()

# ── MaterialSimulator (draw platform/object surfaces) ─────────────────────────
def draw_platform(plat, cam_x):
  x,y,w,h,t=plat["x"]-cam_x,plat["y"],plat["w"],plat["h"],plat.get("type","concrete")
  if t=="metal":
    g=ctx.createLinearGradient(x,y,x+w,y+h); g.addColorStop(0,"#2A2A2A"); g.addColorStop(0.5,"#4A4A4A"); g.addColorStop(1,"#1A1A1A")
    ctx.fillStyle=g; ctx.fillRect(x,y,w,h)
    ctx.strokeStyle="#888"; ctx.lineWidth=1; ctx.strokeRect(x+2,y+2,w-4,h-4) # specular inner
  elif t=="concrete":
    g=ctx.createLinearGradient(x,y,x,y+h); g.addColorStop(0,"#6A6560"); g.addColorStop(1,"#3A3533")
    ctx.fillStyle=g; ctx.fillRect(x,y,w,h)
    ctx.strokeStyle="rgba(0,0,0,0.4)"; ctx.lineWidth=1.2 # cracks
    ctx.beginPath(); ctx.moveTo(x+w*0.2,y); ctx.lineTo(x+w*0.15,y+h); ctx.stroke()
  else: # dirt
    g=ctx.createLinearGradient(x,y,x,y+h); g.addColorStop(0,"#5A4020"); g.addColorStop(1,"#3A2810")
    ctx.fillStyle=g; ctx.fillRect(x,y,w,h)
  # edge highlight
  ctx.fillStyle="rgba(255,255,255,0.12)"; ctx.fillRect(x,y,w,2)

state={
  "mode":"intro","cam_x":0,"t":0,
  "player":{"x":100,"y":H-100,"vx":0,"vy":0,"hp":100,"maxHp":100,"lives":3,"stamina":100,
    "score":0,"combo":0,"combo_t":0,"ammo":30,"level":1,"xp":0,"facing":1,"state":"idle",
    "inv_t":0,"dash_cd":0,"atk_t":0,"on_ground":False,"jumps":2,"moving":False,"walk_spd":8},
  "enemies":[],"boss":None,"projectiles":[],"particles":[],"items":[],"platforms":[],"hazards":[],
  "smoke_emitters":[{"x":1200,"y":300},{"x":3500,"y":280},{"x":6800,"y":260}]
}

HAIR_COLOR="#2A1A08"; OUTFIT_LIT="#4A5240"; OUTFIT_DARK="#2A3020"; SKIN_LIT="#E8C49A"
WEAPON_COLOR="#2A2A2A"; BOOT_COLOR="#1A1208"; LIGHT_COLOR="#FF8840"

def draw_background(cam_x):
  # EnvironmentPainter Agent: dramatic overcast sky
  g=ctx.createLinearGradient(0,0,0,H); g.addColorStop(0,"#060810"); g.addColorStop(0.45,"#0E1520"); g.addColorStop(0.75,"#1C2535"); g.addColorStop(1,"#283040")
  ctx.fillStyle=g; ctx.fillRect(0,0,W,H)
  # clouds
  for i in range(8):
    cx2=(i*130-cam_x*0.04)%W; cy2=40+i*18+math.sin(i)*25
    ctx.fillStyle=f"rgba({80+i*8},{85+i*8},{95+i*8},0.7)"
    ctx.beginPath(); ctx.ellipse(cx2,cy2,80+i*12,25+i*4,0,0,2*math.pi); ctx.fill()

def enemy_ai(e,p,dt):
  ex,ey,px=e["x"],e["y"],p["x"]; dist=abs(ex-px)
  etype=e.get("type","grunt")
  if etype=="grunt":
    if dist<320: spd=130*(1 if px>ex else -1); e["x"]+=spd*dt; e["facing"]=1 if spd>0 else -1
    elif e.get("t",0)%180<90: e["x"]+=60*dt; e["facing"]=1
    else: e["x"]-=60*dt; e["facing"]=-1
  elif etype=="heavy":
    if dist<200 and e.get("charge_cd",0)<=0:
      e["vx"]=420*(1 if px>ex else -1); e["charge_cd"]=60
    else:
      e["vx"]*=0.92; e["x"]+=e.get("vx",0)*dt
    if e.get("charge_cd",0)>0: e["charge_cd"]-=1
  elif etype=="aerial":
    e["y"]=e.get("base_y",200)+math.sin(state["t"]*2.1)*36
    spd=115*(1 if px>ex else -1); e["x"]+=spd*dt
  e["t"]=e.get("t",0)+1

def update_player(p,dt):
  k=keys()
  spd=RUN_SPD if k.get("ShiftLeft") or k.get("ShiftRight") else WALK_SPD
  moving=False
  if k.get("ArrowLeft") or k.get("KeyA"): p["vx"]=-spd; p["facing"]=-1; moving=True
  elif k.get("ArrowRight") or k.get("KeyD"): p["vx"]=spd; p["facing"]=1; moving=True
  else: p["vx"]*=0.75
  p["moving"]=moving
  if (k.get("ArrowUp") or k.get("KeyW") or k.get("Space")) and p["jumps"]>0:
    if not getattr(update_player,"prev_jump",False): p["vy"]=-JUMP_VEL; p["jumps"]-=1
  update_player.prev_jump=k.get("ArrowUp") or k.get("KeyW") or k.get("Space")
  p["vy"]+=GRAVITY*dt; p["x"]+=p["vx"]*dt; p["y"]+=p["vy"]*dt
  if p["y"]>=H-60: p["y"]=H-60; p["vy"]=0; p["on_ground"]=True; p["jumps"]=2
  else: p["on_ground"]=False
  if p["combo_t"]>0: p["combo_t"]-=dt
  else: p["combo"]=0
  if p["inv_t"]>0: p["inv_t"]-=dt
  state["cam_x"]+=(p["x"]-state["cam_x"]-W//2)*0.08

GRAVITY=700; WALK_SPD=240; RUN_SPD=400; JUMP_VEL=580; BULLET_SPD=900
# hoosMath refines these from Wolfram:
js.window.hoosMath("gameTheme",create_proxy(lambda p: None))

def update(dt):
  state["t"]+=dt
  update_player(state["player"],dt)
  for e in state["enemies"]: enemy_ai(e,state["player"],dt)
  for src in state.get("smoke_emitters",[]): emit_smoke(src["x"],src["y"])
  update_atmosphere(dt)

def draw():
  cam_x=state["cam_x"]
  ctx.clearRect(0,0,W,H)
  draw_background(cam_x) # sky+clouds
  draw_atmosphere(cam_x) # fog layer 1
  for plat in state["platforms"]: draw_platform(plat,cam_x) # terrain
  for e in state["enemies"]: draw_enemy(e,cam_x,state["t"])
  draw_atmosphere(cam_x) # fog layer 2
  draw_player(state["player"],cam_x,state["t"])
  for src in state.get("smoke_emitters",[]): emit_smoke(src["x"],src["y"])
  # HUD
  p=state["player"]
  hud.innerHTML=f'''<div style="position:absolute;top:8px;left:8px;width:180px;height:14px;background:#222;border-radius:3px"><div style="height:100%;width:{p['hp']/p['maxHp']*100}%;background:linear-gradient(90deg,#22FF44,#FF2222);border-radius:3px"></div></div><div style="position:absolute;top:26px;left:8px;color:#FFF;font:bold 14px monospace">♥×{p['lives']} SCR:{p['score']} LVL:{p['level']}</div>'''

async def game_loop():
  last=js.Date.now()/1000
  while True:
    now=js.Date.now()/1000; dt=min(now-last,0.04); last=now
    update(dt); draw()
    await asyncio.sleep(1/60)

asyncio.ensure_future(game_loop())
</script>

ALL entity visuals, atmospheric effects, audio tone match: \${userPrompt}\``;
}

// ─── Assemble TypeScript source ───────────────────────────────────────────────
const cdn = { phaser:CDN_PHASER, three:CDN_THREE, pyodide:CDN_PYODIDE, p5:CDN_P5, kaboom:CDN_KABOOM, babylon:CDN_BABYLON, pixi:CDN_PIXI };

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
console.log("rebuild-prompt done —", newContent.length, "chars →", file);
