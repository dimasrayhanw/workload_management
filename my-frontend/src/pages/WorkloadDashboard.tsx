import React, { useEffect, useMemo, useState } from "react";
import { Job } from "../types";
import { api } from "../api";
import JobForm from "../components/JobForm";
import JobList from "../components/JobList";

import { Pie, Bar } from "react-chartjs-2";
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend,
  CategoryScale,
  LinearScale,
  BarElement,
  Title as ChartTitle,
} from "chart.js";

ChartJS.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement, ChartTitle);

const WorkloadDashboard: React.FC = () => {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [editJob, setEditJob] = useState<Job | null>(null);

  const fetchJobs = async () => {
    try {
      setJobs(await api.getJobs());
    } catch (err) {
      console.error(err);
      alert("Failed to fetch jobs.");
    }
  };

  useEffect(() => {
    fetchJobs();
  }, []);

  // aggregate durations by user
  const aggregated = useMemo(() => {
    const m = new Map<string, number>();
    for (const j of jobs) {
      const key = (j.user_name || "").trim() || "(no name)";
      m.set(key, (m.get(key) || 0) + Number(j.estimated_duration || 0));
    }
    const labels = Array.from(m.keys());
    const data = labels.map(l => m.get(l) || 0);
    return { labels, data };
  }, [jobs]);

  const barData = {
    labels: aggregated.labels,
    datasets: [
      {
        label: "Total Estimated Duration (hrs)",
        data: aggregated.data,
        backgroundColor: [
          "#4bc0c0","#ff6384","#36a2eb","#ffcd56","#9966ff","#ff9f40","#66bb6a","#ec407a","#29b6f6","#ab47bc"
        ],
      },
    ],
  };

  const pieData = {
    labels: aggregated.labels,
    datasets: [
      {
        data: aggregated.data,
        backgroundColor: [
          "#4bc0c0","#ff6384","#36a2eb","#ffcd56","#9966ff","#ff9f40","#66bb6a","#ec407a","#29b6f6","#ab47bc"
        ],
      },
    ],
  };

  const barOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { display: false }, title: { display: false, text: "" } },
    scales: { y: { beginAtZero: true } },
  } as const;

  const pieOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { position: "right" as const } },
  };

  return (
    <div style={{ padding: 16 }}>
      <h1>Workload Dashboard</h1>

      {/* Charts row */}
      <div style={{ display: "flex", gap: 16, alignItems: "stretch", margin: "8px 0 24px" }}>
        <div style={{ flex: 1, minWidth: 300, height: 260 }}>
          <Bar data={barData} options={barOptions} />
        </div>
        <div style={{ flex: 1, minWidth: 300, height: 260 }}>
          <Pie data={pieData} options={pieOptions} />
        </div>
      </div>

      <JobForm onJobAdded={() => { fetchJobs(); setEditJob(null); }} editJob={editJob} onCancelEdit={() => setEditJob(null)} />

      <h2>Job List</h2>
      <JobList jobs={jobs} onJobsUpdated={fetchJobs} onEditJob={(job) => setEditJob(job)} />
    </div>
  );
};

export default WorkloadDashboard;