import React, { useEffect, useMemo, useState } from "react";
import { Job } from "../types";

// ---- Task options per Job Type (scrollable <select>) ----
const TASKS: Record<string, string[]> = {
  "Dev": [
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
  // DX doesn’t have a strict list — give a few generic choices
  "DX": [
    "DX (General)",
    "Automation",
    "Dashboard",
    "ETL",
    "RPA",
    "Other",
  ],
};

// ---- Duration rules (hours) ----
const DEV_RULES: Record<string, number> = {
  "BOM": 2,
  "Sending Sample": 3,
  "Assembly": 3,
  "Power Consumption": 4,
  "EMI": 4,
  "Audio": 4,
  "D_VA Project Management": 5,
  "High Grade Project Management": 160, // ~1 month
  "CST": 40,                            // ~1 week
  "ESD/EOS": 8,                         // 1 day
  "Backend": 40,
  "HDMI": 40,
  "USB": 40,
  "Sub Assy": 40,
};

const NON_DEV_RULES: Record<string, number> = {
  "Innovation": 2,
  "SHEE 5S": 1,
  "Education": 3,
  "Budget/Accounting": 2,
  "VI": 3,
  "CA": 2,
  "IT": 1,
  "Reinvent": 2,
  "GA": 0.5,
  "Asset": 3,
};

const DX_DEFAULT_HOURS = 5.5 * 40; // midpoint of 3–8 weeks

// ---- Unit suggestions (for quantity) ----
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

  "DX|DX (General)": "time",
  "DX|Automation": "time",
  "DX|Dashboard": "time",
  "DX|ETL": "time",
  "DX|RPA": "time",
  "DX|Other": "time",
};

function suggestUnit(job_type: string, task_name: string): string {
  const key = `${job_type}|${task_name}`.trim();
  if (UNIT_SUGGESTIONS[key]) return UNIT_SUGGESTIONS[key];
  if (job_type === "Dev") return "time";
  if (job_type === "Non Dev") return "time";
  if (job_type === "DX") return "time";
  return "";
}

function computeEstimated(job_type: string, task_name: string, quantity: number): number {
  const q = Math.max(1, Number(quantity || 1));
  if (job_type === "DX") return DX_DEFAULT_HOURS; // fixed midpoint regardless of qty
  if (job_type === "Dev") return (DEV_RULES[task_name] ?? 0) * q;
  if (job_type === "Non Dev") return (NON_DEV_RULES[task_name] ?? 0) * q;
  return 0;
}

type Props = {
  onJobAdded: () => void;
  editJob?: Job | null;
  onCancelEdit?: () => void;
};

const JobForm: React.FC<Props> = ({ onJobAdded, editJob, onCancelEdit }) => {
  const [formData, setFormData] = useState<Job>({
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

  // Load edit data
  useEffect(() => {
    if (!editJob) return;
    setFormData({
      ...editJob,
      start_date: editJob.start_date || "",
      due_date: editJob.due_date || "",
      unit: editJob.unit || "",
      status: editJob.status || "Open",
    });
  }, [editJob]);

  // Recompute duration whenever these change
  useEffect(() => {
    if (!formData.job_type || !formData.task_name) return;
    const est = computeEstimated(formData.job_type, formData.task_name, formData.quantity || 1);
    setFormData(prev => ({ ...prev, estimated_duration: est }));
  }, [formData.job_type, formData.task_name, formData.quantity]);

  const taskOptions = useMemo(() => TASKS[formData.job_type] ?? [], [formData.job_type]);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;

    setFormData(prev => {
      const next = {
        ...prev,
        [name]: name === "quantity" ? Number(value) : value,
      } as Job;

      // Reset task when job_type changes
      if (name === "job_type") {
        next.task_name = "";
      }

      // Suggest unit when either changes (don’t overwrite a custom unit)
      if (name === "job_type" || name === "task_name") {
        const jt = name === "job_type" ? String(value) : prev.job_type;
        const tn = name === "task_name" ? String(value) : prev.task_name;
        const suggested = suggestUnit(jt, tn);
        if (!prev.unit || prev.unit === "" || prev.unit === "time") {
          next.unit = suggested;
        }
      }
      return next;
    });
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
      if (!res.ok) throw new Error(await res.text());

      onJobAdded();
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
      onCancelEdit?.();
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

      {/* Scrollable Task Name dropdown */}
      <select
        name="task_name"
        value={formData.task_name}
        onChange={handleChange}
        required
        size={1} // dropdown; the menu will scroll if long
        style={{ maxWidth: 420 }}
        disabled={!formData.job_type}
        title={!formData.job_type ? "Select Job Type first" : undefined}
      >
        <option value="">{formData.job_type ? "-- Select Task --" : "Select Job Type first"}</option>
        {taskOptions.map(t => (
          <option key={t} value={t}>{t}</option>
        ))}
      </select>

      {/* description textarea */}
      <textarea
        name="description"
        placeholder="Description"
        value={formData.description || ""}
        onChange={handleChange}
        rows={3}
        style={{ resize: "vertical" }}
      />

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
        <input
          name="quantity"
          type="number"
          min={1}
          placeholder="Quantity"
          value={formData.quantity || 1}
          onChange={handleChange}
          required
        />
        <input
          name="unit"
          placeholder="Unit (e.g., item, tv, set, week, time)"
          value={formData.unit || ""}
          onChange={handleChange}
        />
        <input
          name="estimated_duration"
          type="number"
          step="0.1"
          placeholder="Estimated Duration (hrs)"
          value={formData.estimated_duration}
          onChange={handleChange}
          disabled
          title="Calculated automatically"
        />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
        <label>
          Start Date
          <input name="start_date" type="date" value={formData.start_date || ""} onChange={handleChange} />
        </label>
        <label>
          Due Date
          <input name="due_date" type="date" value={formData.due_date || ""} onChange={handleChange} />
        </label>
        <label>
          Status
          <select name="status" value={formData.status || "Open"} onChange={handleChange}>
            <option>Open</option>
            <option>Done</option>
          </select>
        </label>
      </div>

      <div style={{ display: "flex", gap: 8 }}>
        <button type="submit" className="btn-primary">{editJob ? "Update Job" : "Add Job"}</button>
        {editJob && <button type="button" className="btn-danger" onClick={onCancelEdit}>Cancel</button>}
      </div>
    </form>
  );
};

export default JobForm;