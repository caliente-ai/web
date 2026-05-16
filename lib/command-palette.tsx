"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";

export type Command = {
  id: string;
  label: string;
  hint?: string;
  icon: string; // material symbol name
  action: () => void;
  keywords?: string[];
};

const Ctx = createContext<{
  open: boolean;
  setOpen: (v: boolean) => void;
  register: (cmd: Command) => () => void;
} | null>(null);

export function useCommandPalette() {
  const c = useContext(Ctx);
  if (!c) throw new Error("CommandPalette must be inside CommandPaletteProvider");
  return c;
}

export function CommandPaletteProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [extra, setExtra] = useState<Command[]>([]);
  const [query, setQuery] = useState("");

  // Built-in nav commands
  const builtin = useMemo<Command[]>(
    () => [
      { id: "nav.dashboard", label: "Go to Dashboard", icon: "dashboard", action: () => router.push("/dashboard"), keywords: ["projects", "home"] },
      { id: "nav.upload", label: "Upload PDF", icon: "cloud_upload", action: () => router.push("/upload"), keywords: ["new"] },
      { id: "nav.assistant", label: "Open Project Assistant", icon: "psychology", action: () => router.push("/assistant"), keywords: ["chat", "ai"] },
      { id: "nav.audit", label: "Open Audit Log", icon: "history", action: () => router.push("/audit") },
      { id: "nav.settings", label: "Org Settings", icon: "settings", action: () => router.push("/settings") },
      { id: "nav.billing", label: "Billing & Usage", icon: "credit_card", action: () => router.push("/billing") },
      { id: "nav.signout", label: "Sign out", icon: "logout", action: () => router.push("/sign-in?signedOut=1") },
    ],
    [router]
  );

  const register = useCallback((cmd: Command) => {
    setExtra((prev) => [...prev.filter((c) => c.id !== cmd.id), cmd]);
    return () => setExtra((prev) => prev.filter((c) => c.id !== cmd.id));
  }, []);

  // ⌘K / Ctrl+K to open
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((v) => !v);
      }
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  useEffect(() => {
    if (!open) setQuery("");
  }, [open]);

  const all = [...builtin, ...extra];
  const filtered = all.filter((c) => {
    const q = query.trim().toLowerCase();
    if (!q) return true;
    return (
      c.label.toLowerCase().includes(q) ||
      (c.keywords ?? []).some((k) => k.toLowerCase().includes(q))
    );
  });

  return (
    <Ctx.Provider value={{ open, setOpen, register }}>
      {children}
      {open && (
        <div
          className="fixed inset-0 z-[9998] bg-sidebar-navy/40 backdrop-blur-sm flex items-start justify-center pt-24"
          onClick={() => setOpen(false)}
        >
          <div
            className="bg-canvas-white border border-border-subtle rounded-2xl shadow-2xl w-full max-w-xl mx-4 overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3 px-4 py-3 border-b border-border-subtle">
              <span className="material-symbols-outlined text-outline">search</span>
              <input
                autoFocus
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Type a command or jump to a screen..."
                className="flex-1 bg-transparent outline-none font-body-md text-body-md"
              />
              <kbd className="font-mono text-[10px] bg-surface-container-low border border-border-subtle px-1.5 py-0.5 rounded">esc</kbd>
            </div>
            <div className="max-h-80 overflow-y-auto p-2">
              {filtered.length === 0 && (
                <div className="px-4 py-8 text-center text-on-surface-variant text-body-sm">No commands match "{query}"</div>
              )}
              {filtered.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => {
                    c.action();
                    setOpen(false);
                  }}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left hover:bg-surface-container-low transition-colors"
                >
                  <span className="material-symbols-outlined text-outline">{c.icon}</span>
                  <span className="flex-1 text-body-md">{c.label}</span>
                  {c.hint && <span className="font-mono text-[10px] text-outline">{c.hint}</span>}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </Ctx.Provider>
  );
}
