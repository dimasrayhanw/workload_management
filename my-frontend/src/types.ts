// src/types.ts
export interface Job {
  id?: number;
  user_name: string;
  job_type: "Dev" | "Non Dev" | "DX";
  task_name: string;
  description?: string;
  quantity: number;
  estimated_duration: number; // hours (server-calculated)
  unit?: string;              // unit for quantity (e.g., set, item, week)
  start_date?: string;        // YYYY-MM-DD
  due_date?: string;          // YYYY-MM-DD
  status?: "Open" | "Done";
}