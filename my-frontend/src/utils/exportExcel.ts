// src/utils/exportExcel.ts
import ExcelJS from "exceljs";
import type { Job } from "../types";
import { resolveDisplayName } from "../constants";

// ── Brand palette (ARGB) ─────────────────────────────────────────
const LG_RED      = "FFA50034";
const LG_RED_D    = "FF8B002B";
const WHITE       = "FFFFFFFF";
const ROW_ALT     = "FFFFF8F8"; // faint blush for odd rows
const DONE_MUTED  = "FF9E9E9E";
const OVERDUE_BG  = "FFFFECEC";
const OVERDUE_TXT = "FF9C2B2E";
const COMPLEX_BG  = "FFFFF8DC";
const COMPLEX_TXT = "FF996600";
const VCOMPLEX_BG = "FFFFECEC";
const VCOMPLEX_TXT= "FFCC0000";

// ── Shared helpers ───────────────────────────────────────────────
const hairBorder: Partial<ExcelJS.Borders> = {
  top:    { style: "hair", color: { argb: "FFDDDDDD" } },
  left:   { style: "hair", color: { argb: "FFDDDDDD" } },
  bottom: { style: "hair", color: { argb: "FFDDDDDD" } },
  right:  { style: "hair", color: { argb: "FFDDDDDD" } },
};

const applyHeader = (cell: ExcelJS.Cell, bg = LG_RED) => {
  cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: bg } };
  cell.font = { bold: true, color: { argb: WHITE }, size: 10 };
  cell.alignment = { vertical: "middle", horizontal: "center", wrapText: true };
  cell.border = {
    top:    { style: "thin", color: { argb: LG_RED_D } },
    left:   { style: "thin", color: { argb: LG_RED_D } },
    bottom: { style: "thin", color: { argb: LG_RED_D } },
    right:  { style: "thin", color: { argb: LG_RED_D } },
  };
};

const applyTitle = (ws: ExcelJS.Worksheet, from: string, to: string, text: string, rowH = 28) => {
  ws.mergeCells(`${from}:${to}`);
  const c = ws.getCell(from);
  c.value = text;
  c.fill  = { type: "pattern", pattern: "solid", fgColor: { argb: LG_RED } };
  c.font  = { bold: true, color: { argb: WHITE }, size: 13 };
  c.alignment = { vertical: "middle", horizontal: "left" };
  ws.getRow(parseInt(from.replace(/\D/g, ""), 10)).height = rowH;
};

const applySubtitle = (ws: ExcelJS.Worksheet, from: string, to: string, text: string) => {
  ws.mergeCells(`${from}:${to}`);
  const c = ws.getCell(from);
  c.value = text;
  c.fill  = { type: "pattern", pattern: "solid", fgColor: { argb: LG_RED_D } };
  c.font  = { color: { argb: WHITE }, size: 9, italic: true };
  c.alignment = { vertical: "middle", horizontal: "left" };
  ws.getRow(parseInt(from.replace(/\D/g, ""), 10)).height = 16;
};

const styleDataRow = (row: ExcelJS.Row, i: number) => {
  row.eachCell({ includeEmpty: true }, cell => {
    cell.fill   = { type: "pattern", pattern: "solid", fgColor: { argb: i % 2 === 0 ? WHITE : ROW_ALT } };
    cell.border = hairBorder;
    cell.font   = { size: 10 };
    cell.alignment = { vertical: "middle" };
  });
};

const parseDateLocal = (raw?: string | null): Date | null => {
  if (!raw) return null;
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(raw.trim());
  return m ? new Date(+m[1], +m[2] - 1, +m[3]) : null;
};

const isOverdue = (j: Job): boolean => {
  if ((j.status || "Open").toLowerCase() === "done") return false;
  const dd = parseDateLocal(j.due_date);
  if (!dd) return false;
  const today = new Date(); today.setHours(0, 0, 0, 0);
  return dd < today;
};

const download = async (wb: ExcelJS.Workbook, filename: string) => {
  const buf  = await wb.xlsx.writeBuffer();
  const blob = new Blob([buf], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement("a");
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
};

// ── Sheet helpers ────────────────────────────────────────────────

/** Build a jobs worksheet (reused in both exports) */
function buildJobsSheet(wb: ExcelJS.Workbook, jobs: Job[], sheetName = "Jobs") {
  const ws = wb.addWorksheet(sheetName, {
    views: [{ state: "frozen", ySplit: 3 }],
    properties: { defaultRowHeight: 18 },
  });

  const COLS = [
    { key: "user_name",          header: "Member",       width: 16 },
    { key: "job_type",           header: "Job Type",     width: 11 },
    { key: "task_name",          header: "Task",         width: 32 },
    { key: "description",        header: "Description",  width: 40 },
    { key: "complexity",         header: "Complexity",   width: 14 },
    { key: "quantity",           header: "Qty",          width: 8  },
    { key: "unit",               header: "Unit",         width: 9  },
    { key: "estimated_duration", header: "Est. Hrs",     width: 12 },
    { key: "start_date",         header: "Start",        width: 12 },
    { key: "due_date",           header: "Due",          width: 12 },
    { key: "status",             header: "Status",       width: 10 },
  ];

  ws.columns = COLS.map(c => ({ key: c.key, width: c.width }));

  applyTitle(ws, "A1", "K1", `HW OLED LGERC — ${sheetName}`);
  applySubtitle(ws, "A2", "K2",
    `Generated: ${new Date().toLocaleString()}   |   ${jobs.length} job(s)`);

  // Header row (row 3)
  const hRow = ws.getRow(3); hRow.height = 22;
  COLS.forEach((c, i) => applyHeader(hRow.getCell(i + 1)));
  hRow.values = ["", ...COLS.map(c => c.header)]; // values after fill — reapply headers
  COLS.forEach((c, i) => applyHeader(hRow.getCell(i + 1))); // reapply styles

  jobs.forEach((j, idx) => {
    const complexity = j.complexity || "Normal";
    const row = ws.addRow({
      user_name:          resolveDisplayName(j.user_name || ""),
      job_type:           j.job_type || "",
      task_name:          j.task_name || "",
      description:        j.description || "",
      complexity,
      quantity:           j.quantity ?? 0,
      unit:               j.unit || "",
      estimated_duration: Number.isFinite(Number(j.estimated_duration)) ? +Number(j.estimated_duration).toFixed(1) : null,
      start_date:         j.start_date || "",
      due_date:           j.due_date || "",
      status:             j.status || "Open",
    });

    styleDataRow(row, idx);

    // Overdue row tint
    if (isOverdue(j)) {
      row.eachCell({ includeEmpty: true }, c => {
        c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: OVERDUE_BG } };
      });
      const dueCell = row.getCell("due_date");
      dueCell.font = { bold: true, color: { argb: OVERDUE_TXT }, size: 10 };
    }

    // Done → muted italic
    if ((j.status || "").toLowerCase() === "done") {
      row.eachCell({ includeEmpty: true }, c => {
        c.font = { color: { argb: DONE_MUTED }, size: 10, italic: true };
      });
    }

    // Complexity cell colour (wins over done/overdue for that cell only)
    const cc = row.getCell("complexity");
    if (complexity === "Very Complex") {
      cc.fill = { type: "pattern", pattern: "solid", fgColor: { argb: VCOMPLEX_BG } };
      cc.font = { bold: true, color: { argb: VCOMPLEX_TXT }, size: 10 };
    } else if (complexity === "Complex") {
      cc.fill = { type: "pattern", pattern: "solid", fgColor: { argb: COMPLEX_BG } };
      cc.font = { bold: true, color: { argb: COMPLEX_TXT }, size: 10 };
    } else if (complexity === "Simple") {
      cc.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFE8F4FF" } };
      cc.font = { color: { argb: "FF1565C0" }, size: 10 };
    }

    row.getCell("estimated_duration").numFmt = "0.0";
    row.getCell("estimated_duration").alignment = { horizontal: "right", vertical: "middle" };
    row.getCell("quantity").alignment = { horizontal: "right", vertical: "middle" };
  });

  ws.autoFilter = { from: { row: 3, column: 1 }, to: { row: 3, column: COLS.length } };
  return ws;
}

/** Per-member summary sheet */
function buildMemberSheet(wb: ExcelJS.Workbook, jobs: Job[]) {
  const ws = wb.addWorksheet("By Member", { views: [{ state: "frozen", ySplit: 3 }] });

  // Compute
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const map: Record<string, { total:number; open:number; done:number; hrs:number; openHrs:number; overdue:number }> = {};
  for (const j of jobs) {
    const u = resolveDisplayName(j.user_name || "unknown");
    if (!map[u]) map[u] = { total:0, open:0, done:0, hrs:0, openHrs:0, overdue:0 };
    const done = (j.status||"Open").toLowerCase() === "done";
    const h = j.estimated_duration || 0;
    map[u].total++;
    map[u].hrs += h;
    if (done) { map[u].done++; }
    else {
      map[u].open++; map[u].openHrs += h;
      if (isOverdue(j)) map[u].overdue++;
    }
  }
  const rows = Object.entries(map)
    .map(([user, v]) => ({
      user, ...v,
      hrs: +v.hrs.toFixed(1), openHrs: +v.openHrs.toFixed(1),
      completion: v.total > 0 ? Math.round(v.done / v.total * 100) : 0,
    }))
    .sort((a, b) => b.openHrs - a.openHrs);

  const COLS = [
    { key: "user",       header: "Member",       width: 16 },
    { key: "total",      header: "Total Jobs",   width: 12 },
    { key: "open",       header: "Open Jobs",    width: 12 },
    { key: "done",       header: "Done Jobs",    width: 12 },
    { key: "hrs",        header: "Total Hrs",    width: 13 },
    { key: "openHrs",    header: "Active Hrs",   width: 13 },
    { key: "overdue",    header: "Overdue",      width: 11 },
    { key: "completion", header: "Completion %", width: 14 },
  ];
  ws.columns = COLS.map(c => ({ key: c.key, width: c.width }));

  applyTitle(ws, "A1", "H1", "Summary by Member");
  applySubtitle(ws, "A2", "H2", `${rows.length} member(s) · ${jobs.length} total job(s)`);

  const hRow = ws.getRow(3); hRow.height = 22;
  COLS.forEach((c, i) => { const cell = hRow.getCell(i + 1); cell.value = c.header; applyHeader(cell); });

  rows.forEach((r, i) => {
    const row = ws.addRow(r);
    styleDataRow(row, i);
    if (r.overdue > 0) row.getCell("overdue").font = { bold: true, color: { argb: VCOMPLEX_TXT }, size: 10 };
    const pct = r.completion;
    row.getCell("completion").font = {
      bold: true, size: 10,
      color: { argb: pct >= 70 ? "FF059669" : pct >= 40 ? "FFD97706" : "FFCC0000" },
    };
    ["total","open","done","hrs","openHrs","overdue","completion"].forEach(k => {
      row.getCell(k).alignment = { horizontal: "right", vertical: "middle" };
    });
    ["hrs","openHrs"].forEach(k => { row.getCell(k).numFmt = "0.0"; });
    row.getCell("completion").value = `${pct}%`;
  });

  ws.autoFilter = { from: { row: 3, column: 1 }, to: { row: 3, column: COLS.length } };
}

/** Type × complexity breakdown sheet */
function buildTypeSheet(wb: ExcelJS.Workbook, jobs: Job[]) {
  const ws = wb.addWorksheet("By Type");
  const COMPLEXITY_ORDER = ["Simple", "Normal", "Complex", "Very Complex"];

  type TypeEntry = { jobs: number; openJobs: number; hrs: number; openHrs: number };
  const map: Record<string, Record<string, TypeEntry>> = {};
  for (const j of jobs) {
    const t = j.job_type || "Unknown";
    const c = j.complexity || "Normal";
    if (!map[t]) map[t] = {};
    if (!map[t][c]) map[t][c] = { jobs:0, openJobs:0, hrs:0, openHrs:0 };
    const isDone = (j.status||"Open").toLowerCase() === "done";
    const h = j.estimated_duration || 0;
    map[t][c].jobs++;
    map[t][c].hrs += h;
    if (!isDone) { map[t][c].openJobs++; map[t][c].openHrs += h; }
  }

  const COLS = [
    { key: "type",     header: "Job Type",    width: 13 },
    { key: "comp",     header: "Complexity",  width: 15 },
    { key: "jobs",     header: "Total Jobs",  width: 12 },
    { key: "openJobs", header: "Open Jobs",   width: 12 },
    { key: "hrs",      header: "Total Hrs",   width: 13 },
    { key: "openHrs",  header: "Active Hrs",  width: 13 },
  ];
  ws.columns = COLS.map(c => ({ key: c.key, width: c.width }));
  applyTitle(ws, "A1", "F1", "Summary by Type & Complexity");
  applySubtitle(ws, "A2", "F2", "Active hours exclude Done jobs");
  const hRow = ws.getRow(3); hRow.height = 22;
  COLS.forEach((c, i) => { const cell = hRow.getCell(i + 1); cell.value = c.header; applyHeader(cell); });

  let rowIdx = 0;
  Object.entries(map).forEach(([type, compMap]) => {
    COMPLEXITY_ORDER.filter(k => compMap[k]).forEach(comp => {
      const v = compMap[comp];
      const row = ws.addRow({
        type, comp, jobs: v.jobs, openJobs: v.openJobs,
        hrs: +v.hrs.toFixed(1), openHrs: +v.openHrs.toFixed(1),
      });
      styleDataRow(row, rowIdx++);
      ["jobs","openJobs","hrs","openHrs"].forEach(k => row.getCell(k).alignment = { horizontal:"right", vertical:"middle" });
      ["hrs","openHrs"].forEach(k => row.getCell(k).numFmt = "0.0");

      const cc = row.getCell("comp");
      if (comp === "Very Complex") { cc.fill={type:"pattern",pattern:"solid",fgColor:{argb:VCOMPLEX_BG}}; cc.font={bold:true,color:{argb:VCOMPLEX_TXT},size:10}; }
      else if (comp === "Complex") { cc.fill={type:"pattern",pattern:"solid",fgColor:{argb:COMPLEX_BG}}; cc.font={bold:true,color:{argb:COMPLEX_TXT},size:10}; }
    });
  });

  ws.autoFilter = { from:{row:3,column:1}, to:{row:3,column:COLS.length} };
}

// ════════════════════════════════════════════════════════════════
//  PUBLIC: Dashboard / JobList export
// ════════════════════════════════════════════════════════════════
export async function exportJobsExcel(jobs: Job[], filename = "workload_jobs.xlsx") {
  if (jobs.length === 0) return 0;
  const wb = new ExcelJS.Workbook();
  wb.creator = "HW OLED LGERC Workload Dashboard";
  wb.created = new Date();

  buildJobsSheet(wb, jobs, "Jobs");
  buildMemberSheet(wb, jobs);
  buildTypeSheet(wb, jobs);

  await download(wb, filename);
  return jobs.length;
}

// ════════════════════════════════════════════════════════════════
//  PUBLIC: Analysis tab export
// ════════════════════════════════════════════════════════════════
export async function exportAnalysisExcel(
  jobs: Job[],
  perUser: {
    user: string; openJobs: number; doneJobs: number; totalJobs: number;
    openHrs: number; doneHrs: number; totalHrs: number; overdue: number; completionPct: number;
  }[],
  insights: string[],
  filename = "workload_analysis.xlsx"
) {
  const wb = new ExcelJS.Workbook();
  wb.creator = "HW OLED LGERC Workload Dashboard";
  wb.created = new Date();

  const total = jobs.length;
  const done  = jobs.filter(j => (j.status||"Open").toLowerCase()==="done").length;
  const completionRate = total > 0 ? Math.round(done/total*100) : 0;
  const overdueCount  = jobs.filter(isOverdue).length;
  const activeHrs     = jobs.filter(j=>(j.status||"Open").toLowerCase()!=="done")
                            .reduce((s,j)=>s+(j.estimated_duration||0), 0);

  // ── Sheet 1: Overview KPIs ─────────────────────────────────
  const ws1 = wb.addWorksheet("Overview");
  ws1.getColumn("A").width = 30;
  ws1.getColumn("B").width = 22;

  applyTitle(ws1, "A1", "B1", "HW OLED LGERC — Workload Analysis Report", 30);
  applySubtitle(ws1, "A2", "B2", `Generated: ${new Date().toLocaleString()}`);

  const kpis: [string, string | number][] = [
    ["Total Jobs", total],
    ["Open Jobs", total - done],
    ["Done Jobs", done],
    ["Completion Rate", `${completionRate}%`],
    ["Overdue Jobs", overdueCount],
    ["Total Active Hours", `${activeHrs.toFixed(1)} hrs`],
    ["Active Members (with open jobs)", perUser.filter(u=>u.openJobs>0).length],
    ["Avg Active Hrs / Member", perUser.filter(u=>u.openJobs>0).length > 0
      ? `${(perUser.filter(u=>u.openJobs>0).reduce((s,u)=>s+u.openHrs,0)/perUser.filter(u=>u.openJobs>0).length).toFixed(1)} hrs`
      : "—"],
  ];

  kpis.forEach(([label, value], i) => {
    const row = ws1.getRow(i + 4); row.height = 22;
    const lc = row.getCell(1); const vc = row.getCell(2);
    lc.value = label;
    vc.value = value;
    const bg = i % 2 === 0 ? WHITE : ROW_ALT;
    [lc, vc].forEach(c => {
      c.fill   = { type:"pattern", pattern:"solid", fgColor:{argb: bg} };
      c.border = hairBorder;
      c.alignment = { vertical:"middle" };
    });
    lc.font = { bold:true, size:11, color:{argb:"FF374151"} };
    vc.font = { bold:true, size:13, color:{argb: LG_RED } };
  });

  // ── Sheet 2: Member Breakdown ──────────────────────────────
  const ws2 = wb.addWorksheet("Member Breakdown", { views:[{state:"frozen",ySplit:3}] });
  const COLS2 = [
    {key:"user",       header:"Member",       width:16},
    {key:"openJobs",   header:"Open Jobs",    width:12},
    {key:"doneJobs",   header:"Done Jobs",    width:12},
    {key:"openHrs",    header:"Active Hrs",   width:13},
    {key:"doneHrs",    header:"Done Hrs",     width:13},
    {key:"totalHrs",   header:"Total Hrs",    width:13},
    {key:"overdue",    header:"Overdue",      width:11},
    {key:"completion", header:"Completion %", width:14},
  ];
  ws2.columns = COLS2.map(c=>({key:c.key,width:c.width}));
  applyTitle(ws2,"A1","H1","Member Breakdown");
  applySubtitle(ws2,"A2","H2",`${perUser.length} member(s) · ${total} total job(s)`);
  const hRow2 = ws2.getRow(3); hRow2.height = 22;
  COLS2.forEach((c,i)=>{ const cell=hRow2.getCell(i+1); cell.value=c.header; applyHeader(cell); });

  perUser.forEach((u, i) => {
    const row = ws2.addRow({
      user: u.user, openJobs: u.openJobs, doneJobs: u.doneJobs,
      openHrs: u.openHrs, doneHrs: u.doneHrs, totalHrs: u.totalHrs,
      overdue: u.overdue, completion: `${u.completionPct}%`,
    });
    styleDataRow(row, i);
    if (u.overdue > 0) row.getCell("overdue").font = { bold:true, color:{argb:VCOMPLEX_TXT}, size:10 };
    const pct = u.completionPct;
    row.getCell("completion").font = {
      bold:true, size:10,
      color:{argb: pct>=70?"FF059669":pct>=40?"FFD97706":"FFCC0000"},
    };
    ["openJobs","doneJobs","openHrs","doneHrs","totalHrs","overdue","completion"]
      .forEach(k => row.getCell(k).alignment = {horizontal:"right",vertical:"middle"});
    ["openHrs","doneHrs","totalHrs"].forEach(k => row.getCell(k).numFmt = "0.0");
  });
  ws2.autoFilter = {from:{row:3,column:1},to:{row:3,column:COLS2.length}};

  // ── Sheet 3: All Jobs ──────────────────────────────────────
  buildJobsSheet(wb, jobs, "All Jobs");

  // ── Sheet 4: Insights ─────────────────────────────────────
  const ws4 = wb.addWorksheet("Insights");
  ws4.getColumn("A").width = 90;
  applyTitle(ws4,"A1","A1","Auto-Generated Insights",28);
  applySubtitle(ws4,"A2","A2",`Based on ${total} jobs · ${new Date().toLocaleDateString()}`);

  insights.forEach((text, i) => {
    const row = ws4.getRow(i + 4); row.height = 26;
    const cell = row.getCell(1);
    cell.value = text;
    cell.font  = { size:11 };
    cell.fill  = { type:"pattern", pattern:"solid", fgColor:{argb: i%2===0?WHITE:ROW_ALT} };
    cell.border = { ...hairBorder, left:{style:"medium",color:{argb:LG_RED}} };
    cell.alignment = { vertical:"middle", wrapText:true };
  });

  await download(wb, filename);
  return total;
}
