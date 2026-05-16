"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Button, LinearProgress, TextField } from "@mui/material";
import { TopBar } from "@/components/TopBar";
import { Icon } from "@/components/Icon";
import { useProjects, type Sheet } from "@/lib/stores/projects";
import { useToast } from "@/lib/toast";
import { cn } from "@/lib/cn";

type Stage = "idle" | "uploading" | "splitting" | "ocr" | "tiling" | "naming" | "ready" | "error";

const STAGES: { key: Stage; label: string; icon: string; detail: string }[] = [
  { key: "uploading", label: "Upload", icon: "cloud_upload", detail: "Chunking PDF to presigned R2 URL" },
  { key: "splitting", label: "Split", icon: "splitscreen", detail: "Splitting pages with pypdfium2" },
  { key: "ocr", label: "OCR", icon: "document_scanner", detail: "Google Document AI · text + bboxes" },
  { key: "tiling", label: "Tile", icon: "grid_view", detail: "libvips → DZI pyramid per page" },
  { key: "naming", label: "Auto-name", icon: "smart_toy", detail: "Title-block regex + AI fallback" },
  { key: "ready", label: "Ready", icon: "check_circle", detail: "Sheets ready to draw on" },
];

export default function UploadPage() {
  const router = useRouter();
  const { push } = useToast();
  const create = useProjects((s) => s.create);

  const [file, setFile] = useState<File | null>(null);
  const [stage, setStage] = useState<Stage>("idle");
  const [progress, setProgress] = useState(0);
  const [projectName, setProjectName] = useState("");
  const [address, setAddress] = useState("");
  const [pageCount, setPageCount] = useState(0);
  const [createdId, setCreatedId] = useState<string | null>(null);
  const dragRef = useRef<HTMLDivElement>(null);
  const [dragOver, setDragOver] = useState(false);

  function pick(f: File) {
    if (!f.name.toLowerCase().endsWith(".pdf")) {
      push("error", "Please drop a PDF file");
      return;
    }
    setFile(f);
    setProjectName(f.name.replace(/\.pdf$/i, "").replace(/[_-]+/g, " "));
    setStage("idle");
    setProgress(0);
    setPageCount(0);
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
    const f = e.dataTransfer.files?.[0];
    if (f) pick(f);
  }

  async function start() {
    if (!file) {
      push("error", "Pick a PDF first");
      return;
    }
    if (!projectName.trim()) {
      push("error", "Project name is required");
      return;
    }
    // Fake page count between 24 and 156
    const pages = 24 + Math.floor(Math.random() * 130);
    setPageCount(pages);

    const transitions: { stage: Stage; durationMs: number }[] = [
      { stage: "uploading", durationMs: 1200 },
      { stage: "splitting", durationMs: 800 },
      { stage: "ocr", durationMs: 2000 },
      { stage: "tiling", durationMs: 1400 },
      { stage: "naming", durationMs: 700 },
      { stage: "ready", durationMs: 400 },
    ];

    for (const t of transitions) {
      setStage(t.stage);
      const steps = 20;
      for (let i = 0; i < steps; i++) {
        await sleep(t.durationMs / steps);
        setProgress(((stagesBeforeIndex(t.stage) + (i + 1) / steps) / STAGES.length) * 100);
      }
    }

    // Create project in store
    const sheets = makeSheets(pages);
    const project = create({
      name: projectName.trim(),
      address: address.trim() || "Address pending",
      status: "active",
      sheets,
      itemsCount: 0,
      revision: "v1",
      members: [{ initials: "JD", color: "#dbeafe" }],
      scannedByAi: true,
    });
    setCreatedId(project.id);
    push("success", `${projectName} ready — ${pages} pages ingested`);
  }

  function reset() {
    setFile(null);
    setStage("idle");
    setProgress(0);
    setCreatedId(null);
    setProjectName("");
    setAddress("");
  }

  return (
    <>
      <TopBar
        title="Upload Project"
        subtitle="Drop a multi-page architectural PDF — agentic ingest takes care of the rest"
      />
      <main className="px-margin-desktop py-8 max-w-5xl mx-auto">
        <div className="grid lg:grid-cols-[1fr_400px] gap-gutter">
          {/* Drop zone & form */}
          <section className="bg-canvas-white border border-border-subtle rounded-2xl p-8">
            {!file && (
              <div
                ref={dragRef}
                onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={handleDrop}
                className={cn(
                  "border-2 border-dashed rounded-xl p-12 text-center transition-all cursor-pointer",
                  dragOver
                    ? "border-primary bg-primary/5 shadow-ai-glow"
                    : "border-outline-variant hover:border-primary/40 hover:bg-surface-container-low"
                )}
                onClick={() => document.getElementById("file-input")?.click()}
              >
                <Icon name="cloud_upload" className="text-[72px] text-outline-variant" filled />
                <h3 className="font-display text-headline-lg mt-4">Drop your PDF here</h3>
                <p className="text-body-md text-on-surface-variant mt-2">or click to browse — up to 500 pages</p>
                <input
                  id="file-input"
                  type="file"
                  accept="application/pdf"
                  className="hidden"
                  onChange={(e) => e.target.files?.[0] && pick(e.target.files[0])}
                />
                <p className="mt-6 text-label-sm text-outline">
                  Stored in Cloudflare R2 with short-lived presigned URLs · §2.6
                </p>
              </div>
            )}

            {file && stage === "idle" && (
              <div className="flex flex-col gap-4">
                <div className="flex items-center gap-3 bg-surface-container-low p-3 rounded-lg">
                  <Icon name="picture_as_pdf" className="text-error-red text-[28px]" filled />
                  <div className="flex-1 min-w-0">
                    <div className="font-headline-sm font-semibold truncate">{file.name}</div>
                    <div className="text-label-sm text-on-surface-variant font-mono">
                      {(file.size / 1024 / 1024).toFixed(1)} MB
                    </div>
                  </div>
                  <button onClick={reset} className="text-outline hover:text-error-red p-2">
                    <Icon name="close" />
                  </button>
                </div>
                <TextField
                  label="Project name"
                  value={projectName}
                  onChange={(e) => setProjectName(e.target.value)}
                  fullWidth
                  required
                />
                <TextField
                  label="Site address (optional)"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="123 Main St, City, ST"
                  fullWidth
                />
                <Button
                  variant="contained"
                  size="large"
                  startIcon={<Icon name="auto_awesome" />}
                  onClick={start}
                  sx={{ py: 1.5 }}
                >
                  Start agentic ingest
                </Button>
              </div>
            )}

            {file && stage !== "idle" && stage !== "ready" && (
              <div className="flex flex-col gap-6">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-display text-headline-md">Processing {projectName}</span>
                    <span className="font-mono text-data-sm text-on-surface-variant">{Math.round(progress)}%</span>
                  </div>
                  <LinearProgress variant="determinate" value={progress} sx={{ height: 8, borderRadius: 4 }} />
                </div>
                <Pipeline current={stage} pageCount={pageCount} />
              </div>
            )}

            {file && stage === "ready" && createdId && (
              <div className="flex flex-col items-center text-center py-8">
                <div className="w-20 h-20 rounded-full bg-success-green/10 border-2 border-success-green flex items-center justify-center mb-4">
                  <Icon name="check" className="text-success-green text-[48px]" filled />
                </div>
                <h3 className="font-display text-display-lg">All sheets ingested</h3>
                <p className="text-body-md text-on-surface-variant mt-2 mb-8">
                  {pageCount} pages processed · OCR complete · DZI tiles ready
                </p>
                <div className="flex gap-3">
                  <Button variant="outlined" onClick={reset}>Upload another</Button>
                  <Button
                    variant="contained"
                    endIcon={<Icon name="arrow_forward" />}
                    onClick={() => router.push(`/projects/${createdId}/editor`)}
                  >
                    Open in editor
                  </Button>
                </div>
              </div>
            )}
          </section>

          {/* Right rail */}
          <aside className="space-y-4">
            <div className="bg-canvas-white border border-border-subtle rounded-2xl p-5">
              <h4 className="font-display text-headline-sm mb-3 flex items-center gap-2">
                <Icon name="conveyor_belt" className="text-primary" /> Ingest pipeline
              </h4>
              <ul className="space-y-3">
                {STAGES.map((s, i) => (
                  <li key={s.key} className="flex items-start gap-3">
                    <span className="text-[20px] text-outline-variant mt-0.5 font-mono w-5 text-right">
                      {i + 1}.
                    </span>
                    <div>
                      <div className="text-body-md font-semibold">{s.label}</div>
                      <div className="text-label-sm text-on-surface-variant">{s.detail}</div>
                    </div>
                  </li>
                ))}
              </ul>
            </div>

            <div className="bg-sidebar-navy text-canvas-white rounded-2xl p-5">
              <div className="flex items-center gap-2 mb-2">
                <Icon name="bolt" className="text-primary" filled />
                <h4 className="font-display text-headline-sm">Why this is fast</h4>
              </div>
              <p className="text-label-sm text-secondary-fixed-dim leading-relaxed">
                Workers run in parallel on Fly.io. OCR batches 10 pages per Document AI request and writes
                results directly to R2 — the API stays out of the binary path entirely.
              </p>
            </div>
          </aside>
        </div>
      </main>
    </>
  );
}

function Pipeline({ current, pageCount }: { current: Stage; pageCount: number }) {
  const currentIdx = STAGES.findIndex((s) => s.key === current);
  return (
    <ul className="space-y-2">
      {STAGES.map((s, i) => {
        const done = i < currentIdx;
        const active = i === currentIdx;
        return (
          <li
            key={s.key}
            className={cn(
              "flex items-center gap-3 p-3 rounded-lg border transition-all",
              done && "bg-success-green/5 border-success-green/20",
              active && "bg-primary/5 border-primary/30 shadow-ai-glow",
              !done && !active && "bg-surface-container-low border-border-subtle opacity-60"
            )}
          >
            <div
              className={cn(
                "w-9 h-9 rounded-lg flex items-center justify-center",
                done && "bg-success-green text-canvas-white",
                active && "bg-primary text-canvas-white animate-pulse-subtle",
                !done && !active && "bg-surface-container text-outline"
              )}
            >
              <Icon name={done ? "check" : s.icon} filled={active} />
            </div>
            <div className="flex-1">
              <div className="text-body-md font-semibold">{s.label}</div>
              <div className="text-label-sm text-on-surface-variant">{s.detail}</div>
            </div>
            <div className="font-mono text-data-sm text-outline">
              {done && pageCount > 0 ? `${pageCount}/${pageCount}` : active ? "…" : ""}
            </div>
          </li>
        );
      })}
    </ul>
  );
}

function makeSheets(pageCount: number): Sheet[] {
  const disciplines: Sheet["discipline"][] = ["A", "S", "M", "E", "P"];
  return Array.from({ length: Math.min(pageCount, 14) }).map((_, i) => {
    const d = disciplines[i % disciplines.length];
    return {
      id: `sh_${Math.random().toString(36).slice(2, 8)}`,
      number: `${d}-${100 + i}`,
      title: ["First Floor", "Second Floor", "Roof Plan", "Foundation", "HVAC", "Power", "Plumbing"][i % 7],
      discipline: d,
      status: "ready",
    };
  });
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

function stagesBeforeIndex(s: Stage): number {
  return STAGES.findIndex((x) => x.key === s);
}
