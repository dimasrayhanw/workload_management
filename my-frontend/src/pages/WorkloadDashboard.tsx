// import React, { useEffect, useState } from "react";
// import JobList from "../components/JobList";
// import JobForm from "../components/JobForm";
// import { Bar } from "react-chartjs-2";
// import {
//   Chart as ChartJS,
//   CategoryScale,
//   LinearScale,
//   BarElement,
//   Title,
//   Tooltip,
//   Legend,
// } from "chart.js";

// ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

// interface Job {
//   id: number;
//   user_name: string;
//   job_type: string;
//   task_name: string;
//   description?: string;
//   quantity: number;
//   estimated_duration: number;
//   unit?: string;
// }

// const WorkloadDashboard: React.FC = () => {
//   const [jobs, setJobs] = useState<Job[]>([]);
//   const [editJob, setEditJob] = useState<Job | null>(null);

//   const fetchJobs = async () => {
//     try {
//       const res = await fetch("http://localhost:8000/jobs/");
//       if (!res.ok) throw new Error("Failed to fetch jobs");
//       const data = await res.json();
//       setJobs(data);
//     } catch (error) {
//       console.error(error);
//     }
//   };

//   useEffect(() => {
//     fetchJobs();
//   }, []);

//   // Aggregate by normalized name
//   const aggregatedData = jobs.reduce((acc, job) => {
//     const nameKey = job.user_name.trim().toLowerCase();
//     if (!acc[nameKey]) {
//       acc[nameKey] = {
//         user_name: job.user_name.trim(),
//         total_duration: 0,
//         total_quantity: 0,
//       };
//     }
//     acc[nameKey].total_duration += job.estimated_duration;
//     acc[nameKey].total_quantity += job.quantity;
//     return acc;
//   }, {} as Record<string, { user_name: string; total_duration: number; total_quantity: number }>);

//   const chartData = {
//     labels: Object.values(aggregatedData).map((item) => item.user_name),
//     datasets: [
//       {
//         label: "Total Estimated Duration",
//         data: Object.values(aggregatedData).map((item) => item.total_duration),
//         backgroundColor: "rgba(75, 192, 192, 0.6)",
//       },
//     ],
//   };

//   return (
//     <div>
//       <h1>Workload Dashboard</h1>

//       <JobForm
//         onJobAdded={fetchJobs}
//         editJob={editJob}
//         onCancelEdit={() => setEditJob(null)}
//       />
//       <JobList
//         jobs={jobs}
//         onJobsUpdated={fetchJobs}
//         onEditJob={(job) => setEditJob(job)}
//       />

//       <h2>Summary Table</h2>
//       <table border={1} cellPadding={5}>
//         <thead>
//           <tr>
//             <th>User Name</th>
//             <th>Total Quantity</th>
//             <th>Total Estimated Duration</th>
//           </tr>
//         </thead>
//         <tbody>
//           {Object.values(aggregatedData).map((item) => (
//             <tr key={item.user_name}>
//               <td>{item.user_name}</td>
//               <td>{item.total_quantity}</td>
//               <td>{item.total_duration}</td>
//             </tr>
//           ))}
//         </tbody>
//       </table>

//       <h2>Total Estimated Duration by User</h2>
//       <div style={{ maxWidth: "600px" }}>
//         <Bar data={chartData} />
//       </div>
//     </div>
//   );
// };

// export default WorkloadDashboard;

import React, { useEffect, useState } from "react";
import JobForm, { Job } from "../components/JobForm";
import JobList from "../components/JobList";
import { Bar } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from "chart.js";

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

const WorkloadDashboard: React.FC = () => {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [editJob, setEditJob] = useState<Job | null>(null);

  const fetchJobs = async () => {
    try {
      const res = await fetch("http://localhost:8000/jobs/");
      if (!res.ok) throw new Error("Failed to fetch jobs");
      const data = await res.json();
      setJobs(data);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchJobs();
  }, []);

  // aggregate by normalized user name
  const aggregated = Object.values(
    jobs.reduce((acc: Record<string, { user_name: string; total_duration: number; total_quantity: number }>, j) => {
      const key = (j.user_name || "").trim().toLowerCase() || "__unknown__";
      if (!acc[key]) {
        acc[key] = { user_name: j.user_name ? j.user_name.trim() : "(no name)", total_duration: 0, total_quantity: 0 };
      }
      acc[key].total_duration += Number(j.estimated_duration || 0);
      acc[key].total_quantity += Number(j.quantity || 0);
      return acc;
    }, {})
  );

  const chartData = {
    labels: aggregated.map(a => a.user_name),
    datasets: [
      {
        label: "Total Estimated Duration",
        data: aggregated.map(a => a.total_duration),
        backgroundColor: "rgba(54, 162, 235, 0.7)",
      },
    ],
  };

  return (
    <div style={{ padding: 16, fontFamily: "'Poppins', system-ui, sans-serif" }}>
      <h1 style={{ fontFamily: "'Fredoka One', cursive", marginBottom: 8 }}>Workload Dashboard</h1>

      <JobForm
        onJobAdded={() => {
          fetchJobs();
          setEditJob(null);
        }}
        editJob={editJob}
        onCancelEdit={() => setEditJob(null)}
      />

      <h2>Job List</h2>
      <JobList jobs={jobs} onJobsUpdated={fetchJobs} onEditJob={(job) => setEditJob(job)} />

      <h2 style={{ marginTop: 24 }}>Summary</h2>
      <table border={1} cellPadding={5} style={{ borderCollapse: "collapse", marginBottom: 20 }}>
        <thead>
          <tr>
            <th>User</th>
            <th>Total Quantity</th>
            <th>Total Estimated Duration</th>
          </tr>
        </thead>
        <tbody>
          {aggregated.map(a => (
            <tr key={a.user_name}>
              <td>{a.user_name}</td>
              <td style={{ textAlign: "right" }}>{a.total_quantity}</td>
              <td style={{ textAlign: "right" }}>{a.total_duration}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <h2>Total Estimated Duration by User</h2>
      <div style={{ maxWidth: 800 }}>
        <Bar data={chartData} />
      </div>
    </div>
  );
};

export default WorkloadDashboard;