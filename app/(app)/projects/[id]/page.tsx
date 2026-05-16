"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import dynamic from "next/dynamic";
import Link from "next/link";
import { Button, IconButton, Tooltip, Menu, MenuItem, ToggleButtonGroup, ToggleButton, Divider, LinearProgress } from "@mui/material";
import { Icon } from "@/components/Icon";
import { Kbd } from "@/components/Kbd";
import { useProjects, type Sheet } from "@/lib/stores/projects";
import {
  useTakeoff,
  type Tool,
  polygonAreaPx,
  polylineLengthPx,
  pxToFeet,
} from "@/lib/stores/takeoff";
import { useToast } from "@/lib/toast";
import { cn } from "@/lib/cn";
import { PLAN_PX_PER_FOOT } from "@/lib/sample-floor-plan";

const SheetCanvas = dynamic(() => import("@/components/editor/SheetCanvas").then((m) => m.SheetCanvas), {
  ssr: false,
  loading: () => (
    <div className="absolute inset-0 flex items-center justify-center text-on-surface-variant">
      <div className="flex items-center gap-2">
        <Icon name="hourglass_top" className="animate-pulse-subtle" />
        <span className="font-mono text-body-sm">loading viewport…</span>
      </div>
    </div>
  ),
});

const TOOLS: { id: Tool; icon: string; label: string; shortcut: string }[] = [
  { id: "select", icon: "near_me", label: "Select", shortcut: "V" },
  { id: "polygon", icon: "pentagon", label: "Polygon (area)", shortcut: "P" },
  { id: "polyline", icon: "polyline", label: "Polyline (length)", shortcut: "Y" },
  { id: "linear", icon: "straighten", label: "Linear", shortcut: "L" },
  { id: "count", icon: "radio_button_checked", label: "Count", shortcut: "C" },
  { id: "calibrate", icon: "square_foot", label: "Calibrate scale", shortcut: "K" },
  { id: "detect", icon: "auto_fix", label: "AI Detect", shortcut: "D" },
];

export default function ProjectEditorPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const params = useSearchParams();
  const { push } = useToast();

  const project = useProjects((s) => s.projects.find((p) => p.id === id));
  const tool = useTakeoff((s) => s.tool);
  const setTool = useTakeoff((s) => s.setTool);
  const ensureSheet = useTakeoff((s) => s.ensureSheet);
  const undo = useTakeoff((s) => s.undo);
  const redo = useTakeoff((s) => s.redo);
  const items = useTakeoff((s) => s.sheets[`${id}::${params.get("sheet") ?? project?.sheets[0]?.id}`]?.items ?? []);
  const draftLen = useTakeoff((s) => s.draftPoints.length);

  const [tab, setTab] = useState<"classifications" | "properties" | "assistant" | "audit">("classifications");
  const [status, setStatus] = useState<{ cursorImage: [number, number] | null; zoom: number }>({ cursorImage: null, zoom: 1 });

  const sheetId = params.get("sheet") ?? project?.sheets[0]?.id;
  const sheetKey = sheetId ? `${id}::${sheetId}` : null;
  const currentSheet = project?.sheets.find((s) => s.id === sheetId);

  // Ensure store entry for the selected sheet exists
  useEffect(() => {
    if (sheetKey) ensureSheet(sheetKey);
  }, [sheetKey, ensureSheet]);

  // Keyboard shortcuts for tools
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA") return;
      const t = TOOLS.find((t) => t.shortcut.toLowerCase() === e.key.toLowerCase());
      if (t) setTool(t.id);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [setTool]);

  if (!project) {
    return (
      <div className="h-screen flex items-center justify-center">
        <div className="text-center">
          <Icon name="folder_off" className="text-[64px] text-outline-variant" />
          <h2 className="font-display text-headline-lg mt-4">Project not found</h2>
          <Link href="/dashboard">
            <Button variant="contained" sx={{ mt: 2 }}>Back to projects</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-background overflow-hidden">
      {/* Editor top bar */}
      <header className="h-14 bg-canvas-white border-b border-border-subtle flex items-center px-4 gap-4">
        <Link href="/dashboard" className="text-on-surface-variant hover:text-primary flex items-center gap-2">
          <Icon name="arrow_back" className="text-[20px]" />
          <span className="text-label-sm font-semibold">Projects</span>
        </Link>
        <div className="w-px h-6 bg-border-subtle" />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h1 className="font-display text-headline-md font-bold truncate">{project.name}</h1>
            <span className="font-mono text-[10px] text-outline bg-surface-container-low px-2 py-0.5 rounded">
              Rev {project.revision}
            </span>
          </div>
          <p className="text-label-sm text-on-surface-variant truncate">
            {currentSheet ? `${currentSheet.number} · ${currentSheet.title}` : "Select a sheet"}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Tooltip title="Undo (⌘Z)">
            <IconButton size="small" onClick={() => sheetKey && undo(sheetKey)}>
              <Icon name="undo" className="text-[18px]" />
            </IconButton>
          </Tooltip>
          <Tooltip title="Redo (⌘Y)">
            <IconButton size="small" onClick={() => sheetKey && redo(sheetKey)}>
              <Icon name="redo" className="text-[18px]" />
            </IconButton>
          </Tooltip>
          <Button
            variant="outlined"
            size="small"
            startIcon={<Icon name="share" className="text-[16px]" />}
            onClick={() => push("info", "Share link copied (mock)")}
          >
            Share
          </Button>
          <Button
            variant="contained"
            size="small"
            startIcon={<Icon name="file_download" className="text-[16px]" />}
            onClick={() => push("success", "Export queued — you'll get an email when ready")}
          >
            Export
          </Button>
        </div>
      </header>

      {/* Three-column layout */}
      <div className="flex-1 flex min-h-0">
        {/* Left rail: sheet navigator */}
        <aside className="w-60 bg-canvas-white border-r border-border-subtle flex flex-col">
          <div className="p-3 border-b border-border-subtle">
            <p className="text-label-caps uppercase tracking-widest text-outline mb-2">Drawing Set</p>
            <div className="text-headline-sm font-semibold">Issue Rev {project.revision}</div>
            <div className="text-label-sm text-on-surface-variant font-mono">{project.sheets.length} sheets</div>
          </div>
          <div className="flex-1 overflow-y-auto p-2 space-y-1">
            {groupByDiscipline(project.sheets).map(([disc, sheets]) => (
              <details key={disc} open className="group">
                <summary className="flex items-center justify-between cursor-pointer px-2 py-1.5 hover:bg-surface-container-low rounded">
                  <span className="text-label-sm font-bold uppercase tracking-wider">{disciplineName(disc as Sheet["discipline"])}</span>
                  <Icon name="expand_more" className="text-[16px] group-open:rotate-180 transition-transform" />
                </summary>
                <div className="mt-1 ml-1 border-l border-border-subtle">
                  {sheets.map((s) => (
                    <button
                      key={s.id}
                      onClick={() => router.push(`/projects/${id}?sheet=${s.id}`)}
                      className={cn(
                        "w-full text-left px-3 py-1.5 text-label-sm flex items-center gap-2 transition-colors",
                        s.id === sheetId
                          ? "bg-primary/5 border-l-2 border-primary text-primary -ml-px font-semibold"
                          : "hover:bg-surface-container-low border-l border-transparent"
                      )}
                    >
                      <span
                        className={cn(
                          "w-1.5 h-1.5 rounded-full",
                          s.status === "ready" && "bg-success-green",
                          s.status === "ingesting" && "bg-primary animate-pulse-subtle",
                          s.status === "queued" && "bg-outline-variant",
                          s.status === "failed" && "bg-error-red"
                        )}
                      />
                      <span className="font-mono text-data-sm">{s.number}</span>
                      <span className="flex-1 truncate text-on-surface-variant">{s.title}</span>
                    </button>
                  ))}
                </div>
              </details>
            ))}
          </div>
        </aside>

        {/* Center canvas */}
        <section className="flex-1 relative bg-surface-container cad-grid overflow-hidden">
          {sheetKey && <SheetCanvas sheetKey={sheetKey} onStatus={setStatus} />}

          {/* Floating toolbar */}
          <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-sidebar-navy text-canvas-white px-1.5 py-1.5 rounded-xl flex items-center gap-0.5 z-20 shadow-2xl border border-white/10">
            {TOOLS.map((t, i) => (
              <Tooltip key={t.id} title={`${t.label} · ${t.shortcut}`}>
                <button
                  onClick={() => setTool(t.id)}
                  className={cn(
                    "w-9 h-9 rounded-lg flex items-center justify-center relative transition-colors",
                    tool === t.id ? "bg-primary text-canvas-white shadow-ai-glow" : "hover:bg-white/10"
                  )}
                >
                  <Icon name={t.icon} className="text-[20px]" filled={tool === t.id} />
                  <span className="absolute bottom-0 right-0.5 text-[8px] font-mono text-secondary-fixed-dim">{t.shortcut}</span>
                </button>
              </Tooltip>
            ))}
            <div className="w-px h-6 bg-white/10 mx-1" />
            <Tooltip title="AI Detect rooms on this sheet">
              <button
                onClick={() => router.push(`/detect?project=${id}&sheet=${sheetId}`)}
                className="w-9 h-9 rounded-lg flex items-center justify-center hover:bg-primary/20 text-primary transition-colors"
              >
                <Icon name="psychology" className="text-[20px]" filled />
              </button>
            </Tooltip>
          </div>

          {/* Hint */}
          {tool !== "select" && (
            <div className="absolute top-20 left-1/2 -translate-x-1/2 bg-sidebar-navy/90 text-canvas-white px-3 py-1.5 rounded-lg z-20 font-mono text-data-sm">
              {tool === "polygon" && (
                <>Click to add vertices. <span className="text-secondary-fixed-dim">Enter</span> or double-click to close.</>
              )}
              {tool === "polyline" && <>Click to add points. <span className="text-secondary-fixed-dim">Enter</span> to finish.</>}
              {tool === "linear" && <>Click two points to measure a length.</>}
              {tool === "count" && <>Each click drops a count marker.</>}
              {tool === "calibrate" && <>Click two endpoints of a known dimension to set the scale.</>}
              {tool === "detect" && <>Press the AI button to send this sheet to the segmentation worker.</>}
            </div>
          )}

          {/* Bottom status bar */}
          <div className="absolute bottom-0 left-0 right-0 h-9 bg-canvas-white/90 backdrop-blur-glass border-t border-border-subtle flex items-center px-4 gap-6 z-20 text-label-sm">
            <StatusItem icon="square_foot">Scale: 1/4&quot; = 1&apos;-0&quot;</StatusItem>
            <StatusItem icon="my_location">
              {status.cursorImage
                ? `${pxToFeet(status.cursorImage[0], PLAN_PX_PER_FOOT).toFixed(1)}', ${pxToFeet(status.cursorImage[1], PLAN_PX_PER_FOOT).toFixed(1)}'`
                : "—"}
            </StatusItem>
            <StatusItem icon="zoom_in">{Math.round(status.zoom * 100)}%</StatusItem>
            <div className="flex-1" />
            <span className="text-outline">
              {items.length} item{items.length === 1 ? "" : "s"} · {draftLen} draft pt{draftLen === 1 ? "" : "s"}
            </span>
            <span className="font-mono text-[10px] text-outline flex items-center gap-1">
              <Kbd>Esc</Kbd> cancel · <Kbd>⌘Z</Kbd> undo
            </span>
          </div>
        </section>

        {/* Right inspector */}
        <RightInspector sheetKey={sheetKey} tab={tab} setTab={setTab} />
      </div>
    </div>
  );
}

function StatusItem({ icon, children }: { icon: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2">
      <Icon name={icon} className="text-[16px] text-outline" />
      <span className="font-mono text-data-sm">{children}</span>
    </div>
  );
}

function groupByDiscipline(sheets: Sheet[]) {
  const map = new Map<Sheet["discipline"], Sheet[]>();
  sheets.forEach((s) => {
    const arr = map.get(s.discipline) ?? [];
    arr.push(s);
    map.set(s.discipline, arr);
  });
  return Array.from(map.entries());
}

function disciplineName(d: Sheet["discipline"]) {
  return ({ A: "Architectural", S: "Structural", M: "Mechanical", E: "Electrical", P: "Plumbing" } as const)[d];
}

function RightInspector({
  sheetKey,
  tab,
  setTab,
}: {
  sheetKey: string | null;
  tab: "classifications" | "properties" | "assistant" | "audit";
  setTab: (t: "classifications" | "properties" | "assistant" | "audit") => void;
}) {
  const classifications = useTakeoff((s) => s.classifications);
  const activeId = useTakeoff((s) => s.activeClassificationId);
  const setActive = useTakeoff((s) => s.setActiveClassification);
  const items = useTakeoff((s) => (sheetKey ? s.sheets[sheetKey]?.items ?? [] : []));
  const selectedId = useTakeoff((s) => s.selectedItemId);
  const setSelected = useTakeoff((s) => s.setSelected);
  const remove = useTakeoff((s) => s.removeItem);
  const sheet = useTakeoff((s) => (sheetKey ? s.sheets[sheetKey] : null));
  const { push } = useToast();

  // Quantity totals by classification
  const totalsByCls = useMemo(() => {
    const out = new Map<string, number>();
    const px = sheet?.scalePxPerFoot ?? PLAN_PX_PER_FOOT;
    items.forEach((it) => {
      let q = 0;
      if (it.kind === "polygon") {
        const areaPx = polygonAreaPx(it.points);
        const sf = (Math.sqrt(areaPx) / px) ** 2;
        q = sf;
      } else if (it.kind === "polyline" || it.kind === "linear") {
        q = polylineLengthPx(it.points) / px;
      } else if (it.kind === "count") {
        q = it.points.length;
      }
      out.set(it.classificationId, (out.get(it.classificationId) ?? 0) + q);
    });
    return out;
  }, [items, sheet]);

  const totalArea = Array.from(totalsByCls.entries()).reduce((sum, [cid, q]) => {
    const c = classifications.find((c) => c.id === cid);
    return c?.unit === "SF" ? sum + q : sum;
  }, 0);

  return (
    <aside className="w-80 bg-canvas-white border-l border-border-subtle flex flex-col">
      {/* Tabs */}
      <div className="flex border-b border-border-subtle bg-surface-container-low">
        {(["classifications", "properties", "assistant", "audit"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={cn(
              "flex-1 py-2.5 text-label-sm font-semibold capitalize transition-colors",
              tab === t
                ? "bg-canvas-white text-primary border-b-2 border-primary -mb-px"
                : "text-on-surface-variant hover:text-on-background"
            )}
          >
            {t}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto p-3">
        {tab === "classifications" && (
          <>
            <div className="mb-3">
              <p className="text-label-caps uppercase tracking-widest text-outline mb-2">Active</p>
              <div className="grid grid-cols-1 gap-1.5">
                {classifications.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => setActive(c.id)}
                    className={cn(
                      "flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-left transition-colors",
                      activeId === c.id
                        ? "bg-primary/5 border border-primary/30"
                        : "hover:bg-surface-container-low border border-transparent"
                    )}
                  >
                    <span className="w-3 h-3 rounded-sm" style={{ background: c.color }} />
                    <div className="flex-1 min-w-0">
                      <div className="text-label-sm font-semibold truncate">{c.name}</div>
                      <div className="font-mono text-[10px] text-outline">CSI {c.csi}</div>
                    </div>
                    <span className="font-mono text-data-sm text-on-surface-variant">
                      {((totalsByCls.get(c.id) ?? 0).toLocaleString(undefined, { maximumFractionDigits: 0 }))} {c.unit}
                    </span>
                  </button>
                ))}
              </div>
              <button
                onClick={() => push("info", "Create classification dialog — wire later")}
                className="mt-2 w-full py-2 text-label-sm text-primary border border-dashed border-primary/40 rounded-lg hover:bg-primary/5 transition-colors"
              >
                + New classification
              </button>
            </div>
            <Divider sx={{ my: 2 }} />
            <p className="text-label-caps uppercase tracking-widest text-outline mb-2">Items on this sheet</p>
            <div className="space-y-1">
              {items.length === 0 && (
                <div className="text-label-sm text-on-surface-variant text-center py-6 border border-dashed border-border-subtle rounded-lg">
                  Pick a tool and start drawing.
                </div>
              )}
              {items.map((it) => {
                const c = classifications.find((c) => c.id === it.classificationId);
                if (!c) return null;
                const isSel = selectedId === it.id;
                return (
                  <div
                    key={it.id}
                    onClick={() => setSelected(it.id)}
                    className={cn(
                      "flex items-center gap-2 px-2.5 py-1.5 rounded-md cursor-pointer transition-colors",
                      isSel ? "bg-primary/10 ring-1 ring-primary/30" : "hover:bg-surface-container-low"
                    )}
                  >
                    <span className="w-2.5 h-2.5 rounded-sm" style={{ background: c.color }} />
                    <span className="flex-1 text-label-sm truncate">{c.name}</span>
                    <span className="font-mono text-[10px] text-outline">{it.kind}</span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        if (sheetKey) remove(sheetKey, it.id);
                      }}
                      className="text-outline hover:text-error-red"
                    >
                      <Icon name="delete" className="text-[16px]" />
                    </button>
                  </div>
                );
              })}
            </div>
          </>
        )}

        {tab === "properties" && (
          <PropertiesPanel sheetKey={sheetKey} />
        )}
        {tab === "assistant" && (
          <AssistantStub />
        )}
        {tab === "audit" && (
          <AuditStub items={items} />
        )}
      </div>

      <footer className="p-3 border-t border-border-subtle bg-surface-container-low">
        <div className="flex justify-between text-label-caps uppercase text-outline mb-2">
          <span>Total Measured Area</span>
          <span className="font-mono text-data-md text-on-background">
            {Math.round(totalArea).toLocaleString()} SF
          </span>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <Button variant="outlined" size="small" onClick={() => push("info", "Bulk assign coming next")}>
            Bulk Assign
          </Button>
          <Button
            variant="contained"
            size="small"
            startIcon={<Icon name="psychology" className="text-[16px]" />}
            onClick={() => push("success", "AI analysis queued")}
          >
            Run AI
          </Button>
        </div>
      </footer>
    </aside>
  );
}

function PropertiesPanel({ sheetKey }: { sheetKey: string | null }) {
  const items = useTakeoff((s) => (sheetKey ? s.sheets[sheetKey]?.items ?? [] : []));
  const selectedId = useTakeoff((s) => s.selectedItemId);
  const selected = items.find((i) => i.id === selectedId);
  const cls = useTakeoff((s) => s.classifications.find((c) => c.id === selected?.classificationId));
  const reclassify = useTakeoff((s) => s.reclassify);
  const classifications = useTakeoff((s) => s.classifications);

  if (!selected || !cls) {
    return (
      <div className="text-center py-10 text-on-surface-variant text-body-sm">
        Select an item to inspect its properties.
      </div>
    );
  }
  return (
    <div className="space-y-3">
      <div>
        <p className="text-label-caps uppercase text-outline mb-1">ID</p>
        <p className="font-mono text-data-sm">{selected.id}</p>
      </div>
      <div>
        <p className="text-label-caps uppercase text-outline mb-1">Kind</p>
        <p className="capitalize text-label-sm">{selected.kind}</p>
      </div>
      <div>
        <p className="text-label-caps uppercase text-outline mb-1">Classification</p>
        <select
          value={cls.id}
          onChange={(e) => sheetKey && reclassify(sheetKey, selected.id, e.target.value)}
          className="w-full bg-surface-container-low border border-border-subtle rounded-md py-1.5 px-2 text-label-sm"
        >
          {classifications.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
      </div>
      <div>
        <p className="text-label-caps uppercase text-outline mb-1">Vertices</p>
        <p className="font-mono text-data-sm">{selected.points.length}</p>
      </div>
    </div>
  );
}

function AssistantStub() {
  return (
    <div className="space-y-3">
      <p className="text-label-sm text-on-surface-variant">
        Long-context chat panel is on the dedicated <Link href="/assistant" className="text-primary underline">Project Assistant</Link> page.
      </p>
      <div className="bg-primary/5 border border-primary/20 rounded-lg p-3">
        <p className="text-label-sm font-semibold flex items-center gap-1.5">
          <Icon name="auto_awesome" className="text-primary text-[16px]" filled /> Suggested
        </p>
        <ul className="mt-2 space-y-1 text-label-sm">
          <li className="text-on-surface-variant">"Total drywall in corridor C3"</li>
          <li className="text-on-surface-variant">"Summarize painting scope"</li>
        </ul>
      </div>
    </div>
  );
}

function AuditStub({ items }: { items: { id: string; kind: string }[] }) {
  if (items.length === 0) {
    return <p className="text-label-sm text-on-surface-variant text-center py-6">No actions yet on this sheet.</p>;
  }
  return (
    <ul className="space-y-2">
      {items.slice(-8).reverse().map((it) => (
        <li key={it.id} className="flex items-start gap-2">
          <Icon name="check_circle" className="text-success-green text-[16px] mt-0.5" filled />
          <div>
            <div className="text-label-sm">
              Created <span className="capitalize">{it.kind}</span> <span className="font-mono text-[10px] text-outline">{it.id.slice(0, 10)}…</span>
            </div>
            <div className="text-[10px] text-outline">just now</div>
          </div>
        </li>
      ))}
    </ul>
  );
}
