
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api";
import "../styles/Leave.css";

export default function LeaveHistory() {
  const navigate = useNavigate();

  const [leaves, setLeaves] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function fetchLeaves() {
    try {
      setLoading(true);
      setError("");

      const response = await api.get("/leaves/me");
      setLeaves(response.data);
    } catch (err) {
      setError(
        err.response?.data?.detail ||
          "Unable to load leave history."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchLeaves();
  }, []);

  function formatDate(value) {
    if (!value) return "—";

    return new Date(`${value}T00:00:00`).toLocaleDateString(
      "en-IN",
      {
        day: "2-digit",
        month: "short",
        year: "numeric",
      }
    );
  }

  function statusClass(status) {
    return `leave-status ${status.toLowerCase()}`;
  }

  return (
    <div className="leave-page">
      <div className="leave-container">
        <div className="leave-header">
          <div>
            <p className="leave-eyebrow">WORKSPHERE HRMS</p>
            <h1>Leave History</h1>
            <p>Track your leave applications and their status.</p>
          </div>

          <button
            className="leave-primary-btn leave-action-btn"
            onClick={() => navigate("/leaves/apply")}
          >
            + Apply for Leave
          </button>
        </div>

        <div className="leave-card">
          <div className="leave-history-heading">
            <h2>My Leave Requests</h2>

            <button
              className="leave-secondary-btn"
              onClick={fetchLeaves}
              disabled={loading}
            >
              {loading ? "Refreshing..." : "Refresh"}
            </button>
          </div>

          {error && (
            <div className="leave-message error" role="alert">
              {typeof error === "string" ? error : JSON.stringify(error)}
            </div>
          )}

          {loading ? (
            <p>Loading leave history...</p>
          ) : leaves.length === 0 ? (
            <div className="leave-empty">
              <h3>No leave requests yet</h3>
              <p>Your submitted leave applications will appear here.</p>
            </div>
          ) : (
            <div className="leave-table-wrapper">
              <table className="leave-table">
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Leave Type</th>
                    <th>Start Date</th>
                    <th>End Date</th>
                    <th>Reason</th>
                    <th>Status</th>
                  </tr>
                </thead>

                <tbody>
                  {leaves.map((leave) => (
                    <tr key={leave.id}>
                      <td>{leave.id}</td>
                      <td>{leave.leave_type}</td>
                      <td>{formatDate(leave.start_date)}</td>
                      <td>{formatDate(leave.end_date)}</td>
                      <td className="leave-reason">{leave.reason}</td>
                      <td>
                        <span className={statusClass(leave.status)}>
                          {leave.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
