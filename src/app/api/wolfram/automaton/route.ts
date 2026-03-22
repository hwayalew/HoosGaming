import { NextRequest, NextResponse } from "next/server";

function runCA(rule: number, width: number, rows: number): number[][] {
  const ruleBits = Array.from({ length: 8 }, (_, i) => (rule >> i) & 1);
  const grid: number[][] = [];

  let row = new Array(width).fill(0);
  row[Math.floor(width / 2)] = 1;
  grid.push([...row]);

  for (let r = 1; r < rows; r++) {
    const next = new Array(width).fill(0);
    for (let c = 0; c < width; c++) {
      const l = row[(c - 1 + width) % width];
      const m = row[c];
      const ri = row[(c + 1) % width];
      const idx = (l << 2) | (m << 1) | ri;
      next[c] = ruleBits[idx];
    }
    row = next;
    grid.push([...row]);
  }
  return grid;
}

export async function GET(req: NextRequest) {
  const rule = parseInt(req.nextUrl.searchParams.get("rule") ?? "30", 10);
  const width = Math.min(Math.max(parseInt(req.nextUrl.searchParams.get("width") ?? "64", 10), 16), 128);
  const rows = Math.min(Math.max(parseInt(req.nextUrl.searchParams.get("rows") ?? "32", 10), 8), 64);

  if (isNaN(rule) || rule < 0 || rule > 255) {
    return NextResponse.json({ error: "rule must be 0-255" }, { status: 400 });
  }

  const grid = runCA(rule, width, rows);

  const platforms: Array<{ x: number; y: number; w: number }> = [];
  for (let r = 4; r < rows; r += 4) {
    let start = -1;
    for (let c = 0; c < width; c++) {
      if (grid[r][c] === 1 && start === -1) start = c;
      if ((grid[r][c] === 0 || c === width - 1) && start !== -1) {
        const w = c - start;
        if (w >= 3) {
          platforms.push({
            x: Math.round((start / width) * 800),
            y: Math.round((r / rows) * 450) + 60,
            w: Math.round((w / width) * 800),
          });
        }
        start = -1;
      }
    }
  }

  return NextResponse.json({ rule, grid, platforms, width, rows });
}
