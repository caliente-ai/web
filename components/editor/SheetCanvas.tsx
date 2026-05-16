"use client";

import OpenSeadragon from "openseadragon";
import Konva from "konva";
import { useEffect, useRef } from "react";
import {
  PLAN_WIDTH,
  PLAN_HEIGHT,
  PLAN_PX_PER_FOOT,
  floorPlanDataUri,
} from "@/lib/sample-floor-plan";
import {
  polygonAreaPx,
  polylineLengthPx,
  pxToFeet,
  useTakeoff,
  type TakeoffItem,
} from "@/lib/stores/takeoff";

export type SheetCanvasProps = {
  sheetKey: string;
  onStatus?: (s: { cursorImage: [number, number] | null; zoom: number }) => void;
};

export function SheetCanvas({ sheetKey, onStatus }: SheetCanvasProps) {
  const osdHostRef = useRef<HTMLDivElement | null>(null);
  const konvaHostRef = useRef<HTMLDivElement | null>(null);
  const viewerRef = useRef<OpenSeadragon.Viewer | null>(null);
  const stageRef = useRef<Konva.Stage | null>(null);
  const layerRef = useRef<Konva.Layer | null>(null);

  // Bootstrap OpenSeadragon + Konva once.
  useEffect(() => {
    const osdHost = osdHostRef.current;
    const konvaHost = konvaHostRef.current;
    if (!osdHost || !konvaHost) return;

    const viewer = OpenSeadragon({
      element: osdHost,
      prefixUrl: "https://cdn.jsdelivr.net/npm/openseadragon@5.0.0/build/openseadragon/images/",
      tileSources: { type: "image", url: floorPlanDataUri() },
      showNavigator: false,
      showZoomControl: false,
      showHomeControl: false,
      showFullPageControl: false,
      gestureSettingsMouse: { clickToZoom: false, dblClickToZoom: false },
      minZoomImageRatio: 0.4,
      maxZoomPixelRatio: 10,
      visibilityRatio: 1,
      constrainDuringPan: true,
      animationTime: 0.4,
    });
    viewerRef.current = viewer;

    const stage = new Konva.Stage({
      container: konvaHost,
      width: konvaHost.clientWidth,
      height: konvaHost.clientHeight,
    });
    const layer = new Konva.Layer({ listening: false });
    stage.add(layer);
    stageRef.current = stage;
    layerRef.current = layer;

    viewer.addHandler("open", () => {
      viewer.viewport.fitBounds(viewer.world.getItemAt(0).getBounds(), true);
      requestAnimationFrame(redraw);
    });
    viewer.addHandler("update-viewport", redraw);
    viewer.addHandler("animation", redraw);

    const resize = () => {
      if (!stageRef.current || !konvaHost) return;
      stageRef.current.size({ width: konvaHost.clientWidth, height: konvaHost.clientHeight });
      redraw();
    };
    window.addEventListener("resize", resize);

    // Cursor + zoom reporter
    const onMove = (evt: MouseEvent) => {
      if (!viewerRef.current) return;
      const rect = osdHost.getBoundingClientRect();
      const vp = viewerRef.current.viewport.viewerElementToViewportCoordinates(
        new OpenSeadragon.Point(evt.clientX - rect.left, evt.clientY - rect.top)
      );
      const img = viewerRef.current.viewport.viewportToImageCoordinates(vp);
      onStatus?.({
        cursorImage: [img.x, img.y],
        zoom: viewerRef.current.viewport.getZoom(true),
      });
    };
    const onLeave = () =>
      onStatus?.({ cursorImage: null, zoom: viewerRef.current?.viewport.getZoom(true) ?? 1 });
    osdHost.addEventListener("mousemove", onMove);
    osdHost.addEventListener("mouseleave", onLeave);

    return () => {
      window.removeEventListener("resize", resize);
      osdHost.removeEventListener("mousemove", onMove);
      osdHost.removeEventListener("mouseleave", onLeave);
      viewer.destroy();
      stage.destroy();
      viewerRef.current = null;
      stageRef.current = null;
      layerRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Subscribe to takeoff store changes → redraw
  useEffect(() => {
    const unsub = useTakeoff.subscribe(() => redraw());
    return unsub;
  }, [sheetKey]);

  // Listen to keyboard for Esc / Enter / Delete / Z (undo)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = useTakeoff.getState();
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA") return;
      if (e.key === "Escape") t.resetDraft();
      if (e.key === "Enter" && t.draftPoints.length >= 2) {
        const kind = t.tool === "polyline" ? "polyline" : t.tool === "linear" ? "linear" : "polygon";
        t.commitDraft(sheetKey, kind);
      }
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "z" && !e.shiftKey) {
        e.preventDefault();
        t.undo(sheetKey);
      }
      if ((e.metaKey || e.ctrlKey) && (e.key.toLowerCase() === "y" || (e.shiftKey && e.key.toLowerCase() === "z"))) {
        e.preventDefault();
        t.redo(sheetKey);
      }
      if ((e.key === "Delete" || e.key === "Backspace") && t.selectedItemId) {
        t.removeItem(sheetKey, t.selectedItemId);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [sheetKey]);

  function redraw() {
    const viewer = viewerRef.current;
    const stage = stageRef.current;
    const layer = layerRef.current;
    if (!viewer || !stage || !layer) return;

    layer.destroyChildren();

    const state = useTakeoff.getState();
    const sheet = state.sheets[sheetKey];
    const items = sheet?.items ?? [];
    const cls = state.classifications;
    const sel = state.selectedItemId;
    const pxPerFoot = sheet?.scalePxPerFoot ?? PLAN_PX_PER_FOOT;

    function toOverlay(p: [number, number]): [number, number] {
      const vp = viewer!.viewport.imageToViewportCoordinates(p[0], p[1]);
      const px = viewer!.viewport.viewportToViewerElementCoordinates(vp);
      return [px.x, px.y];
    }

    items.forEach((it) => {
      const klass = cls.find((c) => c.id === it.classificationId);
      if (!klass) return;
      const overlay = it.points.map(toOverlay);
      const flat = overlay.flat();
      const isSelected = sel === it.id;
      drawItem(layer, it, klass, flat, isSelected, pxPerFoot);
    });

    // Draft preview
    const draft = state.draftPoints;
    if (draft.length > 0) {
      const overlay = draft.map(toOverlay);
      const flat = overlay.flat();
      const draftLine = new Konva.Line({
        points: flat,
        stroke: "#0f172a",
        strokeWidth: 2,
        dash: [6, 4],
        closed: false,
        listening: false,
      });
      layer.add(draftLine);
      overlay.forEach(([x, y]) => {
        layer.add(
          new Konva.Rect({
            x: x - 4,
            y: y - 4,
            width: 8,
            height: 8,
            fill: "#ffffff",
            stroke: "#0f172a",
            strokeWidth: 2,
            listening: false,
          })
        );
      });
    }

    layer.batchDraw();
  }

  // Click capture overlay (for drawing tools). We layer it above OSD only when a draw tool is active.
  return (
    <div className="absolute inset-0">
      <div ref={osdHostRef} className="absolute inset-0 bg-white" />
      <div ref={konvaHostRef} className="absolute inset-0 pointer-events-none" />
      <ClickCapture sheetKey={sheetKey} viewerRef={viewerRef} />
    </div>
  );

  function drawItem(
    layer: Konva.Layer,
    item: TakeoffItem,
    klass: ReturnType<typeof getCls>,
    flat: number[],
    selected: boolean,
    pxPerFoot: number
  ) {
    const color = klass.color;
    const tint = hexToRgba(color, selected ? 0.34 : 0.18);

    if (item.kind === "polygon") {
      layer.add(
        new Konva.Line({
          points: flat,
          stroke: color,
          strokeWidth: selected ? 3 : 2,
          fill: tint,
          closed: true,
          listening: false,
        })
      );
      const areaPx = polygonAreaPx(item.points);
      const sf = pxToFeet(Math.sqrt(areaPx), pxPerFoot) * pxToFeet(Math.sqrt(areaPx), pxPerFoot);
      labelAt(layer, flat[0], flat[1], color, `${klass.name.split("—")[0].trim()} — ${Math.round(sf).toLocaleString()} ${klass.unit}`);
    } else if (item.kind === "polyline" || item.kind === "linear") {
      layer.add(
        new Konva.Line({
          points: flat,
          stroke: color,
          strokeWidth: selected ? 4 : 3,
          closed: false,
          listening: false,
        })
      );
      const lengthPx = polylineLengthPx(item.points);
      const lf = pxToFeet(lengthPx, pxPerFoot);
      labelAt(layer, flat[0], flat[1], color, `${klass.name.split("—")[0].trim()} — ${Math.round(lf)} ${klass.unit}`);
    } else if (item.kind === "count") {
      item.points.forEach(([_x, _y], idx) => {
        const [x, y] = [flat[idx * 2], flat[idx * 2 + 1]];
        layer.add(
          new Konva.Circle({
            x,
            y,
            radius: 10,
            fill: color,
            stroke: "#ffffff",
            strokeWidth: 2,
            listening: false,
          })
        );
        layer.add(
          new Konva.Text({
            x: x - 6,
            y: y - 7,
            text: String(idx + 1),
            fontSize: 11,
            fontStyle: "700",
            fill: "#ffffff",
            listening: false,
          })
        );
      });
    }

    if (selected) {
      // Vertex handles
      for (let i = 0; i < flat.length; i += 2) {
        layer.add(
          new Konva.Rect({
            x: flat[i] - 4,
            y: flat[i + 1] - 4,
            width: 8,
            height: 8,
            fill: "#ffffff",
            stroke: color,
            strokeWidth: 2,
            listening: false,
          })
        );
      }
    }
  }

  function getCls() {
    return useTakeoff.getState().classifications[0];
  }
}

function labelAt(layer: Konva.Layer, x: number, y: number, color: string, text: string) {
  const w = text.length * 6.2 + 14;
  layer.add(
    new Konva.Rect({
      x: x + 6,
      y: y - 22,
      width: w,
      height: 18,
      fill: "rgba(255,255,255,0.92)",
      stroke: color,
      strokeWidth: 1,
      cornerRadius: 3,
      listening: false,
    })
  );
  layer.add(
    new Konva.Text({
      x: x + 12,
      y: y - 18.5,
      text,
      fontFamily: "JetBrains Mono",
      fontSize: 11,
      fill: color,
      listening: false,
    })
  );
}

function hexToRgba(hex: string, alpha: number): string {
  const m = hex.replace("#", "");
  const r = parseInt(m.slice(0, 2), 16);
  const g = parseInt(m.slice(2, 4), 16);
  const b = parseInt(m.slice(4, 6), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

function ClickCapture({
  sheetKey,
  viewerRef,
}: {
  sheetKey: string;
  viewerRef: React.MutableRefObject<OpenSeadragon.Viewer | null>;
}) {
  const hostRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    function eventToImage(e: MouseEvent): [number, number] | null {
      const viewer = viewerRef.current;
      if (!viewer || !host) return null;
      const rect = host.getBoundingClientRect();
      const vp = viewer.viewport.viewerElementToViewportCoordinates(
        new OpenSeadragon.Point(e.clientX - rect.left, e.clientY - rect.top)
      );
      const img = viewer.viewport.viewportToImageCoordinates(vp);
      return [img.x, img.y];
    }

    function onClick(e: MouseEvent) {
      const state = useTakeoff.getState();
      const tool = state.tool;
      if (tool === "select") return;
      const pt = eventToImage(e);
      if (!pt) return;

      if (tool === "count") {
        // Each click adds a single count marker (commit immediately)
        const cls = state.classifications.find((c) => c.id === state.activeClassificationId);
        if (!cls) return;
        state.appendDraftPoint(pt);
        const draft = useTakeoff.getState().draftPoints;
        if (draft.length === 1) {
          // commit single-point count item
          useTakeoff.setState((s) => {
            const sheet = s.sheets[sheetKey] ?? { items: [], scalePxPerFoot: PLAN_PX_PER_FOOT, calibrated: false, history: [], future: [] };
            const item: TakeoffItem = {
              id: `it_${Math.random().toString(36).slice(2, 10)}`,
              kind: "count",
              classificationId: cls.id,
              points: [pt],
            };
            return {
              sheets: { ...s.sheets, [sheetKey]: { ...sheet, items: [...sheet.items, item], history: [...sheet.history, sheet.items].slice(-50), future: [] } },
              draftPoints: [],
              selectedItemId: item.id,
            };
          });
        }
        return;
      }

      state.appendDraftPoint(pt);
    }

    function onDblClick(e: MouseEvent) {
      e.preventDefault();
      const state = useTakeoff.getState();
      const kind = state.tool === "polyline" ? "polyline" : state.tool === "linear" ? "linear" : "polygon";
      if (kind === "polygon" && state.draftPoints.length < 3) return;
      if (kind !== "polygon" && state.draftPoints.length < 2) return;
      state.commitDraft(sheetKey, kind);
    }

    function syncPointerEvents() {
      const tool = useTakeoff.getState().tool;
      const active = tool !== "select";
      host!.style.pointerEvents = active ? "auto" : "none";
      host!.style.cursor = active ? "crosshair" : "default";
    }
    const unsub = useTakeoff.subscribe(syncPointerEvents);
    syncPointerEvents();

    host.addEventListener("click", onClick);
    host.addEventListener("dblclick", onDblClick);

    return () => {
      host.removeEventListener("click", onClick);
      host.removeEventListener("dblclick", onDblClick);
      unsub();
    };
  }, [sheetKey, viewerRef]);

  return <div ref={hostRef} className="absolute inset-0 z-10" />;
}
