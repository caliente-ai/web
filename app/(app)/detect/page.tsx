"use client";

import { useMemo, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Button, MenuItem, Select } from "@mui/material";
import { TopBar } from "@/components/TopBar";
import { Icon } from "@/components/Icon";
import { useProjects } from "@/lib/stores/projects";
import { useToast } from "@/lib/toast";
import { cn } from "@/lib/cn";

type Candidate = {
  id: string;
  name: string;
  confidence: number; // 0..1
  areaSF: number;
  classification: string;
};

const SEED: Candidate[] = [
  { id: "p1", name: "Lobby", confidence: 0.97, areaSF: 216, classification: "Room — Floor" },
  { id: "p2", name: "Office A", confidence: 0.94, areaSF: 142, classification: "Room — Floor" },
  { id: "p3", name: "Conf. Room", confidence: 0.91, areaSF: 380, classification: "Room — Floor" },
  { id: "p4", name: "Storage", confidence: 0.88, areaSF: 120, classification: "Room — Floor" },
  { id: "p5", name: "Restroom A", confidence: 0.84, areaSF: 88, classification: "Room — Floor" },
  { id: "p6", name: "Restroom B", confidence: 0.82, areaSF: 92, classification: "Room — Floor" },
  { id: "p7", name: "Corridor 1", confidence: 0.78, areaSF: 410, classification: "Corridor" },
  { id: "p8", name: "Corridor 2", confidence: 0.74, areaSF: 290, classification: "Corridor" },
  { id: "p9", name: "Mech. Closet", confidence: 0.69, areaSF: 32, classification: "Service Room" },
  { id: "p10", name: "Open Office", confidence: 0.66, areaSF: 1240, classification: "Room — Floor" },
  { id: "p11", name: "Stair A", confidence: 0.58, areaSF: 110, classification: "Service Room" },
  { id: "p12", name: "Vestibule", confidence: 0.54, areaSF: 64, classification: "Room — Floor" },
];

type Decision = "accepted" | "rejected" | "pending";

export default function DetectPage() {
  const params = useSearchParams();
  const router = useRouter();
  const projects = useProjects((s) => s.projects);
  const { push } = useToast();
  const [projectId, setProjectId] = useState(params.get("project") ?? projects[0]?.id ?? "");
  const project = projects.find((p) => p.id === projectId);
  const [decisions, setDecisions] = useState<Record<string, Decision>>(() =>
    Object.fromEntries(SEED.map((c) => [c.id, "pending"]))
  );

  const stats = useMemo(() => {
    const accepted = Object.values(decisions).filter((d) => d === "accepted").length;
    const rejected = Object.values(decisions).filter((d) => d === "rejected").length;
    const pending = Object.values(decisions).filter((d) => d === "pending").length;
    const acceptedSF = SEED.filter((c) => decisions[c.id] === "accepted").reduce((s, c) => s + c.areaSF, 0);
    return { accepted, rejected, pending, acceptedSF };
  }, [decisions]);

  function decideAll(d: Decision, predicate: (c: Candidate) => boolean) {
    setDecisions((prev) => {
      const next = { ...prev };
      SEED.forEach((c) => {
        if (predicate(c)) next[c.id] = d;
      });
      return next;
    });
  }

  function commit() {
    push("success", `${stats.accepted} polygons added to the project`);
    if (project) router.push(`/projects/${project.id}`);
  }

  return (
    <>
      <TopBar
        title="AI Detection Review"
        subtitle="Wall + room segmentation results — accept, reject, or remap"
        actions={
          <Select size="small" value={projectId} onChange={(e) => setProjectId(e.target.value as string)} sx={{ minWidth: 240 }}>
            {projects.map((p) => (
              <MenuItem key={p.id} value={p.id}>{p.name}</MenuItem>
            ))}
          </Select>
        }
      />
      <main className="px-margin-desktop py-8 max-w-[1600px] mx-auto">
        <section className="grid lg:grid-cols-[1fr_360px] gap-gutter">
          <div className="bg-canvas-white border border-border-subtle rounded-2xl overflow-hidden">
            <div className="px-5 py-4 border-b border-border-subtle flex items-center justify-between flex-wrap gap-3">
              <div>
                <h3 className="font-display text-headline-md">{SEED.length} polygons detected</h3>
                <p className="text-label-sm text-on-surface-variant">U-Net + ResNet-50 backbone · CubiCasa5K fine-tuned</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button size="small" variant="outlined" startIcon={<Icon name="done_all" className="text-[16px]" />} onClick={() => decideAll("accepted", (c) => c.confidence >= 0.85)}>
                  Accept ≥ 85%
                </Button>
                <Button size="small" variant="outlined" color="error" startIcon={<Icon name="block" className="text-[16px]" />} onClick={() => decideAll("rejected", (c) => c.confidence < 0.6)}>
                  Reject &lt; 60%
                </Button>
              </div>
            </div>
            <div className="divide-y divide-border-subtle">
              {SEED.map((c) => (
                <Row
                  key={c.id}
                  candidate={c}
                  decision={decisions[c.id]}
                  onAccept={() => setDecisions((p) => ({ ...p, [c.id]: "accepted" }))}
                  onReject={() => setDecisions((p) => ({ ...p, [c.id]: "rejected" }))}
                  onUndo={() => setDecisions((p) => ({ ...p, [c.id]: "pending" }))}
                />
              ))}
            </div>
          </div>

          <aside className="space-y-4">
            <div className="bg-canvas-white border border-border-subtle rounded-2xl p-5">
              <h4 className="font-display text-headline-sm mb-3">Summary</h4>
              <StatRow label="Accepted" value={stats.accepted} tone="success" />
              <StatRow label="Rejected" value={stats.rejected} tone="error" />
              <StatRow label="Pending" value={stats.pending} tone="muted" />
              <div className="my-3 border-t border-border-subtle" />
              <div className="flex justify-between">
                <span className="text-label-sm text-on-surface-variant">Total accepted SF</span>
                <span className="font-mono text-data-md font-bold">{stats.acceptedSF.toLocaleString()}</span>
              </div>
            </div>
            <Button
              variant="contained"
              size="large"
              fullWidth
              startIcon={<Icon name="check" />}
              disabled={stats.accepted === 0}
              onClick={commit}
              sx={{ py: 1.25 }}
            >
              Commit {stats.accepted} polygons
            </Button>
            <p className="text-label-sm text-on-surface-variant px-1">
              Confidence is calibrated on a 50-sheet held-out test set. Below 60% means the model is unsure.
            </p>
          </aside>
        </section>
      </main>
    </>
  );
}

function StatRow({ label, value, tone }: { label: string; value: number; tone: "success" | "error" | "muted" }) {
  const cls = { success: "text-success-green", error: "text-error-red", muted: "text-outline" }[tone];
  return (
    <div className="flex justify-between py-1">
      <span className="text-label-sm">{label}</span>
      <span className={cn("font-mono text-data-sm font-bold", cls)}>{value}</span>
    </div>
  );
}

function Row({ candidate, decision, onAccept, onReject, onUndo }: { candidate: Candidate; decision: Decision; onAccept: () => void; onReject: () => void; onUndo: () => void }) {
  const conf = Math.round(candidate.confidence * 100);
  const tone = conf >= 85 ? "success" : conf >= 60 ? "warning" : "error";
  const toneBg = { success: "bg-success-green/10 text-success-green border-success-green/30", warning: "bg-warning-amber/10 text-warning-amber border-warning-amber/30", error: "bg-error-red/10 text-error-red border-error-red/30" }[tone];
  return (
    <div
      className={cn(
        "flex items-center gap-4 px-5 py-3 transition-colors",
        decision === "accepted" && "bg-success-green/5",
        decision === "rejected" && "bg-error-red/5 opacity-60"
      )}
    >
      <div className={cn("w-14 h-14 rounded-lg border-2 flex items-center justify-center bg-canvas-white", toneBg)}>
        <Icon name="check_box_outline_blank" className="text-[28px]" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="font-headline-sm font-semibold">{candidate.name}</div>
        <div className="text-label-sm text-on-surface-variant">
          {candidate.classification} · <span className="font-mono">{candidate.areaSF.toLocaleString()} SF</span>
        </div>
      </div>
      <span className={cn("px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase border", toneBg)}>
        {conf}% conf
      </span>
      <div className="flex gap-1">
        {decision === "pending" ? (
          <>
            <button
              onClick={onReject}
              className="w-9 h-9 rounded-lg flex items-center justify-center text-error-red hover:bg-error-red/10"
            >
              <Icon name="close" />
            </button>
            <button
              onClick={onAccept}
              className="w-9 h-9 rounded-lg flex items-center justify-center text-success-green hover:bg-success-green/10"
            >
              <Icon name="check" />
            </button>
          </>
        ) : (
          <button onClick={onUndo} className="px-2 text-label-sm text-primary hover:underline">
            Undo
          </button>
        )}
      </div>
    </div>
  );
}
