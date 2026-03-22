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
      if (!/(?:phaser|three\.min|r134\/three|babylonjs\.com|babylon\.js|p5\.min|kaboom|pixi(?:\.min)?\.js)/i.test(src)) {
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
    if (/\bglobal\s+/m.test(source)) {
      return "Python Pyodide games must not use `global`; use one module-level dict `state` and mutate keys (e.g. state[\"score\"]).";
    }
    if (!/import\s+js\b/m.test(source)) {
      return "Python games must `import js` for canvas and DOM (Pyodide).";
    }
    const hasStateDict =
      /\bstate\s*=\s*\{/.test(source) ||
      /\bstate\s*=\s*dict\s*\(/.test(source);
    if (!hasStateDict) {
      return "Python games must define a single module-level dict `state = { ... }` (or `state = dict(...)`) for all mutable game data.";
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

export function extractGameCode(text: string, language = "js-phaser"): string | null {
  const htmlBlock = text.match(/```html\s*([\s\S]*?)(?:```\s*$|```\s*\n|$)/i);
  if (htmlBlock) return stripModelArtifacts(htmlBlock[1]);
  const htmlDirect = text.match(/(<!DOCTYPE html>[\s\S]*?<\/html>)/i);
  if (htmlDirect) return stripModelArtifacts(htmlDirect[1]);
  const pythonBlock = text.match(/```python\s*([\s\S]*?)(?:```|$)/i);
  if (pythonBlock) {
    const cleanedPython = stripModelArtifacts(pythonBlock[1]);
    return `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>HOOS Game</title>
<style>*{margin:0;padding:0;box-sizing:border-box}html,body{width:100%;height:100%;background:#000;overflow:hidden}body{display:block}</style>
</head><body><script src="${LANGUAGE_CDNS.python}"></script>
<script type="text/python">${cleanedPython}</script></body></html>`;
  }
  const jsBlock = text.match(/```(?:javascript|js)\s*([\s\S]*?)(?:```|$)/i);
  if (jsBlock) {
    const selectedCdn = LANGUAGE_CDNS[language] ?? LANGUAGE_CDNS["js-phaser"];
    const cleanedJs = stripModelArtifacts(jsBlock[1]);
    return `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>HOOS Game</title>
<style>*{margin:0;padding:0;box-sizing:border-box}html,body{width:100%;height:100%;background:#000;overflow:hidden}body{display:block}</style>
</head><body><script src="${selectedCdn}"></script>
<script>${cleanedJs}</script></body></html>`;
  }
  return null;
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
  if (pythonBlock) return stripModelArtifacts(pythonBlock[1]);

  const jsBlock = text.match(/```(?:javascript|js)\s*([\s\S]*?)(?:```|$)/i);
  if (jsBlock) return stripModelArtifacts(jsBlock[1]);

  if (!runnableHtml) return null;

  if (language === "python") {
    const pythonScript = runnableHtml.match(/<script[^>]*type=["']text\/python["'][^>]*>([\s\S]*?)<\/script>/i);
    if (pythonScript) return stripModelArtifacts(pythonScript[1]);
  }

  const scripts = Array.from(runnableHtml.matchAll(/<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/gi));
  if (scripts.length > 0) {
    return stripModelArtifacts(scripts.map((match) => match[1].trim()).filter(Boolean).join("\n\n"));
  }

  return stripModelArtifacts(runnableHtml);
}
