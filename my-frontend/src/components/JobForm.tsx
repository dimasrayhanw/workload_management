// import React, { useEffect, useState } from "react";
// import type { Job } from "../types";
// import { api } from "../api";

// const UNIT_SUGGESTIONS: Record<string, string> = {
//   // Dev
//   "Dev|BOM": "item",
//   "Dev|Sending Sample": "tv",
//   "Dev|Assembly": "time",
//   "Dev|Power Consumption": "time",
//   "Dev|EMI": "tv",
//   "Dev|Audio": "set",
//   "Dev|D_VA Project Management": "project",
//   "Dev|High Grade Project Management": "project",
//   "Dev|CST": "week",
//   "Dev|ESD/EOS": "day",
//   "Dev|Backend": "week",
//   "Dev|HDMI": "week",
//   "Dev|USB": "week",
//   "Dev|Sub Assy": "week",
//   // Non Dev
//   "Non Dev|Innovation": "time",
//   "Non Dev|SHEE 5S": "time",
//   "Non Dev|Education": "time",
//   "Non Dev|Budget/Accounting": "time",
//   "Non Dev|VI": "time",
//   "Non Dev|CA": "time",
//   "Non Dev|IT": "time",
//   "Non Dev|Reinvent": "time",
//   "Non Dev|GA": "time",
//   "Non Dev|Asset": "time",
//   // DX
//   "DX|": "time",
// };

// const DEV_TASKS = [
//   "BOM","Sending Sample","Assembly","Power Consumption","EMI","Audio",
//   "D_VA Project Management","High Grade Project Management","CST","ESD/EOS",
//   "Backend","HDMI","USB","Sub Assy"
// ];
// const NON_DEV_TASKS = [
//   "Innovation","SHEE 5S","Education","Budget/Accounting","VI","CA","IT","Reinvent","GA","Asset"
// ];
// // DX tasks are not fixed; leave free input.

// function suggestUnit(job_type: string, task_name: string): string {
//   const key = `${job_type}|${task_name}`.trim();
//   if (UNIT_SUGGESTIONS[key]) return UNIT_SUGGESTIONS[key];
//   if (job_type === "Dev") return "time";
//   if (job_type === "Non Dev") return "time";
//   if (job_type === "DX") return "time";
//   return "";
// }

// type Props = {
//   onJobAdded: () => void;
//   editJob?: Job | null;
//   onCancelEdit?: () => void;
// };

// const JobForm: React.FC<Props> = ({ onJobAdded, editJob, onCancelEdit }) => {
//   const [formData, setFormData] = useState<Job>({
//     user_name: "",
//     job_type: "" as any,
//     task_name: "",
//     description: "",
//     quantity: 0,
//     estimated_duration: 0,
//     unit: "",
//     start_date: "",
//     due_date: "",
//     status: "Open",
//   });

//   useEffect(() => {
//     if (editJob) {
//       setFormData({
//         ...editJob,
//         start_date: editJob.start_date || "",
//         due_date: editJob.due_date || "",
//         unit: editJob.unit || "",
//         status: editJob.status || "Open",
//       });
//     }
//   }, [editJob]);

//   const handleChange = (
//     e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
//   ) => {
//     const { name, value } = e.target;
//     setFormData(prev => {
//       const next = {
//         ...prev,
//         [name]: name === "quantity" || name === "estimated_duration" ? Number(value) : value,
//       } as Job;

//       if (name === "job_type" || name === "task_name") {
//         const suggested = suggestUnit(
//           name === "job_type" ? String(value) : String(prev.job_type),
//           name === "task_name" ? String(value) : String(prev.task_name)
//         );
//         if (!prev.unit || prev.unit === "" || prev.unit === "time") {
//           next.unit = suggested;
//         }
//         // if job_type changed, reset task_name for a clean select list
//         if (name === "job_type") next.task_name = "";
//       }
//       return next;
//     });
//   };

//   const handleSubmit = async (e: React.FormEvent) => {
//     e.preventDefault();
//     try {
//       if (editJob?.id) {
//         await api.updateJob(editJob.id, formData);
//       } else {
//         await api.createJob(formData);
//       }
//       onJobAdded();
//       setFormData({
//         user_name: "",
//         job_type: "" as any,
//         task_name: "",
//         description: "",
//         quantity: 0,
//         estimated_duration: 0,
//         unit: "",
//         start_date: "",
//         due_date: "",
//         status: "Open",
//       });
//       onCancelEdit?.();
//     } catch (err) {
//       console.error(err);
//       alert("Failed to save job. See console.");
//     }
//   };

//   const taskOptions = formData.job_type === "Dev"
//     ? DEV_TASKS
//     : formData.job_type === "Non Dev"
//     ? NON_DEV_TASKS
//     : []; // DX free text

//   return (
//     <form onSubmit={handleSubmit} style={{ marginBottom: "1rem", display: "grid", gap: 8 }}>
//       <input name="user_name" placeholder="User Name" value={formData.user_name} onChange={handleChange} required />

//       <select name="job_type" value={formData.job_type} onChange={handleChange} required>
//         <option value="">-- Select Job Type --</option>
//         <option value="Dev">Dev</option>
//         <option value="Non Dev">Non Dev</option>
//         <option value="DX">DX</option>
//       </select>

//       {/* Task: select for Dev & Non Dev, free input for DX */}
//       {formData.job_type === "DX" ? (
//         <input
//           name="task_name"
//           placeholder="Task Name (DX free text)"
//           value={formData.task_name}
//           onChange={handleChange}
//           required
//         />
//       ) : (
//         <select
//           name="task_name"
//           value={formData.task_name}
//           onChange={handleChange}
//           required
//         >
//           <option value="">-- Select Task --</option>
//           {taskOptions.map(t => (
//             <option key={t} value={t}>{t}</option>
//           ))}
//         </select>
//       )}

//       <textarea
//         name="description"
//         placeholder="Description"
//         value={formData.description || ""}
//         onChange={handleChange}
//         rows={3}
//         style={{ resize: "vertical" }}
//       />

//       <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
//         <input name="quantity" type="number" placeholder="Quantity" value={formData.quantity} onChange={handleChange} required />
//         <input
//           name="unit"
//           placeholder="Unit (e.g., set, tv, week, item)"
//           value={formData.unit || ""}
//           onChange={handleChange}
//         />
//         <input
//           name="estimated_duration"
//           type="number"
//           step="0.1"
//           placeholder="Estimated Duration (hrs)"
//           value={formData.estimated_duration}
//           onChange={handleChange}
//           disabled
//           title="Calculated automatically by server"
//         />
//       </div>

//       <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
//         <label>Start Date <input name="start_date" type="date" value={formData.start_date || ""} onChange={handleChange} /></label>
//         <label>Due Date <input name="due_date" type="date" value={formData.due_date || ""} onChange={handleChange} /></label>
//         <label>Status
//           <select name="status" value={formData.status || "Open"} onChange={handleChange}>
//             <option>Open</option>
//             <option>Done</option>
//           </select>
//         </label>
//       </div>

//       <div style={{ display: "flex", gap: 8 }}>
//         <button type="submit" className="btn-primary">{editJob ? "Update Job" : "Add Job"}</button>
//         {editJob && <button type="button" className="btn-danger" onClick={onCancelEdit}>Cancel</button>}
//       </div>
//     </form>
//   );
// };

// export default JobForm;

import React, { useEffect, useState } from "react";
import type { Job } from "../types";
import { api } from "../api";

const UNIT_SUGGESTIONS: Record<string, string> = {
  "Dev|BOM": "item",
  "Dev|Sending Sample": "tv",
  "Dev|Assembly": "time",
  "Dev|Power Consumption": "time",
  "Dev|EMI": "tv",
  "Dev|Audio": "set",
  "Dev|D_VA Project Management": "project",
  "Dev|High Grade Project Management": "project",
  "Dev|CST": "week",
  "Dev|ESD/EOS": "day",
  "Dev|Backend": "week",
  "Dev|HDMI": "week",
  "Dev|USB": "week",
  "Dev|Sub Assy": "week",
  "Non Dev|Innovation": "time",
  "Non Dev|SHEE 5S": "time",
  "Non Dev|Education": "time",
  "Non Dev|Budget/Accounting": "time",
  "Non Dev|VI": "time",
  "Non Dev|CA": "time",
  "Non Dev|IT": "time",
  "Non Dev|Reinvent": "time",
  "Non Dev|GA": "time",
  "Non Dev|Asset": "time",
  "DX|": "time",
};

function suggestUnit(job_type: string, task_name: string): string {
  const key = `${job_type}|${task_name}`.trim();
  if (UNIT_SUGGESTIONS[key]) return UNIT_SUGGESTIONS[key];
  if (job_type === "Dev" || job_type === "Non Dev" || job_type === "DX") return "time";
  return "";
}

type Props = {
  onJobAdded: () => void;
  editJob?: Job | null;
  onCancelEdit?: () => void;
};

const JobForm: React.FC<Props> = ({ onJobAdded, editJob, onCancelEdit }) => {
  const [formData, setFormData] = useState<Job>({
    user_name: "",
    job_type: "Dev",
    task_name: "",
    description: "",
    quantity: 0,
    estimated_duration: 0,
    unit: "",
    start_date: "",
    due_date: "",
    status: "Open",
  });

  useEffect(() => {
    if (editJob) {
      setFormData({
        ...editJob,
        start_date: editJob.start_date || "",
        due_date: editJob.due_date || "",
        unit: editJob.unit || "",
        status: editJob.status || "Open",
      });
    }
  }, [editJob]);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData(prev => {
      const next = {
        ...prev,
        [name]: name === "quantity" || name === "estimated_duration" ? Number(value) : value,
      } as Job;

      if (name === "job_type" || name === "task_name") {
        const suggested = suggestUnit(
          name === "job_type" ? String(value) : String(prev.job_type),
          name === "task_name" ? String(value) : String(prev.task_name)
        );
        if (!prev.unit || prev.unit === "" || prev.unit === "time") {
          next.unit = suggested;
        }
      }
      return next;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editJob?.id) {
        await api.updateJob(editJob.id, formData);
      } else {
        await api.createJob(formData);
      }
      onJobAdded();
      setFormData({
        user_name: "",
        job_type: "Dev",
        task_name: "",
        description: "",
        quantity: 0,
        estimated_duration: 0,
        unit: "",
        start_date: "",
        due_date: "",
        status: "Open",
      });
      onCancelEdit?.();
    } catch (err) {
      console.error(err);
      alert("Failed to save job. See console for details.");
    }
  };

  return (
    <form onSubmit={handleSubmit} className="card grid pad" style={{ gap: 10 }}>
      <div className="row">
        <input className="input" name="user_name" placeholder="User Name" value={formData.user_name} onChange={handleChange} required />
        <select className="input" name="job_type" value={formData.job_type} onChange={handleChange} required>
          <option value="">Job Type…</option>
          <option value="Dev">Dev</option>
          <option value="Non Dev">Non Dev</option>
          <option value="DX">DX</option>
        </select>
        <input className="input" name="task_name" placeholder="Task Name" value={formData.task_name} onChange={handleChange} required />
      </div>

      <textarea className="input" name="description" placeholder="Description" value={formData.description || ""} onChange={handleChange} />

      <div className="row">
        <input className="input" name="quantity" type="number" placeholder="Quantity" value={formData.quantity} onChange={handleChange} required />
        <input className="input" name="unit" placeholder="Unit (e.g., set, tv, week)" value={formData.unit || ""} onChange={handleChange} />
        <input className="input" name="estimated_duration" type="number" step="0.1" placeholder="Estimated Duration (hrs)" value={formData.estimated_duration} onChange={handleChange} disabled />
      </div>

      <div className="row">
        <label className="input" style={{ display:"flex", alignItems:"center", gap:10 }}>
          Start
          <input style={{ border: "none", background:"transparent", color:"inherit" }} name="start_date" type="date" value={formData.start_date || ""} onChange={handleChange} />
        </label>
        <label className="input" style={{ display:"flex", alignItems:"center", gap:10 }}>
          Due
          <input style={{ border: "none", background:"transparent", color:"inherit" }} name="due_date" type="date" value={formData.due_date || ""} onChange={handleChange} />
        </label>
        <label className="input" style={{ display:"flex", alignItems:"center", gap:10 }}>
          Status
          <select style={{ border: "none", background:"transparent", color:"inherit" }} name="status" value={formData.status || "Open"} onChange={handleChange}>
            <option>Open</option>
            <option>Done</option>
          </select>
        </label>
      </div>

      <div className="row" style={{ justifyContent:"flex-end" }}>
        {editJob && <button type="button" className="btn danger" onClick={onCancelEdit}>Cancel</button>}
        <button type="submit" className="btn primary">{editJob ? "Update Job" : "Add Job"}</button>
      </div>
    </form>
  );
};

export default JobForm;