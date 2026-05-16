"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

export type Tool =
  | "select"
  | "polygon"
  | "polyline"
  | "count"
  | "linear"
  | "calibrate"
  | "detect";

export type ItemKind = "polygon" | "polyline" | "count" | "linear";

export type TakeoffItem = {
  id: string;
  kind: ItemKind;
  classificationId: string;
  // Points are in IMAGE coordinates (0..planW, 0..planH)
  points: [number, number][];
  label?: string;
};

export type Classification = {
  id: string;
  name: string;
  csi: string;
  color: string;
  unit: "SF" | "LF" | "EA";
  formula?: string;
};

export type SheetState = {
  items: TakeoffItem[];
  scalePxPerFoot: number;
  calibrated: boolean;
  history: Snapshot[];
  future: Snapshot[];
};

type Snapshot = TakeoffItem[];

type State = {
  tool: Tool;
  activeClassificationId: string;
  draftPoints: [number, number][];
  classifications: Classification[];
  sheets: Record<string, SheetState>; // key: `${projectId}::${sheetId}`
  selectedItemId: string | null;
};

type Actions = {
  setTool: (tool: Tool) => void;
  setActiveClassification: (id: string) => void;
  resetDraft: () => void;
  appendDraftPoint: (pt: [number, number]) => void;
  commitDraft: (key: string, kind: ItemKind, area?: number) => TakeoffItem | null;
  removeItem: (key: string, itemId: string) => void;
  reclassify: (key: string, itemId: string, classificationId: string) => void;
  setSelected: (id: string | null) => void;
  ensureSheet: (key: string) => SheetState;
  undo: (key: string) => void;
  redo: (key: string) => void;
  setScale: (key: string, pxPerFoot: number) => void;
  addClassification: (c: Omit<Classification, "id">) => Classification;
};

const DEFAULT_CLASSIFICATIONS: Classification[] = [
  { id: "cls_wall_int", csi: "09 21 16", name: "Interior Walls — GWB", color: "#2563eb", unit: "LF" },
  { id: "cls_room_floor", csi: "09 65 00", name: "Room — Resilient Floor", color: "#16a34a", unit: "SF" },
  { id: "cls_ceiling", csi: "09 51 13", name: "Acoustical Ceiling", color: "#a855f7", unit: "SF" },
  { id: "cls_doors", csi: "08 14 00", name: "Wood Doors", color: "#dc2626", unit: "EA" },
  { id: "cls_paint", csi: "09 91 23", name: "Interior Paint", color: "#f59e0b", unit: "SF" },
  { id: "cls_concrete", csi: "03 30 00", name: "Cast-in-Place Concrete", color: "#0f172a", unit: "SF" },
];

function emptySheet(): SheetState {
  return { items: [], scalePxPerFoot: 12, calibrated: false, history: [], future: [] };
}

function snap(s: SheetState): SheetState {
  return {
    ...s,
    history: [...s.history.slice(-49), s.items.map((i) => ({ ...i, points: i.points.map((p) => [...p] as [number, number]) }))],
    future: [],
  };
}

export const useTakeoff = create<State & Actions>()(
  persist(
    (set, get) => ({
      tool: "polygon",
      activeClassificationId: DEFAULT_CLASSIFICATIONS[0].id,
      draftPoints: [],
      classifications: DEFAULT_CLASSIFICATIONS,
      sheets: {},
      selectedItemId: null,

      setTool: (tool) => set({ tool, draftPoints: [] }),
      setActiveClassification: (id) => set({ activeClassificationId: id }),
      resetDraft: () => set({ draftPoints: [] }),
      appendDraftPoint: (pt) => set((s) => ({ draftPoints: [...s.draftPoints, pt] })),

      ensureSheet: (key) => {
        const existing = get().sheets[key];
        if (existing) return existing;
        const fresh = emptySheet();
        set((s) => ({ sheets: { ...s.sheets, [key]: fresh } }));
        return fresh;
      },

      commitDraft: (key, kind) => {
        const { draftPoints, activeClassificationId, classifications } = get();
        if (draftPoints.length < (kind === "polyline" ? 2 : 3)) return null;
        const cls = classifications.find((c) => c.id === activeClassificationId)!;
        const newItem: TakeoffItem = {
          id: `it_${Math.random().toString(36).slice(2, 10)}`,
          kind,
          classificationId: cls.id,
          points: draftPoints.map((p) => [...p] as [number, number]),
        };
        set((s) => {
          const sheet = s.sheets[key] ?? emptySheet();
          const updated = snap(sheet);
          updated.items = [...updated.items, newItem];
          return {
            sheets: { ...s.sheets, [key]: updated },
            draftPoints: [],
            selectedItemId: newItem.id,
          };
        });
        return newItem;
      },

      removeItem: (key, itemId) =>
        set((s) => {
          const sheet = s.sheets[key];
          if (!sheet) return {} as never;
          const updated = snap(sheet);
          updated.items = updated.items.filter((i) => i.id !== itemId);
          return { sheets: { ...s.sheets, [key]: updated }, selectedItemId: null };
        }),

      reclassify: (key, itemId, classificationId) =>
        set((s) => {
          const sheet = s.sheets[key];
          if (!sheet) return {} as never;
          const updated = snap(sheet);
          updated.items = updated.items.map((i) =>
            i.id === itemId ? { ...i, classificationId } : i
          );
          return { sheets: { ...s.sheets, [key]: updated } };
        }),

      setSelected: (id) => set({ selectedItemId: id }),

      undo: (key) =>
        set((s) => {
          const sheet = s.sheets[key];
          if (!sheet || sheet.history.length === 0) return {} as never;
          const prev = sheet.history[sheet.history.length - 1];
          const updated: SheetState = {
            ...sheet,
            items: prev,
            history: sheet.history.slice(0, -1),
            future: [sheet.items, ...sheet.future].slice(0, 50),
          };
          return { sheets: { ...s.sheets, [key]: updated }, draftPoints: [] };
        }),

      redo: (key) =>
        set((s) => {
          const sheet = s.sheets[key];
          if (!sheet || sheet.future.length === 0) return {} as never;
          const next = sheet.future[0];
          const updated: SheetState = {
            ...sheet,
            items: next,
            history: [...sheet.history, sheet.items].slice(-50),
            future: sheet.future.slice(1),
          };
          return { sheets: { ...s.sheets, [key]: updated } };
        }),

      setScale: (key, pxPerFoot) =>
        set((s) => {
          const sheet = s.sheets[key] ?? emptySheet();
          return {
            sheets: { ...s.sheets, [key]: { ...sheet, scalePxPerFoot: pxPerFoot, calibrated: true } },
          };
        }),

      addClassification: (c) => {
        const item: Classification = { ...c, id: `cls_${Math.random().toString(36).slice(2, 8)}` };
        set((s) => ({ classifications: [...s.classifications, item], activeClassificationId: item.id }));
        return item;
      },
    }),
    {
      name: "pe.takeoff",
      partialize: (s) => ({ classifications: s.classifications, sheets: s.sheets }),
    }
  )
);

// Geometry helpers
export function polygonAreaPx(pts: [number, number][]): number {
  let sum = 0;
  for (let i = 0; i < pts.length; i++) {
    const [x1, y1] = pts[i];
    const [x2, y2] = pts[(i + 1) % pts.length];
    sum += x1 * y2 - x2 * y1;
  }
  return Math.abs(sum / 2);
}

export function polylineLengthPx(pts: [number, number][]): number {
  let sum = 0;
  for (let i = 0; i < pts.length - 1; i++) {
    const [x1, y1] = pts[i];
    const [x2, y2] = pts[i + 1];
    sum += Math.hypot(x2 - x1, y2 - y1);
  }
  return sum;
}

export function pxToFeet(px: number, pxPerFoot: number): number {
  return px / pxPerFoot;
}
