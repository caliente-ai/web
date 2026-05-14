# SCRUM-61 — Viewer Perf Spike (throwaway)

Throwaway test page for the Tech Design §10.1 viewer-performance gating spike.
**Does not ship.** Lives on `spike/SCRUM-61/viewer-perf`, deleted after the verdict.

## What it does

- Loads one synthetic **~20K-px** architectural sheet JPEG into **OpenSeadragon**
  (single image, no DZI — DZI is Phase 2).
- Overlays **500 polygons** (4–12 vertices each) on a **Konva** layer, kept in
  sync with the OSD viewport every frame.
- Live FPS readout + an automated pan/zoom benchmark (avg + p95-worst fps).
- Two §2.2 perf levers as toggles:
  - **Konva hit-graph** (`listening`) — ON redraws a hidden hit canvas every
    frame; OFF is the mitigation, with hit-testing via custom ray-cast
    point-in-polygon (`hit-test.js`).
  - **Viewport culling** — uses `viewport.viewportToImageRectangle` to hide
    off-screen polygons.

## Run it

```
cd spike-scrum-61
npm install
npm run gen     # synthesize public/sheet.jpg (~20K px) — one-time, ~10-40s
npm run dev     # open the printed localhost URL
```

## How to measure

1. Open in **Chrome**. Click **Run pan/zoom benchmark** — note avg + worst fps.
2. Pan/zoom manually for feel; watch the live fps and the hover hit-test.
3. Repeat with **hit-graph OFF** (the mitigation).
4. Repeat with **culling ON**.
5. Repeat the whole set in **Firefox**. Dvir repeats in **Safari** on his Mac.

## Results — fill in, then copy to Confluence

| Browser | Hardware | hit-graph | culling | avg fps | worst fps |
| ------- | -------- | --------- | ------- | ------- | --------- |
| Chrome  |          | ON        | OFF     |         |           |
| Chrome  |          | OFF       | OFF     |         |           |
| Chrome  |          | OFF       | ON      |         |           |
| Firefox |          | OFF       | OFF     |         |           |
| Safari  |          | OFF       | OFF     |         |           |

**Verdict (green / yellow / red): _TBD_**

Decision matrix (from the ticket):

- 🟢 **≥30 fps** sustained (with or without mitigation) — proceed with SCRUM-44.
- 🟡 **15–30 fps** after mitigation — cap polygons/sheet + viewport-cull, document
  the limit; shippable with constraints.
- 🔴 **<15 fps** after mitigation — STOP. Write an ADR for an alternative
  renderer (PixiJS / WebGL) and spike that for 2 days first.
