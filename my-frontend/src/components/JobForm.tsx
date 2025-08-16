// src/components/JobForm.tsx
import React, { useEffect, useMemo, useState } from "react";
import type { Job } from "../types"; // type-only import to satisfy verbatimModuleSyntax

type JobType = "Dev" | "Non Dev" | "DX";

/** Fixed task choices per Job Type */
const TASKS_BY_TYPE: Record<JobType, string[]> = {
  Dev: [
    "BOM",
    "Sending Sample",
    "Assembly",
    "Power Consumption",
    "EMI",
    "Audio",
    "D_VA Project Management",
    "High Grade Project Management",
    "CST",
    "ESD/EOS",
    "Backend",
    "HDMI",
    "USB",
    "Sub Assy",
  ],
  "Non Dev": [
    "Innovation",
    "SHEE 5S",
    "Education",
    "Budget/Accounting",
    "VI",
    "CA",
    "IT",
    "Reinvent",
    "GA",
    "Asset",
  ],
  DX: ["General DX Work"],
};

/** Unit suggestions by exact (JobType|Task) match, with a sane per-type fallback */
const UNIT_SUGGESTIONS: Record<string, string> = {
  // Dev
  "Dev|BOM": "ea",
  "Dev|Sending Sample": "tv",
  "Dev|Assembly": "set",
  "Dev|Power Consumption": "set",
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

  // Non Dev
  "Non Dev|Innovation": "task",
  "Non Dev|SHEE 5S": "task",
  "Non Dev|Education": "session",
  "Non Dev|Budget/Accounting": "task",
  "Non Dev|VI": "task",
  "Non Dev|CA": "task",
  "Non Dev|IT": "task",
  "Non Dev|Reinvent": "task",
  "Non Dev|GA": "task",
  "Non Dev|Asset": "task",

  // DX
  "DX|General DX Work": "task",
};

function suggestUnit(job_type: JobType | "", task_name: string): string {
  const key = `${job_type}|${task_name}`.trim();
  if (UNIT_SUGGESTIONS[key]) return UNIT_SUGGESTIONS[key];
  if (job_type === "Dev") return "set";
  if (job_type === "Non Dev") return "task";
  if (job_type === "DX") return "task";
  return "";
}

/** Local form state:
 * allow job_type = "" for the placeholder option while keeping Job’s shape.
 */
type FormState = Omit<Job, "job_type" | "estimated_duration"> & {
  job_type: JobType | "";
  estimated_duration: number; // still shown (disabled) and sent, server will overwrite
};

type Props = {
  onJobAdded: () => void;
  editJob?: Job | null;
  onCancelEdit?: () => void;
};

const JobForm: React.FC<Props> = ({ onJobAdded, editJob, onCancelEdit }) => {
  const [formData, setFormData] = useState<FormState>({
    user_name: "",
    job_type: "",
    task_name: "",
    description: "",
    quantity: 1,
    estimated_duration: 0,
    unit: "",
    start_date: "",
    due_date: "",
    status: "Open",
  });

  // Prefill when editing
  useEffect(() => {
    if (editJob) {
      setFormData({
        ...editJob,
        job_type: editJob.job_type as JobType,
        description: editJob.description || "",
        unit: editJob.unit || "",
        start_date: editJob.start_date || "",
        due_date: editJob.due_date || "",
        status: (editJob.status as any) || "Open",
        // duration shown but disabled (server recomputes on save)
        estimated_duration: Number(editJob.estimated_duration || 0),
      });
    } else {
      // reset if switching from edit to add (remove unused `prev`)
      setFormData({
        user_name: "",
        job_type: "",
        task_name: "",
        description: "",
        quantity: 1,
        estimated_duration: 0,
        unit: "",
        start_date: "",
        due_date: "",
        status: "Open",
      });
    }
  }, [editJob]);

  const availableTasks = useMemo(() => {
    if (!formData.job_type) return [];
    const arr = TASKS_BY_TYPE[formData.job_type] || [];
    return arr.length ? arr : ["General"];
  }, [formData.job_type]);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;

    setFormData((prev) => {
      const next: FormState = {
        ...prev,
        [name]:
          name === "quantity" || name === "estimated_duration"
            ? Number(value)
            : (value as any),
      };

      // When job type changes: reset task, suggest a unit
      if (name === "job_type") {
        next.task_name = "";
        next.unit = suggestUnit(value as JobType | "", "");
      }

      // When task changes: refresh unit (if empty or generic), keep user overrides
      if (name === "task_name") {
        const suggested = suggestUnit(prev.job_type, value);
        if (!prev.unit || prev.unit === "task" || prev.unit === "set") {
          next.unit = suggested;
        }
      }

      return next;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // basic client guard
    if (!formData.job_type) {
      alert("Please select a Job Type.");
      return;
    }
    if (!formData.task_name) {
      alert("Please select a Task Name.");
      return;
    }

    const url = editJob
      ? `${import.meta.env.VITE_API_BASE}/jobs/${editJob.id}`
      : `${import.meta.env.VITE_API_BASE}/jobs/`;
    const method = editJob ? "PUT" : "POST";

    // Server will compute estimated_duration based on (type, task, quantity)
    const payload = {
      ...formData,
      job_type: formData.job_type as JobType,
    };

    try {
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(`Save failed: ${res.status} ${text}`);
      }
      // success
      setFormData({
        user_name: "",
        job_type: "",
        task_name: "",
        description: "",
        quantity: 1,
        estimated_duration: 0,
        unit: "",
        start_date: "",
        due_date: "",
        status: "Open",
      });
      onJobAdded();
      onCancelEdit?.();
    } catch (err) {
      console.error(err);
      alert("Failed to save job. See console for details.");
    }
  };

  return (
    <form onSubmit={handleSubmit} className="w-full grid gap-3 mb-4">
      {/* Row: User & Status */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <input
          className="input"
          name="user_name"
          placeholder="User Name"
          value={formData.user_name}
          onChange={handleChange}
          required
        />

        <select
          className="input"
          name="status"
          value={formData.status || "Open"}
          onChange={handleChange}
        >
          <option>Open</option>
          <option>Done</option>
        </select>

        <div className="grid grid-cols-2 gap-3">
          <label className="text-sm text-gray-600">
            Start Date
            <input
              className="input mt-1"
              name="start_date"
              type="date"
              value={formData.start_date || ""}
              onChange={handleChange}
            />
          </label>
          <label className="text-sm text-gray-600">
            Due Date
            <input
              className="input mt-1"
              name="due_date"
              type="date"
              value={formData.due_date || ""}
              onChange={handleChange}
            />
          </label>
        </div>
      </div>

      {/* Row: Type & Task */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <select
          className="input"
          name="job_type"
          value={formData.job_type}
          onChange={handleChange}
          required
        >
          <option value="" disabled>
            -- Select Job Type --
          </option>
          <option value="Dev">Dev</option>
          <option value="Non Dev">Non Dev</option>
          <option value="DX">DX</option>
        </select>

        <select
          className="input"
          name="task_name"
          value={formData.task_name}
          onChange={handleChange}
          required
          disabled={!formData.job_type}
        >
          <option value="" disabled>
            {formData.job_type ? "Select a task" : "Select job type first"}
          </option>
          {availableTasks.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
      </div>

      {/* Description */}
      <textarea
        className="input"
        name="description"
        placeholder="Description"
        value={formData.description || ""}
        onChange={handleChange}
        rows={3}
      />

      {/* Row: Quantity, Unit, Estimated Duration */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <input
          className="input"
          name="quantity"
          type="number"
          min={1}
          step={1}
          placeholder="Quantity"
          value={formData.quantity}
          onChange={handleChange}
          required
        />

        <input
          className="input"
          name="unit"
          placeholder="Unit (ea, set, week, task)"
          value={formData.unit || ""}
          onChange={handleChange}
        />

        <input
          className="input"
          name="estimated_duration"
          type="number"
          step="0.1"
          value={formData.estimated_duration}
          onChange={handleChange}
          disabled
          title="Calculated automatically by server"
          placeholder="Estimated Duration (hrs)"
        />
      </div>

      <div className="flex gap-2">
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