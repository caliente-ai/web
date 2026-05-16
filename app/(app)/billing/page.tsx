"use client";

import { Button, LinearProgress } from "@mui/material";
import { TopBar } from "@/components/TopBar";
import { Icon } from "@/components/Icon";
import { useToast } from "@/lib/toast";
import { cn } from "@/lib/cn";

const USAGE = {
  ocrPages: { used: 24_810, included: 50_000 },
  storage: { usedGB: 38.2, includedGB: 100 },
  aiCalls: { used: 412, included: 1500 },
  seats: { used: 4, included: 5 },
};

const INVOICES = [
  { id: "inv_001", date: "2026-04-01", amount: "$99.00", status: "paid" },
  { id: "inv_002", date: "2026-03-01", amount: "$99.00", status: "paid" },
  { id: "inv_003", date: "2026-02-01", amount: "$49.00", status: "paid" },
];

export default function BillingPage() {
  const { push } = useToast();

  return (
    <>
      <TopBar title="Billing & Usage" subtitle="Stripe-powered subscription · next invoice 2026-06-01" />
      <main className="px-margin-desktop py-8 max-w-5xl mx-auto space-y-6">
        {/* Plan card */}
        <section className="bg-gradient-to-br from-primary to-blue-700 text-canvas-white rounded-2xl p-6 shadow-ai-glow-strong">
          <div className="flex items-start justify-between flex-wrap gap-4">
            <div>
              <p className="text-label-caps uppercase tracking-widest opacity-80">Current plan</p>
              <h2 className="font-display text-display-lg mt-1">Pro · $99 / seat / mo</h2>
              <p className="text-body-md opacity-90 mt-2">4 of 5 seats used · next invoice on 2026-06-01</p>
            </div>
            <div className="flex flex-col gap-2">
              <Button
                variant="contained"
                onClick={() => push("info", "Opening Stripe Customer Portal (mocked)")}
                sx={{ bgcolor: "white", color: "primary.main", "&:hover": { bgcolor: "#f8fafc" } }}
              >
                Manage in Stripe
              </Button>
              <Button variant="outlined" color="inherit" onClick={() => push("success", "Upgraded to Scale")}>
                Upgrade to Scale
              </Button>
            </div>
          </div>
        </section>

        {/* Usage meters */}
        <section className="grid grid-cols-1 md:grid-cols-2 gap-gutter">
          <UsageCard
            title="OCR pages this month"
            icon="document_scanner"
            used={USAGE.ocrPages.used}
            included={USAGE.ocrPages.included}
            unit="pages"
            help="Google Document AI · $1.50 per 1k pages"
          />
          <UsageCard
            title="Object storage"
            icon="cloud"
            used={USAGE.storage.usedGB}
            included={USAGE.storage.includedGB}
            unit="GB"
            help="Cloudflare R2 · zero egress fees"
          />
          <UsageCard
            title="AI Detect runs"
            icon="psychology"
            used={USAGE.aiCalls.used}
            included={USAGE.aiCalls.included}
            unit="runs"
            help="U-Net inference on Fly.io GPU"
          />
          <UsageCard
            title="Member seats"
            icon="group"
            used={USAGE.seats.used}
            included={USAGE.seats.included}
            unit="seats"
            help="Add seats for $99 / seat / mo"
          />
        </section>

        {/* Recent invoices */}
        <section className="bg-canvas-white border border-border-subtle rounded-2xl overflow-hidden">
          <div className="px-5 py-4 border-b border-border-subtle flex items-center justify-between">
            <h3 className="font-display text-headline-md">Recent invoices</h3>
            <Button size="small" variant="outlined" startIcon={<Icon name="file_download" className="text-[16px]" />}>
              Download all
            </Button>
          </div>
          <table className="w-full">
            <thead className="bg-surface-container-low text-label-caps uppercase tracking-wider text-outline">
              <tr>
                <th className="text-left py-2 px-5">Invoice</th>
                <th className="text-left py-2 px-5">Date</th>
                <th className="text-left py-2 px-5">Amount</th>
                <th className="text-left py-2 px-5">Status</th>
                <th className="py-2 px-5"></th>
              </tr>
            </thead>
            <tbody>
              {INVOICES.map((i) => (
                <tr key={i.id} className="border-t border-border-subtle hover:bg-surface-container-low">
                  <td className="py-3 px-5 font-mono text-data-sm">{i.id}</td>
                  <td className="py-3 px-5 font-mono text-data-sm">{i.date}</td>
                  <td className="py-3 px-5 font-semibold">{i.amount}</td>
                  <td className="py-3 px-5">
                    <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase bg-success-green/10 text-success-green">
                      paid
                    </span>
                  </td>
                  <td className="py-3 px-5 text-right">
                    <button onClick={() => push("info", "PDF downloaded (mock)")} className="text-primary text-label-sm font-semibold hover:underline">
                      Download
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      </main>
    </>
  );
}

function UsageCard({ title, icon, used, included, unit, help }: { title: string; icon: string; used: number; included: number; unit: string; help: string }) {
  const pct = Math.min(100, Math.round((used / included) * 100));
  const tone = pct > 90 ? "error" : pct > 70 ? "warning" : "success";
  const barColor = { success: "bg-success-green", warning: "bg-warning-amber", error: "bg-error-red" }[tone];

  return (
    <div className="bg-canvas-white border border-border-subtle rounded-2xl p-5">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <Icon name={icon} className="text-primary" />
          <h4 className="font-headline-sm font-semibold">{title}</h4>
        </div>
        <span className="font-mono text-data-sm text-on-surface-variant">{pct}%</span>
      </div>
      <div className="flex items-baseline gap-2 mb-3">
        <span className="font-display text-display-lg font-bold">{used.toLocaleString()}</span>
        <span className="text-label-sm text-on-surface-variant">/ {included.toLocaleString()} {unit}</span>
      </div>
      <div className="h-2 bg-surface-container rounded-full overflow-hidden">
        <div className={cn("h-full transition-all", barColor)} style={{ width: `${pct}%` }} />
      </div>
      <p className="text-label-sm text-on-surface-variant mt-2">{help}</p>
    </div>
  );
}
