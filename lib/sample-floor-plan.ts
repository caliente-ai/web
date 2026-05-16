// Self-contained SVG floor plan used as the OSD tile source.
// No external image hosting required — fully offline.

export const PLAN_WIDTH = 2400;
export const PLAN_HEIGHT = 1600;
export const PLAN_FEET_WIDE = 200;
export const PLAN_PX_PER_FOOT = PLAN_WIDTH / PLAN_FEET_WIDE;

const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${PLAN_WIDTH}" height="${PLAN_HEIGHT}" viewBox="0 0 ${PLAN_WIDTH} ${PLAN_HEIGHT}">
  <rect width="${PLAN_WIDTH}" height="${PLAN_HEIGHT}" fill="#ffffff"/>
  <rect x="100" y="100" width="2200" height="1400" fill="none" stroke="#111827" stroke-width="6"/>
  <g stroke="#111827" stroke-width="3" fill="none">
    <line x1="800" y1="100" x2="800" y2="700"/>
    <line x1="100" y1="700" x2="1600" y2="700"/>
    <line x1="1600" y1="100" x2="1600" y2="900"/>
    <line x1="1100" y1="900" x2="2300" y2="900"/>
    <line x1="1100" y1="900" x2="1100" y2="1500"/>
    <line x1="1700" y1="900" x2="1700" y2="1500"/>
    <line x1="350" y1="700" x2="350" y2="1100"/>
    <line x1="100" y1="1100" x2="800" y2="1100"/>
    <line x1="800" y1="700" x2="800" y2="1500"/>
  </g>
  <g stroke="#6b7280" stroke-width="1.5" fill="none">
    <path d="M 450 700 A 60 60 0 0 0 510 760"/>
    <path d="M 1100 900 A 50 50 0 0 0 1150 950"/>
    <path d="M 1600 500 A 70 70 0 0 1 1670 570"/>
    <path d="M 800 1300 A 55 55 0 0 0 855 1355"/>
  </g>
  <g stroke="#ffffff" stroke-width="6">
    <line x1="450" y1="700" x2="510" y2="700"/>
    <line x1="1100" y1="900" x2="1150" y2="900"/>
    <line x1="1600" y1="500" x2="1600" y2="560"/>
    <line x1="800" y1="1300" x2="800" y2="1355"/>
  </g>
  <g stroke="#9ca3af" stroke-width="1" fill="#6b7280" font-family="JetBrains Mono, monospace" font-size="22">
    <line x1="100" y1="60" x2="2300" y2="60"/>
    <line x1="100" y1="50" x2="100" y2="70"/>
    <line x1="2300" y1="50" x2="2300" y2="70"/>
    <text x="1200" y="50" text-anchor="middle">200'-0"</text>
    <line x1="60" y1="100" x2="60" y2="1500"/>
    <line x1="50" y1="100" x2="70" y2="100"/>
    <line x1="50" y1="1500" x2="70" y2="1500"/>
    <text x="35" y="800" text-anchor="middle" transform="rotate(-90 35 800)">130'-0"</text>
  </g>
  <g font-family="Inter, system-ui" font-size="22" fill="#374151" text-anchor="middle">
    <text x="450" y="400">LOBBY</text>
    <text x="450" y="430" font-size="14" fill="#6b7280">A101</text>
    <text x="1200" y="400">OFFICE A</text>
    <text x="1950" y="400">CONF. ROOM</text>
    <text x="225" y="900">CORRIDOR</text>
    <text x="1200" y="800">OPEN OFFICE</text>
    <text x="1900" y="1200">BREAK</text>
    <text x="950" y="1200">STORAGE</text>
    <text x="450" y="1300">RESTROOM</text>
  </g>
  <g>
    <rect x="1900" y="1350" width="380" height="140" fill="#f3f4f6" stroke="#111827" stroke-width="2"/>
    <text x="2090" y="1390" text-anchor="middle" font-family="Inter, system-ui" font-size="18" font-weight="700" fill="#111827">PROESTIMATOR AI</text>
    <text x="2090" y="1418" text-anchor="middle" font-family="Inter, system-ui" font-size="12" fill="#6b7280">First Floor Plan</text>
    <text x="2090" y="1455" text-anchor="middle" font-family="JetBrains Mono, monospace" font-size="11" fill="#6b7280">Scale: 1/4" = 1'-0"   Rev: C</text>
    <text x="2090" y="1475" text-anchor="middle" font-family="JetBrains Mono, monospace" font-size="11" fill="#6b7280">2026-05-15</text>
  </g>
</svg>`;

export function floorPlanDataUri(): string {
  if (typeof window === "undefined") return "";
  return "data:image/svg+xml;base64," + window.btoa(unescape(encodeURIComponent(svg)));
}
