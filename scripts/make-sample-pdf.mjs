// Generates a multi-page architectural-style sample PDF for testing the
// upload flow. Output: web/samples/proestimator-sample-plans.pdf
//
//   node scripts/make-sample-pdf.mjs

import PDFDocument from "pdfkit";
import { createWriteStream, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const outDir = join(__dirname, "..", "samples");
const outPath = join(outDir, "proestimator-sample-plans.pdf");
mkdirSync(outDir, { recursive: true });

const doc = new PDFDocument({
  size: [1224, 792], // 17×11 ANSI B "tabloid" in points
  layout: "landscape",
  margins: { top: 36, left: 36, right: 36, bottom: 36 },
  info: {
    Title: "ProEstimator AI · Sample Construction Plans",
    Author: "Caliente Solutions",
    Subject: "Test fixture · simulated multi-discipline drawing set",
    Producer: "pdfkit · scripts/make-sample-pdf.mjs",
  },
});
doc.pipe(createWriteStream(outPath));

const SHEETS = [
  { num: "G-001", title: "Cover & Sheet Index", discipline: "GENERAL", render: renderCover },
  { num: "A-101", title: "First Floor Plan", discipline: "ARCHITECTURAL", render: renderFloorPlan(1) },
  { num: "A-102", title: "Second Floor Plan", discipline: "ARCHITECTURAL", render: renderFloorPlan(2) },
  { num: "A-103", title: "Roof Plan", discipline: "ARCHITECTURAL", render: renderRoofPlan },
  { num: "A-201", title: "Reflected Ceiling Plan", discipline: "ARCHITECTURAL", render: renderRcp },
  { num: "A-301", title: "Door & Window Schedule", discipline: "ARCHITECTURAL", render: renderSchedule },
  { num: "S-101", title: "Foundation Plan", discipline: "STRUCTURAL", render: renderStructural("foundation") },
  { num: "S-102", title: "Framing Plan", discipline: "STRUCTURAL", render: renderStructural("framing") },
  { num: "M-101", title: "HVAC Plan", discipline: "MECHANICAL", render: renderHvac },
  { num: "E-101", title: "Power Plan", discipline: "ELECTRICAL", render: renderElectrical("power") },
  { num: "E-102", title: "Lighting Plan", discipline: "ELECTRICAL", render: renderElectrical("lighting") },
  { num: "P-101", title: "Plumbing Plan", discipline: "PLUMBING", render: renderPlumbing },
];

SHEETS.forEach((sheet, i) => {
  if (i > 0) doc.addPage();
  sheet.render(doc);
  drawTitleBlock(doc, sheet, i + 1, SHEETS.length);
});

doc.end();
console.log(`Wrote: ${outPath}`);

// ---------- renderers ----------

function renderCover(doc) {
  doc
    .fontSize(48)
    .fillColor("#111827")
    .font("Helvetica-Bold")
    .text("PROESTIMATOR AI", 80, 100)
    .fontSize(20)
    .fillColor("#374151")
    .font("Helvetica")
    .text("SAMPLE CONSTRUCTION DOCUMENT SET", 80, 160)
    .fontSize(12)
    .fillColor("#6b7280")
    .text("3-story commercial mixed-use · 28,400 GSF · Class B occupancy", 80, 190);

  // Big building silhouette
  doc.lineWidth(2).strokeColor("#111827");
  doc.rect(80, 240, 600, 360).stroke();
  doc.rect(120, 280, 100, 100).stroke();
  doc.rect(260, 280, 100, 100).stroke();
  doc.rect(400, 280, 100, 100).stroke();
  doc.rect(540, 280, 100, 100).stroke();
  doc.rect(120, 420, 100, 80).stroke();
  doc.rect(260, 420, 240, 80).stroke();
  doc.rect(540, 420, 100, 80).stroke();
  doc.rect(330, 540, 100, 60).stroke();

  // Sheet index
  doc.font("Helvetica-Bold").fontSize(14).fillColor("#111827").text("SHEET INDEX", 780, 100);
  doc.font("Helvetica").fontSize(10);
  let y = 130;
  SHEETS.forEach((s) => {
    doc.fillColor("#374151").text(`${s.num}`, 780, y, { width: 60 });
    doc.text(s.title, 850, y, { width: 280 });
    y += 16;
  });

  doc.font("Helvetica-Oblique").fontSize(8).fillColor("#9ca3af").text(
    "This is a synthetic fixture document. All dimensions, room names, and quantities are illustrative.",
    80,
    640,
    { width: 1100 }
  );
}

function renderFloorPlan(level) {
  return (doc) => {
    const ox = 80;
    const oy = 80;
    const W = 1000;
    const H = 600;

    sheetTitle(doc, `LEVEL ${level} · FIRST FLOOR PLAN`);

    // Outer envelope
    doc.lineWidth(3).strokeColor("#111827").rect(ox, oy + 40, W, H).stroke();

    // Interior partitions (CAD-like)
    const lines = [
      [ox + 380, oy + 40, ox + 380, oy + 340],
      [ox, oy + 340, ox + 760, oy + 340],
      [ox + 760, oy + 40, ox + 760, oy + 460],
      [ox + 520, oy + 460, W + ox, oy + 460],
      [ox + 520, oy + 460, ox + 520, oy + 640],
      [ox + 820, oy + 460, ox + 820, oy + 640],
      [ox + 180, oy + 340, ox + 180, oy + 540],
      [ox, oy + 540, ox + 380, oy + 540],
      [ox + 380, oy + 340, ox + 380, oy + 640],
    ];
    doc.lineWidth(2);
    lines.forEach(([x1, y1, x2, y2]) => doc.moveTo(x1, y1).lineTo(x2, y2).stroke());

    // Doors (arcs)
    doc.lineWidth(1).strokeColor("#6b7280");
    doc.path(`M ${ox + 220} ${oy + 340} a 30 30 0 0 0 30 30`).stroke();
    doc.path(`M ${ox + 520} ${oy + 460} a 25 25 0 0 0 25 25`).stroke();
    doc.path(`M ${ox + 760} ${oy + 250} a 35 35 0 0 1 35 35`).stroke();
    doc.path(`M ${ox + 380} ${oy + 600} a 28 28 0 0 0 28 28`).stroke();

    // Door gaps (white)
    doc.strokeColor("#ffffff").lineWidth(4);
    doc.moveTo(ox + 220, oy + 340).lineTo(ox + 250, oy + 340).stroke();
    doc.moveTo(ox + 520, oy + 460).lineTo(ox + 545, oy + 460).stroke();
    doc.moveTo(ox + 760, oy + 250).lineTo(ox + 760, oy + 285).stroke();
    doc.moveTo(ox + 380, oy + 600).lineTo(ox + 380, oy + 628).stroke();

    // Room labels
    doc.fillColor("#374151").font("Helvetica-Bold").fontSize(11);
    const rooms = level === 1
      ? [
          ["LOBBY", "101", 180, 180],
          ["OFFICE A", "102", 560, 180],
          ["CONF. ROOM", "103", 880, 180],
          ["CORRIDOR", "C-1", 100, 440],
          ["OPEN OFFICE", "104", 560, 400],
          ["BREAK", "105", 920, 560],
          ["STORAGE", "106", 460, 560],
          ["RESTROOM", "107", 180, 600],
        ]
      : [
          ["EXEC SUITE", "201", 180, 180],
          ["CONFERENCE", "202", 560, 180],
          ["BOARDROOM", "203", 880, 180],
          ["CORRIDOR", "C-2", 100, 440],
          ["BENCH DESKS", "204", 560, 400],
          ["KITCHENETTE", "205", 920, 560],
          ["FILE ROOM", "206", 460, 560],
          ["RESTROOM", "207", 180, 600],
        ];
    rooms.forEach(([name, num, dx, dy]) => {
      doc.fillColor("#111827").fontSize(11).text(name, ox + dx, oy + dy, { width: 140, align: "center" });
      doc.fillColor("#6b7280").fontSize(8).text(num, ox + dx, oy + dy + 14, { width: 140, align: "center" });
    });

    // Dimension strings
    doc.strokeColor("#9ca3af").lineWidth(0.75).fillColor("#6b7280").font("Helvetica").fontSize(9);
    doc.moveTo(ox, oy + 15).lineTo(ox + W, oy + 15).stroke();
    doc.moveTo(ox, oy + 5).lineTo(ox, oy + 25).stroke();
    doc.moveTo(ox + W, oy + 5).lineTo(ox + W, oy + 25).stroke();
    doc.text(`200'-0"`, ox + W / 2 - 20, oy + 4);

    doc.moveTo(ox - 18, oy + 40).lineTo(ox - 18, oy + 40 + H).stroke();
    doc.save();
    doc.rotate(-90, { origin: [ox - 28, oy + 40 + H / 2] });
    doc.text(`130'-0"`, ox - 60, oy + 40 + H / 2 - 6);
    doc.restore();

    // Window symbols on south wall
    for (let i = 0; i < 5; i++) {
      const wx = ox + 80 + i * 180;
      doc.strokeColor("#111827").lineWidth(1).rect(wx, oy + 40 + H - 4, 50, 8).stroke();
    }
  };
}

function renderRoofPlan(doc) {
  sheetTitle(doc, "ROOF PLAN");
  doc.lineWidth(3).strokeColor("#111827").rect(80, 120, 1000, 600).stroke();
  doc.lineWidth(1).strokeColor("#6b7280");
  for (let y = 140; y < 720; y += 24) {
    doc.moveTo(80, y).lineTo(1080, y).stroke();
  }
  // Roof drains
  doc.fillColor("#374151").font("Helvetica-Bold").fontSize(9);
  const drains = [
    [260, 240], [540, 240], [820, 240],
    [260, 460], [540, 460], [820, 460],
    [260, 660], [540, 660], [820, 660],
  ];
  drains.forEach(([x, y]) => {
    doc.fillColor("#ffffff").rect(x - 8, y - 8, 16, 16).fill();
    doc.lineWidth(1.5).strokeColor("#111827").rect(x - 8, y - 8, 16, 16).stroke();
    doc.fillColor("#111827").text("RD", x - 7, y - 5);
  });

  // Slope arrows
  doc.fillColor("#6b7280").fontSize(8);
  doc.text("SLOPE 1/4\":1' →", 100, 130);
  doc.text("← SLOPE 1/4\":1'", 950, 130);
}

function renderRcp(doc) {
  sheetTitle(doc, "REFLECTED CEILING PLAN");
  doc.lineWidth(3).strokeColor("#111827").rect(80, 120, 1000, 600).stroke();
  // 2x2 ceiling grid
  doc.lineWidth(0.5).strokeColor("#d1d5db");
  for (let x = 80; x <= 1080; x += 24) doc.moveTo(x, 120).lineTo(x, 720).stroke();
  for (let y = 120; y <= 720; y += 24) doc.moveTo(80, y).lineTo(1080, y).stroke();
  // Light fixtures (rectangles)
  doc.lineWidth(1).strokeColor("#111827").fillColor("#fef3c7");
  for (let row = 0; row < 5; row++) {
    for (let col = 0; col < 9; col++) {
      const x = 130 + col * 100;
      const y = 170 + row * 100;
      doc.rect(x, y, 60, 12).fillAndStroke();
    }
  }
  doc.fillColor("#6b7280").font("Helvetica").fontSize(8).text("Type F2 · 2'×4' troffer · 3500K", 90, 700);
}

function renderSchedule(doc) {
  sheetTitle(doc, "DOOR & WINDOW SCHEDULE");
  const rows = [
    ["MARK", "TYPE", "WIDTH", "HEIGHT", "MATERIAL", "HARDWARE", "FIRE", "FRAME"],
    ["D-101", "Single Leaf", "3'-0\"", "7'-0\"", "Solid Core Wood", "H-1", "—", "HM"],
    ["D-102", "Single Leaf", "3'-0\"", "7'-0\"", "Solid Core Wood", "H-1", "20 min", "HM"],
    ["D-103", "Single Leaf", "3'-0\"", "7'-0\"", "Hollow Metal", "H-2", "45 min", "HM"],
    ["D-104", "Double Leaf", "5'-0\"", "7'-0\"", "Tempered Glass", "H-3", "—", "Aluminum"],
    ["D-105", "Single Leaf", "3'-6\"", "7'-0\"", "Solid Core Wood", "H-1", "20 min", "HM"],
    ["D-106", "Single Leaf", "3'-0\"", "7'-0\"", "Hollow Metal", "H-2", "60 min", "HM"],
    ["W-101", "Storefront", "8'-0\"", "10'-0\"", "Tempered Glass", "—", "—", "Aluminum"],
    ["W-102", "Punched Opening", "4'-0\"", "5'-0\"", "Tempered Glass", "—", "—", "Aluminum"],
    ["W-103", "Punched Opening", "4'-0\"", "5'-0\"", "Tempered Glass", "—", "—", "Aluminum"],
  ];

  let y = 140;
  const colWidths = [70, 110, 70, 70, 160, 90, 80, 100];
  const colX = [80];
  for (let i = 1; i < colWidths.length; i++) colX.push(colX[i - 1] + colWidths[i - 1]);
  doc.lineWidth(1).strokeColor("#111827");
  rows.forEach((row, ri) => {
    if (ri === 0) {
      doc.fillColor("#111827").rect(80, y, colWidths.reduce((s, w) => s + w, 0), 22).fill();
      doc.fillColor("#ffffff").font("Helvetica-Bold").fontSize(9);
    } else {
      doc.fillColor(ri % 2 === 0 ? "#f9fafb" : "#ffffff").rect(80, y, colWidths.reduce((s, w) => s + w, 0), 20).fill();
      doc.fillColor("#374151").font("Helvetica").fontSize(9);
      doc.strokeColor("#e5e7eb").moveTo(80, y).lineTo(80 + colWidths.reduce((s, w) => s + w, 0), y).stroke();
    }
    row.forEach((cell, ci) => {
      doc.text(cell, colX[ci] + 6, y + 6, { width: colWidths[ci] - 12 });
    });
    y += ri === 0 ? 22 : 20;
  });
  doc.lineWidth(1).strokeColor("#111827").rect(80, 140, colWidths.reduce((s, w) => s + w, 0), y - 140).stroke();
}

function renderStructural(kind) {
  return (doc) => {
    sheetTitle(doc, kind === "foundation" ? "FOUNDATION PLAN" : "FRAMING PLAN");
    doc.lineWidth(3).strokeColor("#111827").rect(80, 120, 1000, 600).stroke();
    doc.lineWidth(1).strokeColor("#374151");

    // Column grid
    doc.fillColor("#374151").font("Helvetica-Bold").fontSize(9);
    const cols = [180, 360, 540, 720, 900, 1020];
    const rows = [200, 380, 560, 700];
    cols.forEach((x, ci) => {
      doc.lineWidth(0.5).strokeColor("#9ca3af").dash(4, { space: 4 });
      doc.moveTo(x, 120).lineTo(x, 720).stroke();
      doc.undash();
      // Column bubble
      doc.lineWidth(1).strokeColor("#111827").fillColor("#ffffff");
      doc.circle(x, 100, 12).fillAndStroke();
      doc.fillColor("#111827").text(String.fromCharCode(65 + ci), x - 4, 95);
    });
    rows.forEach((y, ri) => {
      doc.lineWidth(0.5).strokeColor("#9ca3af").dash(4, { space: 4 });
      doc.moveTo(80, y).lineTo(1080, y).stroke();
      doc.undash();
      doc.lineWidth(1).strokeColor("#111827").fillColor("#ffffff");
      doc.circle(58, y, 12).fillAndStroke();
      doc.fillColor("#111827").text(String(ri + 1), 55, y - 5);
    });

    // Columns/footings at intersections
    cols.forEach((x) => {
      rows.forEach((y) => {
        if (kind === "foundation") {
          doc.fillColor("#fde68a").strokeColor("#111827").lineWidth(1).rect(x - 18, y - 18, 36, 36).fillAndStroke();
          doc.fillColor("#111827").fontSize(7).text("F1", x - 5, y - 4);
        } else {
          doc.fillColor("#dbeafe").strokeColor("#111827").lineWidth(1).circle(x, y, 8).fillAndStroke();
        }
      });
    });

    doc.fillColor("#6b7280").font("Helvetica").fontSize(8);
    doc.text(kind === "foundation" ? "F1 · 3'-6\" sq footing · #5 @ 12\" o.c. each way" : "W10×30 beam · A992", 90, 700);
  };
}

function renderHvac(doc) {
  sheetTitle(doc, "HVAC PLAN");
  doc.lineWidth(3).strokeColor("#111827").rect(80, 120, 1000, 600).stroke();
  // Ductwork
  doc.lineWidth(8).strokeColor("#93c5fd");
  doc.moveTo(120, 420).lineTo(1040, 420).stroke();
  doc.moveTo(580, 160).lineTo(580, 680).stroke();
  doc.lineWidth(4).strokeColor("#60a5fa");
  doc.moveTo(580, 220).lineTo(900, 220).stroke();
  doc.moveTo(580, 580).lineTo(280, 580).stroke();
  // Diffusers
  const diff = [[200, 200], [400, 200], [780, 200], [200, 620], [400, 620], [780, 620], [880, 350]];
  doc.lineWidth(1).strokeColor("#1e3a8a").fillColor("#bfdbfe");
  diff.forEach(([x, y]) => {
    doc.rect(x - 12, y - 12, 24, 24).fillAndStroke();
    doc.moveTo(x - 12, y - 12).lineTo(x + 12, y + 12).stroke();
    doc.moveTo(x + 12, y - 12).lineTo(x - 12, y + 12).stroke();
  });
  doc.fillColor("#1e3a8a").font("Helvetica-Bold").fontSize(8);
  diff.forEach(([x, y]) => doc.text("SD-A", x - 10, y - 28));
  // AHU
  doc.fillColor("#fde68a").strokeColor("#92400e").lineWidth(1).rect(900, 580, 140, 80).fillAndStroke();
  doc.fillColor("#92400e").font("Helvetica-Bold").fontSize(10).text("AHU-1", 950, 615);
}

function renderElectrical(kind) {
  return (doc) => {
    sheetTitle(doc, kind === "power" ? "POWER PLAN" : "LIGHTING PLAN");
    doc.lineWidth(3).strokeColor("#111827").rect(80, 120, 1000, 600).stroke();
    if (kind === "power") {
      // Receptacles along walls
      doc.lineWidth(1).strokeColor("#111827").fillColor("#fde68a");
      for (let i = 0; i < 18; i++) {
        const x = 110 + i * 55;
        doc.circle(x, 140, 5).fillAndStroke();
      }
      for (let i = 0; i < 18; i++) {
        const x = 110 + i * 55;
        doc.circle(x, 700, 5).fillAndStroke();
      }
      // Panel
      doc.fillColor("#1f2937").rect(960, 350, 60, 120).fill();
      doc.fillColor("#ffffff").font("Helvetica-Bold").fontSize(9).text("PNL-1", 970, 405);
    } else {
      // Light fixtures grid
      doc.lineWidth(1).strokeColor("#111827").fillColor("#fef9c3");
      for (let row = 0; row < 4; row++) {
        for (let col = 0; col < 8; col++) {
          const x = 150 + col * 110;
          const y = 200 + row * 120;
          doc.rect(x, y, 80, 14).fillAndStroke();
        }
      }
      // Wall sconces
      doc.fillColor("#fbbf24");
      for (let i = 0; i < 6; i++) doc.circle(140 + i * 150, 700, 8).fill();
    }
  };
}

function renderPlumbing(doc) {
  sheetTitle(doc, "PLUMBING PLAN");
  doc.lineWidth(3).strokeColor("#111827").rect(80, 120, 1000, 600).stroke();
  // Restroom A
  doc.lineWidth(1).strokeColor("#111827");
  doc.rect(150, 200, 200, 200).stroke();
  doc.rect(150, 400, 200, 200).stroke();
  doc.fillColor("#1f2937").font("Helvetica-Bold").fontSize(10);
  doc.text("MEN", 200, 210);
  doc.text("WOMEN", 195, 410);

  // Fixtures - toilets / urinals / sinks
  const fixtures = [
    [180, 250, "WC"], [240, 250, "WC"], [300, 250, "WC"],
    [180, 320, "LV"], [240, 320, "LV"], [300, 320, "LV"],
    [180, 450, "WC"], [240, 450, "WC"], [300, 450, "WC"],
    [180, 520, "LV"], [240, 520, "LV"], [300, 520, "LV"],
  ];
  doc.lineWidth(1).strokeColor("#111827").fillColor("#bfdbfe");
  fixtures.forEach(([x, y, t]) => {
    doc.rect(x - 12, y - 8, 24, 16).fillAndStroke();
    doc.fillColor("#1e3a8a").font("Helvetica-Bold").fontSize(7).text(t, x - 6, y - 4);
    doc.fillColor("#bfdbfe");
  });

  // Vent stack
  doc.fillColor("#7dd3fc").strokeColor("#0c4a6e").lineWidth(1).circle(900, 400, 18).fillAndStroke();
  doc.fillColor("#0c4a6e").font("Helvetica-Bold").fontSize(9).text("VS", 892, 396);

  // Piping (cold water blue, hot water red, waste green)
  doc.lineWidth(2);
  doc.strokeColor("#2563eb").moveTo(150, 280).lineTo(900, 280).lineTo(900, 380).stroke();
  doc.strokeColor("#dc2626").moveTo(150, 300).lineTo(900, 300).stroke();
  doc.strokeColor("#16a34a").moveTo(150, 580).lineTo(900, 580).lineTo(900, 420).stroke();

  doc.fillColor("#374151").font("Helvetica").fontSize(8);
  doc.text("— Cold Water (3/4\")", 700, 660);
  doc.text("— Hot Water (3/4\")", 700, 675);
  doc.text("— Sanitary Waste (4\")", 700, 690);
}

// ---------- shared chrome ----------

function sheetTitle(doc, title) {
  doc.fillColor("#111827").font("Helvetica-Bold").fontSize(18).text(title, 80, 80);
  doc.fillColor("#9ca3af").font("Helvetica").fontSize(9).text("DRAWN TO SCALE 1/4\" = 1'-0\"", 80, 105);
}

function drawTitleBlock(doc, sheet, idx, total) {
  const x = 980;
  const y = 730;
  const w = 200;
  const h = 50;
  doc.lineWidth(1).strokeColor("#111827").fillColor("#f9fafb").rect(x, y, w, h).fillAndStroke();
  doc.fillColor("#111827").font("Helvetica-Bold").fontSize(11).text("PROESTIMATOR AI", x + 8, y + 6);
  doc.fillColor("#374151").font("Helvetica").fontSize(8).text(`${sheet.num} · ${sheet.title}`, x + 8, y + 22);
  doc.fillColor("#6b7280").font("Helvetica").fontSize(7).text(`SHEET ${idx} OF ${total} · REV C · 2026-05-15`, x + 8, y + 36);

  // Discipline strip on left edge
  doc.fillColor("#111827").rect(20, y, 50, h).fill();
  doc.fillColor("#ffffff").font("Helvetica-Bold").fontSize(8).save();
  doc.rotate(-90, { origin: [45, y + h / 2] });
  doc.text(sheet.discipline, 45 - 30, y + h / 2 - 4);
  doc.restore();

  // Page number bottom-right
  doc.fillColor("#9ca3af").font("Helvetica").fontSize(8).text(`${idx} / ${total}`, 1180, 770, { width: 30, align: "right" });
}
