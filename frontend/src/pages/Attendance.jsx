import { useCallback, useEffect, useState } from "react";
import api from "../api";
import "../styles/Attendance.css";

function Attendance() {
  const [attendance, setAttendance] = useState([]);
  const [todayRecord, setTodayRecord] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const today = new Date().toLocaleDateString("en-CA");

  const loadAttendance = useCallback(async () => {
    try {
      setError("");

      const response = await api.get("/attendance/me");
      const records = response.data;

      setAttendance(records);

      const record = records.find((item) => item.date === today);
      setTodayRecord(record || null);
    } catch (err) {
      setError(
        err.response?.data?.detail ||
          "Unable to load attendance records."
      );
    } finally {
      setLoading(false);
    }
  }, [today]);

  useEffect(() => {
    loadAttendance();
  }, [loadAttendance]);

  async function handleAttendanceAction(action) {
    try {
      setActionLoading(true);
      setError("");
      setMessage("");

      const response = await api.post(`/attendance/${action}`);

      setMessage(
        action === "check-in"
          ? "Check-in recorded successfully."
          : "Check-out recorded successfully."
      );

      setTodayRecord(response.data);
      await loadAttendance();
    } catch (err) {
      setError(
        err.response?.data?.detail ||
          "Unable to update attendance."
      );
    } finally {
      setActionLoading(false);
    }
  }

  function formatTime(value) {
    if (!value) return "—";

    return new Date(value).toLocaleTimeString("en-IN", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  }

  function formatDate(value) {
    if (!value) return "—";

    const [year, month, day] = value.split("-");
    return new Date(
      Number(year),
      Number(month) - 1,
      Number(day)
    ).toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  }

  function getStatusClass(status) {
    return `attendance-status ${status?.toLowerCase() || ""}`;
  }

  if (loading) {
    return <div className="attendance-page">Loading attendance...</div>;
  }

  const checkedIn = Boolean(todayRecord?.check_in);
  const checkedOut = Boolean(todayRecord?.check_out);

  return (
    <main className="attendance-page">
      <header className="attendance-header">
        <div>
          <p className="attendance-eyebrow">WORKSPHERE HRMS</p>
          <h1>Attendance Dashboard</h1>
          <p>Track your daily attendance and working hours.</p>
        </div>

        <div className="attendance-today">
          <span>Today's Date</span>
          <strong>{formatDate(today)}</strong>
        </div>
      </header>

      {error && <div className="attendance-alert error">{error}</div>}
      {message && (
        <div className="attendance-alert success">{message}</div>
      )}

      <section className="attendance-summary">
        <article className="attendance-summary-card">
          <span>Today's Status</span>
          <strong>{todayRecord?.status || "NOT MARKED"}</strong>
        </article>

        <article className="attendance-summary-card">
          <span>Check-in Time</span>
          <strong>{formatTime(todayRecord?.check_in)}</strong>
        </article>

        <article className="attendance-summary-card">
          <span>Check-out Time</span>
          <strong>{formatTime(todayRecord?.check_out)}</strong>
        </article>

        <article className="attendance-summary-card">
          <span>Working Hours</span>
          <strong>
            {todayRecord?.working_hours != null
              ? `${todayRecord.working_hours.toFixed(2)} hrs`
              : "In progress"}
          </strong>
        </article>
      </section>

      <section className="attendance-action-card">
        <div>
          <h2>Mark Your Attendance</h2>
          <p>
            {checkedOut
              ? "Your attendance for today is complete."
              : checkedIn
                ? "You have checked in. Remember to check out when you finish."
                : "Check in when you start your working day."}
          </p>
        </div>

        <div className="attendance-buttons">
          <button
            type="button"
            className="check-in-button"
            disabled={actionLoading || checkedIn}
            onClick={() => handleAttendanceAction("check-in")}
          >
            {actionLoading && !checkedIn ? "Please wait..." : "Check In"}
          </button>

          <button
            type="button"
            className="check-out-button"
            disabled={actionLoading || !checkedIn || checkedOut}
            onClick={() => handleAttendanceAction("check-out")}
          >
            {actionLoading && checkedIn && !checkedOut
              ? "Please wait..."
              : "Check Out"}
          </button>
        </div>
      </section>

      <section className="attendance-history-section">
        <div className="attendance-section-heading">
          <div>
            <h2>Attendance History</h2>
            <p>Your recorded attendance history.</p>
          </div>

          <button
            type="button"
            className="refresh-button"
            onClick={loadAttendance}
          >
            Refresh
          </button>
        </div>

        {attendance.length === 0 ? (
          <div className="attendance-empty">
            No attendance records found.
          </div>
        ) : (
          <div className="attendance-table-wrapper">
            <table className="attendance-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Check In</th>
                  <th>Check Out</th>
                  <th>Working Hours</th>
                  <th>Status</th>
                </tr>
              </thead>

              <tbody>
                {attendance.map((record) => (
                  <tr key={record.id}>
                    <td>{formatDate(record.date)}</td>
                    <td>{formatTime(record.check_in)}</td>
                    <td>{formatTime(record.check_out)}</td>
                    <td>
                      {record.working_hours != null
                        ? `${record.working_hours.toFixed(2)} hrs`
                        : "In progress"}
                    </td>
                    <td>
                      <span className={getStatusClass(record.status)}>
                        {record.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </main>
  );
}

export default Attendance;