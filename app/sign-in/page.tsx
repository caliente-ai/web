"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { Button, TextField, CircularProgress, Divider } from "@mui/material";
import { useAuth } from "@/lib/stores/auth";
import { useToast } from "@/lib/toast";
import { Icon } from "@/components/Icon";

export default function SignInPage() {
  const router = useRouter();
  const params = useSearchParams();
  const signIn = useAuth((s) => s.signIn);
  const session = useAuth((s) => s.session);
  const { push } = useToast();
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (session) router.replace("/dashboard");
  }, [session, router]);

  useEffect(() => {
    if (params.get("signedOut")) push("info", "Signed out");
  }, [params, push]);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.includes("@")) {
      push("error", "Enter a valid email address");
      return;
    }
    setBusy(true);
    setTimeout(() => {
      signIn(email);
      push("success", "Welcome back");
      router.replace("/dashboard");
    }, 600);
  }

  function quick(emailToUse: string, name: string) {
    setBusy(true);
    setTimeout(() => {
      signIn(emailToUse, name);
      push("success", `Signed in as ${name}`);
      router.replace("/dashboard");
    }, 300);
  }

  return (
    <div className="min-h-screen flex">
      {/* Left form pane */}
      <div className="w-full lg:w-[480px] bg-canvas-white flex flex-col p-margin-desktop">
        <div className="flex items-center gap-3 mb-12">
          <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center shadow-ai-glow">
            <Icon name="architecture" filled className="text-canvas-white" />
          </div>
          <div>
            <h1 className="font-display text-headline-md font-bold tracking-tight">ProEstimator AI</h1>
            <p className="text-label-sm text-on-surface-variant">Agentic Precision v2.4</p>
          </div>
        </div>

        <div className="flex-1 flex flex-col justify-center max-w-[360px]">
          <h2 className="font-display text-display-lg text-on-background mb-2">Welcome back</h2>
          <p className="text-body-md text-on-surface-variant mb-8">
            Sign in to your construction takeoff workspace.
          </p>

          <form onSubmit={submit} className="flex flex-col gap-4">
            <TextField
              label="Work email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="estimator@firm.com"
              disabled={busy}
              fullWidth
              autoFocus
            />
            <Button
              type="submit"
              variant="contained"
              size="large"
              disabled={busy}
              startIcon={busy ? <CircularProgress size={16} color="inherit" /> : <Icon name="login" />}
              sx={{ py: 1.25 }}
            >
              {busy ? "Signing in…" : "Continue with email"}
            </Button>
          </form>

          <Divider sx={{ my: 3 }}>
            <span className="text-label-sm text-outline">or quick demo as</span>
          </Divider>

          <div className="grid grid-cols-2 gap-2">
            <Button
              variant="outlined"
              size="small"
              disabled={busy}
              onClick={() => quick("itsik@caliente.io", "Itsik Nanikashvili")}
              startIcon={<Icon name="person" className="text-[16px]" />}
            >
              Owner
            </Button>
            <Button
              variant="outlined"
              size="small"
              disabled={busy}
              onClick={() => quick("estimator@caliente.io", "Maya Patel")}
              startIcon={<Icon name="square_foot" className="text-[16px]" />}
            >
              Estimator
            </Button>
          </div>

          <p className="mt-8 text-label-sm text-on-surface-variant">
            New here?{" "}
            <button
              type="button"
              onClick={() => quick(`trial+${Date.now()}@caliente.io`, "Trial User")}
              className="text-primary font-semibold hover:underline"
            >
              Start a free trial →
            </button>
          </p>
        </div>

        <p className="mt-8 text-label-sm text-outline">
          © 2026 Caliente Solutions · Powered by Clerk (mocked locally)
        </p>
      </div>

      {/* Right marketing pane */}
      <div className="hidden lg:flex flex-1 bg-sidebar-navy relative overflow-hidden">
        <div className="absolute inset-0 cad-grid opacity-10" />
        <div className="relative z-10 flex flex-col justify-end p-margin-desktop w-full">
          <div className="max-w-lg">
            <p className="text-label-caps uppercase tracking-widest text-primary mb-3">
              Construction Takeoff · Reinvented
            </p>
            <h3 className="font-display text-display-hero text-canvas-white leading-[1.1] mb-6">
              Measure plans <span className="text-primary">10× faster</span> with agentic AI.
            </h3>
            <p className="text-body-lg text-secondary-fixed-dim mb-8">
              Upload a PDF, let the agent detect walls, rooms, and symbols, then verify everything in a
              fluid 2D editor that feels like Figma but talks like a senior estimator.
            </p>
            <div className="grid grid-cols-3 gap-4 text-center">
              <Stat label="Takeoff speed" value="10×" />
              <Stat label="OCR recall" value="98%" />
              <Stat label="Avg sheets / project" value="120" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-white/5 border border-white/10 rounded-xl py-3">
      <div className="font-display text-display-lg text-canvas-white">{value}</div>
      <div className="text-label-sm text-secondary-fixed-dim mt-1">{label}</div>
    </div>
  );
}
