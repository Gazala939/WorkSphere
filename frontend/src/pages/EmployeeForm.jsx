
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api";
import "../styles/EmployeeForm.css";

export default function EmployeeForm() {
  const navigate = useNavigate();

  const [form, setForm] = useState({
    username: "",
    email: "",
    password: "",
    full_name: "",
    designation: "",
    department: "",
    joining_date: "",
    salary: "",
    status: "ACTIVE",
  });

  const [loading, setLoading] = useState(false);
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
    setError("");
    setLoading(true);

    const payload = {
      username: form.username.trim(),
      email: form.email.trim(),
      password: form.password,
      full_name: form.full_name.trim(),
      designation: form.designation.trim(),
      department: form.department.trim(),
      joining_date: form.joining_date,
      salary: Number(form.salary),
      status: form.status,
    };

    try {
      await api.post("/employees/with-account", payload);

      alert("User account and employee profile created successfully!");
      navigate("/employees");
    } catch (err) {
      const detail = err.response?.data?.detail;

      setError(
        typeof detail === "string"
          ? detail
          : Array.isArray(detail)
            ? detail.map((item) => item.msg).join(", ")
            : "Unable to add employee. Please check the entered details."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="employee-form-page">
      <div className="employee-form-header">
        <div>
          <h1>Add Employee</h1>
          <p>Create the employee's login account and profile.</p>
        </div>

        <button
          type="button"
          className="employee-form-back"
          onClick={() => navigate("/employees")}
        >
          Back to Employees
        </button>
      </div>

      <form className="employee-form" onSubmit={handleSubmit}>
        {error && (
          <div className="employee-form-error">{error}</div>
        )}

        <h2>Login Account Details</h2>

        <div className="employee-form-grid">
          <div className="employee-form-field">
            <label htmlFor="username">Username</label>
            <input
              id="username"
              name="username"
              value={form.username}
              onChange={handleChange}
              minLength={3}
              maxLength={50}
              autoComplete="username"
              placeholder="Enter username"
              required
            />
          </div>

          <div className="employee-form-field">
            <label htmlFor="email">Email</label>
            <input
              id="email"
              name="email"
              type="email"
              value={form.email}
              onChange={handleChange}
              autoComplete="email"
              placeholder="employee@example.com"
              required
            />
          </div>

          <div className="employee-form-field">
            <label htmlFor="password">Temporary Password</label>
            <input
              id="password"
              name="password"
              type="password"
              value={form.password}
              onChange={handleChange}
              minLength={8}
              maxLength={128}
              autoComplete="new-password"
              placeholder="At least 8 characters"
              required
            />
            <small>
              The employee can use this password to log in.
            </small>
          </div>
        </div>

        <h2>Employee Details</h2>

        <div className="employee-form-grid">
          <div className="employee-form-field">
            <label htmlFor="full_name">Full Name</label>
            <input
              id="full_name"
              name="full_name"
              value={form.full_name}
              onChange={handleChange}
              minLength={2}
              maxLength={100}
              placeholder="Enter full name"
              required
            />
          </div>

          <div className="employee-form-field">
            <label htmlFor="designation">Designation</label>
            <input
              id="designation"
              name="designation"
              value={form.designation}
              onChange={handleChange}
              minLength={2}
              maxLength={100}
              placeholder="e.g. Software Developer"
              required
            />
          </div>

          <div className="employee-form-field">
            <label htmlFor="department">Department</label>
            <input
              id="department"
              name="department"
              value={form.department}
              onChange={handleChange}
              minLength={2}
              maxLength={100}
              placeholder="e.g. IT, HR, Finance"
              required
            />
          </div>

          <div className="employee-form-field">
            <label htmlFor="joining_date">Joining Date</label>
            <input
              id="joining_date"
              name="joining_date"
              type="date"
              value={form.joining_date}
              onChange={handleChange}
              required
            />
          </div>

          <div className="employee-form-field">
            <label htmlFor="salary">Salary (₹)</label>
            <input
              id="salary"
              name="salary"
              type="number"
              min="0"
              step="0.01"
              value={form.salary}
              onChange={handleChange}
              placeholder="Enter salary"
              required
            />
          </div>

          <div className="employee-form-field">
            <label htmlFor="status">Employment Status</label>
            <select
              id="status"
              name="status"
              value={form.status}
              onChange={handleChange}
              required
            >
              <option value="ACTIVE">ACTIVE</option>
              <option value="INACTIVE">INACTIVE</option>
            </select>
          </div>
        </div>

        <div className="employee-form-actions">
          <button
            type="button"
            className="employee-form-cancel"
            onClick={() => navigate("/employees")}
            disabled={loading}
          >
            Cancel
          </button>

          <button
            type="submit"
            className="employee-form-submit"
            disabled={loading}
          >
            {loading ? "Saving..." : "Save Employee"}
          </button>
        </div>
      </form>
    </main>
  );
}
