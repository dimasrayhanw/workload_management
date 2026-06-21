// src/pages/WorkloadDashboard.tsx
import React from "react";
import { api } from "../api";
import JobForm from "../components/JobForm";
import JobList from "../components/JobList";
import { toast } from "../components/ToastContainer";
import type { Theme } from "../App";
import type { Job } from "../types";
import { resolveDisplayName } from "../constants";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from "recharts";
import "../App.css";

type Props = {
  theme: Theme;
  onToggleTheme: () => void;
};

const CHART_COLORS = ["#A50034","#cc3366","#ff6699","#6ea8fe","#4dd4ac","#ffd166","#f7a072","#9b8dfc"];

const WorkloadDashboard: React.FC<Props> = ({ theme, onToggleTheme }) => {
  const [jobs, setJobs] = React.useState<Job[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [isFirstLoad, setIsFirstLoad] = React.useState(true);
  const [editingJob, setEditingJob] = React.useState<Job | null>(null);

  const isDark = theme === "dark";

  const chartTooltipStyle = {
    background: isDark ? "#1c1c1c" : "#ffffff",
    border: `1px solid ${isDark ? "#2d2d2d" : "#e2e2e2"}`,
    borderRadius: 8,
    color: isDark ? "#f2f2f2" : "#1a1a1a",
    fontSize: 12,
  };

  const axisColor = isDark ? "#9e9e9e" : "#6b7280";

  const AxisTick: React.FC<any> = ({ x, y, payload }) => {
    const label = String(payload?.value ?? "");
    const short = label.length > 14 ? label.slice(0, 12) + "…" : label;
    return (
      <text
        x={x} y={y + 12}
        textAnchor="end"
        transform={`rotate(-35, ${x}, ${y + 12})`}
        style={{ fontSize: 11, fill: axisColor }}
      >
        {short}
      </text>
    );
  };

  const fetchJobs = React.useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.getJobs();
      setJobs(data);
    } catch {
      toast.error("Failed to load jobs. Check your connection.");
    } finally {
      setLoading(false);
      setIsFirstLoad(false);
    }
  }, []);

  React.useEffect(() => { fetchJobs(); }, [fetchJobs]);

  // ── Stat values ───────────────────────────────────────────
  const stats = React.useMemo(() => {
    const activeJobs = jobs.filter(j => (j.status || "Open").toLowerCase() !== "done");
    const totalHours = activeJobs.reduce((s, j) => s + (j.estimated_duration || 0), 0);
    const uniqueUsers = new Set(jobs.map(j => (j.user_name || "").toLowerCase())).size;
    const overdueCount = jobs.filter(j => {
      if (!j.due_date || (j.status || "Open").toLowerCase() === "done") return false;
      const [y, m, d] = j.due_date.split("-").map(Number);
      const due = new Date(y, m - 1, d);
      const today = new Date(); today.setHours(0, 0, 0, 0);
      return due < today;
    }).length;
    return { total: jobs.length, totalHours, uniqueUsers, overdueCount };
  }, [jobs]);

  // ── Chart data (active jobs only) ─────────────────────────
  const activeJobs = React.useMemo(
    () => jobs.filter(j => (j.status || "Open").toLowerCase() !== "done"),
    [jobs]
  );

  const byUser = React.useMemo(() => {
    const map: Record<string, number> = {};
    for (const j of activeJobs) {
      const key = resolveDisplayName(j.user_name || "unknown");
      map[key] = (map[key] || 0) + (j.estimated_duration || 0);
    }
    return Object.entries(map)
      .map(([user, hours]) => ({ user, hours: +hours.toFixed(1) }))
      .sort((a, b) => b.hours - a.hours);
  }, [activeJobs]);

  const byType = React.useMemo(() => {
    const map: Record<string, number> = {};
    for (const j of activeJobs) {
      map[j.job_type] = (map[j.job_type] || 0) + (j.estimated_duration || 0);
    }
    return Object.entries(map).map(([name, value]) => ({ name, value: +value.toFixed(1) }));
  }, [activeJobs]);

  // ── Initial loading screen ─────────────────────────────────
  if (isFirstLoad && loading) {
    return (
      <div className="container">
        <div className="page-spinner">
          <div className="spinner" />
          Loading workload data…
        </div>
      </div>
    );
  }

  return (
    <div className="container">

      {/* ── Header ── */}
      <div className="header">
        <div className="header-left">
          <div className="h1">Workload Dashboard HW OLED LGERC</div>
          <div className="sub">For the easiest job tracking</div>
        </div>
        <div className="header-right">
          <button className="theme-toggle" onClick={onToggleTheme} title="Toggle theme">
            {isDark ? "☀️ Light" : "🌙 Dark"}
          </button>
          <div className="chips">
            <span className="chip badge">Jobs: {jobs.length}</span>
            <span className="chip badge">Users: {stats.uniqueUsers}</span>
          </div>
        </div>
      </div>

      {/* ── Stat cards ── */}
      <div className="stat-cards">
        <div className="stat-card accent-red">
          <span className="stat-label">Total Jobs</span>
          <span className="stat-value">{stats.total}</span>
          <span className="stat-sub">All statuses</span>
        </div>
        <div className="stat-card accent-green">
          <span className="stat-label">Active Hours</span>
          <span className="stat-value">{stats.totalHours.toFixed(1)}</span>
          <span className="stat-sub">Estimated (excl. Done)</span>
        </div>
        <div className="stat-card accent-warn">
          <span className="stat-label">Active Users</span>
          <span className="stat-value">{stats.uniqueUsers}</span>
          <span className="stat-sub">Unique members</span>
        </div>
        <div className={`stat-card ${stats.overdueCount > 0 ? "accent-danger" : "accent-green"}`}>
          <span className="stat-label">Overdue</span>
          <span
            className="stat-value"
            style={stats.overdueCount > 0 ? { color: "var(--danger)" } : {}}
          >
            {stats.overdueCount}
          </span>
          <span className="stat-sub">Past due date</span>
        </div>
      </div>

      {/* ── Charts row ── */}
      <div className="card pad charts" style={{ marginBottom: 14 }}>

        {/* Bar: hours by user */}
        <div className="card pad">
          <div className="section-title">Hours by User (active)</div>
          {loading ? (
            <div className="skeleton" style={{ height: 260, borderRadius: 8 }} />
          ) : byUser.length === 0 ? (
            <div className="empty-chart"><span className="muted">No active jobs</span></div>
          ) : (
            <div style={{ width: "100%", height: 260 }}>
              <ResponsiveContainer>
                <BarChart data={byUser} margin={{ top: 8, right: 12, left: 0, bottom: 52 }}>
                  <XAxis
                    dataKey="user"
                    interval={0}
                    height={56}
                    tickMargin={8}
                    tickLine={false}
                    axisLine={false}
                    tick={<AxisTick />}
                  />
                  <YAxis
                    tick={{ fill: axisColor, fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip contentStyle={chartTooltipStyle} cursor={{ fill: "rgba(165,0,52,0.08)" }} />
                  <Bar dataKey="hours" radius={[4, 4, 0, 0]}>
                    {byUser.map((_, i) => (
                      <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        {/* Pie: hours by type */}
        <div className="card pad" style={{ maxWidth: 420 }}>
          <div className="section-title">Hours by Type (active)</div>
          {loading ? (
            <div className="skeleton" style={{ height: 260, borderRadius: 8 }} />
          ) : byType.length === 0 ? (
            <div className="empty-chart"><span className="muted">No active jobs</span></div>
          ) : (
            <div style={{ width: "100%", height: 260 }}>
              <ResponsiveContainer>
                <PieChart>
                  <Pie data={byType} dataKey="value" nameKey="name" outerRadius={90} paddingAngle={3}>
                    {byType.map((_, i) => (
                      <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                    ))}
                  </Pie>
                  <Legend wrapperStyle={{ fontSize: 12, color: axisColor }} />
                  <Tooltip contentStyle={chartTooltipStyle} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      </div>

      {/* ── Add / Edit form ── */}
      <div className="card pad" style={{ marginBottom: 14 }}>
        <div className="section-title">{editingJob ? "Edit Job" : "Add Job"}</div>
        <JobForm
          editJob={editingJob}
          onCancelEdit={() => setEditingJob(null)}
          onJobAdded={() => {
            setEditingJob(null);
            fetchJobs();
          }}
        />
      </div>

      {/* ── Job list ── */}
      <div className="card pad">
        <div className="toolbar" style={{ marginBottom: 10 }}>
          <div className="section-title" style={{ margin: 0 }}>Jobs</div>
          <div className="spacer" />
          <button className="btn ghost small" onClick={fetchJobs} disabled={loading}>
            {loading ? "Refreshing…" : "↻ Refresh"}
          </button>
        </div>
        <div className="table-wrap">
          <JobList
            jobs={jobs}
            loading={loading}
            onJobsUpdated={fetchJobs}
            onEditJob={job => setEditingJob(job)}
          />
        </div>
      </div>
    </div>
  );
};

export default WorkloadDashboard;
