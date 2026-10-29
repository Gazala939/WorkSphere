
import { useEffect, useState } from "react";
import api from "../api";
import "../styles/Onboarding.css";

export default function OnboardingManagement() {
  const [employees, setEmployees] = useState([]);
  const [tasks, setTasks] = useState([]);

  const [form, setForm] = useState({
    employee_id: "",
    task_name: "",
    due_date: "",
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const loadData = async () => {
    setLoading(true);
    setError("");

    try {
      // Load employee records
      const employeeResponse = await api.get("/employees");
      const employeeData = employeeResponse.data;

      setEmployees(
        Array.isArray(employeeData)
          ? employeeData
          : employeeData.items || []
      );

      // Load all onboarding tasks (HR/ADMIN endpoint)
      const taskResponse = await api.get("/onboarding");
      setTasks(taskResponse.data);
    } catch (err) {
      setError(
        err.response?.data?.detail ||
          "Unable to load onboarding data."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleChange = (event) => {
    setForm({
      ...form,
      [event.target.name]: event.target.value,
    });
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    setMessage("");
    setError("");

    if (!form.employee_id || !form.task_name.trim() || !form.due_date) {
      setError("Please fill in all fields.");
      return;
    }

    setSaving(true);

    try {
      await api.post("/onboarding", {
        employee_id: Number(form.employee_id),
        task_name: form.task_name.trim(),
        due_date: form.due_date,
      });

      setMessage("Onboarding task assigned successfully!");

      setForm({
        employee_id: "",
        task_name: "",
        due_date: "",
      });

      await loadData();
    } catch (err) {
      setError(
        err.response?.data?.detail ||
          "Unable to assign onboarding task."
      );
    } finally {
      setSaving(false);
    }
  };

  const handleStatusChange = async (taskId, status) => {
    setError("");
    setMessage("");

    try {
      await api.patch(`/onboarding/${taskId}/status`, {
        status,
      });

      setMessage("Task status updated successfully.");
      await loadData();
    } catch (err) {
      setError(
        err.response?.data?.detail ||
          "Unable to update task status."
      );
    }
  };

  const completedTasks = tasks.filter(
    (task) => task.status === "COMPLETED"
  ).length;

  const pendingTasks = tasks.filter(
    (task) => task.status === "PENDING"
  ).length;

  return (
    <div className="onboarding-page">
      <div className="onboarding-header">
        <div>
          <span className="onboarding-label">
            HR MANAGEMENT
          </span>
          <h1>Onboarding Management</h1>
          <p>
            Assign onboarding tasks and track employee progress.
          </p>
        </div>

        <button
          type="button"
          className="onboarding-refresh"
          onClick={loadData}
        >
          Refresh
        </button>
      </div>

      {message && (
        <div className="onboarding-message">
          {message}
        </div>
      )}

      {error && (
        <div className="onboarding-error">
          {error}
        </div>
      )}

      <div className="onboarding-stats">
        <div className="onboarding-stat-card">
          <span>Total Tasks</span>
          <strong>{tasks.length}</strong>
        </div>

        <div className="onboarding-stat-card">
          <span>Pending</span>
          <strong>{pendingTasks}</strong>
        </div>

        <div className="onboarding-stat-card">
          <span>Completed</span>
          <strong>{completedTasks}</strong>
        </div>
      </div>

      <section className="onboarding-panel">
        <h2>Assign a New Task</h2>

        <form
          className="onboarding-form"
          onSubmit={handleSubmit}
        >
          <label>
            Employee
            <select
              name="employee_id"
              value={form.employee_id}
              onChange={handleChange}
              required
            >
              <option value="">Select employee</option>

              {employees.map((employee) => (
                <option
                  key={employee.id}
                  value={employee.id}
                >
                  {employee.full_name || `Employee ${employee.id}`}
                  {" "} (ID: {employee.id})
                </option>
              ))}
            </select>
          </label>

          <label>
            Task Name
            <input
              type="text"
              name="task_name"
              value={form.task_name}
              onChange={handleChange}
              placeholder="e.g. Complete HR orientation"
              required
            />
          </label>

          <label>
            Due Date
            <input
              type="date"
              name="due_date"
              value={form.due_date}
              onChange={handleChange}
              required
            />
          </label>

          <button
            type="submit"
            className="onboarding-submit"
            disabled={saving}
          >
            {saving ? "Assigning..." : "Assign Task"}
          </button>
        </form>
      </section>

      <section className="onboarding-panel">
        <h2>Employee Onboarding Tasks</h2>

        {loading ? (
          <p>Loading onboarding tasks...</p>
        ) : tasks.length === 0 ? (
          <p>No onboarding tasks found.</p>
        ) : (
          <div className="onboarding-table-wrapper">
            <table className="onboarding-table">
              <thead>
                <tr>
                  <th>Task ID</th>
                  <th>Employee ID</th>
                  <th>Task Name</th>
                  <th>Due Date</th>
                  <th>Status</th>
                  <th>Update Status</th>
                </tr>
              </thead>

              <tbody>
                {tasks.map((task) => (
                  <tr key={task.id}>
                    <td>{task.id}</td>
                    <td>{task.employee_id}</td>
                    <td>{task.task_name}</td>
                    <td>{task.due_date || "—"}</td>
                    <td>
                      <span
                        className={`onboarding-status ${
                          task.status === "COMPLETED"
                            ? "completed"
                            : "pending"
                        }`}
                      >
                        {task.status}
                      </span>
                    </td>
                    <td>
                      <select
                        value={task.status}
                        onChange={(event) =>
                          handleStatusChange(
                            task.id,
                            event.target.value
                          )
                        }
                      >
                        <option value="PENDING">
                          PENDING
                        </option>
                        <option value="COMPLETED">
                          COMPLETED
                        </option>
                      </select>
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
