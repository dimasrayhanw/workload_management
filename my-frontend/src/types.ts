// src/types.ts
export interface Job {
  id?: number;
  user_name: string;
  job_type: "Dev" | "Non Dev" | "DX";
  task_name: string;
  description?: string;
  quantity: number;
  estimated_duration: number;
  unit?: string;
  start_date?: string | null;
  due_date?: string | null;
  status?: "Open" | "Done";
}