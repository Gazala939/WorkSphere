
import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import api from "../api";
import "../styles/EmployeeForm.css";

export default function EditEmployee() {
  const { employeeId } = useParams();
  const navigate = useNavigate();

  const [form, setForm] = useState({
    full_name: "",
    designation: "",
    department: "",
    joining_date: "",
    salary: "",
    status: "ACTIVE",
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    async function loadEmployee() {
      try {
        const response = await api.get(`/employees/${employeeId}`);
        const employee = response.data;

        if (active) {
          setForm({
            full_name: employee.full_name || "",
            designation: employee.designation || "",
            department: employee.department || "",
            joining_date: employee.joining_date || "",
            salary: String(employee.salary ?? ""),
            status: employee.status || "ACTIVE",
          });
        }
      } catch (err) {
        if (active) {
          setError(
            err.response?.data?.detail ||
              "Unable to load employee details."
          );
        }
      } finally {
        if (active) setLoading(false);
      }
    }

    loadEmployee();

    return () => {
      active = false;
    };
  }, [employeeId]);

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
    setSaving(true);

    const payload = {
      full_name: form.full_name.trim(),
      designation: form.designation.trim(),
      department: form.department.trim(),
      joining_date: form.joining_date,
      salary: Number(form.salary),
      status: form.status,
    };

    try {
      await api.put(`/employees/${employeeId}`, payload);
      alert("Employee updated successfully!");
      navigate("/employees");
    } catch (err) {
      const detail = err.response?.data?.detail;

      setError(
        typeof detail === "string"
          ? detail
          : Array.isArray(detail)
            ? detail.map((item) => item.msg).join(", ")
            : "Unable to update employee. Please check the details."
      );
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <main className="employee-form-page">Loading employee details...</main>;
  }

  return (
    <main className="employee-form-page">
      <div className="employee-form-header">
        <div>
          <h1>Edit Employee</h1>
          <p>Update the employee's information.</p>
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
        {error && <div className="employee-form-error">{error}</div>}

        <div className="employee-form-grid">
          <div className="employee-form-field">
            <label htmlFor="full_name">Full Name</label>
            <input
              id="full_name"
              name="full_name"
              value={form.full_name}
              onChange={handleChange}
              minLength="2"
              maxLength="100"
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
              minLength="2"
              maxLength="100"
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
              minLength="2"
              maxLength="100"
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
            disabled={saving}
          >
            Cancel
          </button>

          <button
            type="submit"
            className="employee-form-submit"
            disabled={saving}
          >
            {saving ? "Updating..." : "Update Employee"}
          </button>
        </div>
      </form>
    </main>
  );
}
