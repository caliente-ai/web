"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

export type ProjectStatus = "active" | "processing" | "archived";
export type SheetStatus = "queued" | "ingesting" | "ready" | "failed";

export type Sheet = {
  id: string;
  number: string;
  title: string;
  discipline: "A" | "S" | "M" | "E" | "P";
  status: SheetStatus;
};

export type Project = {
  id: string;
  name: string;
  address: string;
  status: ProjectStatus;
  thumbnail?: string;
  sheets: Sheet[];
  itemsCount: number;
  revision: string;
  editedAt: string; // ISO
  members: { initials: string; color: string }[];
  scannedByAi: boolean;
};

type ProjectState = {
  projects: Project[];
  hydrated: boolean;
  hydrate: () => void;
  create: (p: Omit<Project, "id" | "editedAt">) => Project;
  archive: (id: string) => void;
  unarchive: (id: string) => void;
  rename: (id: string, name: string) => void;
  setProcessing: (id: string, processing: boolean) => void;
  addSheets: (id: string, sheets: Sheet[]) => void;
};

function makeSeed(): Project[] {
  const now = new Date();
  const isoMinus = (m: number) => new Date(now.getTime() - m * 60_000).toISOString();
  return [
    {
      id: "prj_skyline",
      name: "Skyline Residences Ph. II",
      address: "442 West 14th St, New York, NY",
      status: "active",
      sheets: sheetSet("Skyline", 42),
      itemsCount: 1240,
      revision: "v3",
      editedAt: isoMinus(120),
      members: [
        { initials: "MK", color: "#dbeafe" },
        { initials: "RL", color: "#ede9fe" },
      ],
      scannedByAi: true,
    },
    {
      id: "prj_centralhub",
      name: "Central Hub Hospital",
      address: "88 Medical Center Way, Austin, TX",
      status: "processing",
      sheets: sheetSet("CentralHub", 156),
      itemsCount: 8400,
      revision: "v1",
      editedAt: isoMinus(24 * 60),
      members: [{ initials: "AS", color: "#dcfce7" }],
      scannedByAi: false,
    },
    {
      id: "prj_riverside",
      name: "Riverside Mixed-Use Tower",
      address: "12 Riverbend Dr, Portland, OR",
      status: "active",
      sheets: sheetSet("Riverside", 88),
      itemsCount: 3210,
      revision: "v2",
      editedAt: isoMinus(48 * 60),
      members: [
        { initials: "JD", color: "#fef3c7" },
        { initials: "EM", color: "#fee2e2" },
        { initials: "TL", color: "#e0f2fe" },
      ],
      scannedByAi: true,
    },
  ];
}

function sheetSet(prefix: string, count: number): Sheet[] {
  const disciplines: Sheet["discipline"][] = ["A", "S", "M", "E", "P"];
  return Array.from({ length: Math.min(count, 12) }).map((_, i) => {
    const d = disciplines[i % disciplines.length];
    return {
      id: `sh_${prefix.toLowerCase()}_${d}${100 + i}`,
      number: `${d}-${100 + i}`,
      title: titleFor(d, i),
      discipline: d,
      status: i === 0 ? "ready" : i < 4 ? "ready" : "queued",
    };
  });
}

function titleFor(d: Sheet["discipline"], i: number): string {
  const map: Record<Sheet["discipline"], string[]> = {
    A: ["First Floor", "Second Floor", "Roof Plan", "Reflected Ceiling", "Door Schedule"],
    S: ["Foundation", "Framing Plan", "Detail Sheet"],
    M: ["HVAC Layout", "Ductwork"],
    E: ["Power Plan", "Lighting"],
    P: ["Plumbing Plan", "Riser Diagram"],
  };
  return map[d][i % map[d].length];
}

export const useProjects = create<ProjectState>()(
  persist(
    (set, get) => ({
      projects: [],
      hydrated: false,
      hydrate: () => {
        if (get().projects.length === 0) {
          set({ projects: makeSeed(), hydrated: true });
        } else {
          set({ hydrated: true });
        }
      },
      create: (p) => {
        const id = `prj_${Math.random().toString(36).slice(2, 10)}`;
        const project: Project = { ...p, id, editedAt: new Date().toISOString() };
        set((s) => ({ projects: [project, ...s.projects] }));
        return project;
      },
      archive: (id) =>
        set((s) => ({ projects: s.projects.map((p) => (p.id === id ? { ...p, status: "archived" } : p)) })),
      unarchive: (id) =>
        set((s) => ({ projects: s.projects.map((p) => (p.id === id ? { ...p, status: "active" } : p)) })),
      rename: (id, name) =>
        set((s) => ({ projects: s.projects.map((p) => (p.id === id ? { ...p, name, editedAt: new Date().toISOString() } : p)) })),
      setProcessing: (id, processing) =>
        set((s) => ({
          projects: s.projects.map((p) =>
            p.id === id ? { ...p, status: processing ? "processing" : "active", editedAt: new Date().toISOString() } : p
          ),
        })),
      addSheets: (id, sheets) =>
        set((s) => ({
          projects: s.projects.map((p) => (p.id === id ? { ...p, sheets: [...p.sheets, ...sheets] } : p)),
        })),
    }),
    { name: "pe.projects" }
  )
);
