// src/components/JobList.tsx

import type { Job } from "../types";
import { api } from "../api";
import React, { useMemo, useState, useEffect } from "react";
import { USER_NAMES } from "../constants";
import ExcelJS from "exceljs";

type Props = {
  jobs: Job[];
  onJobsUpdated: () => void;
  onEditJob: (job: Job) => void;
};

type SortKey = keyof Job | "estimated_duration" | "quantity";
type Sort = { key: SortKey; dir: "asc" | "desc" } | null;

/* ---------- Local date helpers (avoid UTC drift) ---------- */
const startOfTodayLocal = () => {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
};

/** Parse strict "YYYY-MM-DD" as a **local** midnight Date. */
const parseDateLocal = (raw?: string | null) => {
  if (!raw) return null;
  const s = String(raw).trim();

  // YYYY-MM-DD or YYYY/MM/DD
  let m = /^(\d{4})[-/](\d{2})[-/](\d{2})$/.exec(s);
  if (m) return new Date(+m[1], +m[2] - 1, +m[3]);

  // DD/MM/YYYY
  m = /^(\d{2})[/](\d{2})[/](\d{4})$/.exec(s);
  if (m) return new Date(+m[3], +m[2] - 1, +m[1]);

  return null; // unrecognized
};

/** Overdue = due date before today (local) and not Done */
const isOverdue = (j: Job) => {
  const dd = parseDateLocal(j.due_date);
  if (!dd) return false;
  const status = String(j.status ?? "Open").toLowerCase();
  return dd < startOfTodayLocal() && status !== "done";
};

const JobList: React.FC<Props> = ({ jobs, onJobsUpdated, onEditJob }) => {
  // filters
  const [fUser, setFUser] = useState("");
  const [fType, setFType] = useState("");
  const [fTask, setFTask] = useState("");
  const [fStatus, setFStatus] = useState("");
  const [fStartFrom, setFStartFrom] = useState("");
  const [fStartTo, setFStartTo] = useState("");
  const [fDueFrom, setFDueFrom] = useState("");
  const [fDueTo, setFDueTo] = useState("");

  // sort + pagination + selection
  const [sort, setSort] = useState<Sort>(null);
  const [page, setPage] = useState(1);
  const pageSize = 10;
  const [selectedIds, setSelectedIds] = useState<number[]>([]);

  // NEW: row expansion + cached histories
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [historyByJob, setHistoryByJob] = useState<Record<number, any[]>>({});
  const [loadingHistoryId, setLoadingHistoryId] = useState<number | null>(null);
  const [historyError, setHistoryError] = useState<string | null>(null);

  // 👇 Add this useEffect here
  useEffect(() => {
    const onJobUpdated = (e: Event) => {
      const id = (e as CustomEvent).detail?.id as number | undefined;
      if (!id) return;

      // 1) clear cache for this job
      setHistoryByJob(prev => {
        const next = { ...prev };
        delete next[id];
        return next;
      });

      // 2) if row is expanded, refetch immediately
      if (expandedId === id) {
        (async () => {
          try {
            setLoadingHistoryId(id);
            const data = await api.getJobHistory(id);
            setHistoryByJob(prev => ({ ...prev, [id]: data }));
          } catch (err: any) {
            setHistoryError(err?.message || "Failed to load history");
          } finally {
            setLoadingHistoryId(null);
          }
        })();
      }
    };

    window.addEventListener("job:updated", onJobUpdated as EventListener);
    return () => window.removeEventListener("job:updated", onJobUpdated as EventListener);
  }, [expandedId]); // re-run if expanded row changes

  const toggleExpand = async (jobId?: number) => {
    if (!jobId) return;
    setHistoryError(null);
    if (expandedId === jobId) {
      setExpandedId(null);
      return;
    }
    setExpandedId(jobId);
    // fetch if not cached
    if (!historyByJob[jobId]) {
      try {
        setLoadingHistoryId(jobId);
        const data = await api.getJobHistory(jobId);
        setHistoryByJob(prev => ({ ...prev, [jobId]: data }));
      } catch (e: any) {
        setHistoryError(e?.message || "Failed to load history");
      } finally {
        setLoadingHistoryId(null);
      }
    }
  };

  const toggleSort = (key: SortKey) => {
    setPage(1);
    setSort(prev => {
      if (!prev || prev.key !== key) return { key, dir: "asc" };
      if (prev.dir === "asc") return { key, dir: "desc" };
      return null;
    });
  };

  const filtered = useMemo(() => {
    let r = jobs.slice();

    // text/status filters
    if (fUser) r = r.filter(j => (j.user_name || "") === fUser);
    if (fType)  r = r.filter(j => j.job_type === fType);
    if (fTask)  r = r.filter(j => (j.task_name || "").toLowerCase().includes(fTask.toLowerCase()));
    if (fStatus) r = r.filter(j => (j.status || "Open") === fStatus);

    // date filters (local, tolerant if row has no date)
    const startFromD = parseDateLocal(fStartFrom);
    const startToD   = parseDateLocal(fStartTo);
    const dueFromD   = parseDateLocal(fDueFrom);
    const dueToD     = parseDateLocal(fDueTo);

    if (startFromD) r = r.filter(j => {
      const d = parseDateLocal(j.start_date);
      return !d || d >= startFromD;
    });
    if (startToD) r = r.filter(j => {
      const d = parseDateLocal(j.start_date);
      return !d || d <= startToD;
    });
    if (dueFromD) r = r.filter(j => {
      const d = parseDateLocal(j.due_date);
      return !d || d >= dueFromD;
    });
    if (dueToD) r = r.filter(j => {
      const d = parseDateLocal(j.due_date);
      return !d || d <= dueToD;
    });

    // sort
    if (sort) {
      r.sort((a: any, b: any) => {
        const A = a[sort.key] ?? "";
        const B = b[sort.key] ?? "";
        if (A < B) return sort.dir === "asc" ? -1 : 1;
        if (A > B) return sort.dir === "asc" ?  1 : -1;
        return 0;
      });
    }
    return r;
  }, [jobs, fUser, fType, fTask, fStatus, fStartFrom, fStartTo, fDueFrom, fDueTo, sort]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const pageRows = filtered.slice((page - 1) * pageSize, page * pageSize);

  const allOnPageSelected = pageRows.length > 0 && pageRows.every(j => selectedIds.includes(j.id!));
  const toggleAllOnPage = () => {
    const ids = pageRows.map(j => j.id!).filter(Boolean) as number[];
    setSelectedIds(prev => (allOnPageSelected ? prev.filter(id => !ids.includes(id)) : [...new Set([...prev, ...ids])]));
  };
  const toggleOne = (id?: number) => {
    if (!id) return;
    setSelectedIds(prev => (prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]));
  };

  const handleDelete = async (id?: number) => {
    if (!id) return;
    if (!window.confirm("Delete this job?")) return;
    try {
      await api.deleteJob(id);
      onJobsUpdated();
      setSelectedIds(prev => prev.filter(x => x !== id));
    } catch (e) {
      console.error(e);
      alert("Delete failed.");
    }
  };

  const handleBulkDelete = async () => {
    if (selectedIds.length === 0) return;
    if (!window.confirm(`Delete ${selectedIds.length} selected job(s)?`)) return;
    for (const id of selectedIds) { try { await api.deleteJob(id); } catch {} }
    setSelectedIds([]);
    onJobsUpdated();
  };

  const fmtHours = (h: number | undefined | null) => {
    const v = Number(h ?? 0);
    return Number.isFinite(v) ? (v % 1 === 0 ? `${v.toFixed(0)} h` : `${v.toFixed(1)} h`) : "-";
  };

  // ---------- Export Excel of the current filtered view ----------
  const exportExcel = async () => {
    if (filtered.length === 0) {
      alert("No jobs to export");
      return;
    }

    // 1) Workbook + sheet
    const wb = new ExcelJS.Workbook();
    wb.created = new Date();
    wb.modified = new Date();
    const ws = wb.addWorksheet("Jobs", {
      views: [{ state: "frozen", ySplit: 1 }], // freeze header row
      properties: { defaultRowHeight: 18 },
    });

    // 2) Columns (keys must match the data object below)
    ws.columns = [
      { header: "User Name",          key: "user_name",           width: 22 },
      { header: "Job Type",           key: "job_type",            width: 12 },
      { header: "Task Name",          key: "task_name",           width: 30 },
      { header: "Description",        key: "description",         width: 40 },
      { header: "Quantity",           key: "quantity",            width: 10, style: { alignment: { horizontal: "right" } } },
      { header: "Unit",               key: "unit",                width: 10 },
      { header: "Est. Duration (hrs)",key: "estimated_duration",  width: 18, style: { alignment: { horizontal: "right" }, numFmt: "0.0" } },
      { header: "Start Date",         key: "start_date",          width: 12 },
      { header: "Due Date",           key: "due_date",            width: 12 },
      { header: "Status",             key: "status",              width: 10 },
    ];

    // 3) Header styling
    const header = ws.getRow(1);
    header.height = 22;
    header.eachCell((cell) => {
      cell.font = { bold: true };
      cell.alignment = { vertical: "middle", horizontal: "center" };
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFE6F2FF" } }; // soft blue
      cell.border = {
        top:    { style: "thin", color: { argb: "FFB0C4DE" } },
        left:   { style: "thin", color: { argb: "FFB0C4DE" } },
        bottom: { style: "thin", color: { argb: "FFB0C4DE" } },
        right:  { style: "thin", color: { argb: "FFB0C4DE" } },
      };
    });

    // 4) Add rows with light zebra stripes and conditional styling
    filtered.forEach((j, i) => {
      const r = ws.addRow({
        user_name: j.user_name || "",
        job_type: j.job_type || "",
        task_name: j.task_name || "",
        description: j.description || "",
        quantity: j.quantity ?? "",
        unit: j.unit || "",
        estimated_duration:
          typeof j.estimated_duration === "number" && isFinite(j.estimated_duration)
            ? j.estimated_duration
            : null,
        start_date: j.start_date || "",
        due_date: j.due_date || "",
        status: j.status || "Open",
      });

      // zebra stripe (skip header)
      if (i % 2 === 0) {
        r.eachCell((cell) => {
          cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF9FBFD" } }; // very light gray-blue
        });
      }

      // borders
      r.eachCell((cell) => {
        cell.border = {
          top:    { style: "hair", color: { argb: "FFE0E6ED" } },
          left:   { style: "hair", color: { argb: "FFE0E6ED" } },
          bottom: { style: "hair", color: { argb: "FFE0E6ED" } },
          right:  { style: "hair", color: { argb: "FFE0E6ED" } },
        };
      });

      // conditional highlights
      const overdue = isOverdue(j);
      const statusLower = String(j.status ?? "Open").toLowerCase();

      if (overdue) {
        // highlight Due Date cell
        const dueCell = r.getCell("due_date");
        dueCell.font = { color: { argb: "FF9C2B2E" }, bold: true }; // red
      }

      if (statusLower === "done") {
        // dim the entire row
        r.eachCell((cell) => {
          const f = cell.font || {};
          cell.font = { ...f, color: { argb: "FF6B7280" } }; // slate-500
        });
      }
    });

    // 5) Auto-filter on the header
    ws.autoFilter = {
      from: { row: 1, column: 1 },
      to:   { row: 1, column: ws.columnCount },
    };

    // 6) Optional: summary sheet by user & type
    const byUserType = new Map<string, { qty: number; hrs: number }>();
    filtered.forEach((j) => {
      const key = `${(j.user_name || "").toLowerCase()}|${j.job_type || ""}`;
      const cur = byUserType.get(key) || { qty: 0, hrs: 0 };
      cur.qty += Number(j.quantity ?? 0);
      const h = Number(j.estimated_duration ?? 0);
      if (isFinite(h)) cur.hrs += h;
      byUserType.set(key, cur);
    });

    const ws2 = wb.addWorksheet("Summary", {
      views: [{ state: "frozen", ySplit: 1 }],
    });
    ws2.columns = [
      { header: "User", key: "user", width: 22 },
      { header: "Job Type", key: "type", width: 12 },
      { header: "Total Quantity", key: "qty", width: 16, style: { alignment: { horizontal: "right" } } },
      { header: "Total Est. Hours", key: "hrs", width: 18, style: { alignment: { horizontal: "right" }, numFmt: "0.0" } },
    ];
    ws2.getRow(1).font = { bold: true };
    byUserType.forEach((v, k) => {
      const [user, type] = k.split("|");
      ws2.addRow({ user, type, qty: v.qty, hrs: v.hrs });
    });
    ws2.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: ws2.columnCount } };

    // 7) Generate file and download
    const buf = await wb.xlsx.writeBuffer();
    const blob = new Blob([buf], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "jobs.xlsx";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div>
      {/* Filters */}
      <div style={{ display: "grid", gap: 8, gridTemplateColumns: "repeat(5, minmax(0,1fr))", margin: "8px 0" }}>
        <select value={fUser} onChange={(e) => setFUser(e.target.value)}>
          <option value="">All Users</option>
          {USER_NAMES.map((u) => (
            <option key={u} value={u}>{u}</option>
          ))}
        </select>

        <select value={fType} onChange={(e) => setFType(e.target.value)}>
          <option value="">All Types</option>
          <option>Dev</option>
          <option>Non Dev</option>
          <option>DX</option>
        </select>

        <input placeholder="Filter Task" value={fTask} onChange={(e) => setFTask(e.target.value)} />
        <select value={fStatus} onChange={(e) => setFStatus(e.target.value)}>
          <option value="">All Status</option>
          <option>Open</option>
          <option>Done</option>
        </select>
        <button type="button" className="btn primary" onClick={exportExcel}>
          Export Excel
        </button>
      </div>

      {/* Date filters */}
      <div style={{ display: "grid", gap: 8, gridTemplateColumns: "repeat(4, minmax(0,1fr))", marginBottom: 8 }}>
        <label>Start From <input type="date" value={fStartFrom} onChange={(e) => setFStartFrom(e.target.value)} /></label>
        <label>Start To   <input type="date" value={fStartTo}   onChange={(e) => setFStartTo(e.target.value)} /></label>
        <label>Due From   <input type="date" value={fDueFrom}   onChange={(e) => setFDueFrom(e.target.value)} /></label>
        <label>Due To     <input type="date" value={fDueTo}     onChange={(e) => setFDueTo(e.target.value)} /></label>
      </div>

      {selectedIds.length > 0 && (
        <div style={{ marginBottom: 8, display: "flex", gap: 8 }}>
          <button type="button" className="btn danger" onClick={handleBulkDelete}>
            Delete Selected ({selectedIds.length})
          </button>
        </div>
      )}

      <table>
        <thead>
          <tr>
            <th><input type="checkbox" checked={allOnPageSelected} onChange={toggleAllOnPage} /></th>
            <th onClick={() => toggleSort("user_name")} style={{ cursor: "pointer" }}>User Name</th>
            <th onClick={() => toggleSort("job_type")}  style={{ cursor: "pointer" }}>Job Type</th>
            <th onClick={() => toggleSort("task_name")} style={{ cursor: "pointer" }}>Task Name</th>
            <th>Description</th>
            <th onClick={() => toggleSort("quantity")} style={{ cursor: "pointer" }}>Quantity</th>
            <th>Unit</th>
            <th onClick={() => toggleSort("estimated_duration")} style={{ cursor: "pointer" }}>Est. Duration (hrs)</th>
            <th onClick={() => toggleSort("start_date")} style={{ cursor: "pointer" }}>Start</th>
            <th onClick={() => toggleSort("due_date")}   style={{ cursor: "pointer" }}>Due</th>
            <th onClick={() => toggleSort("status")}     style={{ cursor: "pointer" }}>Status</th>
            <th>Actions</th>
          </tr>
        </thead>

        <tbody>
          {pageRows.map(job => {
            const isExpanded = expandedId === job.id;
            return (
              <React.Fragment key={job.id}>
                <tr
                  className={isOverdue(job) ? "row-overdue" : undefined}
                  onClick={(e) => {
                    // avoid stealing clicks from action buttons
                    const tag = (e.target as HTMLElement).tagName.toLowerCase();
                    if (["button", "input", "select", "a"].includes(tag)) return;
                    toggleExpand(job.id);
                  }}
                  style={{ cursor: "pointer" }}
                  title="Click row to view history"
                >
                  <td>
                    <input
                      type="checkbox"
                      checked={selectedIds.includes(job.id!)}
                      onChange={() => toggleOne(job.id)}
                      onClick={(e) => e.stopPropagation()}
                    />
                  </td>
                  <td>{job.user_name}</td>
                  <td>{job.job_type}</td>
                  <td>{job.task_name}</td>
                  <td>{job.description || "-"}</td>
                  <td className="cell-right">{job.quantity}</td>
                  <td>{job.unit || "-"}</td>
                  <td className="cell-right nowrap">{fmtHours(job.estimated_duration)}</td>
                  <td>{job.start_date || "-"}</td>
                  <td>{job.due_date || "-"}</td>
                  <td><span className={`status ${job.status || "Open"}`}>{job.status || "Open"}</span></td>
                  <td>
                    <div className="row" style={{ gap: 6 }}>
                      <button
                        type="button"
                        className="btn small"
                        onClick={(e) => { e.stopPropagation(); onEditJob(job); }}
                        title="Edit this job"
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        className="btn danger small"
                        onClick={(e) => { e.stopPropagation(); handleDelete(job.id); }}
                        title="Delete this job"
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>

                {/* INLINE DETAIL ROW */}
                {isExpanded && (
                  <tr className="detail-row">
                    <td colSpan={12} style={{ padding: 0 }}>
                      <div className="history-panel">
                        {loadingHistoryId === job.id && <div className="history-loading">Loading history…</div>}
                        {historyError && <div className="history-error">⚠️ {historyError}</div>}
                        {!loadingHistoryId && !historyError && (
                          <div className="history-content">
                            <div className="history-head">
                              <strong>Job #{job.id}</strong> — created by <em>{job.user_name}</em>
                            </div>

                            <div className="history-grid">
                              {(historyByJob[job.id!] || []).map((h) => (
                                <div key={h.id} className="history-item">
                                  <div className="history-when">
                                    {new Date(h.changed_at).toLocaleString()}
                                  </div>
                                  <div className="history-event">
                                    {h.event === "created" ? (
                                      <span className="chip badge">Created</span>
                                    ) : (
                                      <span className="chip badge">Updated</span>
                                    )}
                                  </div>

                                  {Array.isArray(h.changes) && h.changes.length > 0 ? (
                                    <table className="history-table">
                                      <thead>
                                        <tr><th>Field</th><th>From</th><th>To</th></tr>
                                      </thead>
                                      <tbody>
                                        {h.changes.map((c: any, i: number) => (
                                          <tr key={i}>
                                            <td className="nowrap">{c.field}</td>
                                            <td>{c.old === null || c.old === undefined || c.old === "" ? "—" : String(c.old)}</td>
                                            <td>{c.new === null || c.new === undefined || c.new === "" ? "—" : String(c.new)}</td>
                                          </tr>
                                        ))}
                                      </tbody>
                                    </table>
                                  ) : (
                                    h.event === "created" ? <div className="muted">Initial creation</div> : null
                                  )}
                                </div>
                              ))}

                              {(historyByJob[job.id!] || []).length === 0 && (
                                <div className="muted">No history found.</div>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                )}
              </React.Fragment>
            );
          })}
          {pageRows.length === 0 && (
            <tr><td colSpan={12} style={{ textAlign: "center", padding: 16 }}>No jobs</td></tr>
          )}
        </tbody>
      </table>

      {/* Pagination */}
      <div style={{ marginTop: 8, display: "flex", gap: 8, alignItems: "center" }}>
        <button type="button" disabled={page <= 1} onClick={() => setPage(1)}>⏮</button>
        <button type="button" disabled={page <= 1} onClick={() => setPage(p => Math.max(1, p - 1))}>Prev</button>
        <span>Page {page} / {totalPages}</span>
        <button type="button" disabled={page >= totalPages} onClick={() => setPage(p => Math.min(totalPages, p + 1))}>Next</button>
        <button type="button" disabled={page >= totalPages} onClick={() => setPage(totalPages)}>⏭</button>
      </div>
    </div>
  );
};

export default JobList;