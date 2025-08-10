import axios from "axios";
const API_BASE = "http://localhost:8000";

export const fetchJobsSummary = () => axios.get(`${API_BASE}/jobs/summary`).then(r => r.data);
export const fetchJobs = () => axios.get(`${API_BASE}/jobs/`).then(r => r.data);
export const addJob = (job: any) => axios.post(`${API_BASE}/jobs/`, job).then(r => r.data);
export const deleteJob = (id: number) => axios.delete(`${API_BASE}/jobs/${id}`).then(r => r.data);