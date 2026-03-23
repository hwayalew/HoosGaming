/** Shared parsing / validation for IBM WxO + Gemini game outputs (Create + Play assistant). */

export const LANGUAGE_CDNS: Record<string, string> = {
  "js-phaser": "https://cdnjs.cloudflare.com/ajax/libs/phaser/3.60.0/phaser.min.js",
  "js-three": "https://cdnjs.cloudflare.com/ajax/libs/three.js/r134/three.min.js",
  "js-babylon": "https://cdn.babylonjs.com/babylon.js",
  "js-p5": "https://cdnjs.cloudflare.com/ajax/libs/p5.js/1.9.0/p5.min.js",
  "js-kaboom": "https://unpkg.com/kaboom@3000.0.1/dist/kaboom.js",
  "js-pixi": "https://cdnjs.cloudflare.com/ajax/libs/pixi.js/7.2.4/pixi.min.js",
  python: "https://cdn.jsdelivr.net/pyodide/v0.23.4/full/pyodide.js",
};

/**
 * Model output often adds defer/async on engine scripts; inline boot then runs before Phaser/Three/etc. exist.
 * Strip those attributes only on known engine CDN URLs.
 */
export function stripEngineScriptDeferAsync(html: string): string {
  return html.replace(
    /<script\b([^>]*\bsrc=["']([^"']+)["'][^>]*)>/gi,
    (full, inner: string, src: string) => {
      if (!/(?:phaser|three\.min|r134\/three|PointerLockControls|babylonjs\.com|babylon\.js|p5\.min|kaboom|pixi(?:\.min)?\.js)/i.test(src)) {
        return full;
      }
      const cleaned = inner
        .replace(/\s+defer(?:=[^\s>]*)?/gi, "")
        .replace(/\s+async(?:=[^\s>]*)?/gi, "");
      return `<script${cleaned}>`;
    },
  );
}

export function stripModelArtifacts(code: string): string {
  const stopPatterns = [
    /^\s*there is no more code\b/i,
    /^\s*the html document has been properly closed\b/i,
    /^\s*end of code\b/i,
    /^\s*no further code\b/i,
    /^\s*no more code\b/i,
  ];

  const lines = code.replace(/\r\n/g, "\n").split("\n");
  const cleaned: string[] = [];
  for (const line of lines) {
    if (stopPatterns.some((pattern) => pattern.test(line.trim()))) break;
    cleaned.push(line);
  }
  return cleaned.join("\n").trim();
}

function findMissingSceneDefinitions(source: string): string[] {
  const sceneMatch = source.match(/scene\s*:\s*\[([^\]]+)\]/i);
  if (!sceneMatch) return [];

  const names = sceneMatch[1]
    .split(",")
    .map((value) => value.trim())
    .filter((value) => /^[A-Za-z_$][\w$]*$/.test(value));

  return names.filter((name) => {
    const definitionPattern = new RegExp(`\\b(?:class|function|const|let|var)\\s+${name}\\b`);
    return !definitionPattern.test(source);
  });
}

/** Expected engine APIs in extracted primary source (Create / Play validation). */
const ENGINE_MARKERS: Partial<Record<string, RegExp>> = {
  "js-three": /\bTHREE\b/,
  "js-babylon": /\bBABYLON\b/,
  "js-p5": /\bfunction\s+setup\b|\bnew\s+p5\s*\(/,
  "js-kaboom": /\bkaboom\s*\(/,
  "js-pixi": /\bPIXI\b/,
};

/**
 * Auto-fixes Python code that uses `global var` declarations by converting all
 * globally-declared variables into a single module-level `state = {}` dict.
 * This is safe even if the code already has a state dict — it just removes the
 * `global` statements and rewrites the bare-name mutations.
 */
export function fixPythonGlobals(code: string): string {
  // Collect every variable listed in any `global ...` statement
  const globalVars = new Set<string>();
  const globalLineRe = /^\s*global\s+([\w ,]+)/gm;
  let m: RegExpExecArray | null;
  while ((m = globalLineRe.exec(code)) !== null) {
    m[1].split(",").map(v => v.trim()).filter(Boolean).forEach(v => globalVars.add(v));
  }
  if (globalVars.size === 0) return code;

  // Build initial values by scanning module-level assignments (lines that are NOT indented)
  const initialValues: Record<string, string> = {};
  for (const v of globalVars) {
    // Match unindented: `varname = <value>` (not inside a function/class)
    const initRe = new RegExp(`^(${v})\\s*=\\s*([^\\n]+)`, "m");
    const hit = initRe.exec(code);
    initialValues[v] = hit ? hit[2].trim() : "0";
  }

  // Check if state dict already exists
  const hasStateDict = /\bstate\s*=\s*\{/.test(code) || /\bstate\s*=\s*dict\s*\(/.test(code);

  let result = code;

  if (!hasStateDict) {
    // Build the new state dict
    const entries = Array.from(globalVars).map(v => `    "${v}": ${initialValues[v]}`).join(",\n");
    const stateBlock = `\nstate = {\n${entries}\n}\n`;

    // Insert after the last top-level import line
    const afterImports = result.replace(
      /((?:^(?:import |from )[^\n]+\n)+)/m,
      (match) => match + stateBlock,
    );
    result = afterImports !== result ? afterImports : stateBlock + result;

    // Remove now-redundant module-level bare assignments for these vars
    for (const v of globalVars) {
      result = result.replace(new RegExp(`^${v}\\s*=[^=][^\\n]*\\n`, "m"), "");
    }
  }

  // Strip all `global ...` lines inside functions
  result = result.replace(/^[ \t]*global\s+[\w ,]+[ \t]*\n/gm, "");

  // Rewrite mutation assignments inside functions: `var OP= ...` → `state["var"] OP= ...`
  for (const v of globalVars) {
    // Augmented assignments: var += / var -= / var *= etc.
    result = result.replace(
      new RegExp(`(?<=[ \\t]+)\\b${v}\\b(?=\\s*[+\\-*/%&|^]=)`, "g"),
      `state["${v}"]`,
    );
    // Plain assignments: var = (but not state["var"] = and not var == comparisons)
    result = result.replace(
      new RegExp(`(?<=[ \\t]+)\\b${v}\\b(?=\\s*=[^=])`, "g"),
      `state["${v}"]`,
    );
    // Read references in expressions (conservative — only inside function bodies)
    result = result.replace(
      new RegExp(`(?<=[ \\t]+(?:if|while|return|and|or|not|\\(|,|=)[ \\t]*)\\b${v}\\b(?=[^"'])`, "g"),
      `state["${v}"]`,
    );
  }

  return result;
}

export function validateGeneratedOutput(source: string, language: string): string | null {
  if (!source.trim()) return "The model returned an empty code block.";
  if (/there is no more code|properly closed/i.test(source)) {
    return "The model output was truncated and included commentary instead of a complete game.";
  }

  if (language === "python") {
    if (/\bjs\.create_proxy\b/m.test(source)) {
      return "`js.create_proxy` does not exist. Use `from pyodide.ffi import create_proxy`, or use `window.hoosKeyDown` in HTML and `getattr(js.window, \"hoosKeyDown\").to_py()` in Python (no proxy).";
    }
    if (/\bcreate_proxy\s*\(/m.test(source)) {
      const ffiImport = /from\s+pyodide\.ffi\s+import\s+([^\n#]+)/m.exec(source);
      if (!ffiImport || !/\bcreate_proxy\b/.test(ffiImport[1])) {
        return "Every `create_proxy(...)` call requires `from pyodide.ffi import create_proxy` in the same file, or switch to the `window.hoosKeyDown` + `to_py()` pattern.";
      }
    }
    if (/\bmath\.random\s*\(/m.test(source)) {
      return "Python has no math.random(); use `import random` and `random.random()`, `random.randint(a,b)`, or `random.uniform(a,b)`.";
    }
    if (!/import\s+js\b/m.test(source)) {
      return "Python games must `import js` for canvas and DOM (Pyodide).";
    }
  }

  if (language !== "python" && language !== "js-phaser") {
    const marker = ENGINE_MARKERS[language];
    if (marker && !marker.test(source)) {
      return `Generated source does not appear to use the selected engine (${language}). Regenerate or pick another engine.`;
    }
  }

  if (language !== "python" && /new\s+Phaser\.Game\s*\(/.test(source)) {
    const missing = findMissingSceneDefinitions(source);
    if (missing.length > 0) {
      return `Missing Phaser scene definitions: ${missing.join(", ")}.`;
    }
  }

  return null;
}

/**
 * Fixes GRAVITY temporal dead zone crashes.
 * Converts every `const GRAVITY` and `let GRAVITY` to `var GRAVITY` in inline script blocks.
 * `var` is function-hoisted with no TDZ, and can be re-declared (unlike const/let),
 * so multiple `var GRAVITY = X` declarations in the same scope are perfectly safe.
 * Works for both standalone (`let GRAVITY = 28;`) and multi-var
 * (`let GRAVITY = 580, WALK_SPD = 260`) declarations — only the keyword changes.
 */
export function fixGravityDeclarations(html: string): string {
  return html.replace(
    /(<script(?![^>]*\bsrc=)[^>]*>)([\s\S]*?)(<\/script>)/gi,
    (_match, open: string, body: string, close: string) => {
      if (!/\bGRAVITY\b/.test(body)) return _match;
      const fixed = body
        .replace(/\bconst\s+(GRAVITY\s*=)/g, "var $1")
        .replace(/\blet\s+(GRAVITY\s*=)/g, "var $1");
      return open + fixed + close;
    }
  );
}

/**
 * Fixes Babylon.js cubemap crash: `Cannot load cubemap because files were not defined`.
 * CubeTexture / HDRCubeTexture / createDefaultEnvironment all need external HDR/DDS files
 * that don't exist in a generated game, causing a fatal uncaught exception.
 * Replace with no-ops so the rest of the game keeps running.
 */
export function fixBabylonCubemap(html: string): string {
  return html
    .replace(/new\s+BABYLON\.(?:HDR)?CubeTexture\s*\([^)]+\)/g,
      "null /* cubemap removed — use DynamicTexture sky sphere */")
    .replace(/scene\.createDefaultEnvironment\s*\([^)]*\)/g,
      "null /* createDefaultEnvironment removed — requires HDR textures */")
    .replace(/BABYLON\.CubeTexture\.CreateFromImages\s*\([^)]+\)/g,
      "null /* CubeTexture.CreateFromImages removed */");
}

/**
 * Fixes Pyodide TypeError: "<fn>() takes 0 positional arguments but 1 was given".
 *
 * Browsers call requestAnimationFrame callbacks with a DOMHighResTimeStamp argument.
 * Python functions passed to it (directly or via create_proxy) MUST accept that arg.
 * When the AI generates `def step():` with no parameters, Pyodide raises a TypeError.
 *
 * This sanitizer:
 *   1. Collects every function name passed to requestAnimationFrame (direct or wrapped in create_proxy).
 *   2. Finds those `def <name>():` definitions (including nested ones).
 *   3. Rewrites them as `def <name>(*_):` so the timestamp is silently ignored.
 */
export function fixPythonRafCallbacks(code: string): string {
  const rafNames = new Set<string>();
  const rafRe = /requestAnimationFrame\s*\(\s*(?:create_proxy\s*\(\s*)?(\w+)/g;
  let m: RegExpExecArray | null;
  while ((m = rafRe.exec(code)) !== null) {
    rafNames.add(m[1]);
  }
  if (rafNames.size === 0) return code;

  let result = code;
  for (const name of rafNames) {
    // Only patch zero-arg defs so we don't double-patch already-correct signatures
    result = result.replace(
      new RegExp(`\\bdef\\s+${name}\\s*\\(\\s*\\)\\s*:`, "g"),
      `def ${name}(*_):`
    );
  }
  return result;
}

/** Applies fixPythonRafCallbacks to every <script type="text/python"> block inside HTML. */
function fixPythonRafInHtml(html: string): string {
  if (!/requestAnimationFrame/i.test(html)) return html;
  return html.replace(
    /(<script[^>]*type=["']text\/python["'][^>]*>)([\s\S]*?)(<\/script>)/gi,
    (_match, open: string, body: string, close: string) => {
      if (!/requestAnimationFrame/i.test(body)) return _match;
      return open + fixPythonRafCallbacks(body) + close;
    }
  );
}

/**
 * Fixes Phaser 3 "Local data URIs are not supported" errors.
 * Phaser's loader rejects any data: URI passed to this.load.image / spritesheet / etc.
 * Strip those calls so the game loads (sprites must be created via this.textures.createCanvas).
 */
export function fixPhaserDataUriLoads(html: string): string {
  // Match: this.load.image("key", "data:...") or this.load.spritesheet("key", "data:...", {...})
  return html.replace(
    /this\.load\.(?:image|spritesheet|atlas|bitmapFont|svg|audio|video)\s*\(\s*(['"`][^'"`,\s]+['"`])\s*,\s*['"`]data:[^'"`,]+['"`][^)]*\)\s*;?/g,
    (_, key) => `/* data URI load for ${key} removed — create in create() via this.textures.createCanvas() */`
  );
}

/**
 * Fixes "ReferenceError: <var> is not defined" for standard game-state variables.
 *
 * Both Phaser and Three.js scaffolds define player stats (hp, score, lives, ammo…)
 * as script-level variables. The AI sometimes:
 *   (a) forgets to declare them entirely, or
 *   (b) declares them with `const`/`let` inside a function scope that other functions
 *       then try to read from the outer scope → ReferenceError.
 *
 * Strategy: for each well-known game stat variable that is used as a bare identifier
 * (NOT a property access like `this.hp` or `player.hp`) but has no script-level
 * `var/let/const` declaration, inject a `var <name> = <default>` at the top.
 * Using `var` means the declaration is hoisted and never causes TDZ issues.
 */
/**
 * WxO / CharacterRenderer templates reference `humanoid.parts.lUL` (left upper leg) and siblings.
 * Games often call animation before `parts` or a bone is built → Cannot read properties of undefined (reading 'lUL').
 * Rewrites `expr.parts.PART` → `__hoosP(expr, 'PART')` using the iframe's window.__hoosP (injected in hoosHeadBridge).
 */
export function fixHumanoidPartsAccess(html: string): string {
  const partNames =
    "lUL|rUL|lUA|rUA|chest|torso|head|neck|pelvis|hips|spine|lLL|rLL|lFoot|rFoot|lHand|rHand|lFore|rFore|upperArm|lowerArm|thigh|calf|weapon|muzzle|brl|mag|holster|hHelmet|visor|root|eyeL|eyeR";
  const accessRe = new RegExp(
    `\\b((?:this|[\\w$]+)(?:\\.[\\w$]+)*)\\.parts\\.(${partNames})\\b`,
    "g",
  );

  return html.replace(
    /(<script(?![^>]*\bsrc=)[^>]*>)([\s\S]*?)(<\/script>)/gi,
    (_match, open: string, body: string, close: string) => {
      if (/type\s*=\s*["']text\/python["']/i.test(open)) return _match;
      if (!/\.parts\.(?:lUL|rUL|lUA|rUA|chest|torso|head|neck)\b/.test(body)) return _match;
      const rewritten = body.replace(accessRe, (_m, obj: string, part: string) => `__hoosP(${obj}, '${part}')`);
      if (rewritten === body) return _match;
      return open + rewritten + close;
    },
  );
}

export function fixUndeclaredGameVars(html: string): string {
  // name → sensible default value string
  const GAME_VARS: Array<[string, string]> = [
    ["cfg",       "{}"],
    ["config",    "{}"],
    ["hp",        "100"],
    ["maxHp",     "100"],
    ["lives",     "3"],
    ["stamina",   "100"],
    ["score",     "0"],
    ["combo",     "0"],
    ["ammo",      "30"],
    ["level",     "1"],
    ["xp",        "0"],
    ["jumpsLeft", "2"],
    ["dashCd",    "0"],
    ["invTimer",  "0"],
    ["dead",      "false"],
    ["paused",    "false"],
  ];

  return html.replace(
    /(<script(?![^>]*\bsrc=)[^>]*>)([\s\S]*?)(<\/script>)/gi,
    (_match, open: string, body: string, close: string) => {
      const toInject: string[] = [];

      for (const [name, def] of GAME_VARS) {
        // Skip if there is already a declaration (const/let/var) anywhere in the script.
        // Use [^;]* so multi-var declarations like `let hp = 100, score = 0, lives = 3;`
        // are matched regardless of the values between each variable name.
        if (new RegExp(`\\b(?:const|let|var)\\b[^;]*\\b${name}\\b`).test(body)) continue;

        // Count all bare-identifier uses vs property-access uses
        const allUses   = (body.match(new RegExp(`\\b${name}\\b`, "g")) ?? []).length;
        const propUses  = (body.match(new RegExp(`\\.${name}\\b`, "g")) ?? []).length;
        const bareUses  = allUses - propUses;

        // Only inject if there are bare (non-property) usages that would be undeclared
        if (bareUses < 1) continue;

        toInject.push(`var ${name} = ${def};`);
      }

      if (toInject.length === 0) return _match;
      return open + toInject.join(" ") + "\n" + body + close;
    }
  );
}

/**
 * Fixes "ReferenceError: clock is not defined" in Three.js / general game scripts.
 *
 * `clock.getDelta()` / `clock.getElapsedTime()` / `clock.elapsedTime` are used in
 * animation loops but `clock` is either:
 *   (a) never declared, or
 *   (b) declared with `const`/`let` AFTER `animate()` is called → Temporal Dead Zone crash.
 *
 * Fix strategy:
 *   1. If no declaration exists at all → inject `var clock = new THREE.Clock();` at the top.
 *   2. If `const`/`let clock` is declared → strip it from wherever it sits and re-inject
 *      `var clock = new THREE.Clock();` at the very top of the script so it is never in TDZ.
 */
export function fixClockDeclaration(html: string): string {
  return html.replace(
    /(<script(?![^>]*\bsrc=)[^>]*>)([\s\S]*?)(<\/script>)/gi,
    (_match, open: string, body: string, close: string) => {
      // Only act on scripts that actually reference clock
      if (!/\bclock\s*\./.test(body)) return _match;

      const VAR_DECL = "var clock = typeof THREE !== 'undefined' ? new THREE.Clock() : {getDelta:function(){return 0.016;},getElapsedTime:function(){return performance.now()/1000;},elapsedTime:0};\n";

      // Case (a): clock is not declared anywhere in the script
      const isDeclared = /\b(?:const|let|var)\s+clock\s*=/.test(body);
      if (!isDeclared) {
        return open + VAR_DECL + body + close;
      }

      // Case (b): declared with const/let (TDZ risk) or declared too late
      // Remove the existing declaration and re-insert it at the top as `var`
      const stripped = body
        // Remove: const/let clock = new THREE.Clock(); (optional trailing semicolon)
        .replace(/\b(?:const|let)\s+clock\s*=\s*new\s+(?:THREE\.)?Clock\s*\([^)]*\)\s*;?/g, "/* clock hoisted */")
        // Also convert any bare `var clock = ...` to avoid duplicate var issues (keep as-is, already works)
        ;

      // Only re-inject if we actually stripped something (i.e., had a const/let)
      if (stripped === body) return _match; // was already `var` and declared, leave alone

      return open + VAR_DECL + stripped + close;
    }
  );
}

/**
 * Fixes Phaser 3 black screen caused by `new Phaser.Game(config)` being declared before
 * the scene class definitions. JS classes are NOT hoisted, so the scene array
 * `[Boot, Preload, Game]` evaluates to `[undefined, undefined, undefined]` and Phaser
 * loads zero scenes, leaving a blank canvas.
 * Fix: if `new Phaser.Game(...)` appears before any `class X extends Phaser.Scene`,
 * move the Phaser.Game instantiation to the very end of the script block.
 */
export function fixPhaserSceneOrder(html: string): string {
  return html.replace(
    /(<script(?![^>]*\bsrc=)[^>]*>)([\s\S]*?)(<\/script>)/gi,
    (_match, open: string, body: string, close: string) => {
      if (!/new\s+Phaser\.Game\s*\(/.test(body)) return _match;
      if (!/\bclass\s+\w+\s+extends\s+Phaser\.Scene\b/.test(body)) return _match;

      const gameInitRe = /new\s+Phaser\.Game\s*\([^)]*\)\s*;?/;
      const gameInitMatch = gameInitRe.exec(body);
      if (!gameInitMatch || gameInitMatch.index === undefined) return _match;

      const firstClassMatch = /\bclass\s+\w+\s+extends\s+Phaser\.Scene\b/.exec(body);
      if (!firstClassMatch || firstClassMatch.index === undefined) return _match;

      // Only move it if Phaser.Game() appears BEFORE the first class definition
      if (gameInitMatch.index >= firstClassMatch.index) return _match;

      const gameInitStr = gameInitMatch[0];
      const withoutInit = body.slice(0, gameInitMatch.index) + body.slice(gameInitMatch.index + gameInitStr.length);
      return open + withoutInit.trimEnd() + "\nnew Phaser.Game(config);\n" + close;
    }
  );
}

/**
 * Fixes Phaser 3 invisible sprites caused by missing `tex.refresh()` after drawing
 * on a canvas texture created with `this.textures.createCanvas()`.
 * Phaser's CanvasTexture requires `refresh()` to push the canvas pixel data to WebGL.
 * Without it, sprites show as fully transparent.
 * Fix: for each `const/let/var tex = this.textures.createCanvas(...)` that has no
 * matching `tex.refresh()` call, insert one after the last drawing operation.
 */
export function fixPhaserMissingTexRefresh(html: string): string {
  return html.replace(
    /(<script(?![^>]*\bsrc=)[^>]*>)([\s\S]*?)(<\/script>)/gi,
    (_match, open: string, body: string, close: string) => {
      if (!/this\.textures\.createCanvas/.test(body)) return _match;

      const varRe = /\b(?:const|let|var)\s+(\w+)\s*=\s*this\.textures\.createCanvas\s*\(/g;
      let m: RegExpExecArray | null;
      let result = body;
      let cumulativeOffset = 0;

      // Collect all createCanvas variable assignments from the original body
      const assignments: Array<{ name: string; origIndex: number }> = [];
      while ((m = varRe.exec(body)) !== null) {
        assignments.push({ name: m[1], origIndex: m.index });
      }

      for (let i = 0; i < assignments.length; i++) {
        const { name, origIndex } = assignments[i];

        // Check if this variable already has a .refresh() call in the current (possibly modified) result
        const refreshRe = new RegExp(`\\b${name}\\s*\\.\\s*refresh\\s*\\(`);
        if (refreshRe.test(result)) continue;

        // Block end: start of next createCanvas in the original body (or end of body)
        const nextOrigIndex = i + 1 < assignments.length ? assignments[i + 1].origIndex : body.length;

        // Find the last semicolon in the block (in the current result, accounting for prior insertions)
        const blockStart = origIndex + cumulativeOffset;
        const blockEnd = nextOrigIndex + cumulativeOffset;
        const blockSlice = result.slice(blockStart, blockEnd);
        const lastSemi = blockSlice.lastIndexOf(";");
        const insertAt = blockStart + (lastSemi >= 0 ? lastSemi + 1 : blockSlice.length);

        const insertion = `\n${name}.refresh();`;
        result = result.slice(0, insertAt) + insertion + result.slice(insertAt);
        cumulativeOffset += insertion.length;
      }

      return open + result + close;
    }
  );
}

export function extractGameCode(text: string, language = "js-phaser"): string | null {
  const htmlBlock = text.match(/```html\s*([\s\S]*?)(?:```\s*$|```\s*\n|$)/i);
  if (htmlBlock) return sanitizeGameHtml(stripModelArtifacts(htmlBlock[1]));
  const htmlDirect = text.match(/(<!DOCTYPE html>[\s\S]*?<\/html>)/i);
  if (htmlDirect) return sanitizeGameHtml(stripModelArtifacts(htmlDirect[1]));
  const pythonBlock = text.match(/```python\s*([\s\S]*?)(?:```|$)/i);
  if (pythonBlock) {
    const cleanedPython = fixPythonRafCallbacks(fixPythonGlobals(stripModelArtifacts(pythonBlock[1])));
    return `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>HOOS Game</title>
<style>*{margin:0;padding:0;box-sizing:border-box}html,body{width:100%;height:100%;background:#000;overflow:hidden}body{display:block}</style>
</head><body><script src="${LANGUAGE_CDNS.python}"></script>
<script type="text/python">${cleanedPython}</script></body></html>`;
  }
  const jsBlock = text.match(/```(?:javascript|js)\s*([\s\S]*?)(?:```|$)/i);
  if (jsBlock) {
    const selectedCdn = LANGUAGE_CDNS[language] ?? LANGUAGE_CDNS["js-phaser"];
    const cleanedJs = stripModelArtifacts(jsBlock[1]);
    return sanitizeGameHtml(`<!DOCTYPE html><html><head><meta charset="UTF-8"><title>HOOS Game</title>
<style>*{margin:0;padding:0;box-sizing:border-box}html,body{width:100%;height:100%;background:#000;overflow:hidden}body{display:block}</style>
</head><body><script src="${selectedCdn}"></script>
<script>${cleanedJs}</script></body></html>`);
  }
  return null;
}

/**
 * Removes NUL bytes and BOM from inline scripts — they break parsing and cause opaque runtime failures.
 */
export function stripBinaryArtifactsFromScripts(html: string): string {
  return html.replace(
    /(<script(?![^>]*\bsrc=)[^>]*>)([\s\S]*?)(<\/script>)/gi,
    (_m, open: string, body: string, close: string) => {
      const cleaned = body.replace(/\u0000/g, "").replace(/^\uFEFF/, "");
      return open + cleaned + close;
    },
  );
}

/**
 * Three.js / Pixi: `controls = new OrbitControls(camera, renderer.domElement)` crashes if `camera` is still undefined.
 * If the script references OrbitControls with a `camera` identifier, ensure a hoisted fallback camera exists.
 */
export function fixThreeOrbitControlsCamera(html: string): string {
  return html.replace(
    /(<script(?![^>]*\bsrc=)[^>]*>)([\s\S]*?)(<\/script>)/gi,
    (_m, open: string, body: string, close: string) => {
      if (!/\bTHREE\b/.test(body) || !/\bOrbitControls\s*\(/.test(body) || !/\bcamera\b/.test(body)) return _m;
      if (/\b(?:const|let|var)\s+camera\s*=/.test(body)) return _m;
      const guard =
        "var camera = (typeof camera !== 'undefined' && camera) || (typeof THREE !== 'undefined' ? new THREE.PerspectiveCamera(75, innerWidth / Math.max(innerHeight, 1), 0.1, 2000) : null);\n";
      return open + guard + body + close;
    },
  );
}

/** Applies all engine-specific runtime fixers to a complete HTML game document. */
export function sanitizeGameHtml(html: string): string {
  let out = html;
  out = stripBinaryArtifactsFromScripts(out);
  out = fixGravityDeclarations(out);
  out = fixBabylonCubemap(out);
  out = fixPhaserDataUriLoads(out);
  out = fixPhaserSceneOrder(out);
  out = fixPhaserMissingTexRefresh(out);
  out = fixClockDeclaration(out);
  out = fixThreeOrbitControlsCamera(out);
  out = fixHumanoidPartsAccess(out);
  out = fixUndeclaredGameVars(out);
  out = fixPythonRafInHtml(out);
  return out;
}

export function detectEngine(code: string): string {
  if (/BABYLON\.|babylon\.js/i.test(code)) return "BABYLON.JS 3D";
  if (/THREE\.|three\.min\.js/i.test(code)) return "THREE.JS 3D";
  if (/pyodide|text\/python/i.test(code)) return "PYTHON / PYODIDE";
  if (/kaboom\s*\(/i.test(code)) return "KABOOM.JS 2D";
  if (/PIXI\./i.test(code)) return "PIXI.JS 2D";
  if (/createCanvas|p5\.min\.js/i.test(code)) return "P5.JS 2D";
  if (/phaser|Phaser/i.test(code)) return "PHASER 3 · 2D";
  return "HTML5 GAME";
}

export function extractPrimarySource(text: string, language: string, runnableHtml: string | null): string | null {
  const pythonBlock = text.match(/```python\s*([\s\S]*?)(?:```|$)/i);
  if (pythonBlock) return fixPythonRafCallbacks(fixPythonGlobals(stripModelArtifacts(pythonBlock[1])));

  const jsBlock = text.match(/```(?:javascript|js)\s*([\s\S]*?)(?:```|$)/i);
  if (jsBlock) return stripModelArtifacts(jsBlock[1]);

  if (!runnableHtml) return null;

  if (language === "python") {
    const pythonScript = runnableHtml.match(/<script[^>]*type=["']text\/python["'][^>]*>([\s\S]*?)<\/script>/i);
    if (pythonScript) return fixPythonRafCallbacks(fixPythonGlobals(stripModelArtifacts(pythonScript[1])));
  }

  const scripts = Array.from(runnableHtml.matchAll(/<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/gi));
  if (scripts.length > 0) {
    return stripModelArtifacts(scripts.map((match) => match[1].trim()).filter(Boolean).join("\n\n"));
  }

  return stripModelArtifacts(runnableHtml);
}
