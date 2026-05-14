# SCRUM-61 — Viewer Perf Spike (throwaway)

Throwaway test page for the Tech Design §10.1 viewer-performance gating spike.
**Does not ship.** Lives on `spike/SCRUM-61/viewer-perf`, deleted after the verdict.

## What it does

- Loads one synthetic architectural sheet JPEG into **OpenSeadragon** (single
  image, no DZI). Fixture is **16,000 × 10,400 px** — see Findings for why not
  the full 20K.
- Overlays **500 polygons** (4–12 vertices each) on a **Konva** layer, kept in
  sync with the OSD viewport every frame.
- Live FPS readout + an automated pan/zoom benchmark (avg + p95-worst fps).
- Toggles to isolate the bottleneck:
  - **Konva hit-graph** (`listening`) — ON redraws a hidden hit canvas every
    frame; OFF is the §2.2 mitigation, with hit-testing via custom ray-cast
    point-in-polygon (`hit-test.js`).
  - **Viewport culling** — uses `viewport.viewportToImageRectangle` to hide
    off-screen polygons.
  - **Hide polygons (OSD only)** — strips the Konva overlay entirely, to test
    OpenSeadragon in isolation.

## Run it

```
cd spike-scrum-61
npm install
npm run gen     # synthesize public/sheet.jpg (16000x10400) — one-time, ~7-40s
npm run dev     # open the printed localhost URL
```

## Results — 16 GB Windows 10 laptop, ~144 Hz display

### Automated benchmark (scripted pan/zoom)

| Browser | hit-graph | culling | avg fps | worst p95 |
| ------- | --------- | ------- | ------- | --------- |
| Chrome  | ON        | OFF     | 142     | 143       |
| Chrome  | OFF       | OFF     | 142     | 143       |
| Chrome  | OFF       | ON      | 144     | 143       |
| Firefox | ON        | OFF     | 133     | 72        |
| Firefox | OFF       | OFF     | 134     | 72        |
| Firefox | OFF       | ON      | 141     | 144       |
| Safari  | —         | —       | not run — pending Dvir |  |

### Manual aggressive scroll-zoom (the real-world test) — lowest live FPS

| Browser | config                         | lowest fps | feel            |
| ------- | ------------------------------ | ---------- | --------------- |
| Chrome  | full app, culling OFF          | 51         | janky / "stuck" |
| Chrome  | full app, culling ON           | 32         | janky / "stuck" |
| Chrome  | **OSD only** (polygons hidden) | **27**     | **still janky** |

The automated benchmark reports ~143 fps, but it does not reflect real use — its
gentle scripted moves miss the stall. Aggressive manual scroll-zoom is the honest
test, and it tells a different story.

## Verdict: 🟡 Yellow — with a critical caveat

By raw numbers (lowest ~27 fps during aggressive zoom) it sits in the 15–30
yellow band. **But the ticket's yellow mitigation — "cap polygons-per-sheet,
render only viewport-visible polygons" — does not apply**, because the polygon
overlay is not the bottleneck.

## Findings

1. **A true 20K-px single JPEG cannot render in a browser.** Hard ~16,384-px
   canvas/texture limit (Chrome/Firefox/Safari). The fixture had to be dropped to
   16,000 px wide to render at all. → Tiling/DZI is a *prerequisite*, not a
   Phase 2 nice-to-have.
2. **The bottleneck is OpenSeadragon resampling the single large image during
   zoom — not the Konva overlay.** With the overlay completely hidden ("OSD
   only"), aggressive zoom still stutters and still drops to 27 fps.
3. **Neither §2.2 mitigation helps.** The Konva hit-graph toggle makes no
   measurable difference; viewport culling made the *manual* Chrome zoom *worse*
   (32 vs 51 fps) — its per-frame overhead outweighs any saving. Both target the
   overlay, which was never the problem.
4. The OSD + Konva architecture itself is probably sound — the overlay is cheap.
   It just cannot be fed a single large image.

## Recommendation

- **Do not start SCRUM-44 on the single-JPEG assumption.** Pull DZI/tiling from
  "Phase 2" into the Phase 1 viewer work.
- **Follow-up spike:** re-test OpenSeadragon + Konva with real DZI tiles before
  SCRUM-44 commits. OSD is built for tiled gigapixel images; with tiles the
  result is expected to be green — but it must be confirmed, not assumed.
- Drop the §2.2 polygon-mitigation framing — the spike shows the polygons are
  not the risk.

## Decision matrix (from the ticket, for reference)

- 🟢 **≥30 fps** sustained — proceed with SCRUM-44.
- 🟡 **15–30 fps** after mitigation — cap polygons/sheet + viewport-cull, document
  the limit; shippable with constraints.
- 🔴 **<15 fps** after mitigation — STOP. ADR for an alternative renderer.

## Outstanding

- Dvir: Safari pass on his Mac (won't change the root-cause finding).
- Screenshots attached to SCRUM-61 / the Confluence write-up.
