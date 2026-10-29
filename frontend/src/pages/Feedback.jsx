
import { useEffect, useState } from "react";
import api from "../api";
import { useAuth } from "../auth/AuthContext";
import "../styles/Feedback.css";

export default function Feedback() {
  const { user } = useAuth();

  const role = user?.role?.toUpperCase();
  const isManager = role === "HR" || role === "ADMIN";

  const [message, setMessage] = useState("");
  const [rating, setRating] = useState(5);
  const [feedbackList, setFeedbackList] = useState([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");

  async function loadFeedback() {
    setLoading(true);
    setError("");

    try {
      const response = await api.get("/feedback");
      setFeedbackList(response.data);
    } catch (err) {
      setError(
        err.response?.data?.detail ||
        "Could not load feedback."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (isManager) {
      loadFeedback();
    }
  }, [isManager]);

  async function handleSubmit(e) {
    e.preventDefault();
    setNotice("");
    setError("");

    if (message.trim().length < 3) {
      setError("Please enter at least 3 characters.");
      return;
    }

    setSubmitting(true);

    try {
      await api.post("/feedback", {
        message: message.trim(),
        rating: Number(rating),
      });

      setMessage("");
      setRating(5);
      setNotice("Your feedback was submitted successfully.");
    } catch (err) {
      setError(
        err.response?.data?.detail ||
        "Could not submit feedback."
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="feedback-page">
      <div className="feedback-heading">
        <div>
          <h1>Employee Feedback</h1>
          <p>
            {isManager
              ? "Review feedback submitted by employees."
              : "Share your experience and help us improve."}
          </p>
        </div>

        {isManager && (
          <button
            className="feedback-refresh"
            onClick={loadFeedback}
            disabled={loading}
          >
            {loading ? "Loading..." : "Refresh"}
          </button>
        )}
      </div>

      {notice && (
        <div className="feedback-success">{notice}</div>
      )}

      {error && (
        <div className="feedback-error">{error}</div>
      )}

      {!isManager ? (
        <form
          className="feedback-form"
          onSubmit={handleSubmit}
        >
          <h2>Share Your Feedback</h2>

          <label htmlFor="feedback-rating">
            Rate your experience
          </label>

          <select
            id="feedback-rating"
            value={rating}
            onChange={(e) => setRating(Number(e.target.value))}
          >
            <option value={5}>5 - Excellent</option>
            <option value={4}>4 - Very Good</option>
            <option value={3}>3 - Good</option>
            <option value={2}>2 - Fair</option>
            <option value={1}>1 - Poor</option>
          </select>

          <label htmlFor="feedback-message">
            Your message
          </label>

          <textarea
            id="feedback-message"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Tell us about your experience..."
            minLength={3}
            maxLength={2000}
            rows={6}
            required
          />

          <small>{message.length}/2000 characters</small>

          <button
            className="feedback-submit"
            type="submit"
            disabled={submitting}
          >
            {submitting ? "Submitting..." : "Submit Feedback"}
          </button>
        </form>
      ) : (
        <div className="feedback-dashboard">
          <div className="feedback-summary">
            <div className="feedback-stat">
              <span>Total Feedback</span>
              <strong>{feedbackList.length}</strong>
            </div>

            <div className="feedback-stat">
              <span>Average Rating</span>
              <strong>
                {feedbackList.length
                  ? (
                      feedbackList.reduce(
                        (sum, item) => sum + item.rating,
                        0
                      ) / feedbackList.length
                    ).toFixed(1)
                  : "—"}
                {feedbackList.length ? " / 5" : ""}
              </strong>
            </div>
          </div>

          <h2>Submitted Feedback</h2>

          {loading ? (
            <p>Loading feedback...</p>
          ) : feedbackList.length === 0 ? (
            <p className="feedback-empty">
              No feedback has been submitted yet.
            </p>
          ) : (
            <div className="feedback-list">
              {feedbackList.map((item) => (
                <article
                  className="feedback-card"
                  key={item.id}
                >
                  <div className="feedback-card-top">
                    <strong>
                      Employee #{item.employee_id}
                    </strong>

                    <span className="feedback-rating">
                      {"★".repeat(item.rating)}
                      {"☆".repeat(5 - item.rating)}
                      {" "}
                      ({item.rating}/5)
                    </span>
                  </div>

                  <p>{item.message}</p>

                  <small>
                    {new Date(item.created_at).toLocaleString()}
                  </small>
                </article>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
