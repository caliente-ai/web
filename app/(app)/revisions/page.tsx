"use client";

import { useMemo, useState } from "react";
import { Button, MenuItem, Select } from "@mui/material";
import { TopBar } from "@/components/TopBar";
import { Icon } from "@/components/Icon";
import { useToast } from "@/lib/toast";
import { cn } from "@/lib/cn";

type Change = {
  id: string;
  sheet: string;
  kind: "added" | "removed" | "modified" | "renamed";
  description: string;
  delta?: string;
};

const CHANGES: Change[] = [
  { id: "c1", sheet: "A-101", kind: "modified", description: "Conf. Room A grew", delta: "+28 SF" },
  { id: "c2", sheet: "A-101", kind: "renamed", description: "Storage → IT Closet" },
  { id: "c3", sheet: "A-101", kind: "added", description: "New wall: corridor C3 extension", delta: "+42 LF" },
  { id: "c4", sheet: "A-201", kind: "modified", description: "Open Office reduced", delta: "-110 SF" },
  { id: "c5", sheet: "A-201", kind: "added", description: "New mech closet", delta: "+32 SF" },
  { id: "c6", sheet: "A-301", kind: "removed", description: "Old vestibule deleted", delta: "-64 SF" },
  { id: "c7", sheet: "A-102", kind: "modified", description: "Restroom B retiled", delta: "+12 SF" },
];

export default function RevisionsPage() {
  const [from, setFrom] = useState("B");
  const [to, setTo] = useState("C");
  const [selectedSheet, setSelectedSheet] = useState<string>(CHANGES[0].sheet);
  const { push } = useToast();

  const grouped = useMemo(() => {
    const map = new Map<string, Change[]>();
    CHANGES.forEach((c) => {
      const arr = map.get(c.sheet) ?? [];
      arr.push(c);
      map.set(c.sheet, arr);
    });
    return Array.from(map.entries());
  }, []);

  const sheetChanges = CHANGES.filter((c) => c.sheet === selectedSheet);

  return (
    <>
      <TopBar
        title="Revisions Diff"
        subtitle={`Compare ${from} vs ${to} — ${CHANGES.length} changes detected`}
        actions={
          <div className="flex items-center gap-2">
            <Select size="small" value={from} onChange={(e) => setFrom(e.target.value as string)}>
              {["A", "B", "C", "D"].map((r) => (
                <MenuItem key={r} value={r}>Rev {r}</MenuItem>
              ))}
            </Select>
            <Icon name="trending_flat" className="text-outline" />
            <Select size="small" value={to} onChange={(e) => setTo(e.target.value as string)}>
              {["A", "B", "C", "D"].map((r) => (
                <MenuItem key={r} value={r}>Rev {r}</MenuItem>
              ))}
            </Select>
            <Button variant="outlined" size="small" startIcon={<Icon name="file_download" className="text-[16px]" />} onClick={() => push("info", "PDF diff export queued")}>
              Export
            </Button>
          </div>
        }
      />
      <main className="px-margin-desktop py-8 max-w-[1600px] mx-auto">
        <section className="grid lg:grid-cols-[1fr_360px] gap-gutter">
          {/* Two-up diff viewer */}
          <div className="bg-canvas-white border border-border-subtle rounded-2xl overflow-hidden">
            <div className="grid grid-cols-2 divide-x divide-border-subtle">
              <SheetPane label={`Rev ${from}`} tone="muted" sheetNumber={selectedSheet} />
              <SheetPane label={`Rev ${to}`} tone="primary" sheetNumber={selectedSheet} highlights={sheetChanges} />
            </div>
            <footer className="border-t border-border-subtle px-5 py-3 flex items-center gap-6 text-label-sm">
              <span className="flex items-center gap-2"><span className="w-3 h-3 rounded-sm border-2 border-success-green" />Added</span>
              <span className="flex items-center gap-2"><span className="w-3 h-3 rounded-sm border-2 border-error-red" />Removed</span>
              <span className="flex items-center gap-2"><span className="w-3 h-3 rounded-sm border-2 border-warning-amber" />Modified</span>
            </footer>
          </div>

          {/* Change list */}
          <aside className="bg-canvas-white border border-border-subtle rounded-2xl overflow-hidden flex flex-col">
            <div className="px-4 py-3 border-b border-border-subtle flex items-center justify-between">
              <h4 className="font-display text-headline-sm">Changes by sheet</h4>
              <span className="font-mono text-data-sm text-outline">{CHANGES.length}</span>
            </div>
            <div className="overflow-y-auto flex-1 max-h-[70vh]">
              {grouped.map(([sheet, changes]) => (
                <div key={sheet}>
                  <button
                    onClick={() => setSelectedSheet(sheet)}
                    className={cn(
                      "w-full px-4 py-2 text-left flex items-center gap-2 transition-colors",
                      selectedSheet === sheet
                        ? "bg-primary/5 border-l-4 border-primary"
                        : "hover:bg-surface-container-low border-l-4 border-transparent"
                    )}
                  >
                    <Icon name="description" className="text-primary text-[18px]" />
                    <span className="font-mono text-data-sm font-bold flex-1">{sheet}</span>
                    <span className="font-mono text-[10px] text-outline">{changes.length}</span>
                  </button>
                  {selectedSheet === sheet && (
                    <ul className="pb-2">
                      {changes.map((c) => (
                        <li key={c.id} className="px-4 py-2 ml-6 mr-2 mb-1 border-l-2 border-border-subtle pl-3 text-label-sm">
                          <div className="flex items-center gap-2">
                            <KindBadge kind={c.kind} />
                            <span className="flex-1 truncate">{c.description}</span>
                            {c.delta && <span className="font-mono text-[10px] text-on-surface-variant">{c.delta}</span>}
                          </div>
                          <button
                            onClick={() => push("success", "Applied to takeoffs")}
                            className="mt-1 text-[10px] text-primary font-semibold hover:underline"
                          >
                            Apply to takeoffs →
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              ))}
            </div>
          </aside>
        </section>
      </main>
    </>
  );
}

function KindBadge({ kind }: { kind: Change["kind"] }) {
  const map = {
    added: { label: "ADD", c: "bg-success-green/10 text-success-green border-success-green/30" },
    removed: { label: "DEL", c: "bg-error-red/10 text-error-red border-error-red/30" },
    modified: { label: "MOD", c: "bg-warning-amber/10 text-warning-amber border-warning-amber/30" },
    renamed: { label: "REN", c: "bg-primary/10 text-primary border-primary/30" },
  }[kind];
  return (
    <span className={cn("px-1.5 py-0.5 rounded text-[9px] font-mono font-bold uppercase tracking-wider border", map.c)}>
      {map.label}
    </span>
  );
}

function SheetPane({ label, tone, sheetNumber, highlights }: { label: string; tone: "muted" | "primary"; sheetNumber: string; highlights?: Change[] }) {
  return (
    <div className="relative">
      <div className={cn("px-4 py-2 border-b border-border-subtle flex items-center justify-between", tone === "primary" && "bg-primary/5")}>
        <span className="font-display text-headline-sm font-bold">{label}</span>
        <span className="font-mono text-data-sm text-outline">{sheetNumber}</span>
      </div>
      <div className="aspect-[4/3] cad-grid relative">
        <div className="absolute inset-12 flex items-center justify-center">
          <Icon name="architecture" className="text-[96px] text-outline-variant opacity-50" />
        </div>
        {highlights?.map((h, i) => (
          <div
            key={h.id}
            className={cn(
              "absolute border-2 rounded animate-pulse-subtle",
              h.kind === "added" && "border-success-green bg-success-green/10",
              h.kind === "removed" && "border-error-red bg-error-red/10",
              h.kind === "modified" && "border-warning-amber bg-warning-amber/10",
              h.kind === "renamed" && "border-primary bg-primary/10"
            )}
            style={{
              left: `${15 + (i * 13) % 60}%`,
              top: `${20 + (i * 17) % 50}%`,
              width: `${10 + (i % 3) * 6}%`,
              height: `${8 + (i % 4) * 5}%`,
            }}
          />
        ))}
      </div>
    </div>
  );
}
