"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Icon } from "./Icon";
import { cn } from "@/lib/cn";
import { useAuth } from "@/lib/stores/auth";
import { useCommandPalette } from "@/lib/command-palette";
import { Kbd } from "./Kbd";

type NavItem = { href: string; label: string; icon: string };

const NAV: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: "dashboard" },
  { href: "/upload", label: "Upload PDF", icon: "cloud_upload" },
  { href: "/assistant", label: "Project Assistant", icon: "psychology" },
  { href: "/detect", label: "AI Detect Review", icon: "auto_fix" },
  { href: "/symbols", label: "Symbol Search", icon: "search" },
  { href: "/revisions", label: "Revisions Diff", icon: "compare" },
];

const SECONDARY: NavItem[] = [
  { href: "/audit", label: "Audit Log", icon: "history" },
  { href: "/settings", label: "Org Settings", icon: "settings" },
  { href: "/billing", label: "Billing", icon: "credit_card" },
];

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const session = useAuth((s) => s.session);
  const signOut = useAuth((s) => s.signOut);
  const { setOpen } = useCommandPalette();

  function handleSignOut() {
    signOut();
    router.push("/sign-in?signedOut=1");
  }

  function isActive(href: string) {
    if (href === "/dashboard") return pathname === href || pathname?.startsWith("/projects");
    return pathname?.startsWith(href);
  }

  return (
    <aside className="fixed left-0 top-0 h-screen w-sidebar-width flex flex-col bg-sidebar-navy z-50 border-r border-white/5">
      <div className="flex flex-col h-full p-4 gap-2">
        {/* Brand */}
        <Link href="/dashboard" className="flex items-center gap-3 mb-6 px-2 group">
          <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center shadow-ai-glow group-hover:shadow-ai-glow-strong transition-shadow">
            <Icon name="architecture" className="text-canvas-white" filled />
          </div>
          <div>
            <h1 className="font-display text-headline-md font-bold tracking-tight text-canvas-white leading-none">
              ProEstimator AI
            </h1>
            <p className="text-label-sm text-secondary-fixed-dim mt-1">Agentic Precision v2.4</p>
          </div>
        </Link>

        {/* Primary CTA */}
        <Link
          href="/upload"
          className="bg-primary text-on-primary text-headline-sm py-3 px-4 rounded-xl mb-4 flex items-center justify-center gap-2 hover:opacity-90 active:scale-[0.98] transition-all shadow-ai-glow"
        >
          <Icon name="add" />
          New Estimate
        </Link>

        {/* Command palette trigger */}
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="flex items-center gap-2 px-3 py-2 mb-4 rounded-lg bg-white/5 text-secondary-fixed-dim hover:bg-white/10 hover:text-canvas-white transition-colors text-body-sm"
        >
          <Icon name="search" className="text-[18px]" />
          <span className="flex-1 text-left">Quick jump…</span>
          <Kbd className="bg-white/5 border-white/10 text-secondary-fixed-dim">⌘K</Kbd>
        </button>

        {/* Navigation */}
        <nav className="flex-1 flex flex-col gap-1 overflow-y-auto no-scrollbar">
          {NAV.map((item) => (
            <NavLink key={item.href} item={item} active={isActive(item.href)} />
          ))}

          <div className="my-3 border-t border-white/5" />
          <p className="text-label-sm text-outline-variant uppercase tracking-widest px-3 mb-1">Management</p>
          {SECONDARY.map((item) => (
            <NavLink key={item.href} item={item} active={isActive(item.href)} />
          ))}
        </nav>

        {/* Account block */}
        <div className="mt-auto border-t border-white/5 pt-3">
          <div className="flex items-center gap-3 px-2 py-2">
            <div className="w-9 h-9 rounded-full bg-primary-container text-on-primary-container flex items-center justify-center font-bold text-body-sm">
              {session?.initials ?? "JD"}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-label-sm text-canvas-white truncate">{session?.name ?? "Guest"}</div>
              <div className="text-[10px] text-secondary-fixed-dim truncate">{session?.orgName ?? "—"}</div>
            </div>
            <button
              type="button"
              onClick={handleSignOut}
              title="Sign out"
              className="p-1.5 text-secondary-fixed-dim hover:text-canvas-white hover:bg-white/5 rounded-md transition-colors"
            >
              <Icon name="logout" className="text-[18px]" />
            </button>
          </div>
        </div>
      </div>
    </aside>
  );
}

function NavLink({ item, active }: { item: NavItem; active: boolean }) {
  return (
    <Link
      href={item.href}
      className={cn(
        "flex items-center gap-3 py-2 px-3 rounded-xl transition-all",
        active
          ? "glass text-canvas-white shadow-ai-glow"
          : "text-secondary-fixed-dim hover:bg-white/5 hover:text-canvas-white"
      )}
    >
      <Icon name={item.icon} filled={active} className="text-[20px]" />
      <span className="text-body-md">{item.label}</span>
    </Link>
  );
}
