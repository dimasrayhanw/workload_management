// src/components/JobForm.tsx
import React, { useEffect, useMemo, useState } from "react";
import type { Job } from "../types";

type JobType = "Dev" | "Non Dev" | "DX";

const TASKS_BY_TYPE: Record<JobType, string[]> = {
  Dev: [
    "BOM - Part Compose","BOM - Compare","BOM - HW Option","BOM - Rule Validation","BOM - Tool Option","BOM - Automation","BOM Check",
    "Sending Sample","Assembly","Power Consumption","EMI","Audio","D_VA Project Management","Material Forecast/Request","High Grade Project Management",
    "CST","ESD/EOS","Backend","HDMI","USB","Sub Assy","DCDC","Others (1 hour)"
  ],
  "Non Dev": [
    "Innovation","SHEE 5S","Education","Budget/Accounting","Investment","VI","CA","IT","Reinvent","GA","Asset","Warehouse","Others (1 hour)"
  ],
  DX: ["Initial Setup","Phase 1","Phase 2","Phase 3","Beta Test","Launching","Others (1 hour)"],
};

/** ---- FRONTEND RULES MIRROR BACKEND ---- */
const DEV_RULES_FE: Record<string, number> = {
  "BOM - Part Compose": 2.0,
  "BOM - Compare": 1.0,
  "BOM - HW Option": 4.0,
  "BOM - Rule Validation": 3.0,
  "BOM - Tool Option": 2.0,
  "BOM - Automation": 4.0,
  "BOM Check": 3.0,
  "Material Forecast/Request": 0.2,
  "Sending Sample": 3.0,
  "Assembly": 0.3,
  "Power Consumption": 4.0,
  "EMI": 5.0,
  "Audio": 5.0,
  "D_VA Project Management": 2.0,
  "High Grade Project Management": 4.0,
  "CST": 5.0,
  "ESD/EOS": 3.0,
  "Backend": 5.0,
  "HDMI": 4.0,
  "USB": 4.0,
  "Sub Assy": 4.0,
  "DCDC": 4.0,
  "Others (1 hour)": 1.0,
};
const NON_DEV_RULES_FE: Record<string, number> = {
  "Innovation": 2.0,
  "SHEE 5S": 1.0,
  "Education": 3.0,
  "Budget/Accounting": 2.0,
  "Investment": 3.0,
  "VI": 3.0,
  "CA": 2.0,
  "IT": 1.0,
  "Reinvent": 2.0,
  "GA": 0.5,
  "Asset": 5.0,
  "Warehouse": 4.0,
  "Others (1 hour)": 1.0,
};
const DX_RULES_FE: Record<string, number> = {
  "Initial Setup": 2.0,
  "Phase 1": 4.0,
  "Phase 2": 4.0,
  "Phase 3": 4.0,
  "Beta Test": 2.0,
  "Launching": 0.5,
  "Others (1 hour)": 1.0,
};

/** Optional alias mapping so “Sample Sending” also works */
const TASK_ALIASES: Record<string, string> = {
  "sample sending": "Sending Sample",
};

const normalizeTask = (name: string) =>
  TASK_ALIASES[name.trim().toLowerCase()] ?? name;

/** Unit suggestions (unchanged) */
const UNIT_SUGGESTIONS: Record<string,string> = {
  "Dev|BOM - Part Compose":"model","Dev|BOM - Compare":"model","Dev|BOM - HW Option":"ea","Dev|BOM - Rule Validation":"task","Dev|BOM - Tool Option":"model","Dev|BOM - Automation":"model",
  "Dev|BOM Check":"model","Dev|Sending Sample":"set","Dev|Assembly":"set","Dev|Power Consumption":"model","Dev|EMI":"set","Dev|Audio":"set","Dev|D_VA Project Management":"model",
  "Dev|High Grade Project Management":"model","Dev|Material Forecast/Request":"model","Dev|CST":"set","Dev|ESD/EOS":"set",
  "Dev|Backend":"set","Dev|HDMI":"set","Dev|USB":"set","Dev|Sub Assy":"set","Dev|DCDC":"set","Dev|Others (1 hour)":"set",
  "Non Dev|Innovation":"task","Non Dev|SHEE 5S":"task","Non Dev|Education":"task",
  "Non Dev|Budget/Accounting":"task","Non Dev|Investment":"task","Non Dev|VI":"task","Non Dev|CA":"task","Non Dev|IT":"task",
  "Non Dev|Reinvent":"task","Non Dev|GA":"task","Non Dev|Asset":"task","Non Dev|Warehouse":"task","Non Dev|Others (1 hour)":"task",
  "DX|Initial Setup":"task","DX|Phase 1":"task","DX|Phase 2":"task","DX|Phase 3":"task","DX|Beta Test":"task","DX|Launching":"task","DX|Others (1 hour)":"task",
};

function suggestUnit(job_type: JobType | "", task_name: string) {
  const key = `${job_type}|${task_name}`.trim();
  if (UNIT_SUGGESTIONS[key]) return UNIT_SUGGESTIONS[key];
  if (job_type === "Dev") return "set";
  if (job_type === "Non Dev") return "task";
  if (job_type === "DX") return "task";
  return "";
}

/** Local form state (same as before) */
type FormState = Omit<Job,"job_type"|"estimated_duration"> & {
  job_type: JobType | "";
  estimated_duration: number;
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

  /** Match backend compute_estimated: base depends on job_type, then * quantity */
  const calcEstimated = (jobType: JobType | "", task: string, qty: number) => {
    const t = normalizeTask(task);
    const q = Math.max(1, Number(qty || 1));
    let base = 0;
    if (jobType === "Dev") base = DEV_RULES_FE[t] ?? 0;
    else if (jobType === "Non Dev") base = NON_DEV_RULES_FE[t] ?? 0;
    else if (jobType === "DX") base = DX_RULES_FE[t] ?? 0;
    return +(base * q).toFixed(1);
  };

  // Prefill when editing (unchanged)
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
        estimated_duration: Number(editJob.estimated_duration || 0),
      });
    } else {
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

  // Recompute estimate when job_type, task, or quantity changes
  useEffect(() => {
    setFormData(prev => ({
      ...prev,
      estimated_duration: calcEstimated(prev.job_type, prev.task_name, prev.quantity),
    }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formData.job_type, formData.task_name, formData.quantity]);

  const availableTasks = useMemo(() => {
    if (!formData.job_type) return [];
    const arr = TASKS_BY_TYPE[formData.job_type] || [];
    return arr.length ? arr : ["General"];
  }, [formData.job_type]);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;

    setFormData(prev => {
      const next: FormState = {
        ...prev,
        [name]:
          name === "quantity" || name === "estimated_duration"
            ? Number(value)
            : (value as any),
      };

      if (name === "job_type") {
        next.task_name = "";
        next.unit = suggestUnit(value as JobType | "", "");
        next.estimated_duration = 0;
      }
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

    if (!formData.user_name.trim()) { alert("User name required"); return; }
    if (!formData.job_type) { alert("Please select a Job Type."); return; }
    if (!formData.task_name) { alert("Please select a Task Name."); return; }

    const url = editJob
      ? `${import.meta.env.VITE_API_BASE}/jobs/${editJob.id}`
      : `${import.meta.env.VITE_API_BASE}/jobs/`;
    const method = editJob ? "PUT" : "POST";

    const payload = {
      ...formData,
      user_name: formData.user_name.trim(),
      job_type: formData.job_type as "Dev" | "Non Dev" | "DX",
      quantity: Number(formData.quantity ?? 1),
      // estimated_duration will be recomputed by backend too
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

      // ✅ Dispatch the event here so JobList can refresh history
      const savedJob = await res.json();
      window.dispatchEvent(new CustomEvent("job:updated", { detail: { id: savedJob.id } }));

      // Reset form after dispatch
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
    <form onSubmit={handleSubmit} className="form-surface grid gap-4">
      {/* Two-column wrapper */}
      <div className="form-two-col">
        {/* LEFT (4 fields) */}
        <div className="form-stack">
          <div className="form-group">
            <span className="form-label">User Name</span>
            <input
              className="input"
              name="user_name"
              placeholder="User Name"
              value={formData.user_name}
              onChange={handleChange}
              required
            />
          </div>

          <div className="form-group">
            <span className="form-label">Job Type</span>
            <select
              className="input"
              name="job_type"
              value={formData.job_type}
              onChange={handleChange}
              required
            >
              <option value="" disabled>-- Select Job Type --</option>
              <option value="Dev">Dev</option>
              <option value="Non Dev">Non Dev</option>
              <option value="DX">DX</option>
            </select>
          </div>

          <div className="form-group">
            <span className="form-label">Task Name</span>
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
              {availableTasks.map(t => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <span className="form-label">Status</span>
            <select
              className="input"
              name="status"
              value={formData.status || "Open"}
              onChange={handleChange}
            >
              <option>Open</option>
              <option>Done</option>
            </select>
          </div>
        </div>

        {/* RIGHT (5 fields) */}
        <div className="form-stack">
          <div className="form-group">
            <span className="form-label">Quantity</span>
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
          </div>

          <div className="form-group">
            <span className="form-label">Unit</span>
            <input
              className="input"
              name="unit"
              placeholder="Unit (ea, set, task, model, etc.)"
              value={formData.unit || ""}
              onChange={handleChange}
            />
          </div>

          <div className="form-group">
            <span className="form-label">Start Date</span>
            <input
              className="input"
              name="start_date"
              type="date"
              value={formData.start_date || ""}
              onChange={handleChange}
            />
          </div>

          <div className="form-group">
            <span className="form-label">Due Date</span>
            <input
              className="input"
              name="due_date"
              type="date"
              value={formData.due_date || ""}
              onChange={handleChange}
            />
          </div>

          <div className="form-group">
            <span className="form-label">Description</span>
            <textarea
              className="input"
              name="description"
              placeholder="Description"
              value={formData.description || ""}
              onChange={handleChange}
              rows={3}
            />
          </div>
        </div>
      </div>

      {/* Bottom: estimated + actions */}
      <div className="form-two-col" style={{ alignItems: "end" }}>
        <div className="form-group">
          <span className="form-label">Estimated Duration (hrs)</span>
          <input
            className="input"
            name="estimated_duration"
            type="number"
            step="0.1"
            value={formData.estimated_duration}
            onChange={handleChange}
            disabled
            title="Calculated automatically"
            placeholder="Estimated Duration (hrs)"
          />
        </div>

        <div className="flex gap-2" style={{ justifyContent: "flex-end" }}>
          <button type="submit" className="btn primary">
            {editJob ? "Update Job" : "Add Job"}
          </button>
          {editJob && (
            <button type="button" className="btn danger" onClick={onCancelEdit}>
              Cancel
            </button>
          )}
        </div>
      </div>
    </form>
  );
};

export default JobForm;