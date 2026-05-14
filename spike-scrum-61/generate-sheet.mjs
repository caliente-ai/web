// SCRUM-61 — synthesize one ~20K-px architectural "sheet" JPEG.
// Throwaway test fixture. Run: `npm run gen`  ->  writes public/sheet.jpg
//
// For a *performance* spike the drawing content is irrelevant — only the
// pixel dimensions matter. We build a lightweight SVG (pattern grid + room
// rectangles + labels) and let sharp rasterise it to a single big JPEG.
import sharp from "sharp";
import { mkdirSync } from "node:fs";

const W = 20000;
const H = 13000;

// seeded RNG so the fixture is repeatable
function mulberry32(seed) {
  return function () {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rand = mulberry32(424242);

// loose grid of "rooms" with jitter + labels
const rooms = [];
const cols = 11;
const rowsN = 7;
const cellW = W / cols;
const cellH = H / rowsN;
for (let r = 0; r < rowsN; r++) {
  for (let c = 0; c < cols; c++) {
    const padX = cellW * (0.06 + rand() * 0.1);
    const padY = cellH * (0.06 + rand() * 0.1);
    rooms.push({
      x: c * cellW + padX,
      y: r * cellH + padY,
      w: cellW - padX * 2,
      h: cellH - padY * 2,
      label: `R-${r + 1}${String(c + 1).padStart(2, "0")}`,
    });
  }
}

const roomSvg = rooms
  .map(
    (rm) =>
      `<rect x="${rm.x.toFixed(0)}" y="${rm.y.toFixed(0)}" width="${rm.w.toFixed(0)}" height="${rm.h.toFixed(0)}" fill="#f4f1ea" stroke="#222" stroke-width="6"/>` +
      `<text x="${(rm.x + 40).toFixed(0)}" y="${(rm.y + 140).toFixed(0)}" font-family="monospace" font-size="96" fill="#444">${rm.label}</text>`,
  )
  .join("");

const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <defs>
    <pattern id="grid" width="200" height="200" patternUnits="userSpaceOnUse">
      <path d="M200 0 L0 0 0 200" fill="none" stroke="#dcdcdc" stroke-width="2"/>
    </pattern>
  </defs>
  <rect width="100%" height="100%" fill="#ffffff"/>
  <rect width="100%" height="100%" fill="url(#grid)"/>
  <rect x="60" y="60" width="${W - 120}" height="${H - 120}" fill="none" stroke="#333" stroke-width="24"/>
  ${roomSvg}
  <text x="120" y="${H - 120}" font-family="monospace" font-size="170" fill="#222">SCRUM-61 SYNTHETIC SHEET — ${W} x ${H} px — throwaway perf fixture</text>
</svg>`;

mkdirSync("public", { recursive: true });

console.log(`Rendering ${W}x${H} sheet (${rooms.length} rooms)… this can take ~10-40s.`);
const t0 = Date.now();
await sharp(Buffer.from(svg), { limitInputPixels: false })
  .jpeg({ quality: 78, mozjpeg: true })
  .toFile("public/sheet.jpg");
console.log(`Done in ${((Date.now() - t0) / 1000).toFixed(1)}s  ->  public/sheet.jpg`);
