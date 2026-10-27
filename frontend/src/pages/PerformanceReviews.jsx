
import { useEffect, useState } from "react";
import api from "../api";
import "../styles/PerformanceReviews.css";

export default function PerformanceReviews() {
  const [reviews, setReviews] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [role, setRole] = useState("");
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const [form, setForm] = useState({
    employee_id: "",
    review_period: "",
    rating: "5",
    feedback: "",
  });

  const isManager = role === "HR" || role === "ADMIN";

  async function loadReviews(currentRole) {
    try {
      const endpoint =
        currentRole === "HR" || currentRole === "ADMIN"
          ? "/performance-reviews"
          : "/performance-reviews/me";

      const response = await api.get(endpoint);
      setReviews(response.data);
    } catch (err) {
      setError(
        err.response?.data?.detail || "Could not load performance reviews."
      );
    }
  }

  useEffect(() => {
    async function initialize() {
      try {
        const response = await api.get("/auth/me");
        const currentRole = response.data.role;

        setRole(currentRole);

        if (currentRole === "HR" || currentRole === "ADMIN") {
          const employeeResponse = await api.get("/employees");
          setEmployees(employeeResponse.data);
        }

        await loadReviews(currentRole);
      } catch (err) {
        setError(
          err.response?.data?.detail ||
            "Could not load your performance information."
        );
      } finally {
        setLoading(false);
      }
    }

    initialize();
  }, []);

  function handleChange(event) {
    setForm({
      ...form,
      [event.target.name]: event.target.value,
    });
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setMessage("");
    setError("");

    try {
      await api.post("/performance-reviews", {
        employee_id: Number(form.employee_id),
        review_period: form.review_period.trim(),
        rating: Number(form.rating),
        feedback: form.feedback.trim(),
      });

      setMessage("Performance review added successfully!");

      setForm({
        employee_id: "",
        review_period: "",
        rating: "5",
        feedback: "",
      });

      await loadReviews(role);
    } catch (err) {
      setError(
        err.response?.data?.detail || "Could not save the performance review."
      );
    }
  }

  if (loading) {
    return <p>Loading performance reviews...</p>;
  }

  return (
    <div className="performance-page">
      <h1>Performance Management</h1>
      <p className="performance-subtitle">
        Review employee ratings, feedback, and performance history.
      </p>

      {message && <p className="performance-success">{message}</p>}
      {error && <p className="performance-error">{String(error)}</p>}

      {isManager && (
        <section className="performance-card">
          <h2>Add Performance Review</h2>

          <form onSubmit={handleSubmit} className="performance-form">
            <label htmlFor="employee_id">Employee</label>
            <select
              id="employee_id"
              name="employee_id"
              value={form.employee_id}
              onChange={handleChange}
              required
            >
              <option value="">Select employee</option>
              {employees.map((employee) => (
                <option key={employee.id} value={employee.id}>
                  {employee.full_name} (ID: {employee.id})
                </option>
              ))}
            </select>

            <label htmlFor="review_period">Review Period</label>
            <input
              id="review_period"
              name="review_period"
              type="text"
              placeholder="e.g. October 2026"
              value={form.review_period}
              onChange={handleChange}
              maxLength={50}
              required
            />

            <label htmlFor="rating">Rating (1–5)</label>
            <select
              id="rating"
              name="rating"
              value={form.rating}
              onChange={handleChange}
              required
            >
              <option value="1">1 - Needs Improvement</option>
              <option value="2">2 - Fair</option>
              <option value="3">3 - Good</option>
              <option value="4">4 - Very Good</option>
              <option value="5">5 - Excellent</option>
            </select>

            <label htmlFor="feedback">Feedback</label>
            <textarea
              id="feedback"
              name="feedback"
              placeholder="Enter performance feedback"
              value={form.feedback}
              onChange={handleChange}
              maxLength={1000}
              rows={4}
              required
            />

            <button type="submit">Save Review</button>
          </form>
        </section>
      )}

      <section className="performance-card">
        <h2>{isManager ? "Performance History" : "My Performance Reviews"}</h2>

        {reviews.length === 0 ? (
          <p>No performance reviews found.</p>
        ) : (
          <div className="performance-table-wrapper">
            <table className="performance-table">
              <thead>
                <tr>
                  {isManager && <th>Employee ID</th>}
                  <th>Review Period</th>
                  <th>Rating</th>
                  <th>Feedback</th>
                  <th>Created At</th>
                </tr>
              </thead>
              <tbody>
                {reviews.map((review) => (
                  <tr key={review.id}>
                    {isManager && <td>{review.employee_id}</td>}
                    <td>{review.review_period}</td>
                    <td>{review.rating} / 5</td>
                    <td>{review.feedback}</td>
                    <td>
                      {new Date(review.created_at).toLocaleDateString()}
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
