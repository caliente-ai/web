"use client";

import { useState } from "react";
import { Button, Switch, TextField, Tab, Tabs, MenuItem, Select } from "@mui/material";
import { TopBar } from "@/components/TopBar";
import { Icon } from "@/components/Icon";
import { useAuth } from "@/lib/stores/auth";
import { useToast } from "@/lib/toast";
import { cn } from "@/lib/cn";

type Member = {
  id: string;
  name: string;
  email: string;
  role: "owner" | "admin" | "estimator" | "viewer" | "subcontractor";
  initials: string;
  color: string;
  status: "active" | "pending";
};

const MEMBERS_SEED: Member[] = [
  { id: "u1", name: "Itsik Nanikashvili", email: "itsik@caliente.io", role: "owner", initials: "IN", color: "#dbeafe", status: "active" },
  { id: "u2", name: "Maya Patel", email: "maya@caliente.io", role: "admin", initials: "MP", color: "#ede9fe", status: "active" },
  { id: "u3", name: "Alex Stone", email: "alex@caliente.io", role: "estimator", initials: "AS", color: "#dcfce7", status: "active" },
  { id: "u4", name: "Riley Lee", email: "riley@caliente.io", role: "estimator", initials: "RL", color: "#fee2e2", status: "active" },
  { id: "u5", name: "Pending invite", email: "subcontractor@partner.com", role: "subcontractor", initials: "PE", color: "#fef3c7", status: "pending" },
];

export default function SettingsPage() {
  const [tab, setTab] = useState(0);
  const session = useAuth((s) => s.session);
  const { push } = useToast();
  const [members, setMembers] = useState(MEMBERS_SEED);
  const [inviteEmail, setInviteEmail] = useState("");
  const [orgName, setOrgName] = useState(session?.orgName ?? "Caliente Solutions");

  return (
    <>
      <TopBar title="Organization Settings" subtitle={`${members.length} members · ${members.filter((m) => m.status === "active").length} active`} />
      <main className="px-margin-desktop py-8 max-w-5xl mx-auto">
        <Tabs value={tab} onChange={(_e, v) => setTab(v)} sx={{ borderBottom: 1, borderColor: "divider", mb: 4 }}>
          <Tab label="General" />
          <Tab label="Members" />
          <Tab label="API Keys" />
          <Tab label="Integrations" />
        </Tabs>

        {tab === 0 && (
          <section className="space-y-6">
            <Card title="Organization details" description="Visible across all projects.">
              <div className="grid sm:grid-cols-2 gap-4">
                <TextField label="Organization name" value={orgName} onChange={(e) => setOrgName(e.target.value)} fullWidth />
                <TextField label="Org ID" value={session?.orgId ?? "org_caliente"} disabled fullWidth />
                <TextField label="Primary domain" placeholder="caliente.io" fullWidth />
                <TextField label="Default unit system" select defaultValue="imperial" fullWidth>
                  <MenuItem value="imperial">Imperial (feet, SF)</MenuItem>
                  <MenuItem value="metric">Metric (m, m²)</MenuItem>
                </TextField>
              </div>
              <div className="mt-4 flex justify-end">
                <Button variant="contained" onClick={() => push("success", "Settings saved")}>Save changes</Button>
              </div>
            </Card>

            <Card title="Workspace preferences" description="Apply defaults for new projects.">
              <ToggleRow
                label="Auto-detect rooms on upload"
                desc="Runs U-Net segmentation as soon as the ingest pipeline finishes."
                defaultChecked
              />
              <ToggleRow
                label="Strict RLS testing on every PR"
                desc="Run the cross_tenant chaos suite on every CI build."
                defaultChecked
              />
              <ToggleRow
                label="Enable Project Assistant (chat)"
                desc="Loads compact JSON context per chat session. Cost ~$0.04–0.12 per session."
                defaultChecked
              />
            </Card>

            <Card title="Danger zone" tone="error">
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-headline-sm font-semibold">Delete organization</div>
                  <p className="text-label-sm text-on-surface-variant">All projects, sheets, and members will be unrecoverable after 30 days.</p>
                </div>
                <Button variant="outlined" color="error" onClick={() => push("warning", "Deletion is disabled in this build")}>Delete org</Button>
              </div>
            </Card>
          </section>
        )}

        {tab === 1 && (
          <section className="space-y-6">
            <Card title="Invite a teammate" description="Members receive an email and join your workspace.">
              <div className="flex gap-2">
                <TextField
                  size="small"
                  placeholder="teammate@firm.com"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  fullWidth
                />
                <Select size="small" defaultValue="estimator">
                  <MenuItem value="admin">Admin</MenuItem>
                  <MenuItem value="estimator">Estimator</MenuItem>
                  <MenuItem value="viewer">Viewer</MenuItem>
                  <MenuItem value="subcontractor">Subcontractor</MenuItem>
                </Select>
                <Button
                  variant="contained"
                  disabled={!inviteEmail.includes("@")}
                  startIcon={<Icon name="group_add" className="text-[16px]" />}
                  onClick={() => {
                    setMembers((p) => [
                      ...p,
                      {
                        id: `u_${Date.now()}`,
                        name: "Pending invite",
                        email: inviteEmail,
                        role: "estimator",
                        initials: inviteEmail.slice(0, 2).toUpperCase(),
                        color: "#fef3c7",
                        status: "pending",
                      },
                    ]);
                    push("success", `Invite sent to ${inviteEmail}`);
                    setInviteEmail("");
                  }}
                >
                  Invite
                </Button>
              </div>
            </Card>

            <Card title="Members">
              <table className="w-full">
                <thead className="text-label-caps uppercase text-outline">
                  <tr>
                    <th className="text-left py-2">Person</th>
                    <th className="text-left py-2">Role</th>
                    <th className="text-left py-2">Status</th>
                    <th className="py-2"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border-subtle">
                  {members.map((m) => (
                    <tr key={m.id}>
                      <td className="py-2.5">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full flex items-center justify-center text-[10px] font-bold" style={{ background: m.color }}>
                            {m.initials}
                          </div>
                          <div>
                            <div className="text-body-md font-semibold">{m.name}</div>
                            <div className="text-label-sm text-on-surface-variant">{m.email}</div>
                          </div>
                        </div>
                      </td>
                      <td className="py-2.5">
                        <Select
                          size="small"
                          value={m.role}
                          onChange={(e) => {
                            const r = e.target.value as Member["role"];
                            setMembers((p) => p.map((x) => (x.id === m.id ? { ...x, role: r } : x)));
                            push("info", `${m.name}'s role updated`);
                          }}
                          disabled={m.role === "owner"}
                        >
                          <MenuItem value="owner">Owner</MenuItem>
                          <MenuItem value="admin">Admin</MenuItem>
                          <MenuItem value="estimator">Estimator</MenuItem>
                          <MenuItem value="viewer">Viewer</MenuItem>
                          <MenuItem value="subcontractor">Subcontractor</MenuItem>
                        </Select>
                      </td>
                      <td className="py-2.5">
                        <span className={cn("px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase", m.status === "active" ? "bg-success-green/10 text-success-green" : "bg-warning-amber/10 text-warning-amber")}>
                          {m.status}
                        </span>
                      </td>
                      <td className="py-2.5 text-right">
                        {m.role !== "owner" && (
                          <button
                            onClick={() => {
                              setMembers((p) => p.filter((x) => x.id !== m.id));
                              push("info", `Removed ${m.name}`);
                            }}
                            className="text-outline hover:text-error-red text-label-sm font-semibold"
                          >
                            Remove
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Card>
          </section>
        )}

        {tab === 2 && (
          <Card title="API Keys" description="Use these to script project access from CI.">
            <div className="bg-surface-container-low border border-border-subtle rounded-lg p-4 mb-4 flex items-center gap-3">
              <Icon name="key" className="text-primary" />
              <span className="font-mono text-data-sm flex-1">pk_live_caliente_••••••••••••cD7A</span>
              <Button size="small" variant="outlined" onClick={() => push("success", "Key copied to clipboard")}>Copy</Button>
              <Button size="small" variant="outlined" color="error" onClick={() => push("warning", "Key rotated")}>Rotate</Button>
            </div>
            <Button variant="contained" startIcon={<Icon name="add" />} onClick={() => push("success", "New key issued")}>
              Issue new key
            </Button>
          </Card>
        )}

        {tab === 3 && (
          <div className="grid sm:grid-cols-2 gap-gutter">
            {[
              { name: "Procore", desc: "Sync projects + RFIs", icon: "construction", enabled: false },
              { name: "Sage Intacct", desc: "Push cost codes", icon: "calculate", enabled: true },
              { name: "Slack", desc: "Channel alerts per project", icon: "forum", enabled: true },
              { name: "Linear", desc: "Mirror RFIs as issues", icon: "task_alt", enabled: false },
            ].map((i) => (
              <div key={i.name} className="bg-canvas-white border border-border-subtle rounded-2xl p-5">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center">
                      <Icon name={i.icon} className="text-primary" />
                    </div>
                    <div>
                      <div className="font-headline-sm font-semibold">{i.name}</div>
                      <div className="text-label-sm text-on-surface-variant">{i.desc}</div>
                    </div>
                  </div>
                  <Switch defaultChecked={i.enabled} onChange={(_e, v) => push("info", `${i.name} ${v ? "enabled" : "disabled"}`)} />
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </>
  );
}

function Card({ title, description, children, tone }: { title: string; description?: string; children: React.ReactNode; tone?: "default" | "error" }) {
  return (
    <div className={cn("bg-canvas-white border rounded-2xl p-5", tone === "error" ? "border-error-red/40" : "border-border-subtle")}>
      <h3 className="font-display text-headline-md font-bold">{title}</h3>
      {description && <p className="text-label-sm text-on-surface-variant mt-1 mb-4">{description}</p>}
      <div className={description ? "" : "mt-4"}>{children}</div>
    </div>
  );
}

function ToggleRow({ label, desc, defaultChecked = false }: { label: string; desc: string; defaultChecked?: boolean }) {
  return (
    <div className="flex items-start justify-between py-3 border-b border-border-subtle last:border-b-0">
      <div className="flex-1 pr-6">
        <div className="text-body-md font-semibold">{label}</div>
        <div className="text-label-sm text-on-surface-variant mt-0.5">{desc}</div>
      </div>
      <Switch defaultChecked={defaultChecked} />
    </div>
  );
}
