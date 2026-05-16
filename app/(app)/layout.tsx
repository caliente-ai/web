"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Sidebar } from "@/components/Sidebar";
import { useAuth } from "@/lib/stores/auth";
import { useProjects } from "@/lib/stores/projects";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const session = useAuth((s) => s.session);
  const hydrate = useProjects((s) => s.hydrate);

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  useEffect(() => {
    if (!session) router.replace("/sign-in");
  }, [session, router]);

  if (!session) return null;

  return (
    <div className="min-h-screen bg-background">
      <Sidebar />
      <div className="pl-sidebar-width">{children}</div>
    </div>
  );
}
