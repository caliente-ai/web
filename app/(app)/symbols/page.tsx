"use client";

import { useMemo, useState } from "react";
import { Button, MenuItem, Select, TextField } from "@mui/material";
import { TopBar } from "@/components/TopBar";
import { Icon } from "@/components/Icon";
import { useToast } from "@/lib/toast";
import { cn } from "@/lib/cn";

type Symbol = {
  id: string;
  sheet: string;
  confidence: number;
  x: number;
  y: number;
  status: "accepted" | "rejected" | "pending";
};

const MOCK: Symbol[] = Array.from({ length: 84 }).map((_, i) => ({
  id: `sym_${i + 1}`,
  sheet: `A-${100 + (i % 6)}`,
  confidence: 0.55 + Math.random() * 0.44,
  x: Math.random() * 100,
  y: Math.random() * 100,
  status: "pending",
}));

export default function SymbolsPage() {
  const [query, setQuery] = useState("Single-leaf door");
  const [items, setItems] = useState(MOCK);
  const [filter, setFilter] = useState<"all" | "high" | "low">("all");
  const { push } = useToast();

  const filtered = useMemo(
    () =>
      items.filter((s) => {
        if (filter === "high") return s.confidence >= 0.85;
        if (filter === "low") return s.confidence < 0.6;
        return true;
      }),
    [items, filter]
  );

  function decide(id: string, status: Symbol["status"]) {
    setItems((prev) => prev.map((s) => (s.id === id ? { ...s, status } : s)));
  }

  function accept(predicate: (s: Symbol) => boolean, label: string) {
    setItems((prev) => prev.map((s) => (predicate(s) ? { ...s, status: "accepted" } : s)));
    push("success", label);
  }

  const accepted = items.filter((s) => s.status === "accepted").length;

  return (
    <>
      <TopBar
        title="Symbol Search"
        subtitle="OpenCV template match · multi-scale ±25% · 4 rotations"
        actions={
          <Button variant="contained" disabled={accepted === 0} startIcon={<Icon name="check" />} onClick={() => push("success", `${accepted} symbols saved to count classification`)}>
            Commit {accepted || 0}
          </Button>
        }
      />
      <main className="px-margin-desktop py-8 max-w-[1600px] mx-auto">
        <section className="bg-canvas-white border border-border-subtle rounded-2xl p-5 mb-6">
          <div className="flex items-center gap-3 flex-wrap">
            <TextField
              size="small"
              label="Searched symbol"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              sx={{ minWidth: 300 }}
            />
            <Select size="small" value={filter} onChange={(e) => setFilter(e.target.value as typeof filter)}>
              <MenuItem value="all">All ({items.length})</MenuItem>
              <MenuItem value="high">High confidence ≥85% ({items.filter((s) => s.confidence >= 0.85).length})</MenuItem>
              <MenuItem value="low">Low &lt;60% ({items.filter((s) => s.confidence < 0.6).length})</MenuItem>
            </Select>
            <div className="flex-1" />
            <Button variant="outlined" size="small" startIcon={<Icon name="done_all" className="text-[16px]" />} onClick={() => accept((s) => s.confidence >= 0.85, "Accepted all high-confidence")}>
              Accept high conf
            </Button>
            <Button variant="outlined" size="small" color="error" startIcon={<Icon name="block" className="text-[16px]" />} onClick={() => setItems((prev) => prev.map((s) => (s.confidence < 0.6 ? { ...s, status: "rejected" } : s)))}>
              Reject low conf
            </Button>
          </div>
          <p className="mt-3 text-label-sm text-on-surface-variant">
            <strong>{filtered.length} matches</strong> across <strong>{new Set(filtered.map((s) => s.sheet)).size} sheets</strong> · {Math.round((items.filter((s) => s.confidence >= 0.85).length / items.length) * 100)}% high confidence
          </p>
        </section>

        <section className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 xl:grid-cols-7 gap-3">
          {filtered.map((s) => {
            const conf = Math.round(s.confidence * 100);
            const tone = conf >= 85 ? "success" : conf >= 60 ? "warning" : "error";
            const toneClass = { success: "border-success-green/40", warning: "border-warning-amber/40", error: "border-error-red/40" }[tone];
            const badgeClass = { success: "bg-success-green text-canvas-white", warning: "bg-warning-amber text-canvas-white", error: "bg-error-red text-canvas-white" }[tone];
            return (
              <div
                key={s.id}
                className={cn(
                  "relative bg-canvas-white border-2 rounded-xl overflow-hidden transition-all",
                  toneClass,
                  s.status === "accepted" && "ring-2 ring-success-green ring-offset-2",
                  s.status === "rejected" && "opacity-40"
                )}
              >
                <div className="aspect-square cad-grid relative">
                  <div className="absolute inset-3 flex items-center justify-center">
                    <Icon name="door_front" className="text-[48px] text-outline" filled />
                  </div>
                  <span className={cn("absolute top-1.5 left-1.5 px-1.5 py-0.5 rounded text-[10px] font-mono font-bold", badgeClass)}>
                    {conf}%
                  </span>
                  <span className="absolute top-1.5 right-1.5 px-1.5 py-0.5 rounded text-[10px] font-mono bg-canvas-white/90 text-on-surface-variant">
                    {s.sheet}
                  </span>
                </div>
                <div className="flex divide-x divide-border-subtle border-t border-border-subtle">
                  <button
                    onClick={() => decide(s.id, "rejected")}
                    className="flex-1 py-1.5 text-error-red hover:bg-error-red/10"
                    title="Reject"
                  >
                    <Icon name="close" className="text-[16px]" />
                  </button>
                  <button
                    onClick={() => decide(s.id, "pending")}
                    className="flex-1 py-1.5 text-outline hover:bg-surface-container-low"
                    title="Maybe"
                  >
                    <Icon name="help" className="text-[16px]" />
                  </button>
                  <button
                    onClick={() => decide(s.id, "accepted")}
                    className="flex-1 py-1.5 text-success-green hover:bg-success-green/10"
                    title="Accept"
                  >
                    <Icon name="check" className="text-[16px]" />
                  </button>
                </div>
              </div>
            );
          })}
        </section>
      </main>
    </>
  );
}
