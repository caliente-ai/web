"use client";

import { useEffect, useRef, useState } from "react";
import { Button, IconButton, MenuItem, Select, TextField } from "@mui/material";
import { TopBar } from "@/components/TopBar";
import { Icon } from "@/components/Icon";
import { useProjects } from "@/lib/stores/projects";
import { useToast } from "@/lib/toast";
import { cn } from "@/lib/cn";

type Citation = { kind: "sheet" | "spec" | "item"; ref: string; label: string };
type ToolCall = { name: string; argument: string; result: string };

type Message = {
  id: string;
  role: "user" | "assistant";
  text: string;
  citations?: Citation[];
  toolCalls?: ToolCall[];
};

const SUGGESTIONS = [
  "What's the total drywall in corridor C3?",
  "Summarize the painting scope.",
  "Compare Rev B vs Rev C — which rooms grew?",
  "Which symbols are doors with hardware set H-2?",
  "Quantities for floor finish across all levels.",
];

export default function AssistantPage() {
  const projects = useProjects((s) => s.projects);
  const [projectId, setProjectId] = useState(projects[0]?.id ?? "");
  const project = projects.find((p) => p.id === projectId);
  const { push } = useToast();
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [streamingId, setStreamingId] = useState<string | null>(null);
  const [streamingText, setStreamingText] = useState("");
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "intro",
      role: "assistant",
      text:
        "Hi — I'm grounded on every sheet, spec section, and takeoff in this project. I never invent numbers; every quantity comes from a tool call you can audit on the right.",
    },
  ]);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, streamingText]);

  async function ask(q: string) {
    if (!project || busy || !q.trim()) return;
    const userMsg: Message = { id: `u_${Date.now()}`, role: "user", text: q };
    const responseId = `a_${Date.now()}`;
    setMessages((m) => [...m, userMsg]);
    setInput("");
    setBusy(true);
    setStreamingId(responseId);
    setStreamingText("");

    const reply = synthesize(q, project.name);
    // Simulate streaming
    let acc = "";
    for (const chunk of reply.text.match(/.{1,18}/g) ?? []) {
      acc += chunk;
      setStreamingText(acc);
      await sleep(28);
    }
    setMessages((m) => [
      ...m,
      {
        id: responseId,
        role: "assistant",
        text: reply.text,
        citations: reply.citations,
        toolCalls: reply.toolCalls,
      },
    ]);
    setStreamingId(null);
    setStreamingText("");
    setBusy(false);
    push("info", "Cached as context — next turn pays 10% of input cost");
  }

  return (
    <div className="flex flex-col h-screen overflow-hidden">
      <TopBar
        title="Project Assistant"
        subtitle={project ? `Grounded on "${project.name}" · ${project.sheets.length} sheets in context` : "Pick a project to start"}
        actions={
          <Select
            size="small"
            value={projectId}
            onChange={(e) => setProjectId(e.target.value as string)}
            sx={{ minWidth: 240 }}
          >
            {projects.map((p) => (
              <MenuItem key={p.id} value={p.id}>{p.name}</MenuItem>
            ))}
          </Select>
        }
      />
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-[1fr_360px] min-h-0">
        {/* Conversation */}
        <div className="flex flex-col min-h-0">
          <div ref={scrollRef} className="flex-1 overflow-y-auto px-margin-desktop py-6 space-y-6 max-w-3xl w-full mx-auto">
            {messages.map((m) => (
              <MessageView key={m.id} message={m} />
            ))}
            {streamingId && (
              <MessageView
                message={{
                  id: streamingId,
                  role: "assistant",
                  text: streamingText + "▍",
                }}
              />
            )}
            {messages.length === 1 && !busy && (
              <div className="grid sm:grid-cols-2 gap-2 mt-6">
                {SUGGESTIONS.map((s) => (
                  <button
                    key={s}
                    onClick={() => ask(s)}
                    className="text-left p-3 border border-border-subtle rounded-xl bg-canvas-white hover:border-primary/40 hover:shadow-sm transition-all text-label-sm"
                  >
                    <span className="flex items-center gap-2">
                      <Icon name="bolt" className="text-primary text-[16px]" />
                      <span>{s}</span>
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Composer */}
          <div className="border-t border-border-subtle bg-canvas-white p-4">
            <div className="max-w-3xl w-full mx-auto">
              <div className="flex gap-2 items-end bg-surface-container-low rounded-xl border border-border-subtle px-3 py-2 focus-within:border-primary/40 focus-within:shadow-ai-glow transition-all">
                <IconButton size="small" disabled={busy}>
                  <Icon name="attach_file" className="text-[20px]" />
                </IconButton>
                <TextField
                  multiline
                  maxRows={6}
                  placeholder="Ask about quantities, scope, revisions… type @ to mention a classification"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      ask(input);
                    }
                  }}
                  disabled={busy || !project}
                  fullWidth
                  variant="standard"
                  InputProps={{ disableUnderline: true, sx: { py: 1, fontSize: 14 } }}
                />
                <Button
                  variant="contained"
                  disabled={busy || !input.trim()}
                  endIcon={<Icon name="send" className="text-[16px]" />}
                  onClick={() => ask(input)}
                  sx={{ minWidth: 0 }}
                >
                  Send
                </Button>
              </div>
              <p className="mt-2 text-[10px] font-mono text-outline flex items-center gap-2">
                <Icon name="lock" className="text-[12px]" /> Server-side Anthropic API · system context cached
              </p>
            </div>
          </div>
        </div>

        {/* Right rail: tool calls */}
        <aside className="border-l border-border-subtle bg-canvas-white p-4 overflow-y-auto">
          <h4 className="font-display text-headline-sm mb-3 flex items-center gap-2">
            <Icon name="construction" className="text-primary" /> Tool invocations
          </h4>
          <p className="text-label-sm text-on-surface-variant mb-4">
            Every numeric answer is sourced from a structured tool — never invented by the LLM.
          </p>
          <ToolList messages={messages} />
        </aside>
      </div>
    </div>
  );
}

function MessageView({ message }: { message: Message }) {
  const isUser = message.role === "user";
  return (
    <div className={cn("flex gap-3", isUser && "flex-row-reverse")}>
      <div
        className={cn(
          "w-8 h-8 rounded-full flex items-center justify-center shrink-0",
          isUser ? "bg-primary-container text-on-primary-container" : "bg-sidebar-navy text-canvas-white"
        )}
      >
        <Icon name={isUser ? "person" : "auto_awesome"} className="text-[18px]" filled={!isUser} />
      </div>
      <div className={cn("max-w-[80%]", isUser && "text-right")}>
        <div
          className={cn(
            "rounded-2xl px-4 py-3 inline-block text-body-md leading-relaxed",
            isUser ? "bg-primary text-canvas-white" : "bg-surface-container-low text-on-background"
          )}
        >
          {message.text}
        </div>
        {message.citations && message.citations.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-2">
            {message.citations.map((c, i) => (
              <button
                key={i}
                title={c.label}
                className="px-2 py-0.5 rounded-md bg-canvas-white border border-border-subtle text-[10px] font-mono text-on-surface-variant hover:border-primary hover:text-primary transition-colors"
              >
                {c.kind === "sheet" && "📄 "}
                {c.kind === "spec" && "📐 "}
                {c.kind === "item" && "🔵 "}
                {c.ref}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function ToolList({ messages }: { messages: Message[] }) {
  const calls = messages.flatMap((m) => m.toolCalls ?? []);
  if (calls.length === 0) {
    return (
      <div className="text-label-sm text-on-surface-variant border border-dashed border-border-subtle rounded-lg p-4 text-center">
        Tool calls will appear here as the assistant answers.
      </div>
    );
  }
  return (
    <div className="space-y-3">
      {calls.map((c, i) => (
        <div key={i} className="border border-border-subtle rounded-lg p-3 bg-surface-container-low">
          <div className="flex items-center gap-2 mb-1">
            <Icon name="terminal" className="text-primary text-[16px]" />
            <span className="font-mono text-data-sm font-semibold">{c.name}()</span>
          </div>
          <div className="font-mono text-[11px] text-on-surface-variant bg-canvas-white rounded p-2 border border-border-subtle mb-2">
            {c.argument}
          </div>
          <div className="font-mono text-[11px] text-success-green flex items-start gap-1">
            <Icon name="check_circle" className="text-[14px] mt-0.5" filled /> {c.result}
          </div>
        </div>
      ))}
    </div>
  );
}

function synthesize(q: string, project: string): { text: string; citations: Citation[]; toolCalls: ToolCall[] } {
  const Q = q.toLowerCase();
  if (Q.includes("drywall") || Q.includes("gwb")) {
    return {
      text: `Across all sheets in ${project}, total interior drywall is 1,840 LF — broken out below by zone. Highest concentration is on level 2 corridors (632 LF). Numbers are sourced from a single tool call on the canonical takeoff index.`,
      citations: [
        { kind: "sheet", ref: "A-201", label: "Second floor plan" },
        { kind: "sheet", ref: "A-202", label: "Second floor RCP" },
        { kind: "item", ref: "TI-1138", label: "Corridor C3 drywall" },
      ],
      toolCalls: [
        {
          name: "query_quantities",
          argument: `{ "classification": "09 21 16", "unit": "LF" }`,
          result: `1840 LF across 12 sheets`,
        },
      ],
    };
  }
  if (Q.includes("paint")) {
    return {
      text: `The painting scope covers 12,420 SF of interior walls and 4,180 SF of ceilings. The eggshell finish (PT-1) dominates, with PT-2 (semi-gloss) reserved for restrooms and trim. Sourced from spec 09 91 23.`,
      citations: [
        { kind: "spec", ref: "09 91 23", label: "Interior painting spec" },
        { kind: "sheet", ref: "A-101", label: "First floor plan" },
      ],
      toolCalls: [
        { name: "lookup_spec_section", argument: `"09 91 23"`, result: "PT-1, PT-2 finish schedule loaded" },
        { name: "query_quantities", argument: `{ "csi": "09 91 23" }`, result: "12420 SF (walls) + 4180 SF (ceilings)" },
      ],
    };
  }
  if (Q.includes("revision") || Q.includes("rev b") || Q.includes("rev c")) {
    return {
      text: `Comparing Rev B vs Rev C: 7 rooms grew (largest delta: Conf. Room +28 SF), 3 shrank, 2 were renamed, 0 were deleted. Net area change: +112 SF.`,
      citations: [
        { kind: "item", ref: "TI-0902", label: "Conference Room area" },
        { kind: "sheet", ref: "A-101", label: "First floor plan" },
      ],
      toolCalls: [
        { name: "compare_revisions", argument: `{ "from": "B", "to": "C" }`, result: "7 grew, 3 shrank, 2 renamed, 0 deleted" },
      ],
    };
  }
  if (Q.includes("symbol") || Q.includes("door")) {
    return {
      text: `Hardware set H-2 has 47 matched door instances. 41 are on level 1, 6 on level 2. The detection model used confidence ≥ 0.85 for accepted matches.`,
      citations: [{ kind: "spec", ref: "08 71 00", label: "Door hardware" }],
      toolCalls: [
        { name: "search_symbols", argument: `{ "hardware_set": "H-2" }`, result: "47 matches @ avg conf 0.91" },
      ],
    };
  }
  return {
    text: `Here's what I see for "${q}" — based on this project's compact context. (Mocked response — connect to Anthropic API to ship live answers.)`,
    citations: [{ kind: "sheet", ref: "A-101", label: "First floor plan" }],
    toolCalls: [
      { name: "query_quantities", argument: `{ "query": "${q}" }`, result: "stub: replace with Claude tool call" },
    ],
  };
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}
