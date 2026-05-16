"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button, TextField, ToggleButton, ToggleButtonGroup, MenuItem, Menu } from "@mui/material";
import { TopBar } from "@/components/TopBar";
import { Icon } from "@/components/Icon";
import { Kbd } from "@/components/Kbd";
import { useProjects, type Project } from "@/lib/stores/projects";
import { useToast } from "@/lib/toast";
import { compact, relativeTime } from "@/lib/format";
import { cn } from "@/lib/cn";

type Tab = "active" | "processing" | "archived";

export default function DashboardPage() {
  const projects = useProjects((s) => s.projects);
  const archive = useProjects((s) => s.archive);
  const unarchive = useProjects((s) => s.unarchive);
  const { push } = useToast();
  const [search, setSearch] = useState("");
  const [tab, setTab] = useState<Tab>("active");
  const [view, setView] = useState<"grid" | "list">("grid");

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return projects.filter((p) => {
      if (tab === "archived" && p.status !== "archived") return false;
      if (tab === "processing" && p.status !== "processing") return false;
      if (tab === "active" && (p.status === "archived")) return false;
      if (q && !`${p.name} ${p.address}`.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [projects, search, tab]);

  const totals = {
    active: projects.filter((p) => p.status !== "archived").length,
    processing: projects.filter((p) => p.status === "processing").length,
    archived: projects.filter((p) => p.status === "archived").length,
  };

  return (
    <>
      <TopBar
        title="Projects"
        subtitle={`${projects.length} total · ${totals.active} active · ${totals.processing} processing`}
        actions={
          <Link href="/upload">
            <Button variant="contained" startIcon={<Icon name="add" />}>New Project</Button>
          </Link>
        }
      />

      <main className="px-margin-desktop py-8 max-w-[1600px] mx-auto">
        {/* Hero header */}
        <section className="flex items-end justify-between gap-6 flex-wrap mb-8">
          <div>
            <h2 className="font-display text-display-lg text-on-background">Active Projects</h2>
            <p className="text-body-md text-on-surface-variant mt-1">
              Real-time agentic monitoring across your construction portfolio.
            </p>
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            <TextField
              size="small"
              placeholder="Search projects…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              InputProps={{
                startAdornment: <Icon name="search" className="text-outline mr-2" />,
              }}
              sx={{ minWidth: 260 }}
            />
            <ToggleButtonGroup
              value={tab}
              exclusive
              size="small"
              onChange={(_e, v) => v && setTab(v as Tab)}
            >
              <ToggleButton value="active" sx={{ textTransform: "none", px: 2 }}>
                Active · {totals.active}
              </ToggleButton>
              <ToggleButton value="processing" sx={{ textTransform: "none", px: 2 }}>
                Processing · {totals.processing}
              </ToggleButton>
              <ToggleButton value="archived" sx={{ textTransform: "none", px: 2 }}>
                Archived · {totals.archived}
              </ToggleButton>
            </ToggleButtonGroup>
            <div className="flex bg-surface-container-low p-1 rounded-lg">
              <button
                onClick={() => setView("grid")}
                className={cn(
                  "p-2 rounded-md transition-colors",
                  view === "grid" ? "bg-canvas-white shadow-sm text-primary" : "text-outline"
                )}
                title="Grid"
              >
                <Icon name="grid_view" className="text-[18px]" />
              </button>
              <button
                onClick={() => setView("list")}
                className={cn(
                  "p-2 rounded-md transition-colors",
                  view === "list" ? "bg-canvas-white shadow-sm text-primary" : "text-outline"
                )}
                title="List"
              >
                <Icon name="list" className="text-[18px]" />
              </button>
            </div>
          </div>
        </section>

        {filtered.length === 0 ? (
          <EmptyState onCreate={() => push("info", "Open /upload to create a project")} />
        ) : view === "grid" ? (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-gutter">
            {filtered.map((p) => (
              <ProjectCard key={p.id} project={p} onArchive={(id) => { archive(id); push("info", "Project archived"); }} onUnarchive={(id) => { unarchive(id); push("success", "Project restored"); }} />
            ))}
          </div>
        ) : (
          <ProjectList projects={filtered} onArchive={archive} onUnarchive={unarchive} />
        )}

        <p className="text-label-sm text-outline mt-8 flex items-center gap-2">
          <Icon name="info" className="text-[14px]" /> Tip: <Kbd>⌘</Kbd>+<Kbd>K</Kbd> jumps between screens.
        </p>
      </main>
    </>
  );
}

function ProjectCard({ project, onArchive, onUnarchive }: { project: Project; onArchive: (id: string) => void; onUnarchive: (id: string) => void }) {
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  const router = useRouter();
  const firstSheet = project.sheets[0];

  return (
    <div className="group bg-canvas-white border border-border-subtle rounded-xl overflow-hidden hover:border-primary/30 hover:shadow-md transition-all flex flex-col">
      <button
        type="button"
        onClick={() => router.push(`/projects/${project.id}`)}
        className="text-left"
      >
        <div className="relative h-44 bg-gradient-to-br from-surface-container-low to-surface-container overflow-hidden">
          <div className="absolute inset-0 cad-grid opacity-40" />
          <div className="absolute inset-0 flex items-center justify-center">
            <Icon name="architecture" className="text-[64px] text-outline-variant opacity-70 group-hover:scale-110 transition-transform" filled />
          </div>
          <div className="absolute top-3 left-3 flex gap-2">
            {project.scannedByAi && (
              <span className="bg-success-green/10 text-success-green border border-success-green/20 px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider backdrop-blur-md">
                AI Scanned
              </span>
            )}
            {project.status === "processing" && (
              <span className="bg-primary/10 text-primary border border-primary/20 px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider backdrop-blur-md flex items-center gap-1">
                <Icon name="auto_awesome" className="text-[12px]" /> Processing
              </span>
            )}
            {project.status === "archived" && (
              <span className="bg-outline/20 text-on-surface-variant px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider backdrop-blur-md">
                Archived
              </span>
            )}
          </div>
        </div>
      </button>

      <div className="p-5 flex-1 flex flex-col">
        <div className="flex justify-between items-start mb-2 gap-2">
          <Link href={`/projects/${project.id}`} className="font-display text-headline-md font-bold text-on-background hover:text-primary transition-colors line-clamp-1">
            {project.name}
          </Link>
          <button
            type="button"
            onClick={(e) => setAnchor(e.currentTarget)}
            className="text-outline hover:text-on-background"
          >
            <Icon name="more_vert" />
          </button>
          <Menu anchorEl={anchor} open={!!anchor} onClose={() => setAnchor(null)}>
            <MenuItem onClick={() => { router.push(`/projects/${project.id}`); setAnchor(null); }}>
              <Icon name="open_in_new" className="mr-2 text-[18px]" /> Open project
            </MenuItem>
            <MenuItem onClick={() => { if (firstSheet) router.push(`/projects/${project.id}/editor?sheet=${firstSheet.id}`); setAnchor(null); }}>
              <Icon name="architecture" className="mr-2 text-[18px]" /> Open editor
            </MenuItem>
            {project.status === "archived" ? (
              <MenuItem onClick={() => { onUnarchive(project.id); setAnchor(null); }}>
                <Icon name="unarchive" className="mr-2 text-[18px]" /> Restore
              </MenuItem>
            ) : (
              <MenuItem onClick={() => { onArchive(project.id); setAnchor(null); }}>
                <Icon name="archive" className="mr-2 text-[18px]" /> Archive
              </MenuItem>
            )}
          </Menu>
        </div>
        <p className="text-label-sm text-on-surface-variant flex items-center gap-1 mb-4">
          <Icon name="location_on" className="text-[14px]" />
          {project.address}
        </p>
        <div className="mt-auto">
          <div className="flex flex-wrap gap-2 mb-4">
            <Chip icon="description" tone="primary" text={`${project.sheets.length} Sheets`} />
            <Chip icon="square_foot" tone="tertiary" text={`${compact(project.itemsCount)} Items`} />
            <Chip
              icon={project.status === "processing" ? "hourglass_top" : "check_circle"}
              tone={project.status === "processing" ? "warning" : "success"}
              text={`Rev ${project.revision}`}
            />
          </div>
          <div className="flex items-center justify-between pt-4 border-t border-border-subtle">
            <span className="text-label-sm text-outline">Edited {relativeTime(project.editedAt)}</span>
            <div className="flex -space-x-2">
              {project.members.map((m, i) => (
                <div
                  key={i}
                  className="w-7 h-7 rounded-full border-2 border-canvas-white text-[10px] font-bold flex items-center justify-center"
                  style={{ background: m.color }}
                >
                  {m.initials}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Chip({ icon, text, tone }: { icon: string; text: string; tone: "primary" | "tertiary" | "warning" | "success" }) {
  const toneClass = {
    primary: "text-primary",
    tertiary: "text-tertiary",
    warning: "text-warning-amber",
    success: "text-success-green",
  }[tone];
  return (
    <div className="bg-surface-container-low px-2 py-1 rounded-lg flex items-center gap-1.5 border border-border-subtle">
      <Icon name={icon} className={cn("text-[14px]", toneClass)} />
      <span className="font-mono text-data-sm">{text}</span>
    </div>
  );
}

function ProjectList({ projects, onArchive, onUnarchive }: { projects: Project[]; onArchive: (id: string) => void; onUnarchive: (id: string) => void }) {
  const router = useRouter();
  return (
    <div className="bg-canvas-white border border-border-subtle rounded-xl overflow-hidden">
      <table className="w-full">
        <thead className="bg-surface-container-low">
          <tr className="text-label-caps uppercase text-outline tracking-wider">
            <th className="text-left py-3 px-4">Project</th>
            <th className="text-left py-3 px-4">Address</th>
            <th className="text-left py-3 px-4">Sheets</th>
            <th className="text-left py-3 px-4">Items</th>
            <th className="text-left py-3 px-4">Rev</th>
            <th className="text-left py-3 px-4">Edited</th>
            <th className="text-right py-3 px-4"></th>
          </tr>
        </thead>
        <tbody>
          {projects.map((p) => (
            <tr key={p.id} className="border-t border-border-subtle hover:bg-surface-container-low cursor-pointer" onClick={() => router.push(`/projects/${p.id}`)}>
              <td className="py-3 px-4 font-headline-sm font-semibold">{p.name}</td>
              <td className="py-3 px-4 text-on-surface-variant text-label-sm">{p.address}</td>
              <td className="py-3 px-4 font-mono text-data-sm">{p.sheets.length}</td>
              <td className="py-3 px-4 font-mono text-data-sm">{compact(p.itemsCount)}</td>
              <td className="py-3 px-4 font-mono text-data-sm">{p.revision}</td>
              <td className="py-3 px-4 text-label-sm text-outline">{relativeTime(p.editedAt)}</td>
              <td className="py-3 px-4 text-right" onClick={(e) => e.stopPropagation()}>
                {p.status === "archived" ? (
                  <button onClick={() => onUnarchive(p.id)} className="text-primary text-label-sm font-semibold hover:underline">Restore</button>
                ) : (
                  <button onClick={() => onArchive(p.id)} className="text-outline hover:text-error-red text-label-sm font-semibold">Archive</button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function EmptyState({ onCreate }: { onCreate: () => void }) {
  return (
    <div className="bg-canvas-white border border-dashed border-border-subtle rounded-2xl p-16 text-center">
      <Icon name="folder_open" className="text-[64px] text-outline-variant" />
      <h3 className="font-display text-headline-lg mt-4">No projects yet</h3>
      <p className="text-body-md text-on-surface-variant mt-1 mb-6">Upload a PDF to bootstrap your first takeoff.</p>
      <Link href="/upload">
        <Button variant="contained" size="large" startIcon={<Icon name="add" />} onClick={onCreate}>
          Create your first project
        </Button>
      </Link>
    </div>
  );
}
