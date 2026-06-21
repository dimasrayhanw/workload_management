// src/components/AnalysisPanel.tsx
import React, { useMemo } from "react";
import type { Job } from "../types";
import { resolveDisplayName } from "../constants";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  Cell, Legend, CartesianGrid,
} from "recharts";
import type { Theme } from "../App";
import { exportAnalysisExcel } from "../utils/exportExcel";

type Props = {
  jobs: Job[];
  theme: Theme;
  loading: boolean;
  onRefresh: () => void;
};

const parseLocalDate = (raw?: string | null): Date | null => {
  if (!raw) return null;
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(raw.trim());
  return m ? new Date(+m[1], +m[2] - 1, +m[3]) : null;
};

const todayStart = () => {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
};

const COMPLEXITY_ORDER = ["Simple", "Normal", "Complex", "Very Complex"];
const COMPLEXITY_COLORS: Record<string, string> = {
  Simple: "#6ea8fe", Normal: "#9e9e9e", Complex: "#ffd166", "Very Complex": "#ff5555",
};

const AnalysisPanel: React.FC<Props> = ({ jobs, theme, loading, onRefresh }) => {
  const isDark = theme === "dark";
  const tooltipStyle = {
    background: isDark ? "#1c1c1c" : "#ffffff",
    border: `1px solid ${isDark ? "#2d2d2d" : "#e2e2e2"}`,
    borderRadius: 8,
    color: isDark ? "#f2f2f2" : "#1a1a1a",
    fontSize: 12,
  };
  const axisColor = isDark ? "#9e9e9e" : "#6b7280";

  const today = todayStart();
  const nextWeek = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);

  /* ── Per-user stats ─────────────────────────────────────── */
  const perUser = useMemo(() => {
    const map: Record<string, {
      openJobs: number; doneJobs: number;
      openHrs: number; doneHrs: number;
      overdue: number;
    }> = {};

    for (const j of jobs) {
      const user = resolveDisplayName(j.user_name || "unknown");
      if (!map[user]) map[user] = { openJobs: 0, doneJobs: 0, openHrs: 0, doneHrs: 0, overdue: 0 };
      const isDone = (j.status || "Open").toLowerCase() === "done";
      const hrs = j.estimated_duration || 0;
      if (isDone) { map[user].doneJobs++; map[user].doneHrs += hrs; }
      else {
        map[user].openJobs++;
        map[user].openHrs += hrs;
        const dd = parseLocalDate(j.due_date);
        if (dd && dd < today) map[user].overdue++;
      }
    }
    return Object.entries(map)
      .map(([user, v]) => ({
        user,
        openJobs: v.openJobs,
        doneJobs: v.doneJobs,
        totalJobs: v.openJobs + v.doneJobs,
        openHrs: +v.openHrs.toFixed(1),
        doneHrs: +v.doneHrs.toFixed(1),
        totalHrs: +(v.openHrs + v.doneHrs).toFixed(1),
        overdue: v.overdue,
        completionPct: v.openJobs + v.doneJobs > 0
          ? Math.round(v.doneJobs / (v.openJobs + v.doneJobs) * 100)
          : 0,
      }))
      .sort((a, b) => b.openHrs - a.openHrs);
  }, [jobs, today]);

  /* ── Global KPIs ─────────────────────────────────────────── */
  const kpis = useMemo(() => {
    const total = jobs.length;
    const done = jobs.filter(j => (j.status || "Open").toLowerCase() === "done").length;
    const open = total - done;
    const completionRate = total > 0 ? Math.round(done / total * 100) : 0;
    const overdueCount = jobs.filter(j => {
      if ((j.status || "Open").toLowerCase() === "done") return false;
      const dd = parseLocalDate(j.due_date);
      return dd && dd < today;
    }).length;
    const overdueRate = open > 0 ? Math.round(overdueCount / open * 100) : 0;
    const activeUsers = perUser.filter(u => u.openJobs > 0);
    const avgOpenHrs = activeUsers.length > 0
      ? +(activeUsers.reduce((s, u) => s + u.openHrs, 0) / activeUsers.length).toFixed(1)
      : 0;
    const maxHrs = perUser.length > 0 ? perUser[0].openHrs : 0;
    const minHrs = perUser.length > 0 ? [...perUser].sort((a, b) => a.openHrs - b.openHrs)[0].openHrs : 0;
    const spread = minHrs > 0 ? +(maxHrs / minHrs).toFixed(1) : null;
    return { total, done, open, completionRate, overdueCount, overdueRate, avgOpenHrs, spread };
  }, [jobs, perUser, today]);

  /* ── Complexity breakdown ─────────────────────────────────── */
  const complexityData = useMemo(() => {
    const map: Record<string, { count: number; hrs: number }> = {};
    for (const j of jobs.filter(j => (j.status || "Open").toLowerCase() !== "done")) {
      const c = j.complexity || "Normal";
      if (!map[c]) map[c] = { count: 0, hrs: 0 };
      map[c].count++;
      map[c].hrs += j.estimated_duration || 0;
    }
    return COMPLEXITY_ORDER.filter(k => map[k]).map(k => ({
      name: k, count: map[k].count, hrs: +map[k].hrs.toFixed(1),
    }));
  }, [jobs]);

  /* ── Stacked Open/Done chart ─────────────────────────────── */
  const stackedData = useMemo(() =>
    perUser.slice(0, 15).map(u => ({ user: u.user, "Open Hrs": u.openHrs, "Done Hrs": u.doneHrs })),
    [perUser]
  );

  /* ── Completion rate chart ───────────────────────────────── */
  const completionChartData = useMemo(() =>
    perUser.filter(u => u.totalJobs > 0)
      .map(u => ({ user: u.user, "Rate %": u.completionPct }))
      .sort((a, b) => b["Rate %"] - a["Rate %"]),
    [perUser]
  );

  /* ── Auto insights ───────────────────────────────────────── */
  const insights = useMemo(() => {
    const out: string[] = [];

    if (kpis.overdueCount > 0)
      out.push(`⚠️ ${kpis.overdueCount} active job${kpis.overdueCount > 1 ? "s are" : " is"} overdue (${kpis.overdueRate}% of open work). Review priorities.`);

    const topUser = perUser[0];
    if (topUser?.openHrs > 0)
      out.push(`🔥 Highest active load: ${topUser.user} at ${topUser.openHrs} hrs across ${topUser.openJobs} job${topUser.openJobs > 1 ? "s" : ""}.`);

    const idle = perUser.filter(u => u.openJobs === 0 && u.doneJobs > 0);
    if (idle.length > 0)
      out.push(`✅ ${idle.length} member${idle.length > 1 ? "s" : ""} completed all their jobs: ${idle.slice(0, 4).map(u => u.user).join(", ")}${idle.length > 4 ? "…" : ""}.`);

    if (kpis.completionRate >= 60)
      out.push(`📈 Good progress — team is at ${kpis.completionRate}% overall completion rate.`);
    else if (kpis.completionRate > 0 && kpis.completionRate < 30)
      out.push(`📋 Only ${kpis.completionRate}% of jobs done. Consider reviewing deadlines or workload distribution.`);

    const activeU = perUser.filter(u => u.openHrs > 0);
    if (kpis.spread && kpis.spread > 4 && activeU.length >= 2) {
      const lightest = [...activeU].sort((a, b) => a.openHrs - b.openHrs)[0];
      out.push(`⚖️ Workload imbalance: ${topUser?.user} (${topUser?.openHrs} hrs) vs ${lightest.user} (${lightest.openHrs} hrs) — ${kpis.spread}× difference.`);
    } else if (activeU.length >= 2) {
      out.push(`👥 Workload is reasonably balanced among ${activeU.length} active members (avg ${kpis.avgOpenHrs} hrs each).`);
    }

    const dueSoon = jobs.filter(j => {
      if ((j.status || "Open").toLowerCase() === "done") return false;
      const dd = parseLocalDate(j.due_date);
      return dd && dd >= today && dd <= nextWeek;
    }).length;
    if (dueSoon > 0)
      out.push(`📅 ${dueSoon} job${dueSoon > 1 ? "s" : ""} due within the next 7 days — plan accordingly.`);

    const veryComplex = jobs.filter(j => j.complexity === "Very Complex" && (j.status || "Open").toLowerCase() !== "done").length;
    if (veryComplex > 0)
      out.push(`🔴 ${veryComplex} open job${veryComplex > 1 ? "s are" : " is"} marked Very Complex — may need extra resources or time.`);

    if (out.length === 0)
      out.push("✨ Everything looks good! No critical issues detected.");

    return out;
  }, [kpis, perUser, jobs, today, nextWeek]);

  const AxisTick: React.FC<any> = ({ x, y, payload }) => {
    const label = String(payload?.value ?? "");
    const short = label.length > 12 ? label.slice(0, 10) + "…" : label;
    return (
      <text x={x} y={y + 12} textAnchor="end"
        transform={`rotate(-30, ${x}, ${y + 12})`}
        style={{ fontSize: 11, fill: axisColor }}>
        {short}
      </text>
    );
  };

  const [exporting, setExporting] = React.useState(false);

  const handleExport = async () => {
    setExporting(true);
    try {
      const now = new Date().toISOString().slice(0, 10);
      await exportAnalysisExcel(jobs, perUser, insights, `workload_analysis_${now}.xlsx`);
    } catch {
      // toast not available here, silent fail — user can retry
    } finally {
      setExporting(false);
    }
  };

  return (
    <div>
      {/* ── Toolbar ── */}
      <div className="toolbar" style={{ marginBottom: 14 }}>
        <span className="muted" style={{ fontSize: 12 }}>
          Analysis based on {jobs.length} job{jobs.length !== 1 ? "s" : ""}
        </span>
        <div className="spacer" />
        <button className="btn ghost small" onClick={onRefresh} disabled={loading}>
          {loading ? "Refreshing…" : "↻ Refresh"}
        </button>
        <button className="btn primary small" onClick={handleExport} disabled={exporting || jobs.length === 0}>
          {exporting ? "Exporting…" : "↓ Export Analysis"}
        </button>
      </div>

      {/* ── KPI cards ── */}
      <div className="analysis-kpis" style={{ marginBottom: 14 }}>
        <div className="stat-card accent-green">
          <span className="stat-label">Completion Rate</span>
          <span className="stat-value">{kpis.completionRate}%</span>
          <span className="stat-sub">{kpis.done} done / {kpis.total} total</span>
        </div>
        <div className="stat-card accent-warn">
          <span className="stat-label">Avg Active Hrs / User</span>
          <span className="stat-value">{kpis.avgOpenHrs}</span>
          <span className="stat-sub">Open jobs only</span>
        </div>
        <div className={`stat-card ${kpis.overdueCount > 0 ? "accent-danger" : "accent-green"}`}>
          <span className="stat-label">Overdue Rate</span>
          <span className="stat-value" style={kpis.overdueCount > 0 ? { color: "var(--danger)" } : {}}>
            {kpis.overdueRate}%
          </span>
          <span className="stat-sub">{kpis.overdueCount} job{kpis.overdueCount !== 1 ? "s" : ""} overdue</span>
        </div>
        <div className={`stat-card ${kpis.spread && kpis.spread > 4 ? "accent-danger" : "accent-green"}`}>
          <span className="stat-label">Workload Spread</span>
          <span className="stat-value">{kpis.spread ? `${kpis.spread}×` : "—"}</span>
          <span className="stat-sub">Max / min active hrs</span>
        </div>
      </div>

      {/* ── Charts row ── */}
      <div className="card pad charts" style={{ marginBottom: 14 }}>
        {/* Stacked open/done */}
        <div className="card pad">
          <div className="section-title">Open vs Done Hours — per Member</div>
          {stackedData.length === 0 ? (
            <div className="empty-chart"><span className="muted">No data</span></div>
          ) : (
            <div style={{ width: "100%", height: 260 }}>
              <ResponsiveContainer>
                <BarChart data={stackedData} margin={{ top: 8, right: 12, left: 0, bottom: 52 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={isDark ? "#2a2a2a" : "#f0f0f0"} />
                  <XAxis dataKey="user" interval={0} height={56} tickMargin={8}
                    tickLine={false} axisLine={false} tick={<AxisTick />} />
                  <YAxis tick={{ fill: axisColor, fontSize: 11 }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Legend wrapperStyle={{ fontSize: 11, color: axisColor }} />
                  <Bar dataKey="Open Hrs" stackId="a" fill="#A50034" radius={[0,0,0,0]} />
                  <Bar dataKey="Done Hrs" stackId="a" fill="#4dd4ac" radius={[4,4,0,0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        {/* Completion rate % */}
        <div className="card pad" style={{ maxWidth: 380 }}>
          <div className="section-title">Completion Rate % — per Member</div>
          {completionChartData.length === 0 ? (
            <div className="empty-chart"><span className="muted">No data</span></div>
          ) : (
            <div style={{ width: "100%", height: 260 }}>
              <ResponsiveContainer>
                <BarChart data={completionChartData} layout="vertical"
                  margin={{ top: 4, right: 28, left: 40, bottom: 4 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={isDark ? "#2a2a2a" : "#f0f0f0"} horizontal={false} />
                  <XAxis type="number" domain={[0, 100]} tick={{ fill: axisColor, fontSize: 11 }}
                    tickFormatter={v => `${v}%`} axisLine={false} tickLine={false} />
                  <YAxis dataKey="user" type="category" width={58}
                    tick={{ fill: axisColor, fontSize: 11 }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={tooltipStyle} formatter={(v: any) => [`${v}%`, "Completion"]} />
                  <Bar dataKey="Rate %" radius={[0, 4, 4, 0]} minPointSize={3}>
                    {completionChartData.map((entry, i) => (
                      <Cell key={i}
                        fill={entry["Rate %"] >= 70 ? "#4dd4ac" : entry["Rate %"] >= 40 ? "#ffd166" : "#A50034"} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      </div>

      {/* ── Complexity breakdown chart ── */}
      {complexityData.length > 0 && (
        <div className="card pad" style={{ marginBottom: 14 }}>
          <div className="section-title">Open Jobs by Complexity</div>
          <div style={{ width: "100%", height: 160 }}>
            <ResponsiveContainer>
              <BarChart data={complexityData} margin={{ top: 4, right: 12, left: 0, bottom: 4 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={isDark ? "#2a2a2a" : "#f0f0f0"} />
                <XAxis dataKey="name" tick={{ fill: axisColor, fontSize: 12 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: axisColor, fontSize: 11 }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={tooltipStyle}
                  formatter={(val: any, name: string) => [val, name === "hrs" ? "Hours" : "Jobs"]} />
                <Legend wrapperStyle={{ fontSize: 11, color: axisColor }} />
                <Bar dataKey="count" name="Jobs" radius={[4,4,0,0]}>
                  {complexityData.map((e, i) => <Cell key={i} fill={COMPLEXITY_COLORS[e.name] || "#9e9e9e"} />)}
                </Bar>
                <Bar dataKey="hrs" name="Hours" radius={[4,4,0,0]} fill="#cc3366" opacity={0.7} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* ── Per-user table ── */}
      <div className="card pad" style={{ marginBottom: 14 }}>
        <div className="section-title">Member Breakdown</div>
        <div style={{ overflowX: "auto" }}>
          <table className="analysis-table">
            <thead>
              <tr>
                <th>Member</th>
                <th className="cell-num">Open Jobs</th>
                <th className="cell-num">Done Jobs</th>
                <th className="cell-num">Open Hrs</th>
                <th className="cell-num">Done Hrs</th>
                <th className="cell-num">Total Hrs</th>
                <th className="cell-num">Overdue</th>
                <th className="cell-num">Completion</th>
              </tr>
            </thead>
            <tbody>
              {perUser.map(u => (
                <tr key={u.user}>
                  <td><strong>{u.user}</strong></td>
                  <td className="cell-num">{u.openJobs}</td>
                  <td className="cell-num">{u.doneJobs}</td>
                  <td className="cell-num">{u.openHrs}</td>
                  <td className="cell-num">{u.doneHrs}</td>
                  <td className="cell-num">{u.totalHrs}</td>
                  <td className="cell-num" style={u.overdue > 0 ? { color: "var(--danger)", fontWeight: 700 } : {}}>
                    {u.overdue > 0 ? `⚠ ${u.overdue}` : "—"}
                  </td>
                  <td className="cell-num">
                    <span style={{
                      color: u.completionPct >= 70 ? "var(--success)" :
                             u.completionPct >= 40 ? "var(--warn)" : "var(--danger)",
                      fontWeight: 700,
                    }}>
                      {u.completionPct}%
                    </span>
                  </td>
                </tr>
              ))}
              {perUser.length === 0 && (
                <tr><td colSpan={8} style={{ textAlign: "center", color: "var(--muted)", padding: 20 }}>No data</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Auto insights ── */}
      <div className="card pad">
        <div className="section-title">Auto Insights</div>
        <ul className="insights-list">
          {insights.map((text, i) => (
            <li key={i} className="insight-item">{text}</li>
          ))}
        </ul>
      </div>
    </div>
  );
};

export default AnalysisPanel;
