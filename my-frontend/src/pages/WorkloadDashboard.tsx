// src/pages/WorkloadDashboard.tsx
import React from "react";
import { api } from "../api";
import JobForm from "../components/JobForm";
import JobList from "../components/JobList";
import type { Job } from "../types";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend
} from "recharts";
import "../App.css";

const COLORS = ["#6ea8fe", "#9b8dfc", "#4dd4ac", "#ffd166", "#ff8fab", "#a1e3ff", "#b2f7ef", "#f7a072"];

/** Rotated/custom tick for the X axis (always render, truncate long names) */
const AxisTick: React.FC<any> = ({ x, y, payload }) => {
  const label = String(payload?.value ?? "");
  const short = label.length > 14 ? label.slice(0, 12) + "…" : label;
  return (
    <text
      x={x}
      y={y + 12}
      textAnchor="end"
      transform={`rotate(-35, ${x}, ${y + 12})`}
      style={{ fontSize: 12, fill: "#b7c2e6" }}
    >
      {short}
    </text>
  );
};

const WorkloadDashboard: React.FC = () => {
  const [jobs, setJobs] = React.useState<Job[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [editingJob, setEditingJob] = React.useState<Job | null>(null);

  const fetchJobs = React.useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.getJobs();
      setJobs(data);
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    fetchJobs();
  }, [fetchJobs]);

  // Charts data — exclude "Done" jobs from visualizations
  const activeJobs = React.useMemo(
    () => jobs.filter(j => (j.status || "Open").toLowerCase() !== "done"),
    [jobs]
  );

  const byUser = React.useMemo(() => {
    const map: Record<string, number> = {};
    for (const j of activeJobs) {
      const key = (j.user_name || "unknown").toLowerCase();
      map[key] = (map[key] || 0) + (j.estimated_duration || 0);
    }
    return Object.entries(map).map(([user, hours]) => ({ user, hours: +hours.toFixed(1) }));
  }, [activeJobs]);

  const byType = React.useMemo(() => {
    const map: Record<string, number> = {};
    for (const j of activeJobs) {
      map[j.job_type] = (map[j.job_type] || 0) + (j.estimated_duration || 0);
    }
    return Object.entries(map).map(([name, value]) => ({ name, value: +value.toFixed(1) }));
  }, [activeJobs]);

  return (
    <div className="container">
      <div className="header">
        <div>
          <div className="h1">Workload Dashboard</div>
          <div className="sub">Track jobs, estimates and status in one place</div>
        </div>
        <div className="chips">
          <span className="chip badge">Jobs: {jobs.length}</span>
          <span className="chip badge">
            Users: {new Set(jobs.map(j => (j.user_name || "").toLowerCase())).size}
          </span>
        </div>
      </div>

      {/* Charts row */}
      <div className="card pad charts" style={{ marginBottom: 14 }}>
        {/* Bar */}
        <div className="card pad">
          <div className="section-title">Hours by User</div>
          <div style={{ width: "100%", height: 260 }}>
            <ResponsiveContainer>
              <BarChart
                data={byUser}
                margin={{ top: 8, right: 12, left: 0, bottom: 48 }}
              >
                <XAxis
                  dataKey="user"
                  interval={0}        // show every label
                  height={52}         // room for rotated labels
                  tickMargin={8}
                  tickLine={false}
                  axisLine={false}
                  tick={<AxisTick />} // rotated + truncated
                />
                <YAxis />
                <Tooltip />
                <Bar dataKey="hours">
                  {byUser.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Pie */}
        <div className="card pad" style={{ maxWidth: 420 }}>
          <div className="section-title">Hours by Type</div>
          <div style={{ width: "100%", height: 260 }}>
            <ResponsiveContainer>
              <PieChart>
                <Pie data={byType} dataKey="value" nameKey="name" outerRadius={90}>
                  {byType.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Legend />
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Form */}
      <div className="card pad" style={{ marginBottom: 14 }}>
        <div className="section-title">Add / Edit Job</div>
        <JobForm
          editJob={editingJob}
          onCancelEdit={() => setEditingJob(null)}
          onJobAdded={() => {
            setEditingJob(null);
            fetchJobs();
          }}
        />
      </div>

      {/* List */}
      <div className="card pad">
        <div className="toolbar" style={{ marginBottom: 10 }}>
          <div className="section-title" style={{ margin: 0 }}>Jobs</div>
          <div className="spacer" />
          <button className="btn ghost small" onClick={fetchJobs} disabled={loading}>
            {loading ? "Refreshing…" : "Refresh"}
          </button>
        </div>
        <div className="table-wrap">
          <JobList
            jobs={jobs}
            onJobsUpdated={fetchJobs}
            onEditJob={(job) => setEditingJob(job)}
          />
        </div>
      </div>
    </div>
  );
};

export default WorkloadDashboard;