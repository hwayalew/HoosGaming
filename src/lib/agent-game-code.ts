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
 * The AI sometimes writes `const GRAVITY = X` or `let GRAVITY = X` inside its game code,
 * which conflicts with the scaffold's `let GRAVITY = 28` declaration and causes a TDZ crash.
 * Fix: remove all AI-added GRAVITY declarations and hoist a single `let GRAVITY = 28` to the
 * very top of every inline <script> block that references GRAVITY.
 */
export function fixGravityDeclarations(html: string): string {
  return html.replace(
    /(<script(?![^>]*\bsrc=)[^>]*>)([\s\S]*?)(<\/script>)/gi,
    (_match, open: string, body: string, close: string) => {
      if (!/\bGRAVITY\b/.test(body)) return _match;
      // Remove every const/let/var GRAVITY = ... line so there is never a duplicate declaration
      const stripped = body.replace(/\b(?:const|let|var)\s+GRAVITY\s*=[^\n;]*[;\n]?/g, "");
      // Hoist a single let declaration to the very top of this script block
      return open + "let GRAVITY = 28;\n" + stripped + close;
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

export function extractGameCode(text: string, language = "js-phaser"): string | null {
  const htmlBlock = text.match(/```html\s*([\s\S]*?)(?:```\s*$|```\s*\n|$)/i);
  if (htmlBlock) return sanitizeGameHtml(stripModelArtifacts(htmlBlock[1]));
  const htmlDirect = text.match(/(<!DOCTYPE html>[\s\S]*?<\/html>)/i);
  if (htmlDirect) return sanitizeGameHtml(stripModelArtifacts(htmlDirect[1]));
  const pythonBlock = text.match(/```python\s*([\s\S]*?)(?:```|$)/i);
  if (pythonBlock) {
    const cleanedPython = fixPythonGlobals(stripModelArtifacts(pythonBlock[1]));
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

/** Applies all engine-specific runtime fixers to a complete HTML game document. */
export function sanitizeGameHtml(html: string): string {
  let out = html;
  out = fixGravityDeclarations(out);
  out = fixBabylonCubemap(out);
  out = fixPhaserDataUriLoads(out);
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
  if (pythonBlock) return fixPythonGlobals(stripModelArtifacts(pythonBlock[1]));

  const jsBlock = text.match(/```(?:javascript|js)\s*([\s\S]*?)(?:```|$)/i);
  if (jsBlock) return stripModelArtifacts(jsBlock[1]);

  if (!runnableHtml) return null;

  if (language === "python") {
    const pythonScript = runnableHtml.match(/<script[^>]*type=["']text\/python["'][^>]*>([\s\S]*?)<\/script>/i);
    if (pythonScript) return fixPythonGlobals(stripModelArtifacts(pythonScript[1]));
  }

  const scripts = Array.from(runnableHtml.matchAll(/<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/gi));
  if (scripts.length > 0) {
    return stripModelArtifacts(scripts.map((match) => match[1].trim()).filter(Boolean).join("\n\n"));
  }

  return stripModelArtifacts(runnableHtml);
}
