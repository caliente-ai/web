"use client";

import { useMemo, useState } from "react";
import { MenuItem, Select, TextField } from "@mui/material";
import { TopBar } from "@/components/TopBar";
import { Icon } from "@/components/Icon";
import { useProjects } from "@/lib/stores/projects";
import { useAuth } from "@/lib/stores/auth";
import { relativeTime } from "@/lib/format";
import { cn } from "@/lib/cn";

type Event = {
  id: string;
  actor: string;
  initials: string;
  color: string;
  action: string;
  target: string;
  targetKind: "project" | "sheet" | "item" | "classification" | "org";
  occurredAt: string;
  payload?: Record<string, unknown>;
};

const ACTORS = [
  { name: "Itsik Nanikashvili", initials: "IN", color: "#dbeafe" },
  { name: "Maya Patel", initials: "MP", color: "#ede9fe" },
  { name: "Alex Stone", initials: "AS", color: "#dcfce7" },
  { name: "Riley Lee", initials: "RL", color: "#fee2e2" },
];

const ACTIONS = [
  { verb: "uploaded", kind: "project" as const, target: "Skyline_A101_FirstFloor.pdf" },
  { verb: "classified", kind: "item" as const, target: "TI-1138 → 09 21 16 Drywall" },
  { verb: "ran AI Detect on", kind: "sheet" as const, target: "A-201" },
  { verb: "calibrated scale on", kind: "sheet" as const, target: "A-101" },
  { verb: "approved", kind: "item" as const, target: "TI-0998 (Conf. Room polygon)" },
  { verb: "deleted", kind: "item" as const, target: "TI-0445 (old corridor)" },
  { verb: "invited", kind: "org" as const, target: "estimator@partner.com" },
  { verb: "exported takeoff", kind: "project" as const, target: "Riverside_Q2.xlsx" },
  { verb: "merged revision", kind: "project" as const, target: "Rev C" },
];

function seed(count: number): Event[] {
  const now = Date.now();
  return Array.from({ length: count }).map((_, i) => {
    const actor = ACTORS[i % ACTORS.length];
    const a = ACTIONS[i % ACTIONS.length];
    return {
      id: `evt_${i + 1}`,
      actor: actor.name,
      initials: actor.initials,
      color: actor.color,
      action: a.verb,
      target: a.target,
      targetKind: a.kind,
      occurredAt: new Date(now - i * 1000 * 60 * (3 + (i % 17))).toISOString(),
      payload: { ip: `192.168.${(i * 3) % 256}.${(i * 7) % 256}`, user_agent: "Chrome 130" },
    };
  });
}

const EVENTS = seed(60);

export default function AuditPage() {
  const session = useAuth((s) => s.session);
  const projects = useProjects((s) => s.projects);
  const [search, setSearch] = useState("");
  const [actor, setActor] = useState("all");
  const [kind, setKind] = useState<"all" | Event["targetKind"]>("all");
  const [open, setOpen] = useState<string | null>(null);

  const filtered = useMemo(
    () =>
      EVENTS.filter((e) => {
        const q = search.trim().toLowerCase();
        if (actor !== "all" && e.actor !== actor) return false;
        if (kind !== "all" && e.targetKind !== kind) return false;
        if (q && !`${e.actor} ${e.action} ${e.target}`.toLowerCase().includes(q)) return false;
        return true;
      }),
    [search, actor, kind]
  );

  return (
    <>
      <TopBar title="Audit Log" subtitle={`${EVENTS.length} events · append-only · 7-year retention`} />
      <main className="px-margin-desktop py-8 max-w-5xl mx-auto">
        <section className="bg-canvas-white border border-border-subtle rounded-2xl p-4 mb-6 flex items-center gap-3 flex-wrap">
          <TextField
            size="small"
            placeholder="Search events…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            sx={{ minWidth: 240, flex: 1 }}
            InputProps={{ startAdornment: <Icon name="search" className="text-outline mr-2" /> }}
          />
          <Select size="small" value={actor} onChange={(e) => setActor(e.target.value as string)} sx={{ minWidth: 180 }}>
            <MenuItem value="all">All actors</MenuItem>
            {ACTORS.map((a) => (
              <MenuItem key={a.name} value={a.name}>{a.name}</MenuItem>
            ))}
          </Select>
          <Select size="small" value={kind} onChange={(e) => setKind(e.target.value as typeof kind)} sx={{ minWidth: 160 }}>
            <MenuItem value="all">All target types</MenuItem>
            <MenuItem value="project">Projects</MenuItem>
            <MenuItem value="sheet">Sheets</MenuItem>
            <MenuItem value="item">Items</MenuItem>
            <MenuItem value="classification">Classifications</MenuItem>
            <MenuItem value="org">Org</MenuItem>
          </Select>
        </section>

        <section className="bg-canvas-white border border-border-subtle rounded-2xl overflow-hidden">
          {filtered.length === 0 && (
            <div className="text-center py-12 text-on-surface-variant">No events match your filters.</div>
          )}
          {filtered.map((e) => (
            <div key={e.id} className="border-b border-border-subtle last:border-b-0">
              <button
                onClick={() => setOpen(open === e.id ? null : e.id)}
                className="w-full flex items-center gap-3 px-5 py-3 hover:bg-surface-container-low transition-colors text-left"
              >
                <div
                  className="w-9 h-9 rounded-full flex items-center justify-center text-[10px] font-bold"
                  style={{ background: e.color }}
                >
                  {e.initials}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-body-md">
                    <span className="font-semibold">{e.actor}</span>{" "}
                    <span className="text-on-surface-variant">{e.action}</span>{" "}
                    <span className="font-mono text-data-sm">{e.target}</span>
                  </div>
                  <div className="text-label-sm text-outline mt-0.5 flex items-center gap-2">
                    <KindChip kind={e.targetKind} />
                    <span>{relativeTime(e.occurredAt)}</span>
                  </div>
                </div>
                <Icon name={open === e.id ? "expand_less" : "expand_more"} className="text-outline" />
              </button>
              {open === e.id && (
                <div className="px-5 pb-4 bg-surface-container-low">
                  <pre className="font-mono text-[11px] text-on-surface-variant whitespace-pre-wrap p-3 bg-canvas-white border border-border-subtle rounded-lg">
{JSON.stringify({
  id: e.id,
  actor_id: `usr_${e.initials.toLowerCase()}`,
  org_id: session?.orgId ?? "org_caliente",
  action: e.action,
  target_kind: e.targetKind,
  target: e.target,
  occurred_at: e.occurredAt,
  payload: e.payload,
}, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          ))}
        </section>

        <p className="mt-6 text-label-sm text-outline">
          Append-only. The `audit_event` table denies UPDATE / DELETE at the DB role level. See §7.4.
        </p>
      </main>
    </>
  );
}

function KindChip({ kind }: { kind: Event["targetKind"] }) {
  const c = {
    project: "bg-primary/10 text-primary",
    sheet: "bg-tertiary/10 text-tertiary",
    item: "bg-success-green/10 text-success-green",
    classification: "bg-secondary-fixed-dim/40 text-secondary",
    org: "bg-warning-amber/10 text-warning-amber",
  }[kind];
  return (
    <span className={cn("px-1.5 py-0.5 rounded text-[9px] font-mono font-bold uppercase tracking-wider", c)}>
      {kind}
    </span>
  );
}
