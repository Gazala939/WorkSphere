
import { useEffect, useState } from "react";
import api from "../api";
import "../styles/ResignationManagement.css";

export default function ResignationManagement() {
  const [resignations, setResignations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const loadResignations = async () => {
    setLoading(true);
    setError("");

    try {
      const response = await api.get("/resignations");
      setResignations(response.data);
    } catch (err) {
      setError(
        err.response?.data?.detail ||
          "Unable to load resignation requests."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadResignations();
  }, []);

  const handleDecision = async (resignationId, decision) => {
    const action = decision.toLowerCase();

    const confirmed = window.confirm(
      `Are you sure you want to ${action} resignation #${resignationId}?`
    );

    if (!confirmed) return;

    setUpdatingId(resignationId);
    setMessage("");
    setError("");

    try {
      await api.patch(
        `/resignations/${resignationId}/decision`,
        { status: decision }
      );

      setMessage(
        `Resignation #${resignationId} ${action}d successfully.`
      );

      await loadResignations();
    } catch (err) {
      setError(
        err.response?.data?.detail ||
          "Unable to update the resignation request."
      );
    } finally {
      setUpdatingId(null);
    }
  };

  const pendingCount = resignations.filter(
    (item) => item.status === "PENDING"
  ).length;

  const approvedCount = resignations.filter(
    (item) => item.status === "APPROVED"
  ).length;

  const rejectedCount = resignations.filter(
    (item) => item.status === "REJECTED"
  ).length;

  return (
    <div className="exit-management-page">
      <header className="exit-management-header">
        <div>
          <span className="exit-management-label">
            HUMAN RESOURCES
          </span>
          <h1>Resignation Management</h1>
          <p>
            Review employee resignations and manage exit requests.
          </p>
        </div>

        <button
          type="button"
          className="exit-refresh-btn"
          onClick={loadResignations}
          disabled={loading}
        >
          {loading ? "Loading..." : "Refresh"}
        </button>
      </header>

      {message && (
        <div className="exit-success-message">
          {message}
        </div>
      )}

      {error && (
        <div className="exit-error-message">
          {error}
        </div>
      )}

      <div className="exit-stats">
        <div className="exit-stat-card">
          <span>Total Requests</span>
          <strong>{resignations.length}</strong>
        </div>

        <div className="exit-stat-card">
          <span>Pending</span>
          <strong>{pendingCount}</strong>
        </div>

        <div className="exit-stat-card">
          <span>Approved</span>
          <strong>{approvedCount}</strong>
        </div>

        <div className="exit-stat-card">
          <span>Rejected</span>
          <strong>{rejectedCount}</strong>
        </div>
      </div>

      <section className="exit-management-panel">
        <h2>Employee Resignation Requests</h2>

        {loading ? (
          <p>Loading resignation requests...</p>
        ) : resignations.length === 0 ? (
          <p>No resignation requests have been submitted.</p>
        ) : (
          <div className="exit-table-wrapper">
            <table className="exit-management-table">
              <thead>
                <tr>
                  <th>Request ID</th>
                  <th>Employee ID</th>
                  <th>Reason</th>
                  <th>Notice Period</th>
                  <th>Submitted On</th>
                  <th>Status</th>
                  <th>Decision</th>
                </tr>
              </thead>

              <tbody>
                {resignations.map((item) => (
                  <tr key={item.id}>
                    <td>#{item.id}</td>
                    <td>{item.employee_id}</td>
                    <td className="exit-reason-cell">
                      {item.reason}
                    </td>
                    <td>{item.notice_period} days</td>
                    <td>
                      {item.created_at
                        ? new Date(
                            item.created_at
                          ).toLocaleDateString()
                        : "—"}
                    </td>
                    <td>
                      <span
                        className={`exit-status-badge ${item.status.toLowerCase()}`}
                      >
                        {item.status}
                      </span>
                    </td>
                    <td>
                      {item.status === "PENDING" ? (
                        <div className="exit-action-buttons">
                          <button
                            type="button"
                            className="exit-approve-btn"
                            disabled={updatingId !== null}
                            onClick={() =>
                              handleDecision(
                                item.id,
                                "APPROVED"
                              )
                            }
                          >
                            {updatingId === item.id
                              ? "Updating..."
                              : "Approve"}
                          </button>

                          <button
                            type="button"
                            className="exit-reject-btn"
                            disabled={updatingId !== null}
                            onClick={() =>
                              handleDecision(
                                item.id,
                                "REJECTED"
                              )
                            }
                          >
                            Reject
                          </button>
                        </div>
                      ) : (
                        <span className="exit-reviewed-text">
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
      </section>
    </div>
  );
}
