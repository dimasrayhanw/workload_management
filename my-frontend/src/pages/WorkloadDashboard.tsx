// import React, { useEffect, useMemo, useState } from "react";
// import type { Job } from "../types";
// import { api } from "../api";
// import JobForm from "../components/JobForm";
// import JobList from "../components/JobList";

// import { Pie, Bar } from "react-chartjs-2";
// import {
//   Chart as ChartJS,
//   ArcElement,
//   Tooltip,
//   Legend,
//   CategoryScale,
//   LinearScale,
//   BarElement,
//   Title as ChartTitle,
// } from "chart.js";

// ChartJS.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement, ChartTitle);

// const WorkloadDashboard: React.FC = () => {
//   const [jobs, setJobs] = useState<Job[]>([]);
//   const [editJob, setEditJob] = useState<Job | null>(null);

//   const fetchJobs = async () => {
//     try {
//       setJobs(await api.getJobs());
//     } catch (err) {
//       console.error(err);
//       alert("Failed to fetch jobs.");
//     }
//   };

//   useEffect(() => {
//     fetchJobs();
//   }, []);

//   // aggregate durations by user
//   const aggregated = useMemo(() => {
//     const m = new Map<string, number>();
//     for (const j of jobs) {
//       const key = (j.user_name || "").trim() || "(no name)";
//       m.set(key, (m.get(key) || 0) + Number(j.estimated_duration || 0));
//     }
//     const labels = Array.from(m.keys());
//     const data = labels.map(l => m.get(l) || 0);
//     return { labels, data };
//   }, [jobs]);

//   const barData = {
//     labels: aggregated.labels,
//     datasets: [
//       {
//         label: "Total Estimated Duration (hrs)",
//         data: aggregated.data,
//         backgroundColor: [
//           "#4bc0c0","#ff6384","#36a2eb","#ffcd56","#9966ff","#ff9f40","#66bb6a","#ec407a","#29b6f6","#ab47bc"
//         ],
//       },
//     ],
//   };

//   const pieData = {
//     labels: aggregated.labels,
//     datasets: [
//       {
//         data: aggregated.data,
//         backgroundColor: [
//           "#4bc0c0","#ff6384","#36a2eb","#ffcd56","#9966ff","#ff9f40","#66bb6a","#ec407a","#29b6f6","#ab47bc"
//         ],
//       },
//     ],
//   };

//   const barOptions = {
//     responsive: true,
//     maintainAspectRatio: false,
//     plugins: { legend: { display: false }, title: { display: false, text: "" } },
//     scales: { y: { beginAtZero: true } },
//   } as const;

//   const pieOptions = {
//     responsive: true,
//     maintainAspectRatio: false,
//     plugins: { legend: { position: "right" as const } },
//   };

//   return (
//     <div style={{ padding: 16 }}>
//       <h1>Workload Dashboard</h1>

//       {/* Charts row */}
//       <div style={{ display: "flex", gap: 16, alignItems: "stretch", margin: "8px 0 24px" }}>
//         <div style={{ flex: 1, minWidth: 300, height: 260 }}>
//           <Bar data={barData} options={barOptions} />
//         </div>
//         <div style={{ flex: 1, minWidth: 300, height: 260 }}>
//           <Pie data={pieData} options={pieOptions} />
//         </div>
//       </div>

//       <JobForm onJobAdded={() => { fetchJobs(); setEditJob(null); }} editJob={editJob} onCancelEdit={() => setEditJob(null)} />

//       <h2>Job List</h2>
//       <JobList jobs={jobs} onJobsUpdated={fetchJobs} onEditJob={(job) => setEditJob(job)} />
//     </div>
//   );
// };

// export default WorkloadDashboard;

import React, { useEffect, useMemo, useState } from "react";
import { api } from "../api";
import JobForm from "../components/JobForm";
import JobList from "../components/JobList";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend
} from "recharts";
import "../App.css";

const COLORS = ["#6ea8fe","#9b8dfc","#4dd4ac","#ffd166","#ff8fab","#a1e3ff","#b2f7ef","#f7a072"];

const WorkloadDashboard: React.FC = () => {
  const [jobs, setJobs] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const refresh = async () => {
    setLoading(true);
    try {
      const data = await api.getJobs();
      setJobs(data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { refresh(); }, []);

  const byUser = useMemo(() => {
    const map: Record<string, number> = {};
    for (const j of jobs) {
      const key = (j.user_name || "unknown").toLowerCase();
      map[key] = (map[key] || 0) + (j.estimated_duration || 0);
    }
    return Object.entries(map).map(([user, hours]) => ({ user, hours: +hours.toFixed(1) }));
  }, [jobs]);

  const byType = useMemo(() => {
    const map: Record<string, number> = {};
    for (const j of jobs) map[j.job_type] = (map[j.job_type] || 0) + (j.estimated_duration || 0);
    return Object.entries(map).map(([name, value]) => ({ name, value: +value.toFixed(1) }));
  }, [jobs]);

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
            Users: {new Set(jobs.map(j => (j.user_name||"").toLowerCase())).size}
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
              <BarChart data={byUser}>
                <XAxis dataKey="user" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="hours">
                  {byUser.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
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
                  {byType.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
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
        <JobForm onJobAdded={refresh} />
      </div>

      {/* List */}
      <div className="card pad">
        <div className="toolbar" style={{ marginBottom: 10 }}>
          <div className="section-title" style={{ margin: 0 }}>Jobs</div>
          <div className="spacer" />
          <button className="btn ghost small" onClick={refresh} disabled={loading}>
            {loading ? "Refreshing…" : "Refresh"}
          </button>
        </div>
        <div className="table-wrap">
          <JobList jobs={jobs} onJobsUpdated={refresh} onEditJob={() => {}} />
        </div>
      </div>
    </div>
  );
};

export default WorkloadDashboard;