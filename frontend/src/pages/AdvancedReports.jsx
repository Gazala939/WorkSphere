
import { useState } from "react";
import api from "../api";
import "../styles/AdvancedReports.css";

import {
  ResponsiveContainer,
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";

const COLORS = ["#2563eb", "#f59e0b", "#ef4444", "#10b981", "#8b5cf6"];

export default function AdvancedReports() {
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [department, setDepartment] = useState("");
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function loadReports() {
    if (startDate && endDate && startDate > endDate) {
      setError("Start date cannot be after end date.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const params = {};

      if (startDate) params.start_date = startDate;
      if (endDate) params.end_date = endDate;
      if (department.trim()) params.department = department.trim();

      const response = await api.get("/analytics/advanced", { params });
      setReport(response.data);
    } catch (err) {
      setError(
        err.response?.data?.detail || "Unable to load advanced reports."
      );
    } finally {
      setLoading(false);
    }
  }

  // Convert rating distribution object into chart data.
  const ratingData = Object.entries(
    report?.performance_insights?.rating_distribution || {}
  ).map(([rating, count]) => ({
    rating,
    count: Number(count) || 0,
  }));

  return (
    <div className="advanced-reports-page">
      <h1>Advanced Analytics & Reports</h1>

      <p>
        Explore attendance, leave, performance, and department insights.
      </p>

      {/* Filters */}
      <section className="reports-filters">
        <label>
          Start date
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
          />
        </label>

        <label>
          End date
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
          />
        </label>

        <label>
          Department
          <input
            type="text"
            placeholder="e.g. IT"
            value={department}
            onChange={(e) => setDepartment(e.target.value)}
          />
        </label>

        <button onClick={loadReports} disabled={loading}>
          {loading ? "Loading..." : "Generate Reports"}
        </button>
      </section>

      {error && <p className="reports-error">{error}</p>}

      {loading && <p className="reports-loading">Loading report data...</p>}

      {!report && !loading && (
        <p className="reports-empty">
          Select your filters and click Generate Reports to view analytics.
        </p>
      )}

      {report && (
        <>
          {/* Summary cards */}
          <section className="reports-summary">
            <article className="report-card">
              <h3>Average Performance</h3>
              <strong>
                {report.performance_insights.average_rating ?? 0}
              </strong>
              <p>Out of 5</p>
            </article>

            <article className="report-card">
              <h3>Total Performance Reviews</h3>
              <strong>
                {report.performance_insights.total_reviews ?? 0}
              </strong>
            </article>

            <article className="report-card">
              <h3>Departments Reported</h3>
              <strong>{report.department_reports.length}</strong>
            </article>
          </section>

          {/* Attendance line chart */}
          <section className="reports-section">
            <h2>Attendance Trends</h2>
            <p className="reports-description">
              Daily comparison of present, half-day, and absent employees.
            </p>

            <div className="reports-chart">
              {report.attendance_trends.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart
                    data={report.attendance_trends}
                    margin={{ top: 10, right: 20, left: 0, bottom: 10 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis allowDecimals={false} />
                    <Tooltip />
                    <Legend />

                    <Line
                      type="monotone"
                      dataKey="PRESENT"
                      name="Present"
                      stroke="#10b981"
                      strokeWidth={3}
                      activeDot={{ r: 6 }}
                    />

                    <Line
                      type="monotone"
                      dataKey="HALF_DAY"
                      name="Half Day"
                      stroke="#f59e0b"
                      strokeWidth={3}
                      activeDot={{ r: 6 }}
                    />

                    <Line
                      type="monotone"
                      dataKey="ABSENT"
                      name="Absent"
                      stroke="#ef4444"
                      strokeWidth={3}
                      activeDot={{ r: 6 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <p className="reports-empty">No attendance data found.</p>
              )}
            </div>
          </section>

          {/* Leave bar chart */}
          <section className="reports-section">
            <h2>Leave Trends</h2>
            <p className="reports-description">
              Daily comparison of pending, approved, and rejected leaves.
            </p>

            <div className="reports-chart">
              {report.leave_trends.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={report.leave_trends}
                    margin={{ top: 10, right: 20, left: 0, bottom: 10 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis allowDecimals={false} />
                    <Tooltip />
                    <Legend />

                    <Bar
                      dataKey="PENDING"
                      name="Pending"
                      fill="#f59e0b"
                      radius={[4, 4, 0, 0]}
                    />

                    <Bar
                      dataKey="APPROVED"
                      name="Approved"
                      fill="#10b981"
                      radius={[4, 4, 0, 0]}
                    />

                    <Bar
                      dataKey="REJECTED"
                      name="Rejected"
                      fill="#ef4444"
                      radius={[4, 4, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <p className="reports-empty">No leave data found.</p>
              )}
            </div>
          </section>

          {/* Performance pie chart */}
          <section className="reports-section">
            <h2>Performance Rating Distribution</h2>
            <p className="reports-description">
              Distribution of performance reviews across rating ranges.
            </p>

            <div className="reports-chart reports-pie-chart">
              {ratingData.some((item) => item.count > 0) ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={ratingData.filter((item) => item.count > 0)}
                      dataKey="count"
                      nameKey="rating"
                      cx="50%"
                      cy="50%"
                      outerRadius={115}
                      label={({ name, percent }) =>
                        `${name}: ${(percent * 100).toFixed(0)}%`
                      }
                    >
                      {ratingData
                        .filter((item) => item.count > 0)
                        .map((item, index) => (
                          <Cell
                            key={item.rating}
                            fill={COLORS[index % COLORS.length]}
                          />
                        ))}
                    </Pie>

                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <p className="reports-empty">
                  No performance ratings available.
                </p>
              )}
            </div>
          </section>

          {/* Department table */}
          <section className="reports-section">
            <h2>Department-wise Reports</h2>

            <div className="reports-table-wrapper">
              <table className="reports-table">
                <thead>
                  <tr>
                    <th>Department</th>
                    <th>Employees</th>
                    <th>Present</th>
                    <th>Half Day</th>
                    <th>Absent</th>
                    <th>Pending Leaves</th>
                    <th>Approved Leaves</th>
                    <th>Rejected Leaves</th>
                    <th>Average Rating</th>
                    <th>Reviews</th>
                  </tr>
                </thead>

                <tbody>
                  {report.department_reports.map((item) => (
                    <tr key={item.department}>
                      <td>{item.department}</td>
                      <td>{item.total_employees}</td>
                      <td>{item.attendance_summary.PRESENT}</td>
                      <td>{item.attendance_summary.HALF_DAY}</td>
                      <td>{item.attendance_summary.ABSENT}</td>
                      <td>{item.leave_summary.PENDING}</td>
                      <td>{item.leave_summary.APPROVED}</td>
                      <td>{item.leave_summary.REJECTED}</td>
                      <td>{item.average_performance_rating}</td>
                      <td>{item.total_performance_reviews}</td>
                    </tr>
                  ))}

                  {report.department_reports.length === 0 && (
                    <tr>
                      <td colSpan="10">No department data found.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}
    </div>
  );
}
