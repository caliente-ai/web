"use client";

import { useRouter } from "next/navigation";
import { Icon } from "./Icon";
import { Kbd } from "./Kbd";
import { useCommandPalette } from "@/lib/command-palette";
import type { ReactNode } from "react";

export function TopBar({
  title,
  subtitle,
  actions,
}: {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
}) {
  const router = useRouter();
  const { setOpen } = useCommandPalette();

  return (
    <header className="sticky top-0 z-30 h-16 bg-canvas-white/85 backdrop-blur-glass border-b border-border-subtle flex items-center px-margin-desktop gap-6">
      <button
        type="button"
        onClick={() => router.back()}
        className="w-9 h-9 flex items-center justify-center rounded-lg text-on-surface-variant hover:bg-surface-container-low transition-colors"
      >
        <Icon name="arrow_back" className="text-[20px]" />
      </button>
      <div className="flex-1 min-w-0">
        <h1 className="font-display text-headline-md font-bold text-on-background truncate">{title}</h1>
        {subtitle && <p className="text-label-sm text-on-surface-variant truncate">{subtitle}</p>}
      </div>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="hidden md:flex items-center gap-2 px-3 h-9 rounded-lg bg-surface-container-low hover:bg-surface-container transition-colors text-body-sm text-on-surface-variant"
      >
        <Icon name="search" className="text-[18px]" />
        <span>Quick jump</span>
        <Kbd>⌘K</Kbd>
      </button>
      <div className="flex items-center gap-2">{actions}</div>
    </header>
  );
}
