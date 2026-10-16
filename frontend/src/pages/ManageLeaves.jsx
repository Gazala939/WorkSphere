
import { useEffect, useState } from "react";
import api from "../api";
import "../styles/Leave.css";

export default function ManageLeaves() {
  const [leaves, setLeaves] = useState([]);
  const [filter, setFilter] = useState("ALL");
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState(null);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  async function fetchLeaves() {
    try {
      setLoading(true);
      setError("");
      const params = filter === "ALL" ? {} : { status: filter };
      const response = await api.get("/leaves", { params });
      setLeaves(response.data);
    } catch (err) {
      setError(
        typeof err.response?.data?.detail === "string"
          ? err.response.data.detail
          : "Unable to load leave requests. Please check your HR/Admin login."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchLeaves();
  }, [filter]);

  async function handleDecision(leaveId, decision) {
    const action = decision === "APPROVED" ? "approve" : "reject";

    if (!window.confirm(`Are you sure you want to ${action} this leave request?`)) {
      return;
    }

    try {
      setProcessingId(leaveId);
      setError("");
      setMessage("");

      await api.patch(`/leaves/${leaveId}/decision`, {
        status: decision,
      });

      setMessage(`Leave request #${leaveId} ${decision.toLowerCase()} successfully.`);
      await fetchLeaves();
    } catch (err) {
      setError(
        typeof err.response?.data?.detail === "string"
          ? err.response.data.detail
          : "Unable to update the leave request."
      );
    } finally {
      setProcessingId(null);
    }
  }

  function formatDate(value) {
    if (!value) return "—";

    return new Date(`${value}T00:00:00`).toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  }

  return (
    <div className="leave-page">
      <div className="leave-container">
        <div className="leave-header">
          <div>
            <p className="leave-eyebrow">WORKSPHERE HRMS</p>
            <h1>Manage Leave Requests</h1>
            <p>Review and manage employee leave applications.</p>
          </div>

          <button
            className="leave-secondary-btn"
            onClick={fetchLeaves}
            disabled={loading}
          >
            {loading ? "Refreshing..." : "Refresh"}
          </button>
        </div>

        <div className="leave-card">
          <div className="leave-history-heading">
            <h2>Employee Leave Requests</h2>

            <select
              className="leave-filter"
              value={filter}
              onChange={(event) => setFilter(event.target.value)}
            >
              <option value="ALL">All Requests</option>
              <option value="PENDING">Pending</option>
              <option value="APPROVED">Approved</option>
              <option value="REJECTED">Rejected</option>
            </select>
          </div>

          {message && (
            <div className="leave-message success" role="status">
              {message}
            </div>
          )}

          {error && (
            <div className="leave-message error" role="alert">
              {error}
            </div>
          )}

          {loading ? (
            <p>Loading leave requests...</p>
          ) : leaves.length === 0 ? (
            <div className="leave-empty">
              <h3>No leave requests found</h3>
              <p>Requests matching your selected filter will appear here.</p>
            </div>
          ) : (
            <div className="leave-table-wrapper">
              <table className="leave-table">
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Employee ID</th>
                    <th>Leave Type</th>
                    <th>Start Date</th>
                    <th>End Date</th>
                    <th>Reason</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>

                <tbody>
                  {leaves.map((leave) => (
                    <tr key={leave.id}>
                      <td>{leave.id}</td>
                      <td>{leave.employee_id}</td>
                      <td>{leave.leave_type}</td>
                      <td>{formatDate(leave.start_date)}</td>
                      <td>{formatDate(leave.end_date)}</td>
                      <td className="leave-reason">{leave.reason}</td>

                      <td>
                        <span
                          className={`leave-status ${leave.status.toLowerCase()}`}
                        >
                          {leave.status}
                        </span>
                      </td>

                      <td>
                        {leave.status === "PENDING" ? (
                          <div className="leave-review-actions">
                            <button
                              className="leave-approve-btn"
                              disabled={processingId !== null}
                              onClick={() =>
                                handleDecision(leave.id, "APPROVED")
                              }
                            >
                              {processingId === leave.id
                                ? "Saving..."
                                : "Approve"}
                            </button>

                            <button
                              className="leave-reject-btn"
                              disabled={processingId !== null}
                              onClick={() =>
                                handleDecision(leave.id, "REJECTED")
                              }
                            >
                              Reject
                            </button>
                          </div>
                        ) : (
                          <span className="leave-reviewed-text">
                            Reviewed
                          </span>
                        )}
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
