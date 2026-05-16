"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

export type Session = {
  userId: string;
  email: string;
  name: string;
  initials: string;
  orgId: string;
  orgName: string;
  role: "owner" | "admin" | "estimator" | "viewer";
};

type AuthState = {
  session: Session | null;
  signIn: (email: string, name?: string) => Session;
  signOut: () => void;
};

function initials(name: string) {
  const parts = name.trim().split(/\s+/);
  return ((parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? "")).toUpperCase() || "JD";
}

export const useAuth = create<AuthState>()(
  persist(
    (set) => ({
      session: null,
      signIn: (email, name) => {
        const display = name ?? email.split("@")[0].replace(/\W+/g, " ").replace(/\b\w/g, (m) => m.toUpperCase());
        const s: Session = {
          userId: `usr_${Math.random().toString(36).slice(2, 10)}`,
          email,
          name: display,
          initials: initials(display),
          orgId: "org_caliente",
          orgName: "Caliente Solutions",
          role: "owner",
        };
        set({ session: s });
        return s;
      },
      signOut: () => set({ session: null }),
    }),
    { name: "pe.session" }
  )
);
