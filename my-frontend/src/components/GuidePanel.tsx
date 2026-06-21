// src/components/GuidePanel.tsx
import React from "react";

type Section = {
  icon: string;
  title: string;
  items: { label: string; desc: string }[];
};

const SECTIONS: Section[] = [
  {
    icon: "➕",
    title: "Adding a Job",
    items: [
      { label: "Member", desc: "Select who owns this job from the dropdown. Names match the org-chart short names." },
      { label: "Job Type", desc: "Dev = hardware development tasks, Non Dev = administrative/support tasks, DX = digital transformation tasks." },
      { label: "Task Name", desc: "Choose from the preset task list for the selected Job Type. The estimated hours are auto-calculated based on your selection." },
      { label: "Description", desc: "Optional free-text detail about the task." },
      { label: "Complexity", desc: "Simple ×0.5 (routine), Normal ×1.0 (standard), Complex ×1.5 (new/tricky), Very Complex ×2.0 (unknown factors). Multiplies the base hour estimate." },
      { label: "Quantity", desc: "How many units of the task. Multiplied against the base hours to compute the total estimate." },
      { label: "Start / Due Date", desc: "Set the date range. Due date must be on or after the start date. Overdue open jobs are highlighted in red." },
      { label: "Submit", desc: "Click Add Job. The estimated hours are computed automatically — you do not need to enter them manually." },
    ],
  },
  {
    icon: "✏️",
    title: "Editing & Deleting Jobs",
    items: [
      { label: "Edit button", desc: "Click the ✏️ icon in the job row. The form above the table pre-fills with the job data. Make changes and click Update Job." },
      { label: "Delete button", desc: "Click the 🗑 icon in the job row. You will see a confirmation prompt before deletion." },
      { label: "Cancel edit", desc: "Click Cancel below the form to discard changes and return to Add Job mode." },
    ],
  },
  {
    icon: "✅",
    title: "Marking Jobs Done / Re-open",
    items: [
      { label: "Done button", desc: "Each open job row has a Done button. Click it to mark the job as Done. Done jobs are excluded from active hours and charts." },
      { label: "Re-open button", desc: "Once a job is Done, the button changes to Re-open. Click it to move the job back to Open." },
      { label: "Effect on hours", desc: "Only Open jobs count toward estimated hours in the stat cards and charts. Done jobs are greyed out in the table." },
    ],
  },
  {
    icon: "🔍",
    title: "Filtering the Job Table",
    items: [
      { label: "Search box", desc: "Type any keyword to filter by task name or description." },
      { label: "Member filter", desc: "Select a specific member to see only their jobs." },
      { label: "Job Type filter", desc: "Filter by Dev, Non Dev, or DX." },
      { label: "Status filter", desc: "Show All, Open only, or Done only." },
      { label: "Complexity filter", desc: "Filter by Simple, Normal, Complex, or Very Complex." },
      { label: "Clear filters", desc: "Click ✕ Clear filters to reset all filters at once." },
    ],
  },
  {
    icon: "📊",
    title: "Dashboard Charts",
    items: [
      { label: "Active Hours by User", desc: "Bar chart of estimated hours per member (open jobs only). Tallest bar = most loaded member." },
      { label: "Hours by Type", desc: "Pie chart showing how active hours are split between Dev, Non Dev, and DX." },
      { label: "Hours by User × Job Type", desc: "Stacked bar chart — each bar is one member, stacked by job type. Useful to see who is doing what kind of work." },
      { label: "Complexity Distribution", desc: "Pie chart of active jobs by complexity level. A large Very Complex slice may indicate workload risk." },
    ],
  },
  {
    icon: "📈",
    title: "Analysis Tab",
    items: [
      { label: "Stacked bar (Open vs Done)", desc: "Shows open and done hours per member side by side, giving a sense of throughput vs remaining load." },
      { label: "Completion rate chart", desc: "Horizontal bar chart per member. Green = ≥70%, Amber = 40–69%, Red = <40%. Quickly spots who is falling behind." },
      { label: "Complexity breakdown", desc: "Bar chart of active job count by complexity across all members." },
      { label: "Per-member table", desc: "Detailed table: total/open/done jobs, active hours, done hours, overdue count, and completion %." },
      { label: "Auto Insights", desc: "Text bullets generated automatically from the data — highlights the most loaded member, idle members, overdue risk, and workload balance." },
      { label: "↓ Export Analysis", desc: "Downloads a 4-sheet Excel file: Overview KPIs, Member Breakdown, All Jobs, and Insights." },
    ],
  },
  {
    icon: "↓",
    title: "Excel Export",
    items: [
      { label: "Dashboard export", desc: "Click ↓ Export in the job table toolbar. Downloads 3-sheet Excel: Jobs (with LG Red headers), By Member summary, By Type & Complexity breakdown." },
      { label: "Analysis export", desc: "Click ↓ Export Analysis in the Analysis tab. Downloads 4-sheet Excel: Overview KPIs, Member Breakdown, All Jobs, and Auto Insights." },
      { label: "Conditional formatting", desc: "Overdue rows → red tint · Done rows → grey italic · Very Complex cells → red · Complex cells → amber · Simple → blue." },
      { label: "Filters applied", desc: "Dashboard export respects the current table filters (only visible rows are exported). Analysis export uses all jobs." },
    ],
  },
  {
    icon: "🕓",
    title: "Job History",
    items: [
      { label: "History panel", desc: "Click the 🕓 icon on any job row to expand a history timeline for that job." },
      { label: "Events tracked", desc: "Created, every field change (with old → new values), and status toggles are all logged with timestamps." },
      { label: "Close panel", desc: "Click the 🕓 icon again to collapse the history." },
    ],
  },
  {
    icon: "⚙️",
    title: "How Hours Are Calculated",
    items: [
      { label: "Formula", desc: "Estimated Hours = Base Hours × Quantity × Complexity Multiplier" },
      { label: "Base hours", desc: "Each task has a preset base hour value (e.g. BOM General Compose = 2 hrs, EMI = 5 hrs). These represent effort per unit." },
      { label: "Complexity multiplier", desc: "Simple ×0.5, Normal ×1.0, Complex ×1.5, Very Complex ×2.0" },
      { label: "Example", desc: "EMI task, Quantity 2, Complex → 5 × 2 × 1.5 = 15 hrs estimated." },
      { label: "Manual override", desc: "If you select a job type without a preset task list, you can set the hours manually." },
    ],
  },
  {
    icon: "🌙",
    title: "Theme & Display",
    items: [
      { label: "Dark / Light mode", desc: "Toggle with the ☀️ / 🌙 button in the top-right header. Your preference is saved in the browser." },
      { label: "Mobile", desc: "The layout is responsive. Charts and table adapt for phone and tablet screens. Use landscape orientation for the full table." },
    ],
  },
];

const GuidePanel: React.FC = () => {
  const [open, setOpen] = React.useState<number | null>(0);

  const toggle = (i: number) => setOpen(prev => (prev === i ? null : i));

  return (
    <div style={{ maxWidth: 760, margin: "0 auto" }}>
      {/* Hero */}
      <div className="card pad" style={{ marginBottom: 16, borderTop: "3px solid var(--primary)" }}>
        <div className="section-title" style={{ fontSize: 17, marginBottom: 6 }}>
          📖 How to use the Workload Dashboard
        </div>
        <p className="muted" style={{ margin: 0, lineHeight: 1.7 }}>
          This dashboard helps the HW OLED LGERC team track, estimate, and balance workload across members.
          Click any section below to expand the guide.
        </p>
      </div>

      {/* Quick reference cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(210px,1fr))", gap: 10, marginBottom: 16 }}>
        {[
          { icon: "🎯", label: "Complexity multiplies base hours", sub: "Simple ×0.5 → Very Complex ×2.0" },
          { icon: "📋", label: "Hours auto-calculated", sub: "Pick task + qty + complexity" },
          { icon: "✅", label: "Done = excluded from load", sub: "Only Open jobs count in charts" },
          { icon: "🚨", label: "Red row = overdue", sub: "Open job past its due date" },
        ].map((c, i) => (
          <div key={i} className="card pad" style={{ display:"flex", flexDirection:"column", gap:4 }}>
            <span style={{ fontSize: 20 }}>{c.icon}</span>
            <span style={{ fontWeight: 600, fontSize: 13 }}>{c.label}</span>
            <span className="muted" style={{ fontSize: 12 }}>{c.sub}</span>
          </div>
        ))}
      </div>

      {/* Accordion sections */}
      {SECTIONS.map((s, i) => (
        <div key={i} className="card" style={{ marginBottom: 8, overflow: "hidden" }}>
          <button
            onClick={() => toggle(i)}
            style={{
              width: "100%", display: "flex", alignItems: "center", gap: 10,
              padding: "13px 16px", background: "transparent", border: "none",
              cursor: "pointer", textAlign: "left",
            }}
          >
            <span style={{ fontSize: 18, minWidth: 24 }}>{s.icon}</span>
            <span style={{ fontWeight: 600, fontSize: 14, color: "var(--text)", flex: 1 }}>{s.title}</span>
            <span style={{ color: "var(--muted)", fontSize: 14 }}>{open === i ? "▲" : "▼"}</span>
          </button>

          {open === i && (
            <div style={{ padding: "0 16px 16px" }}>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {s.items.map((item, j) => (
                  <div key={j} style={{
                    display: "grid", gridTemplateColumns: "160px 1fr", gap: 10,
                    borderBottom: j < s.items.length - 1 ? "1px solid var(--border)" : undefined,
                    paddingBottom: j < s.items.length - 1 ? 8 : 0,
                    alignItems: "start",
                  }}>
                    <span style={{ fontWeight: 600, fontSize: 13, color: "var(--primary)", paddingTop: 1 }}>
                      {item.label}
                    </span>
                    <span style={{ fontSize: 13, color: "var(--text)", lineHeight: 1.6 }}>
                      {item.desc}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      ))}

      <div className="card pad muted" style={{ marginTop: 16, fontSize: 12, textAlign: "center" }}>
        HW OLED LGERC · Workload Dashboard · Internal tool — not for external distribution
      </div>
    </div>
  );
};

export default GuidePanel;
