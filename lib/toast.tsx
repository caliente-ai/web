"use client";

import { createContext, useCallback, useContext, useState, type ReactNode } from "react";
import clsx from "clsx";

export type ToastKind = "success" | "info" | "warning" | "error";
type Toast = { id: number; kind: ToastKind; message: string };

const ToastCtx = createContext<{ push: (kind: ToastKind, message: string) => void } | null>(null);

export function useToast() {
  const ctx = useContext(ToastCtx);
  if (!ctx) throw new Error("useToast must be used inside <ToastProvider>");
  return ctx;
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<Toast[]>([]);

  const push = useCallback((kind: ToastKind, message: string) => {
    const id = Date.now() + Math.random();
    setItems((prev) => [...prev, { id, kind, message }]);
    setTimeout(() => setItems((prev) => prev.filter((t) => t.id !== id)), 3800);
  }, []);

  return (
    <ToastCtx.Provider value={{ push }}>
      {children}
      <div className="fixed bottom-4 right-4 z-[9999] flex flex-col gap-2 max-w-sm">
        {items.map((t) => (
          <div
            key={t.id}
            className="bg-sidebar-navy text-canvas-white rounded-lg shadow-xl pl-3 pr-4 py-3 flex items-start gap-3 min-w-[280px] animate-pulse-subtle"
          >
            <span
              className={clsx(
                "w-1.5 self-stretch rounded-full",
                t.kind === "success" && "bg-success-green",
                t.kind === "info" && "bg-primary",
                t.kind === "warning" && "bg-warning-amber",
                t.kind === "error" && "bg-error-red"
              )}
            />
            <span className="text-body-md text-body-md leading-snug">{t.message}</span>
          </div>
        ))}
      </div>
    </ToastCtx.Provider>
  );
}
