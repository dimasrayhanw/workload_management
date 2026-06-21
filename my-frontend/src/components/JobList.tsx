// src/components/JobList.tsx
import type { Job } from "../types";
import { api } from "../api";
import { toast } from "./ToastContainer";
import React, { useMemo, useState, useEffect } from "react";
import { USER_NAMES, resolveDisplayName } from "../constants";
import ExcelJS from "exceljs";

type Props = {
  jobs: Job[];
  loading: boolean;
  onJobsUpdated: () => void;
  onEditJob: (job: Job) => void;
};

type SortKey = keyof Job | "estimated_duration" | "quantity";
type Sort = { key: SortKey; dir: "asc" | "desc" } | null;

/* ── Date helpers (avoid UTC drift) ── */
const startOfTodayLocal = () => {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
};

const parseDateLocal = (raw?: string | null) => {
  if (!raw) return null;
  const s = String(raw).trim();
  let m = /^(\d{4})[-/](\d{2})[-/](\d{2})$/.exec(s);
  if (m) return new Date(+m[1], +m[2] - 1, +m[3]);
  m = /^(\d{2})[/](\d{2})[/](\d{4})$/.exec(s);
  if (m) return new Date(+m[3], +m[2] - 1, +m[1]);
  return null;
};

const isOverdue = (j: Job) => {
  const dd = parseDateLocal(j.due_date);
  if (!dd) return false;
  return dd < startOfTodayLocal() && (j.status || "Open").toLowerCase() !== "done";
};

/* ── Skeleton row ── */
const SKELETON_COL_WIDTHS = ["40%","25%","55%","70%","60%","20%","25%","30%","25%","28%","28%","22%","60px"];
const SkeletonRow = () => (
  <tr>
    {SKELETON_COL_WIDTHS.map((w, i) => (
      <td key={i} style={{ padding: "11px 12px" }}>
        <div className="skeleton" style={{ height: 13, borderRadius: 4, width: w }} />
      </td>
    ))}
  </tr>
);

/* ── Sort arrow ── */
const SortArrow = ({ col, sort }: { col: SortKey; sort: Sort }) => {
  if (!sort || sort.key !== col)
    return <span className="sort-arrow inactive">↕</span>;
  return (
    <span className="sort-arrow active">
      {sort.dir === "asc" ? "↑" : "↓"}
    </span>
  );
};

const JobList: React.FC<Props> = ({ jobs, loading, onJobsUpdated, onEditJob }) => {
  // filters
  const [fUser,      setFUser]      = useState("");
  const [fType,      setFType]      = useState("");
  const [fTask,      setFTask]      = useState("");
  const [fStatus,    setFStatus]    = useState("");
  const [fStartFrom, setFStartFrom] = useState("");
  const [fStartTo,   setFStartTo]   = useState("");
  const [fDueFrom,   setFDueFrom]   = useState("");
  const [fDueTo,     setFDueTo]     = useState("");

  // sort + pagination + selection
  const [sort,        setSort]        = useState<Sort>(null);
  const [page,        setPage]        = useState(1);
  const pageSize = 10;
  const [selectedIds, setSelectedIds] = useState<number[]>([]);

  // status toggle
  const [togglingId, setTogglingId] = useState<number | null>(null);

  const handleToggleStatus = async (job: Job) => {
    if (!job.id) return;
    const newStatus: "Open" | "Done" = (job.status || "Open") === "Open" ? "Done" : "Open";
    setTogglingId(job.id);
    try {
      const result = await api.patchStatus(job.id, newStatus);
      window.dispatchEvent(new CustomEvent("job:updated", { detail: { id: result.id } }));
      onJobsUpdated();
      toast.success(newStatus === "Done" ? "Marked as done." : "Job re-opened.");
    } catch {
      toast.error("Failed to update status.");
    } finally {
      setTogglingId(null);
    }
  };

  // history expansion + cache
  const [expandedId,       setExpandedId]       = useState<number | null>(null);
  const [historyByJob,     setHistoryByJob]     = useState<Record<number, any[]>>({});
  const [loadingHistoryId, setLoadingHistoryId] = useState<number | null>(null);
  const [historyError,     setHistoryError]     = useState<string | null>(null);

  // clear selection when jobs list changes
  useEffect(() => {
    setSelectedIds([]);
  }, [jobs]);

  // refresh history cache when a job is updated
  useEffect(() => {
    const onJobUpdated = (e: Event) => {
      const id = (e as CustomEvent).detail?.id as number | undefined;
      if (!id) return;
      setHistoryByJob(prev => {
        const next = { ...prev };
        delete next[id];
        return next;
      });
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
  }, [expandedId]);

  const toggleExpand = async (jobId?: number) => {
    if (!jobId) return;
    setHistoryError(null);
    if (expandedId === jobId) { setExpandedId(null); return; }
    setExpandedId(jobId);
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
    if (fUser)   r = r.filter(j => resolveDisplayName(j.user_name || "") === fUser);
    if (fType)   r = r.filter(j => j.job_type === fType);
    if (fTask)   r = r.filter(j => (j.task_name || "").toLowerCase().includes(fTask.toLowerCase()));
    if (fStatus) r = r.filter(j => (j.status || "Open") === fStatus);

    const startFromD = parseDateLocal(fStartFrom);
    const startToD   = parseDateLocal(fStartTo);
    const dueFromD   = parseDateLocal(fDueFrom);
    const dueToD     = parseDateLocal(fDueTo);

    if (startFromD) r = r.filter(j => { const d = parseDateLocal(j.start_date); return !d || d >= startFromD; });
    if (startToD)   r = r.filter(j => { const d = parseDateLocal(j.start_date); return !d || d <= startToD; });
    if (dueFromD)   r = r.filter(j => { const d = parseDateLocal(j.due_date);   return !d || d >= dueFromD; });
    if (dueToD)     r = r.filter(j => { const d = parseDateLocal(j.due_date);   return !d || d <= dueToD; });

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
  const pageRows   = filtered.slice((page - 1) * pageSize, page * pageSize);

  const allOnPageSelected = pageRows.length > 0 && pageRows.every(j => selectedIds.includes(j.id!));
  const toggleAllOnPage = () => {
    const ids = pageRows.map(j => j.id!).filter(Boolean) as number[];
    setSelectedIds(prev =>
      allOnPageSelected ? prev.filter(id => !ids.includes(id)) : [...new Set([...prev, ...ids])]
    );
  };
  const toggleOne = (id?: number) => {
    if (!id) return;
    setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const handleDelete = async (id?: number) => {
    if (!id) return;
    if (!window.confirm("Delete this job?")) return;
    try {
      await api.deleteJob(id);
      onJobsUpdated();
      setSelectedIds(prev => prev.filter(x => x !== id));
      toast.success("Job deleted.");
    } catch {
      toast.error("Delete failed. Try again.");
    }
  };

  const handleBulkDelete = async () => {
    if (selectedIds.length === 0) return;
    if (!window.confirm(`Delete ${selectedIds.length} selected job(s)?`)) return;
    let failed = 0;
    for (const id of selectedIds) {
      try { await api.deleteJob(id); } catch { failed++; }
    }
    setSelectedIds([]);
    onJobsUpdated();
    if (failed) toast.error(`${failed} job(s) failed to delete.`);
    else toast.success(`${selectedIds.length} job(s) deleted.`);
  };

  const fmtHours = (h: number | undefined | null) => {
    const v = Number(h ?? 0);
    return Number.isFinite(v) ? (v % 1 === 0 ? `${v.toFixed(0)} h` : `${v.toFixed(1)} h`) : "—";
  };

  /* ── Export Excel ── */
  const exportExcel = async () => {
    if (filtered.length === 0) { toast.info("No jobs to export."); return; }

    const wb = new ExcelJS.Workbook();
    wb.created = new Date();
    wb.modified = new Date();
    const ws = wb.addWorksheet("Jobs", {
      views: [{ state: "frozen", ySplit: 1 }],
      properties: { defaultRowHeight: 18 },
    });

    ws.columns = [
      { header: "User Name",           key: "user_name",          width: 22 },
      { header: "Job Type",            key: "job_type",           width: 12 },
      { header: "Task Name",           key: "task_name",          width: 30 },
      { header: "Description",         key: "description",        width: 40 },
      { header: "Quantity",            key: "quantity",           width: 10, style: { alignment: { horizontal: "right" } } },
      { header: "Unit",                key: "unit",               width: 10 },
      { header: "Est. Duration (hrs)", key: "estimated_duration", width: 18, style: { alignment: { horizontal: "right" }, numFmt: "0.0" } },
      { header: "Start Date",          key: "start_date",         width: 12 },
      { header: "Due Date",            key: "due_date",           width: 12 },
      { header: "Status",              key: "status",             width: 10 },
    ];

    const header = ws.getRow(1);
    header.height = 22;
    header.eachCell(cell => {
      cell.font = { bold: true };
      cell.alignment = { vertical: "middle", horizontal: "center" };
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFE6F2FF" } };
      cell.border = {
        top: { style: "thin", color: { argb: "FFB0C4DE" } },
        left: { style: "thin", color: { argb: "FFB0C4DE" } },
        bottom: { style: "thin", color: { argb: "FFB0C4DE" } },
        right: { style: "thin", color: { argb: "FFB0C4DE" } },
      };
    });

    filtered.forEach((j, i) => {
      const r = ws.addRow({
        user_name: resolveDisplayName(j.user_name || ""),
        job_type: j.job_type || "",
        task_name: j.task_name || "",
        description: j.description || "",
        quantity: j.quantity ?? "",
        unit: j.unit || "",
        estimated_duration:
          typeof j.estimated_duration === "number" && isFinite(j.estimated_duration)
            ? j.estimated_duration : null,
        start_date: j.start_date || "",
        due_date: j.due_date || "",
        status: j.status || "Open",
      });

      if (i % 2 === 0) {
        r.eachCell(cell => {
          cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF9FBFD" } };
        });
      }
      r.eachCell(cell => {
        cell.border = {
          top: { style: "hair", color: { argb: "FFE0E6ED" } },
          left: { style: "hair", color: { argb: "FFE0E6ED" } },
          bottom: { style: "hair", color: { argb: "FFE0E6ED" } },
          right: { style: "hair", color: { argb: "FFE0E6ED" } },
        };
      });

      if (isOverdue(j)) {
        r.getCell("due_date").font = { color: { argb: "FF9C2B2E" }, bold: true };
      }
      if ((j.status || "").toLowerCase() === "done") {
        r.eachCell(cell => {
          const f = cell.font || {};
          cell.font = { ...f, color: { argb: "FF6B7280" } };
        });
      }
    });

    ws.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: ws.columnCount } };

    // Summary sheet
    const byUserType = new Map<string, { qty: number; hrs: number }>();
    filtered.forEach(j => {
      const key = `${resolveDisplayName(j.user_name || "")}|${j.job_type || ""}`;
      const cur = byUserType.get(key) || { qty: 0, hrs: 0 };
      cur.qty += Number(j.quantity ?? 0);
      const h = Number(j.estimated_duration ?? 0);
      if (isFinite(h)) cur.hrs += h;
      byUserType.set(key, cur);
    });

    const ws2 = wb.addWorksheet("Summary", { views: [{ state: "frozen", ySplit: 1 }] });
    ws2.columns = [
      { header: "User",             key: "user", width: 22 },
      { header: "Job Type",         key: "type", width: 12 },
      { header: "Total Quantity",   key: "qty",  width: 16, style: { alignment: { horizontal: "right" } } },
      { header: "Total Est. Hours", key: "hrs",  width: 18, style: { alignment: { horizontal: "right" }, numFmt: "0.0" } },
    ];
    ws2.getRow(1).font = { bold: true };
    byUserType.forEach((v, k) => {
      const [user, type] = k.split("|");
      ws2.addRow({ user, type, qty: v.qty, hrs: v.hrs });
    });
    ws2.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: ws2.columnCount } };

    const buf = await wb.xlsx.writeBuffer();
    const blob = new Blob([buf], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "jobs.xlsx";
    a.click();
    URL.revokeObjectURL(url);
    toast.success(`Exported ${filtered.length} job(s) to Excel.`);
  };

  /* ── Render ── */
  const hasFilters = !!(fUser || fType || fTask || fStatus || fStartFrom || fStartTo || fDueFrom || fDueTo);

  return (
    <div>
      {/* Filter row 1 */}
      <div style={{ display: "grid", gap: 8, gridTemplateColumns: "repeat(5, minmax(0,1fr))", margin: "8px 0" }}>
        <select value={fUser} onChange={e => { setFUser(e.target.value); setPage(1); }}>
          <option value="">All Users</option>
          {USER_NAMES.map(u => <option key={u} value={u}>{u}</option>)}
        </select>

        <select value={fType} onChange={e => { setFType(e.target.value); setPage(1); }}>
          <option value="">All Types</option>
          <option>Dev</option>
          <option>Non Dev</option>
          <option>DX</option>
        </select>

        <input
          placeholder="Filter by task…"
          value={fTask}
          onChange={e => { setFTask(e.target.value); setPage(1); }}
        />

        <select value={fStatus} onChange={e => { setFStatus(e.target.value); setPage(1); }}>
          <option value="">All Statuses</option>
          <option>Open</option>
          <option>Done</option>
        </select>

        <button type="button" className="btn primary" onClick={exportExcel}>
          ↓ Export Excel
        </button>
      </div>

      {/* Filter row 2: date ranges */}
      <div style={{ display: "grid", gap: 8, gridTemplateColumns: "repeat(4, minmax(0,1fr))", marginBottom: 8 }}>
        <label style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: 12, color: "var(--muted)" }}>
          Start From <input type="date" value={fStartFrom} onChange={e => { setFStartFrom(e.target.value); setPage(1); }} />
        </label>
        <label style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: 12, color: "var(--muted)" }}>
          Start To <input type="date" value={fStartTo} onChange={e => { setFStartTo(e.target.value); setPage(1); }} />
        </label>
        <label style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: 12, color: "var(--muted)" }}>
          Due From <input type="date" value={fDueFrom} onChange={e => { setFDueFrom(e.target.value); setPage(1); }} />
        </label>
        <label style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: 12, color: "var(--muted)" }}>
          Due To <input type="date" value={fDueTo} onChange={e => { setFDueTo(e.target.value); setPage(1); }} />
        </label>
      </div>

      {/* Bulk actions + filter summary */}
      <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 8, minHeight: 32 }}>
        {selectedIds.length > 0 && (
          <button type="button" className="btn danger small" onClick={handleBulkDelete}>
            Delete Selected ({selectedIds.length})
          </button>
        )}
        {hasFilters && (
          <span className="muted" style={{ fontSize: 12 }}>
            {filtered.length} of {jobs.length} jobs shown
            {" · "}
            <button
              type="button"
              className="btn ghost small"
              style={{ padding: "2px 8px", fontSize: 12 }}
              onClick={() => {
                setFUser(""); setFType(""); setFTask(""); setFStatus("");
                setFStartFrom(""); setFStartTo(""); setFDueFrom(""); setFDueTo("");
                setPage(1);
              }}
            >
              Clear filters
            </button>
          </span>
        )}
      </div>

      {/* Table */}
      <table>
        <thead>
          <tr>
            <th><input type="checkbox" checked={allOnPageSelected} onChange={toggleAllOnPage} /></th>
            <th onClick={() => toggleSort("user_name")} style={{ cursor: "pointer" }}>
              User Name <SortArrow col="user_name" sort={sort} />
            </th>
            <th onClick={() => toggleSort("job_type")} style={{ cursor: "pointer" }}>
              Job Type <SortArrow col="job_type" sort={sort} />
            </th>
            <th onClick={() => toggleSort("task_name")} style={{ cursor: "pointer" }}>
              Task Name <SortArrow col="task_name" sort={sort} />
            </th>
            <th>Description</th>
            <th onClick={() => toggleSort("quantity")} style={{ cursor: "pointer" }}>
              Qty <SortArrow col="quantity" sort={sort} />
            </th>
            <th>Unit</th>
            <th onClick={() => toggleSort("estimated_duration")} style={{ cursor: "pointer" }}>
              Est. Hrs <SortArrow col="estimated_duration" sort={sort} />
            </th>
            <th>Complexity</th>
            <th onClick={() => toggleSort("start_date")} style={{ cursor: "pointer" }}>
              Start <SortArrow col="start_date" sort={sort} />
            </th>
            <th onClick={() => toggleSort("due_date")} style={{ cursor: "pointer" }}>
              Due <SortArrow col="due_date" sort={sort} />
            </th>
            <th onClick={() => toggleSort("status")} style={{ cursor: "pointer" }}>
              Status <SortArrow col="status" sort={sort} />
            </th>
            <th>Actions</th>
          </tr>
        </thead>

        <tbody>
          {/* Skeleton rows on first load */}
          {loading && jobs.length === 0 ? (
            Array.from({ length: 6 }).map((_, i) => <SkeletonRow key={i} />)
          ) : pageRows.length === 0 ? (
            <tr>
              <td colSpan={13} style={{ padding: 0, background: "transparent" }}>
                <div className="empty-state">
                  <div className="empty-icon">📭</div>
                  <div className="empty-text">No jobs found</div>
                  {hasFilters && <div className="empty-sub">Try clearing your filters</div>}
                </div>
              </td>
            </tr>
          ) : (
            pageRows.map(job => {
              const isExpanded = expandedId === job.id;
              return (
                <React.Fragment key={job.id}>
                  <tr
                    className={isOverdue(job) ? "row-overdue" : undefined}
                    onClick={e => {
                      const tag = (e.target as HTMLElement).tagName.toLowerCase();
                      if (["button","input","select","a"].includes(tag)) return;
                      toggleExpand(job.id);
                    }}
                    style={{ cursor: "pointer" }}
                    title="Click to view history"
                  >
                    <td>
                      <input
                        type="checkbox"
                        checked={selectedIds.includes(job.id!)}
                        onChange={() => toggleOne(job.id)}
                        onClick={e => e.stopPropagation()}
                      />
                    </td>
                    <td>{resolveDisplayName(job.user_name)}</td>
                    <td>{job.job_type}</td>
                    <td>{job.task_name}</td>
                    <td style={{ color: "var(--muted)" }}>{job.description || "—"}</td>
                    <td className="cell-right">{job.quantity}</td>
                    <td style={{ color: "var(--muted)" }}>{job.unit || "—"}</td>
                    <td className="cell-right nowrap">{fmtHours(job.estimated_duration)}</td>
                    <td>
                      {(() => {
                        const c = job.complexity || "Normal";
                        const cls = c === "Simple" ? "complexity-simple"
                          : c === "Complex" ? "complexity-complex"
                          : c === "Very Complex" ? "complexity-verycomplex"
                          : "complexity-normal";
                        return <span className={`complexity-badge ${cls}`}>{c}</span>;
                      })()}
                    </td>
                    <td className="nowrap">{job.start_date || "—"}</td>
                    <td className="nowrap">{job.due_date || "—"}</td>
                    <td>
                      <button
                        type="button"
                        className={`btn small ${(job.status || "Open") === "Done" ? "ghost" : "primary"}`}
                        style={(job.status || "Open") === "Done" ? { color: "var(--success)", borderColor: "var(--success)" } : {}}
                        disabled={togglingId === job.id}
                        onClick={e => { e.stopPropagation(); handleToggleStatus(job); }}
                        title={(job.status || "Open") === "Done" ? "Click to re-open" : "Click to mark done"}
                      >
                        {togglingId === job.id ? "…" : (job.status || "Open") === "Done" ? "↺ Re-open" : "✓ Done"}
                      </button>
                    </td>
                    <td>
                      <div className="row" style={{ gap: 6 }}>
                        <button
                          type="button"
                          className="btn small"
                          onClick={e => { e.stopPropagation(); onEditJob(job); }}
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          className="btn danger small"
                          onClick={e => { e.stopPropagation(); handleDelete(job.id); }}
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>

                  {/* Inline history */}
                  {isExpanded && (
                    <tr className="detail-row">
                      <td colSpan={13}>
                        <div className="history-panel">
                          {loadingHistoryId === job.id && (
                            <div className="history-loading">Loading history…</div>
                          )}
                          {historyError && (
                            <div className="history-error">⚠ {historyError}</div>
                          )}
                          {!loadingHistoryId && !historyError && (
                            <div className="history-content">
                              <div className="history-head">
                                <strong>Job #{job.id}</strong> — {resolveDisplayName(job.user_name)}
                              </div>
                              <div className="history-grid">
                                {(historyByJob[job.id!] || []).map(h => (
                                  <div key={h.id} className="history-item">
                                    <div className="history-when">
                                      {new Date(h.changed_at).toLocaleString()}
                                    </div>
                                    <div className="history-event">
                                      <span className="chip badge">
                                        {h.event === "created" ? "Created" : "Updated"}
                                      </span>
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
                                              <td>{c.old == null || c.old === "" ? "—" : String(c.old)}</td>
                                              <td>{c.new == null || c.new === "" ? "—" : String(c.new)}</td>
                                            </tr>
                                          ))}
                                        </tbody>
                                      </table>
                                    ) : (
                                      h.event === "created"
                                        ? <div className="muted">Initial creation</div>
                                        : null
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
            })
          )}
        </tbody>
      </table>

      {/* Pagination */}
      <div style={{ marginTop: 12, display: "flex", gap: 6, alignItems: "center", justifyContent: "flex-end" }}>
        <span className="muted" style={{ marginRight: "auto", fontSize: 12 }}>
          {filtered.length} job{filtered.length !== 1 ? "s" : ""} total
        </span>
        <button type="button" className="btn small ghost" disabled={page <= 1} onClick={() => setPage(1)}>⏮</button>
        <button type="button" className="btn small ghost" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>Prev</button>
        <span style={{ fontSize: 13, color: "var(--muted)", minWidth: 90, textAlign: "center" }}>
          Page {page} / {totalPages}
        </span>
        <button type="button" className="btn small ghost" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>Next</button>
        <button type="button" className="btn small ghost" disabled={page >= totalPages} onClick={() => setPage(totalPages)}>⏭</button>
      </div>
    </div>
  );
};

export default JobList;
