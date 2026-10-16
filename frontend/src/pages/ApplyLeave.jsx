
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api";
import "../styles/Leave.css";

export default function ApplyLeave() {
  const navigate = useNavigate();

  const [form, setForm] = useState({
    leave_type: "SICK",
    start_date: "",
    end_date: "",
    reason: "",
  });

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  function handleChange(event) {
    const { name, value } = event.target;

    setForm((previous) => ({
      ...previous,
      [name]: value,
    }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setMessage("");
    setError("");

    if (form.end_date < form.start_date) {
      setError("End date cannot be before start date.");
      return;
    }

    if (form.reason.trim().length < 3) {
      setError("Please enter a reason with at least 3 characters.");
      return;
    }

    try {
      setLoading(true);

      const response = await api.post("/leaves", {
        ...form,
        reason: form.reason.trim(),
      });

      setMessage(
        `Leave application submitted successfully. Status: ${response.data.status}`
      );

      setForm({
        leave_type: "SICK",
        start_date: "",
        end_date: "",
        reason: "",
      });
    } catch (err) {
      setError(
        err.response?.data?.detail ||
          "Unable to submit leave application. Please try again."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="leave-page">
      <div className="leave-container">
        <div className="leave-header">
          <div>
            <p className="leave-eyebrow">WORKSPHERE HRMS</p>
            <h1>Apply for Leave</h1>
            <p>Submit your leave request for HR/Admin review.</p>
          </div>

          <button
            type="button"
            className="leave-secondary-btn"
            onClick={() => navigate("/leaves/history")}
          >
            View Leave History
          </button>
        </div>

        <form className="leave-card" onSubmit={handleSubmit}>
          <h2>Leave Application Form</h2>

          {message && (
            <div className="leave-message success" role="status">
              {message}
            </div>
          )}

          {error && (
            <div className="leave-message error" role="alert">
              {typeof error === "string" ? error : JSON.stringify(error)}
            </div>
          )}

          <div className="leave-field">
            <label htmlFor="leave_type">Leave Type</label>
            <select
              id="leave_type"
              name="leave_type"
              value={form.leave_type}
              onChange={handleChange}
              required
            >
              <option value="SICK">Sick Leave</option>
              <option value="CASUAL">Casual Leave</option>
              <option value="PAID">Paid Leave</option>
            </select>
          </div>

          <div className="leave-date-grid">
            <div className="leave-field">
              <label htmlFor="start_date">Start Date</label>
              <input
                id="start_date"
                type="date"
                name="start_date"
                value={form.start_date}
                onChange={handleChange}
                required
              />
            </div>

            <div className="leave-field">
              <label htmlFor="end_date">End Date</label>
              <input
                id="end_date"
                type="date"
                name="end_date"
                value={form.end_date}
                onChange={handleChange}
                min={form.start_date || undefined}
                required
              />
            </div>
          </div>

          <div className="leave-field">
            <label htmlFor="reason">Reason for Leave</label>
            <textarea
              id="reason"
              name="reason"
              rows="4"
              maxLength="500"
              placeholder="Explain why you need leave..."
              value={form.reason}
              onChange={handleChange}
              required
            />
            <small>{form.reason.length}/500 characters</small>
          </div>

          <button
            type="submit"
            className="leave-primary-btn"
            disabled={loading}
          >
            {loading ? "Submitting..." : "Submit Leave Request"}
          </button>
        </form>
      </div>
    </div>
  );
}
