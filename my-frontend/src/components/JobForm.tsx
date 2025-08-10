// import React, { useState, useEffect } from "react";

// interface Job {
//   id?: number;
//   user_name: string;
//   job_type: string;
//   task_name: string;
//   description?: string;
//   quantity: number;
//   estimated_duration: number;
//   unit?: string;
//   start_date?: string;
//   due_date?: string;
// }

// interface JobFormProps {
//   onJobAdded: () => void;
//   editJob?: Job | null;
//   onCancelEdit?: () => void;
// }

// const JobForm: React.FC<JobFormProps> = ({ onJobAdded, editJob, onCancelEdit }) => {
//   const [formData, setFormData] = useState<Job>({
//     user_name: "",
//     job_type: "",
//     task_name: "",
//     description: "",
//     quantity: 0,
//     estimated_duration: 0,
//     unit: "",
//     start_date: "",
//     due_date: "",
//   });

//   useEffect(() => {
//     if (editJob) {
//       setFormData({
//         ...editJob,
//         start_date: editJob.start_date || "",
//         due_date: editJob.due_date || "",
//       });
//     }
//   }, [editJob]);

//   const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
//     const { name, value } = e.target;
//     setFormData((prev) => ({
//       ...prev,
//       [name]: name === "quantity" || name === "estimated_duration" ? Number(value) : value,
//     }));
//   };

//   const handleSubmit = async (e: React.FormEvent) => {
//     e.preventDefault();
//     const method = editJob ? "PUT" : "POST";
//     const url = editJob
//       ? `http://localhost:8000/jobs/${editJob.id}`
//       : "http://localhost:8000/jobs/";

//     try {
//       const res = await fetch(url, {
//         method,
//         headers: { "Content-Type": "application/json" },
//         body: JSON.stringify(formData),
//       });
//       if (!res.ok) throw new Error("Failed to save job");

//       onJobAdded();

//       // Reset form
//       setFormData({
//         user_name: "",
//         job_type: "",
//         task_name: "",
//         description: "",
//         quantity: 0,
//         estimated_duration: 0,
//         unit: "",
//         start_date: "",
//         due_date: "",
//       });

//       // Exit edit mode
//       if (onCancelEdit) onCancelEdit();
//     } catch (err) {
//       console.error(err);
//     }
//   };

//   return (
//     <form onSubmit={handleSubmit} style={{ marginBottom: "1rem" }}>
//       <input
//         name="user_name"
//         placeholder="User Name"
//         value={formData.user_name}
//         onChange={handleChange}
//         required
//       />

//       <label>
//         Job Type:
//         <select
//           name="job_type"
//           value={formData.job_type}
//           onChange={handleChange}
//           required
//         >
//           <option value="">-- Select --</option>
//           <option value="Dev">Dev</option>
//           <option value="Non Dev">Non Dev</option>
//           <option value="DX">DX</option>
//           <option value="BOM">BOM</option>
//         </select>
//       </label>

//       <input
//         name="task_name"
//         placeholder="Task Name"
//         value={formData.task_name}
//         onChange={handleChange}
//         required
//       />

//       <input
//         name="description"
//         placeholder="Description"
//         value={formData.description}
//         onChange={handleChange}
//       />

//       <input
//         name="quantity"
//         type="number"
//         placeholder="Quantity"
//         value={formData.quantity}
//         onChange={handleChange}
//         required
//       />

//       <input
//         name="estimated_duration"
//         type="number"
//         step="0.1"
//         placeholder="Estimated Duration"
//         value={formData.estimated_duration}
//         onChange={handleChange}
//         required
//       />

//       <input
//         name="unit"
//         placeholder="Unit"
//         value={formData.unit}
//         onChange={handleChange}
//       />

//       <label>
//         Start Date:
//         <input
//           name="start_date"
//           type="date"
//           value={formData.start_date}
//           onChange={handleChange}
//         />
//       </label>

//       <label>
//         Due Date:
//         <input
//           name="due_date"
//           type="date"
//           value={formData.due_date}
//           onChange={handleChange}
//         />
//       </label>

//       <button type="submit" className="btn-primary">
//         {editJob ? "Update Job" : "Add Job"}
//       </button>

//       {editJob && (
//         <button type="button" className="btn-danger" onClick={onCancelEdit}>
//           Cancel
//         </button>
//       )}
//     </form>
//   );
// };

// export default JobForm;

import React, { useEffect, useState } from "react";

export interface Job {
  id?: number;
  user_name: string;
  job_type: string;
  task_name: string;
  description?: string;
  quantity: number;
  estimated_duration: number;
  unit?: string;
  start_date?: string;
  due_date?: string;
}

interface JobFormProps {
  onJobAdded: () => void;
  editJob?: Job | null;
  onCancelEdit?: () => void;
}

const JobForm: React.FC<JobFormProps> = ({ onJobAdded, editJob, onCancelEdit }) => {
  const [formData, setFormData] = useState<Job>({
    user_name: "",
    job_type: "",
    task_name: "",
    description: "",
    quantity: 0,
    estimated_duration: 0,
    unit: "",
    start_date: "",
    due_date: "",
  });

  useEffect(() => {
    if (editJob) {
      setFormData({
        ...editJob,
        start_date: editJob.start_date || "",
        due_date: editJob.due_date || "",
      });
    }
  }, [editJob]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === "quantity" || name === "estimated_duration" ? Number(value) : value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const url = editJob ? `http://localhost:8000/jobs/${editJob.id}` : "http://localhost:8000/jobs/";
    const method = editJob ? "PUT" : "POST";

    try {
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(`Save failed: ${res.status} ${text}`);
      }
      onJobAdded();

      // reset form and exit edit mode
      setFormData({
        user_name: "",
        job_type: "",
        task_name: "",
        description: "",
        quantity: 0,
        estimated_duration: 0,
        unit: "",
        start_date: "",
        due_date: "",
      });
      if (onCancelEdit) onCancelEdit();
    } catch (err) {
      console.error(err);
      alert("Failed to save job. See console for details.");
    }
  };

  return (
    <form onSubmit={handleSubmit} style={{ marginBottom: "1rem", display: "grid", gap: 8 }}>
      <input
        name="user_name"
        placeholder="User Name"
        value={formData.user_name}
        onChange={handleChange}
        required
      />

      <select name="job_type" value={formData.job_type} onChange={handleChange} required>
        <option value="">-- Select Job Type --</option>
        <option value="Dev">Dev</option>
        <option value="Non Dev">Non Dev</option>
        <option value="DX">DX</option>
      </select>

      <input name="task_name" placeholder="Task Name" value={formData.task_name} onChange={handleChange} required />
      <input name="description" placeholder="Description" value={formData.description} onChange={handleChange} />

      <input name="quantity" type="number" placeholder="Quantity" value={formData.quantity} onChange={handleChange} required />
      <input name="estimated_duration" type="number" step="0.1" placeholder="Estimated Duration" value={formData.estimated_duration} onChange={handleChange} required />
      <input name="unit" placeholder="Unit" value={formData.unit} onChange={handleChange} />

      <label>
        Start Date:
        <input name="start_date" type="date" value={formData.start_date || ""} onChange={handleChange} />
      </label>

      <label>
        Due Date:
        <input name="due_date" type="date" value={formData.due_date || ""} onChange={handleChange} />
      </label>

      <div style={{ display: "flex", gap: 8 }}>
        <button type="submit" className="btn-primary">
          {editJob ? "Update Job" : "Add Job"}
        </button>
        {editJob && (
          <button type="button" className="btn-danger" onClick={onCancelEdit}>
            Cancel
          </button>
        )}
      </div>
    </form>
  );
};

export default JobForm;