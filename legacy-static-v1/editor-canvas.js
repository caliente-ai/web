// Functional OpenSeadragon + Konva canvas for the takeoff editor.
// Boots a real pannable/zoomable floor plan (inline SVG data-URI, no network dep),
// then mounts a Konva overlay so the user can actually draw polygons.
(function () {
  "use strict";

  const FLOOR_PLAN_SVG = buildFloorPlanSvg();
  const floorPlanDataUri =
    "data:image/svg+xml;base64," + btoa(unescape(encodeURIComponent(FLOOR_PLAN_SVG)));

  const PLAN_W = 2400;
  const PLAN_H = 1600;

  // ---- OpenSeadragon ----
  const viewer = OpenSeadragon({
    id: "osd-viewer",
    prefixUrl: "https://cdn.jsdelivr.net/npm/openseadragon@5.0.0/build/openseadragon/images/",
    tileSources: {
      type: "image",
      url: floorPlanDataUri,
      buildPyramid: false,
    },
    showNavigator: false,
    showZoomControl: false,
    showHomeControl: false,
    showFullPageControl: false,
    gestureSettingsMouse: { clickToZoom: false, dblClickToZoom: false },
    minZoomImageRatio: 0.5,
    maxZoomPixelRatio: 8,
    visibilityRatio: 1,
    constrainDuringPan: true,
    animationTime: 0.4,
    springStiffness: 8,
  });

  // ---- Konva overlay ----
  const container = document.getElementById("konva-container");
  const stage = new Konva.Stage({
    container,
    width: container.clientWidth,
    height: container.clientHeight,
  });
  const layer = new Konva.Layer();
  stage.add(layer);

  // Seed: a couple of completed polygons + the in-progress polygon from the mock.
  const seedPolygons = [
    {
      label: "Lobby — 216 SF",
      stroke: "#3b82f6",
      fill: "rgba(59,130,246,0.18)",
      // Polygon points in IMAGE coordinates (relative to PLAN_W x PLAN_H).
      points: [
        [360, 320],
        [720, 320],
        [720, 560],
        [360, 560],
      ],
    },
    {
      label: "Storage — 120 SF",
      stroke: "#22c55e",
      fill: "rgba(34,197,94,0.18)",
      points: [
        [960, 720],
        [1200, 720],
        [1200, 920],
        [960, 920],
      ],
    },
    {
      label: "Kitchen — 142 SF",
      stroke: "#2563eb",
      fill: "rgba(37,99,235,0.22)",
      points: [
        [1080, 400],
        [1480, 400],
        [1480, 680],
        [1080, 680],
      ],
      active: true, // shows vertex handles
    },
  ];

  const polygons = []; // { groupNode, imagePoints, label, stroke }

  function imageToOverlayPoints(imgPts) {
    // Convert each image-coord [x,y] to a flat array of overlay (screen) coords.
    const flat = [];
    imgPts.forEach(([x, y]) => {
      const vp = viewer.viewport.imageToViewportCoordinates(x, y);
      const px = viewer.viewport.viewportToViewerElementCoordinates(vp);
      flat.push(px.x, px.y);
    });
    return flat;
  }

  function drawAllPolygons() {
    layer.destroyChildren();

    polygons.forEach((p) => {
      const flat = imageToOverlayPoints(p.imagePoints);
      const group = new Konva.Group();
      const poly = new Konva.Line({
        points: flat,
        stroke: p.stroke,
        strokeWidth: 2,
        fill: p.fill,
        closed: true,
        listening: false,
      });
      group.add(poly);

      // Label badge at first vertex
      if (flat.length >= 2) {
        const labelBg = new Konva.Rect({
          x: flat[0] + 6,
          y: flat[1] - 22,
          width: ctxWidth(p.label) + 12,
          height: 18,
          fill: "rgba(255,255,255,0.9)",
          stroke: p.stroke,
          strokeWidth: 1,
          cornerRadius: 2,
          listening: false,
        });
        const labelText = new Konva.Text({
          x: flat[0] + 12,
          y: flat[1] - 19,
          text: p.label,
          fontFamily: "JetBrains Mono",
          fontSize: 11,
          fontStyle: "500",
          fill: p.stroke,
          listening: false,
        });
        group.add(labelBg);
        group.add(labelText);
      }

      // Vertex handles only when active
      if (p.active) {
        for (let i = 0; i < flat.length; i += 2) {
          const handle = new Konva.Rect({
            x: flat[i] - 4,
            y: flat[i + 1] - 4,
            width: 8,
            height: 8,
            fill: "#ffffff",
            stroke: "#0053db",
            strokeWidth: 2,
            listening: false,
          });
          group.add(handle);
        }
      }
      layer.add(group);
    });

    // Draft polygon (in-progress drawing)
    if (draft.imagePoints.length > 0) {
      const flat = imageToOverlayPoints(draft.imagePoints);
      // Add current cursor as a "preview" segment
      if (draft.cursor) {
        flat.push(draft.cursor.x, draft.cursor.y);
      }
      const draftLine = new Konva.Line({
        points: flat,
        stroke: "#0053db",
        strokeWidth: 2,
        dash: [6, 4],
        closed: false,
        listening: false,
      });
      layer.add(draftLine);
      draft.imagePoints.forEach(([x, y]) => {
        const vp = viewer.viewport.imageToViewportCoordinates(x, y);
        const px = viewer.viewport.viewportToViewerElementCoordinates(vp);
        layer.add(
          new Konva.Rect({
            x: px.x - 4,
            y: px.y - 4,
            width: 8,
            height: 8,
            fill: "#ffffff",
            stroke: "#0053db",
            strokeWidth: 2,
            listening: false,
          })
        );
      });
    }

    layer.batchDraw();
  }

  // Rough text-width estimate so the label box hugs the text.
  const measureCtx = document.createElement("canvas").getContext("2d");
  measureCtx.font = "11px 'JetBrains Mono', monospace";
  function ctxWidth(t) {
    return measureCtx.measureText(t).width;
  }

  // Seed polygons into runtime state
  seedPolygons.forEach((p) => polygons.push({ ...p, imagePoints: p.points }));

  // Resize handling: keep stage in sync with container
  function resizeStage() {
    stage.size({ width: container.clientWidth, height: container.clientHeight });
    drawAllPolygons();
  }
  window.addEventListener("resize", resizeStage);

  // Redraw on every OSD update so polygons track pan/zoom
  viewer.addHandler("update-viewport", drawAllPolygons);
  viewer.addHandler("animation", drawAllPolygons);
  viewer.addHandler("open", () => {
    // Center on the plan once it's open
    viewer.viewport.fitBounds(viewer.world.getItemAt(0).getBounds(), true);
    requestAnimationFrame(drawAllPolygons);
  });

  // ---- Polygon drawing state ----
  const draft = {
    imagePoints: /** @type {[number,number][]} */ ([]),
    cursor: null,
  };

  let tool = "polygon"; // matches the active toolbar pill in the Stitch markup
  const cursorHint = document.getElementById("cursor-hint");

  // Toolbar wiring: read the existing buttons and toggle active styling
  const toolbarButtons = Array.from(
    document.querySelectorAll(".drawing-canvas .absolute.top-md button[title]")
  );
  function setTool(name) {
    tool = name;
    toolbarButtons.forEach((b) => {
      const isActive = (b.getAttribute("title") || "")
        .toLowerCase()
        .startsWith(name.toLowerCase());
      b.classList.toggle("bg-primary-container", isActive);
      b.classList.toggle("text-white", isActive);
      b.classList.toggle("hover:bg-white/10", !isActive);
    });
    if (cursorHint) {
      cursorHint.textContent =
        name === "polygon"
          ? "Polygon tool active — click to add vertices, double-click to close"
          : `${name[0].toUpperCase() + name.slice(1)} tool active`;
      cursorHint.style.opacity = "1";
      clearTimeout(setTool._t);
      setTool._t = setTimeout(() => (cursorHint.style.opacity = "0.5"), 2500);
    }
  }
  toolbarButtons.forEach((b) => {
    b.addEventListener("click", (e) => {
      e.preventDefault();
      const title = (b.getAttribute("title") || "").split(" ")[0].toLowerCase();
      setTool(title);
    });
  });

  // Keyboard shortcuts (V/P/C/L/K/D), matching the Stitch toolbar pills
  window.addEventListener("keydown", (e) => {
    if (e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA") return;
    const map = { v: "select", p: "polygon", c: "count", l: "linear", k: "calibrate", d: "detect" };
    const next = map[e.key.toLowerCase()];
    if (next) setTool(next);
    if (e.key === "Escape" && draft.imagePoints.length) {
      draft.imagePoints = [];
      draft.cursor = null;
      drawAllPolygons();
    }
  });

  // Convert a mouse event to image (plan) coordinates
  function eventToImage(evt) {
    const rect = container.getBoundingClientRect();
    const overlayX = evt.clientX - rect.left;
    const overlayY = evt.clientY - rect.top;
    const vp = viewer.viewport.viewerElementToViewportCoordinates(
      new OpenSeadragon.Point(overlayX, overlayY)
    );
    const img = viewer.viewport.viewportToImageCoordinates(vp);
    return { overlayX, overlayY, imgX: img.x, imgY: img.y };
  }

  // Pointer events: when in polygon mode, capture clicks for drawing.
  // We add a transparent capture layer above OSD ONLY when polygon tool is active.
  const captureLayer = document.createElement("div");
  captureLayer.className = "absolute inset-0 z-10";
  captureLayer.style.cursor = "crosshair";
  document.getElementById("konva-container").parentElement.appendChild(captureLayer);

  function syncCaptureLayer() {
    const active = tool === "polygon";
    captureLayer.style.pointerEvents = active ? "auto" : "none";
    captureLayer.style.display = active ? "block" : "none";
    container.style.zIndex = active ? "11" : "auto"; // keep konva visible above
  }
  const _origSetTool = setTool;
  // After setTool runs, also sync capture layer
  window.addEventListener("keydown", syncCaptureLayer);
  toolbarButtons.forEach((b) => b.addEventListener("click", syncCaptureLayer));

  captureLayer.addEventListener("mousemove", (e) => {
    if (tool !== "polygon" || draft.imagePoints.length === 0) return;
    const { overlayX, overlayY } = eventToImage(e);
    draft.cursor = { x: overlayX, y: overlayY };
    drawAllPolygons();
  });

  captureLayer.addEventListener("click", (e) => {
    if (tool !== "polygon") return;
    const { imgX, imgY } = eventToImage(e);
    draft.imagePoints.push([imgX, imgY]);
    drawAllPolygons();
  });

  captureLayer.addEventListener("dblclick", (e) => {
    if (tool !== "polygon" || draft.imagePoints.length < 3) return;
    e.preventDefault();
    // Compute polygon area (image-coord pixels) and convert via the plan's 1/4" = 1'-0" scale.
    // Mocked scale: assume the plan is 2400 px wide and represents 200 ft, so 1 px ≈ 0.0833 ft.
    const FT_PER_PX = 200 / PLAN_W;
    const area =
      Math.abs(
        draft.imagePoints.reduce((sum, [x1, y1], i) => {
          const [x2, y2] = draft.imagePoints[(i + 1) % draft.imagePoints.length];
          return sum + (x1 * y2 - x2 * y1);
        }, 0) / 2
      ) *
      FT_PER_PX *
      FT_PER_PX;
    const label = `Room — ${Math.round(area)} SF`;
    polygons.push({
      imagePoints: draft.imagePoints,
      label,
      stroke: "#9333ea",
      fill: "rgba(147,51,234,0.18)",
      active: true,
    });
    // Deactivate the previous "active" highlight on existing polys for clarity.
    polygons.forEach((p, i) => {
      if (i !== polygons.length - 1) p.active = false;
    });
    draft.imagePoints = [];
    draft.cursor = null;
    drawAllPolygons();
  });

  // Init
  setTool("polygon");
  syncCaptureLayer();
  // Resize once initial layout settles
  requestAnimationFrame(resizeStage);

  // ---------------------------------------------------------------------------
  // SVG floor-plan source. We build a procedural blueprint so OSD has something
  // to render fully offline — no external image hosting required.
  // ---------------------------------------------------------------------------
  function buildFloorPlanSvg() {
    return [
      `<?xml version="1.0" encoding="UTF-8"?>`,
      `<svg xmlns="http://www.w3.org/2000/svg" width="2400" height="1600" viewBox="0 0 2400 1600">`,
      // Sheet background
      `<rect width="2400" height="1600" fill="#ffffff"/>`,
      // Outer envelope
      `<rect x="100" y="100" width="2200" height="1400" fill="none" stroke="#111827" stroke-width="6"/>`,
      // Interior walls
      `<g stroke="#111827" stroke-width="3" fill="none">`,
      `<line x1="800" y1="100" x2="800" y2="700"/>`,
      `<line x1="100" y1="700" x2="1600" y2="700"/>`,
      `<line x1="1600" y1="100" x2="1600" y2="900"/>`,
      `<line x1="1100" y1="900" x2="2300" y2="900"/>`,
      `<line x1="1100" y1="900" x2="1100" y2="1500"/>`,
      `<line x1="1700" y1="900" x2="1700" y2="1500"/>`,
      `<line x1="350" y1="700" x2="350" y2="1100"/>`,
      `<line x1="100" y1="1100" x2="800" y2="1100"/>`,
      `<line x1="800" y1="700" x2="800" y2="1500"/>`,
      `</g>`,
      // Door swings (light arcs)
      `<g stroke="#6b7280" stroke-width="1.5" fill="none">`,
      `<path d="M 450 700 A 60 60 0 0 0 510 760"/>`,
      `<path d="M 1100 900 A 50 50 0 0 0 1150 950"/>`,
      `<path d="M 1600 500 A 70 70 0 0 1 1670 570"/>`,
      `<path d="M 800 1300 A 55 55 0 0 0 855 1355"/>`,
      `</g>`,
      // Doors (gaps)
      `<g stroke="#ffffff" stroke-width="6">`,
      `<line x1="450" y1="700" x2="510" y2="700"/>`,
      `<line x1="1100" y1="900" x2="1150" y2="900"/>`,
      `<line x1="1600" y1="500" x2="1600" y2="560"/>`,
      `<line x1="800" y1="1300" x2="800" y2="1355"/>`,
      `</g>`,
      // Dimension lines
      `<g stroke="#9ca3af" stroke-width="1" fill="#6b7280" font-family="JetBrains Mono, monospace" font-size="22">`,
      `<line x1="100" y1="60" x2="2300" y2="60"/>`,
      `<line x1="100" y1="50" x2="100" y2="70"/>`,
      `<line x1="2300" y1="50" x2="2300" y2="70"/>`,
      `<text x="1200" y="50" text-anchor="middle">200'-0"</text>`,
      `<line x1="60" y1="100" x2="60" y2="1500"/>`,
      `<line x1="50" y1="100" x2="70" y2="100"/>`,
      `<line x1="50" y1="1500" x2="70" y2="1500"/>`,
      `<text x="35" y="800" text-anchor="middle" transform="rotate(-90 35 800)">130'-0"</text>`,
      `</g>`,
      // Room tags
      `<g font-family="Inter, system-ui" font-size="20" fill="#374151" text-anchor="middle">`,
      `<text x="450" y="400">LOBBY</text>`,
      `<text x="450" y="425" font-size="14" fill="#6b7280">A101</text>`,
      `<text x="1200" y="400">OFFICE A</text>`,
      `<text x="1950" y="400">CONF. ROOM</text>`,
      `<text x="225" y="900">CORRIDOR</text>`,
      `<text x="1200" y="800">OPEN OFFICE</text>`,
      `<text x="1900" y="1200">BREAK</text>`,
      `<text x="950" y="1200">STORAGE</text>`,
      `<text x="450" y="1300">RESTROOM</text>`,
      `</g>`,
      // Title block
      `<g>`,
      `<rect x="1900" y="1350" width="380" height="140" fill="#f3f4f6" stroke="#111827" stroke-width="2"/>`,
      `<text x="2090" y="1390" text-anchor="middle" font-family="Inter, system-ui" font-size="18" font-weight="700" fill="#111827">PROESTIMATOR AI</text>`,
      `<text x="2090" y="1415" text-anchor="middle" font-family="Inter, system-ui" font-size="12" fill="#6b7280">A-101 · First Floor Plan</text>`,
      `<text x="2090" y="1455" text-anchor="middle" font-family="JetBrains Mono, monospace" font-size="11" fill="#6b7280">Scale: 1/4" = 1'-0"   Rev: C</text>`,
      `<text x="2090" y="1475" text-anchor="middle" font-family="JetBrains Mono, monospace" font-size="11" fill="#6b7280">2026-05-15</text>`,
      `</g>`,
      `</svg>`,
    ].join("\n");
  }
})();
