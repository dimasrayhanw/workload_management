import React, { useMemo, useState } from "react";
import type { Job } from "../types";
import { api } from "../api";

type Props = {
  jobs: Job[];
  onJobsUpdated: () => void;
  onEditJob: (job: Job) => void;
};
type SortKey = keyof Job | "estimated_duration" | "quantity";
type Sort = { key: SortKey; dir: "asc" | "desc" } | null;

const todayISO = () => new Date().toISOString().slice(0, 10);

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
    if (fUser) r = r.filter(j => (j.user_name || "").toLowerCase().includes(fUser.toLowerCase()));
    if (fType) r = r.filter(j => j.job_type === fType);
    if (fTask) r = r.filter(j => (j.task_name || "").toLowerCase().includes(fTask.toLowerCase()));
    if (fStatus) r = r.filter(j => (j.status || "Open") === fStatus);
    if (fStartFrom) r = r.filter(j => !j.start_date || j.start_date >= fStartFrom);
    if (fStartTo) r = r.filter(j => !j.start_date || j.start_date <= fStartTo);
    if (fDueFrom) r = r.filter(j => !j.due_date || j.due_date >= fDueFrom);
    if (fDueTo) r = r.filter(j => !j.due_date || j.due_date <= fDueTo);
    if (sort) {
      r.sort((a: any, b: any) => {
        const A = a[sort.key] ?? "";
        const B = b[sort.key] ?? "";
        if (A < B) return sort.dir === "asc" ? -1 : 1;
        if (A > B) return sort.dir === "asc" ? 1 : -1;
        return 0;
      });
    }
    return r;
  }, [jobs, fUser, fType, fTask, fStatus, fStartFrom, fStartTo, fDueFrom, fDueTo, sort]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const pageRows = filtered.slice((page - 1) * pageSize, page * pageSize);

  const allOnPageSelected = pageRows.length > 0 && pageRows.every(j => selectedIds.includes(j.id!));
  const toggleAllOnPage = () => {
    const ids = pageRows.map(j => j.id!) as number[];
    if (allOnPageSelected) {
      setSelectedIds(prev => prev.filter(id => !ids.includes(id)));
    } else {
      setSelectedIds(prev => [...new Set([...prev, ...ids])]);
    }
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
    for (const id of selectedIds) {
      try { await api.deleteJob(id); } catch {}
    }
    setSelectedIds([]);
    onJobsUpdated();
  };

  const fmtHours = (h: number | undefined | null) => {
    const v = Number(h ?? 0);
    return Number.isFinite(v) ? (v % 1 === 0 ? `${v.toFixed(0)} h` : `${v.toFixed(1)} h`) : "-";
  };

  const exportCSV = () => {
    const rows = [[
      "User Name","Job Type","Task Name","Description",
      "Quantity","Unit","Est. Duration (hrs)","Start Date","Due Date","Status"
    ]];
    filtered.forEach(j => {
      rows.push([
        j.user_name || "",
        j.job_type || "",
        j.task_name || "",
        j.description || "",
        String(j.quantity ?? ""),
        j.unit || "",
        typeof j.estimated_duration === "number" && isFinite(j.estimated_duration)
          ? (j.estimated_duration % 1 === 0
              ? j.estimated_duration.toFixed(0)
              : j.estimated_duration.toFixed(1))
          : "",
        j.start_date || "",
        j.due_date || "",
        j.status || "Open",
      ]);
    });
    const csv = rows.map(r => r.map(x => `"${String(x).replace(/"/g,'""')}"`).join(",")).join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "jobs.csv"; a.click();
    URL.revokeObjectURL(url);
  };

  const isOverdue = (j: Job) =>
    j.due_date && j.due_date < todayISO() && (j.status || "Open") !== "Done";

  return (
    <div>
      {/* Filters */}
      <div style={{ display: "grid", gap: 8, gridTemplateColumns: "repeat(5, minmax(0,1fr))", margin: "8px 0" }}>
        <input placeholder="Filter User" value={fUser} onChange={(e) => setFUser(e.target.value)} />
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
        <button className="btn-primary" onClick={exportCSV}>Export CSV</button>
      </div>

      <div style={{ display: "grid", gap: 8, gridTemplateColumns: "repeat(4, minmax(0,1fr))", marginBottom: 8 }}>
        <label>Start From <input type="date" value={fStartFrom} onChange={(e) => setFStartFrom(e.target.value)} /></label>
        <label>Start To <input type="date" value={fStartTo} onChange={(e) => setFStartTo(e.target.value)} /></label>
        <label>Due From <input type="date" value={fDueFrom} onChange={(e) => setFDueFrom(e.target.value)} /></label>
        <label>Due To <input type="date" value={fDueTo} onChange={(e) => setFDueTo(e.target.value)} /></label>
      </div>

      {selectedIds.length > 0 && (
        <div style={{ marginBottom: 8, display: "flex", gap: 8 }}>
          <button className="btn-danger" onClick={handleBulkDelete}>Delete Selected ({selectedIds.length})</button>
        </div>
      )}

      <table border={1} cellPadding={5} style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead>
          <tr>
            <th><input type="checkbox" checked={allOnPageSelected} onChange={toggleAllOnPage} /></th>
            <th onClick={() => toggleSort("user_name")} style={{ cursor: "pointer" }}>User Name</th>
            <th onClick={() => toggleSort("job_type")} style={{ cursor: "pointer" }}>Job Type</th>
            <th onClick={() => toggleSort("task_name")} style={{ cursor: "pointer" }}>Task Name</th>
            <th>Description</th>
            <th onClick={() => toggleSort("quantity")} style={{ cursor: "pointer" }}>Quantity</th>
            <th>Unit</th>
            <th onClick={() => toggleSort("estimated_duration")} style={{ cursor: "pointer" }}>Est. Duration (hrs)</th>
            <th onClick={() => toggleSort("start_date")} style={{ cursor: "pointer" }}>Start</th>
            <th onClick={() => toggleSort("due_date")} style={{ cursor: "pointer" }}>Due</th>
            <th onClick={() => toggleSort("status")} style={{ cursor: "pointer" }}>Status</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {pageRows.map((job) => (
            <tr key={job.id} style={isOverdue(job) ? { background: "#fff3f3" } : undefined}>
              <td>
                <input
                  type="checkbox"
                  checked={selectedIds.includes(job.id!)}
                  onChange={() => toggleOne(job.id)}
                />
              </td>
              <td>{job.user_name}</td>
              <td>{job.job_type}</td>
              <td>{job.task_name}</td>
              <td>{job.description || "-"}</td>
              <td style={{ textAlign: "right" }}>{job.quantity}</td>
              <td>{job.unit || "-"}</td>
              <td style={{ whiteSpace: "nowrap", textAlign: "right" }}>{fmtHours(job.estimated_duration)}</td>
              <td>{job.start_date || "-"}</td>
              <td>{job.due_date || "-"}</td>
              <td>{job.status || "Open"}</td>
              <td>
                <button className="btn-primary" onClick={() => onEditJob(job)}>Edit</button>{" "}
                <button className="btn-danger" onClick={() => handleDelete(job.id)}>Delete</button>
              </td>
            </tr>
          ))}
          {pageRows.length === 0 && (
            <tr><td colSpan={12} style={{ textAlign: "center", padding: 16 }}>No jobs</td></tr>
          )}
        </tbody>
      </table>

      {/* Pagination */}
      <div style={{ marginTop: 8, display: "flex", gap: 8, alignItems: "center" }}>
        <button disabled={page <= 1} onClick={() => setPage(1)}>⏮</button>
        <button disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>Prev</button>
        <span>Page {page} / {totalPages}</span>
        <button disabled={page >= totalPages} onClick={() => setPage((p) => Math.min(totalPages, p + 1))}>Next</button>
        <button disabled={page >= totalPages} onClick={() => setPage(totalPages)}>⏭</button>
      </div>
    </div>
  );
};

export default JobList;