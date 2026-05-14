// SCRUM-61 — Viewer perf spike. Throwaway code, does not ship.
//
// OpenSeadragon renders one 20K-px sheet (single image, no DZI). A Konva layer
// of 500 polygons is kept in sync with the OSD viewport every frame. Two perf
// levers from Tech Design §2.2 are exposed as toggles:
//   - Konva hit-graph (`listening`)  — ON redraws a hidden hit canvas every
//     frame; OFF is the mitigation, with hit-testing via custom ray-cast.
//   - Viewport culling — hides off-screen polygons via viewportToImageRectangle.
import OpenSeadragon from "openseadragon";
import Konva from "konva";
import { pointInPolygon } from "./hit-test.js";

// Must match generate-sheet.mjs. Browser-safe size — a true 20,000-px single
// image exceeds the ~16,384-px canvas limit (recorded SCRUM-61 finding).
const IMG_W = 16000;
const IMG_H = 10400;
const POLY_COUNT = 500;

// ---- seeded RNG: repeatable 500-polygon set --------------------------------
function mulberry32(seed) {
  return function () {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rand = mulberry32(610061);

// ---- 500 polygons in IMAGE-pixel coordinates (4-12 vertices each) ----------
function buildPolygons() {
  const polys = [];
  for (let i = 0; i < POLY_COUNT; i++) {
    const cx = rand() * IMG_W;
    const cy = rand() * IMG_H;
    const verts = 4 + Math.floor(rand() * 9); // 4..12
    const baseR = 90 + rand() * 230;
    const pts = [];
    for (let v = 0; v < verts; v++) {
      const ang = (v / verts) * Math.PI * 2 + (rand() - 0.5) * 0.5;
      const r = baseR * (0.55 + rand() * 0.9);
      pts.push(cx + Math.cos(ang) * r, cy + Math.sin(ang) * r);
    }
    polys.push({ id: i, pts, cx, cy });
  }
  return polys;
}
const polygons = buildPolygons();

// ---- DOM refs --------------------------------------------------------------
const fpsEl = document.getElementById("fps");
const statusEl = document.getElementById("status");
const hitEl = document.getElementById("hit");
const hitGraphChk = document.getElementById("hitGraph");
const cullChk = document.getElementById("cull");
const hidePolysChk = document.getElementById("hidePolys");
const benchBtn = document.getElementById("bench");
const osdEl = document.getElementById("osd");

// ---- on-screen diagnostics (so we don't need DevTools) ---------------------
const diag = document.createElement("div");
diag.style.cssText =
  "margin-top:8px;padding-top:8px;border-top:1px solid #444;color:#9cf;font-size:11px;line-height:1.6;white-space:pre-wrap;";
document.getElementById("hud").appendChild(diag);
const diagState = { probe: "testing…", osd: "waiting…", sync: "—" };
function renderDiag() {
  diag.textContent =
    `sheet probe: ${diagState.probe}\n` +
    `OSD open:    ${diagState.osd}\n` +
    `sync:        ${diagState.sync}`;
}
renderDiag();

// Direct decode probe: can the browser even load a 20000-px JPEG as an <img>?
const probe = new Image();
probe.onload = () => {
  diagState.probe =
    probe.naturalWidth +
    "x" +
    probe.naturalHeight +
    (probe.naturalWidth === 0 ? "  <-- DECODE FAILED (0 px)" : "  OK");
  renderDiag();
};
probe.onerror = () => {
  diagState.probe = "ERROR — browser could not load /sheet.jpg";
  renderDiag();
};
probe.src = "/sheet.jpg";

// ---- OpenSeadragon: single high-res JPEG, no DZI (per ticket) --------------
const osd = OpenSeadragon({
  element: osdEl,
  prefixUrl: "https://cdn.jsdelivr.net/npm/openseadragon@4/build/openseadragon/images/",
  tileSources: { type: "image", url: "/sheet.jpg" },
  showNavigationControl: true,
  animationTime: 1.0,
  springStiffness: 7,
  blendTime: 0,
  immediateRender: true,
  minZoomImageRatio: 0.4,
  maxZoomPixelRatio: 4,
});

// ---- Konva overlay ---------------------------------------------------------
const stage = new Konva.Stage({
  container: "overlay",
  width: window.innerWidth,
  height: window.innerHeight,
});
const layer = new Konva.Layer({ listening: true });
stage.add(layer);

const shapes = polygons.map((p) => {
  const line = new Konva.Line({
    points: p.pts,
    closed: true,
    fill: "rgba(20,120,255,0.16)",
    stroke: "rgba(10,80,180,0.85)",
    strokeWidth: 1.5,
    strokeScaleEnabled: false, // keep stroke visible at every zoom
    perfectDrawEnabled: false,
    shadowForStrokeEnabled: false,
    hitStrokeWidth: 0,
  });
  layer.add(line);
  return line;
});
let highlighted = null;

// ---- OSD <-> Konva viewport sync ------------------------------------------
// Polygons live in image-pixel space. Each frame we place + scale the Konva
// layer so image-coord (0,0) maps to the right screen pixel at the right zoom.
function syncOverlay() {
  const vp = osd.viewport;
  const origin = vp.imageToViewerElementCoordinates(new OpenSeadragon.Point(0, 0));
  const unitX = vp.imageToViewerElementCoordinates(new OpenSeadragon.Point(1, 0));
  const scale = unitX.x - origin.x; // viewer px per image px

  layer.scale({ x: scale, y: scale });
  layer.position({ x: origin.x, y: origin.y });

  if (cullChk.checked) applyCulling();
  layer.batchDraw();

  diagState.sync =
    "scale=" +
    scale.toFixed(5) +
    " origin=(" +
    origin.x.toFixed(0) +
    "," +
    origin.y.toFixed(0) +
    ")";
  renderDiag();
}
osd.addHandler("update-viewport", syncOverlay);
osd.addHandler("open", () => {
  statusEl.textContent = "sheet loaded — pan/zoom or run the benchmark";
  try {
    const size = osd.world.getItemAt(0).getContentSize();
    diagState.osd = "loaded, content " + size.x + "x" + size.y;
  } catch (e) {
    diagState.osd = "open fired but no world item: " + e.message;
  }
  renderDiag();
  resize();
  syncOverlay();
});
osd.addHandler("open-failed", (event) => {
  statusEl.textContent = "FAILED to load /sheet.jpg";
  diagState.osd =
    "OPEN-FAILED: " + (event && event.message ? event.message : "unknown");
  renderDiag();
  console.error("[SCRUM-61] OSD open-failed", event);
});

// ---- viewport culling (yellow-path mitigation) -----------------------------
// Uses viewport.viewportToImageRectangle to hide polygons outside the view.
function applyCulling() {
  const r = osd.viewport.viewportToImageRectangle(osd.viewport.getBounds(true));
  const minX = r.x - 400;
  const minY = r.y - 400;
  const maxX = r.x + r.width + 400;
  const maxY = r.y + r.height + 400;
  for (let i = 0; i < polygons.length; i++) {
    const p = polygons[i];
    shapes[i].visible(p.cx > minX && p.cx < maxX && p.cy > minY && p.cy < maxY);
  }
}
cullChk.addEventListener("change", () => {
  if (!cullChk.checked) for (const s of shapes) s.visible(true);
  syncOverlay();
});

// ---- isolate the bottleneck: hide the whole Konva overlay (OSD only) -------
hidePolysChk.addEventListener("change", () => {
  layer.visible(!hidePolysChk.checked);
  layer.batchDraw();
});

// ---- hit-graph toggle (the core perf variable) -----------------------------
// ON  = Konva redraws its hidden hit canvas every batchDraw (cost).
// OFF = `listening:false`; hit-testing falls back to custom point-in-polygon.
function applyHitGraph() {
  layer.listening(hitGraphChk.checked);
  layer.batchDraw();
}
hitGraphChk.addEventListener("change", applyHitGraph);

// ---- custom point-in-polygon hit-test (always active) ----------------------
// Mouse position -> image coords -> ray-cast against all 500 polygons.
osdEl.addEventListener("mousemove", (e) => {
  const rect = osdEl.getBoundingClientRect();
  const imgPt = osd.viewport.viewerElementToImageCoordinates(
    new OpenSeadragon.Point(e.clientX - rect.left, e.clientY - rect.top),
  );
  let found = -1;
  for (let i = 0; i < polygons.length; i++) {
    if (pointInPolygon(imgPt.x, imgPt.y, polygons[i].pts)) {
      found = i;
      break;
    }
  }
  if (found !== highlighted) {
    if (highlighted !== null) shapes[highlighted].fill("rgba(20,120,255,0.16)");
    if (found !== -1) shapes[found].fill("rgba(255,140,0,0.45)");
    highlighted = found === -1 ? null : found;
    layer.batchDraw();
  }
  hitEl.textContent = found === -1 ? "—" : "polygon #" + found;
});

// ---- resize ----------------------------------------------------------------
function resize() {
  stage.width(window.innerWidth);
  stage.height(window.innerHeight);
}
window.addEventListener("resize", () => {
  resize();
  syncOverlay();
});

// ---- live FPS readout ------------------------------------------------------
let frames = 0;
let fpsLast = performance.now();
function fpsLoop(now) {
  frames++;
  const dt = now - fpsLast;
  if (dt >= 500) {
    fpsEl.textContent = Math.round((frames * 1000) / dt);
    frames = 0;
    fpsLast = now;
  }
  requestAnimationFrame(fpsLoop);
}
requestAnimationFrame(fpsLoop);

// ---- automated pan/zoom benchmark -----------------------------------------
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

async function runBenchmark() {
  benchBtn.disabled = true;
  statusEl.textContent = "benchmark running…";
  const vp = osd.viewport;
  vp.zoomTo(1, null, true);
  await wait(300);

  const intervals = [];
  let running = true;
  let last = performance.now();
  function probe(now) {
    if (!running) return;
    intervals.push(now - last);
    last = now;
    requestAnimationFrame(probe);
  }
  requestAnimationFrame(probe);

  const moves = [
    () => vp.zoomTo(5),
    () => vp.panTo(new OpenSeadragon.Point(0.25, 0.18)),
    () => vp.zoomTo(15),
    () => vp.panTo(new OpenSeadragon.Point(0.72, 0.5)),
    () => vp.zoomTo(6),
    () => vp.panTo(new OpenSeadragon.Point(0.45, 0.3)),
    () => vp.zoomTo(1),
  ];
  for (const m of moves) {
    m();
    await wait(1300);
  }

  running = false;
  intervals.sort((a, b) => a - b);
  const avg = intervals.reduce((a, b) => a + b, 0) / intervals.length;
  const p95 = intervals[Math.floor(intervals.length * 0.95)];
  const avgFps = Math.round(1000 / avg);
  const worstFps = Math.round(1000 / p95);
  const mode = `hit-graph ${hitGraphChk.checked ? "ON" : "OFF"}, culling ${cullChk.checked ? "ON" : "OFF"}`;
  const line = `avg ${avgFps} fps · worst(p95) ${worstFps} fps · ${mode}`;
  statusEl.textContent = line;
  console.log("[SCRUM-61 benchmark]", line, { frames: intervals.length });
  benchBtn.disabled = false;
}
benchBtn.addEventListener("click", runBenchmark);

// ---- init ------------------------------------------------------------------
applyHitGraph();
statusEl.textContent = "loading sheet…";
