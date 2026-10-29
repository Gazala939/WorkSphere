
import { useEffect, useState } from "react";
import api from "../api";
import "../styles/Resignation.css";

export default function Resignation() {
  const [reason, setReason] = useState("");
  const [noticePeriod, setNoticePeriod] = useState(30);
  const [resignations, setResignations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const loadResignations = async () => {
    setLoading(true);

    try {
      const response = await api.get("/resignations/me");
      setResignations(response.data);
      setError("");
    } catch (err) {
      setError(
        err.response?.data?.detail ||
          "Unable to load resignation history."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadResignations();
  }, []);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setMessage("");
    setError("");

    if (!reason.trim()) {
      setError("Please enter your resignation reason.");
      return;
    }

    setSubmitting(true);

    try {
      await api.post("/resignations", {
        reason: reason.trim(),
        notice_period: Number(noticePeriod),
      });

      setMessage("Resignation submitted successfully.");
      setReason("");

      await loadResignations();
    } catch (err) {
      setError(
        err.response?.data?.detail ||
          "Unable to submit resignation."
      );

      await loadResignations();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="resignation-page">
      <header className="resignation-header">
        <span className="resignation-label">
          EMPLOYEE SELF SERVICE
        </span>
        <h1>Resignation & Exit</h1>
        <p>Submit your resignation and track its status.</p>
      </header>

      {message && (
        <div className="resignation-message">{message}</div>
      )}

      {error && (
        <div className="resignation-error">{error}</div>
      )}

      <section className="resignation-panel">
        <h2>Submit Resignation</h2>

        <form onSubmit={handleSubmit} className="resignation-form">
          <label>
            Reason for Resignation
            <textarea
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              placeholder="Enter your reason for resigning"
              rows={4}
              maxLength={2000}
              required
            />
          </label>

          <label>
            Notice Period (Days)
            <input
              type="number"
              min="0"
              max="365"
              value={noticePeriod}
              onChange={(event) =>
                setNoticePeriod(event.target.value)
              }
              required
            />
          </label>

          <button
            type="submit"
            disabled={submitting}
            className="resignation-submit"
          >
            {submitting ? "Submitting..." : "Submit Resignation"}
          </button>
        </form>
      </section>

      <section className="resignation-panel">
        <div className="resignation-history-header">
          <h2>My Exit Status</h2>

          <button
            type="button"
            className="resignation-refresh"
            onClick={loadResignations}
          >
            Refresh
          </button>
        </div>

        {loading ? (
          <p>Loading resignation history...</p>
        ) : resignations.length === 0 ? (
          <p>You have not submitted any resignation requests.</p>
        ) : (
          <div className="resignation-list">
            {resignations.map((item) => (
              <article
                className="resignation-record"
                key={item.id}
              >
                <div className="resignation-record-top">
                  <h3>Resignation #{item.id}</h3>

                  <span
                    className={`resignation-status ${item.status.toLowerCase()}`}
                  >
                    {item.status}
                  </span>
                </div>

                <p>
                  <strong>Reason:</strong> {item.reason}
                </p>

                <p>
                  <strong>Notice period:</strong>{" "}
                  {item.notice_period} days
                </p>

                <p>
                  <strong>Submitted:</strong>{" "}
                  {new Date(item.created_at).toLocaleString()}
                </p>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
