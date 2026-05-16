"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { useAuth } from "@/lib/stores/auth";

export default function RootRedirect() {
  const router = useRouter();
  const session = useAuth((s) => s.session);

  useEffect(() => {
    router.replace(session ? "/dashboard" : "/sign-in");
  }, [router, session]);

  return (
    <div className="h-screen flex items-center justify-center text-on-surface-variant">
      <div className="flex items-center gap-2">
        <span className="material-symbols-outlined animate-pulse-subtle">architecture</span>
        <span className="font-mono text-body-sm">loading…</span>
      </div>
    </div>
  );
}
