// import React from "react";

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

// interface JobListProps {
//   jobs: Job[];
//   onJobsUpdated: () => void;
//   onEditJob: (job: Job) => void;
// }

// const JobList: React.FC<JobListProps> = ({ jobs, onJobsUpdated, onEditJob }) => {
//   const handleDelete = async (id: number) => {
//     if (!window.confirm("Are you sure you want to delete this job?")) return;
//     try {
//       const res = await fetch(`http://localhost:8000/jobs/${id}`, {
//         method: "DELETE",
//       });
//       if (!res.ok) throw new Error("Failed to delete job");
//       onJobsUpdated();
//     } catch (err) {
//       console.error(err);
//     }
//   };

//   return (
//     <table border={1} cellPadding={5}>
//       <thead>
//         <tr>
//           <th>User Name</th>
//           <th>Job Type</th>
//           <th>Task Name</th>
//           <th>Description</th>
//           <th>Quantity</th>
//           <th>Estimated Duration</th>
//           <th>Unit</th>
//           <th>Actions</th>
//         </tr>
//       </thead>
//       <tbody>
//         {jobs.map((job) => (
//           <tr key={job.id}>
//             <td>{job.user_name}</td>
//             <td>{job.job_type}</td>
//             <td>{job.task_name}</td>
//             <td>{job.description}</td>
//             <td>{job.quantity}</td>
//             <td>{job.estimated_duration}</td>
//             <td>{job.unit}</td>
//             <td>
//               <button className="btn-primary" onClick={() => onEditJob(job)}>
//                 Edit
//               </button>
//               <button className="btn-danger" onClick={() => handleDelete(job.id)}>
//                 Delete
//               </button>
//             </td>
//           </tr>
//         ))}
//       </tbody>
//     </table>
//   );
// };

// export default JobList;

import React from "react";
import JobForm, { Job } from "../components/JobForm";

interface JobListProps {
  jobs: Job[];
  onJobsUpdated: () => void;
  onEditJob: (job: Job) => void;
}

const JobList: React.FC<JobListProps> = ({ jobs, onJobsUpdated, onEditJob }) => {
  const handleDelete = async (id?: number) => {
    if (!id) return;
    if (!window.confirm("Are you sure you want to delete this job?")) return;
    try {
      const res = await fetch(`http://localhost:8000/jobs/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Delete failed");
      onJobsUpdated();
    } catch (err) {
      console.error(err);
      alert("Delete failed. See console.");
    }
  };

  return (
    <table border={1} cellPadding={5} style={{ width: "100%", borderCollapse: "collapse" }}>
      <thead>
        <tr>
          <th>User Name</th>
          <th>Job Type</th>
          <th>Task Name</th>
          <th>Description</th>
          <th>Quantity</th>
          <th>Estimated Duration</th>
          <th>Unit</th>
          <th>Start Date</th>
          <th>Due Date</th>
          <th>Actions</th>
        </tr>
      </thead>
      <tbody>
        {jobs.map(job => (
          <tr key={job.id}>
            <td>{job.user_name}</td>
            <td>{job.job_type}</td>
            <td>{job.task_name}</td>
            <td>{job.description}</td>
            <td>{job.quantity}</td>
            <td>{job.estimated_duration}</td>
            <td>{job.unit}</td>
            <td>{job.start_date || "-"}</td>
            <td>{job.due_date || "-"}</td>
            <td>
              <button onClick={() => onEditJob(job)}>Edit</button>{" "}
              <button onClick={() => handleDelete(job.id)}>Delete</button>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
};

export default JobList;