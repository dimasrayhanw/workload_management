// src/pages/WorkloadDashboard.tsx
import React, { useEffect, useMemo, useState } from "react";
import { Job } from "../types";
import JobForm from "../components/JobForm";
import JobList from "../components/JobList";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
} from "chart.js";
import { Bar, Pie } from "react-chartjs-2";

ChartJS.register(CategoryScale, LinearScale, BarElement, ArcElement, Title, Tooltip, Legend);

const PALETTE = [
  "#4e79a7","#f28e2b","#e15759","#76b7b2","#59a14f","#edc949",
  "#af7aa1","#ff9da7","#9c755f","#bab0ab","#1f77b4","#ff7f0e",
  "#2ca02c","#d62728","#9467bd","#8c564b","#e377c2","#7f7f7f",
  "#bcbd22","#17becf"
];
const colorFor = (label: string) => {
  let h = 0;
  for (let i = 0; i < label.length; i++) h = (h * 31 + label.charCodeAt(i)) >>> 0;
  return PALETTE[h % PALETTE.length];
};

const WorkloadDashboard: React.FC = () => {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [editJob, setEditJob] = useState<Job | null>(null);

  const fetchJobs = async () => {
    try {
      const res = await fetch("http://localhost:8000/jobs/");
      const data = await res.json();
      setJobs(data);
    } catch (err) {
      console.error(err);
    }
  };
  useEffect(() => { fetchJobs(); }, []);

  // ------- Aggregations -------
  const aggregated = useMemo(() => {
    const map: Record<string, { user_name: string; total_duration: number }> = {};
    jobs.forEach(j => {
      const name = j.user_name?.trim();
      if (!name) return;
      if (!map[name]) map[name] = { user_name: name, total_duration: 0 };
      map[name].total_duration += Number(j.estimated_duration || 0);
    });
    return Object.values(map);
  }, [jobs]);

  const barLabels = aggregated.map(a => a.user_name);
  const barData = {
    labels: barLabels,
    datasets: [{
      label: "Total Estimated Duration (hrs)",
      data: aggregated.map(a => a.total_duration),
      backgroundColor: barLabels.map(l => colorFor(l)),
      borderColor: barLabels.map(l => colorFor(l)),
      borderWidth: 1
    }]
  };

  const pieDataByUser = {
    labels: barLabels,
    datasets: [{
      label: "Share (hrs)",
      data: aggregated.map(a => a.total_duration),
      backgroundColor: barLabels.map(l => colorFor(l)),
      borderColor: "#ffffff",
      borderWidth: 2
    }]
  };

  const byTypeMap = jobs.reduce<Record<string, number>>((acc, j) => {
    const k = j.job_type || "Unknown";
    acc[k] = (acc[k] || 0) + Number(j.estimated_duration || 0);
    return acc;
  }, {});
  const typeLabels = Object.keys(byTypeMap);
  const pieDataByType = {
    labels: typeLabels,
    datasets: [{
      label: "Total Estimated (hrs)",
      data: typeLabels.map(t => byTypeMap[t]),
      backgroundColor: typeLabels.map(t => colorFor(t)),
      borderColor: "#ffffff",
      borderWidth: 2
    }]
  };

  return (
    <div style={{ padding: 16 }}>
      <h1>Workload Dashboard</h1>

      {/* Form at top */}
      <JobForm
        onJobAdded={fetchJobs}
        editJob={editJob}
        onCancelEdit={() => setEditJob(null)}
      />

      {/* Charts in the middle */}
      <div
        style={{
          margin: "20px 0",
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
          gap: 16,
          alignItems: "start"
        }}
      >
        {/* Bar chart card */}
        <div style={{ background: "#fff", borderRadius: 8, padding: 12, boxShadow: "0 4px 8px rgba(0,0,0,0.05)" }}>
          <h3 style={{ margin: "0 0 8px" }}>Total Duration by User</h3>
          {/* FIX: fixed-height wrapper prevents infinite growth */}
          <div style={{ height: 220 }}>
            <Bar
              data={barData}
              options={{
                responsive: true,
                maintainAspectRatio: false, // fill the 220px wrapper
                plugins: { legend: { display: false }, tooltip: { enabled: true } },
                scales: {
                  y: { beginAtZero: true, ticks: { precision: 0 } },
                  x: { ticks: { autoSkip: false, maxRotation: 45, minRotation: 0 } }
                }
              }}
            />
          </div>
        </div>

        {/* Pie: share by user */}
        <div style={{ background: "#fff", borderRadius: 8, padding: 12, boxShadow: "0 4px 8px rgba(0,0,0,0.05)" }}>
          <h3 style={{ margin: "0 0 8px" }}>Share by User</h3>
          <div style={{ height: 220 }}>
            <Pie
              data={pieDataByUser}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { position: "bottom" } }
              }}
            />
          </div>
        </div>

        {/* Pie: by job type */}
        <div style={{ background: "#fff", borderRadius: 8, padding: 12, boxShadow: "0 4px 8px rgba(0,0,0,0.05)" }}>
          <h3 style={{ margin: "0 0 8px" }}>By Job Type</h3>
          <div style={{ height: 220 }}>
            <Pie
              data={pieDataByType}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { position: "bottom" } }
              }}
            />
          </div>
        </div>
      </div>

      {/* List at bottom */}
      <JobList
        jobs={jobs}
        onJobsUpdated={fetchJobs}
        onEditJob={(job) => setEditJob(job)}
      />
    </div>
  );
};

export default WorkloadDashboard;