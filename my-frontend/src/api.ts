// src/api.ts
export const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:8000";

export const api = {
  async getJobs() {
    const res = await fetch(`${API_BASE}/jobs/`);
    if (!res.ok) throw new Error("Failed to fetch jobs");
    return res.json();
  },

  async createJob(job: any) {
    const res = await fetch(`${API_BASE}/jobs/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(job),
    });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  },

  async updateJob(id: number, job: any) {
    const res = await fetch(`${API_BASE}/jobs/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(job),
    });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  },

  async deleteJob(id: number) {
    const res = await fetch(`${API_BASE}/jobs/${id}`, { method: "DELETE" });
    if (!res.ok) throw new Error(await res.text());
    return true;
  },
};