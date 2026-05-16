// Floating screen switcher injected into every Stitch screen.
// Lets you jump between the 11 mockup routes without leaving the visual chrome.
(function () {
  if (window.__siteNavMounted) return;
  window.__siteNavMounted = true;

  const SCREENS = [
    { slug: "signin", label: "1. Sign-in", icon: "login" },
    { slug: "dashboard", label: "2. Dashboard", icon: "dashboard" },
    { slug: "upload", label: "3. Upload", icon: "cloud_upload" },
    { slug: "editor", label: "4. Editor + Takeoff", icon: "architecture" },
    { slug: "chat", label: "5. Chat", icon: "forum" },
    { slug: "detect", label: "6. AI Detect", icon: "auto_fix" },
    { slug: "symbols", label: "7. Symbol Search", icon: "search" },
    { slug: "revisions", label: "8. Revisions Diff", icon: "compare" },
    { slug: "audit", label: "9. Audit Log", icon: "history" },
    { slug: "settings", label: "10. Org Settings", icon: "settings" },
    { slug: "billing", label: "11. Billing", icon: "credit_card" },
  ];

  const here = (location.pathname.match(/\/screens\/([^/]+)\.html$/) || [])[1] || "";

  const root = document.createElement("div");
  root.id = "__site_nav";
  root.style.cssText = `
    position: fixed; right: 16px; bottom: 16px; z-index: 9999;
    font-family: Inter, system-ui, sans-serif;
  `;

  const btn = document.createElement("button");
  btn.type = "button";
  btn.innerHTML = `
    <span class="material-symbols-outlined" style="font-size:18px; vertical-align:middle">apps</span>
    <span style="margin-left:6px; font-size:12px; font-weight:600; letter-spacing:0.02em">All screens</span>
    <span style="margin-left:8px; opacity:.6; font-size:10px; font-family:'JetBrains Mono',monospace">${here || "home"}</span>
  `;
  btn.style.cssText = `
    background: #0f172a; color: #f8fafc; border: 1px solid #1e293b;
    border-radius: 999px; padding: 10px 16px; cursor: pointer;
    box-shadow: 0 8px 24px rgba(15,23,42,.18);
    display: inline-flex; align-items: center;
  `;
  root.appendChild(btn);

  const menu = document.createElement("div");
  menu.style.cssText = `
    position: absolute; right: 0; bottom: 56px;
    background: #ffffff; color: #0f172a; min-width: 280px;
    border: 1px solid #e2e8f0; border-radius: 8px;
    box-shadow: 0 24px 48px rgba(15,23,42,.18);
    padding: 6px; display: none;
  `;

  const header = document.createElement("div");
  header.style.cssText = `
    padding: 8px 12px 6px; font-size: 10px; letter-spacing: .08em;
    text-transform: uppercase; color: #64748b; font-weight: 700;
  `;
  header.textContent = "Mockup screens";
  menu.appendChild(header);

  SCREENS.forEach((s) => {
    const a = document.createElement("a");
    a.href = `/screens/${s.slug}.html`;
    const active = s.slug === here;
    a.style.cssText = `
      display: flex; align-items: center; gap: 8px;
      padding: 8px 12px; border-radius: 4px; text-decoration: none;
      color: ${active ? "#ffffff" : "#0f172a"};
      background: ${active ? "#2563eb" : "transparent"};
      font-size: 13px; font-weight: 500;
    `;
    a.innerHTML = `
      <span class="material-symbols-outlined" style="font-size:18px">${s.icon}</span>
      <span>${s.label}</span>
    `;
    a.addEventListener("mouseenter", () => {
      if (!active) a.style.background = "#f1f5f9";
    });
    a.addEventListener("mouseleave", () => {
      if (!active) a.style.background = "transparent";
    });
    menu.appendChild(a);
  });

  const home = document.createElement("a");
  home.href = "/index.html";
  home.style.cssText = `
    display: block; margin-top: 4px; padding: 8px 12px;
    border-top: 1px solid #e2e8f0; color: #64748b; font-size: 11px;
    font-family: 'JetBrains Mono', monospace; text-decoration: none;
  `;
  home.textContent = "← back to overview";
  menu.appendChild(home);

  root.appendChild(menu);
  document.body.appendChild(root);

  btn.addEventListener("click", () => {
    menu.style.display = menu.style.display === "block" ? "none" : "block";
  });
  document.addEventListener("click", (e) => {
    if (!root.contains(e.target)) menu.style.display = "none";
  });
  // Keyboard shortcut: '?' toggles the menu, arrow keys jump prev/next
  document.addEventListener("keydown", (e) => {
    if (e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA") return;
    if (e.key === "?") {
      menu.style.display = menu.style.display === "block" ? "none" : "block";
    }
    if (e.key === "ArrowRight" && e.altKey) {
      const idx = SCREENS.findIndex((s) => s.slug === here);
      const next = SCREENS[(idx + 1) % SCREENS.length];
      location.href = `/screens/${next.slug}.html`;
    }
    if (e.key === "ArrowLeft" && e.altKey) {
      const idx = SCREENS.findIndex((s) => s.slug === here);
      const prev = SCREENS[(idx - 1 + SCREENS.length) % SCREENS.length];
      location.href = `/screens/${prev.slug}.html`;
    }
  });
})();
