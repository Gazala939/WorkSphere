
import { useEffect, useState } from "react";
import { useAuth } from "../auth/AuthContext";
import api from "../api";
import "../styles/Tasks.css";

export default function Tasks() {
  const { user } = useAuth();

  const isManager = ["ADMIN", "HR"].includes(user?.role);

  const [tasks, setTasks] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [form, setForm] = useState({
    assigned_to: "",
    title: "",
    description: "",
    due_date: "",
  });

  const loadTasks = async () => {
    try {
      setLoading(true);
      setError("");
      const response = await api.get("/tasks");
      setTasks(response.data);
    } catch (err) {
      setError(err.response?.data?.detail || "Unable to load tasks.");
    } finally {
      setLoading(false);
    }
  };

  const loadEmployees = async () => {
    try {
      const response = await api.get("/employees");
      const data = response.data;
      setEmployees(Array.isArray(data) ? data : data.items || []);
    } catch (err) {
      setError(err.response?.data?.detail || "Unable to load employees.");
    }
  };

  useEffect(() => {
    loadTasks();

    if (isManager) {
      loadEmployees();
    }
  }, [isManager]);

  const updateForm = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const createTask = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    try {
      await api.post("/tasks", {
        assigned_to: Number(form.assigned_to),
        title: form.title.trim(),
        description: form.description.trim(),
        due_date: form.due_date,
      });

      setForm({
        assigned_to: "",
        title: "",
        description: "",
        due_date: "",
      });

      setShowForm(false);
      setSuccess("Task assigned successfully.");
      await loadTasks();
    } catch (err) {
      setError(err.response?.data?.detail || "Unable to assign task.");
    }
  };

  const completeTask = async (taskId) => {
    setError("");
    setSuccess("");

    try {
      await api.patch(`/tasks/${taskId}/status`, {
        status: "COMPLETED",
      });

      setSuccess("Task status updated successfully.");
      await loadTasks();
    } catch (err) {
      setError(err.response?.data?.detail || "Unable to update task.");
    }
  };

  const pendingCount = tasks.filter(
    (task) => task.status === "PENDING"
  ).length;

  const completedCount = tasks.filter(
    (task) => task.status === "COMPLETED"
  ).length;

  return (
    <main className="tasks-page">
      <header className="tasks-header">
        <div>
          <p className="tasks-eyebrow">WORKSPHERE HRMS</p>
          <h1>Task Dashboard</h1>
          <p>Assign tasks, manage deadlines, and track progress.</p>
        </div>

        <div className="tasks-header-actions">
          <button
            className="task-secondary-btn"
            onClick={loadTasks}
            disabled={loading}
          >
            Refresh
          </button>

          {isManager && (
            <button
              className="task-primary-btn"
              onClick={() => setShowForm(!showForm)}
            >
              {showForm ? "Cancel" : "+ Assign Task"}
            </button>
          )}
        </div>
      </header>

      {error && <p className="task-message task-error">{error}</p>}
      {success && <p className="task-message task-success">{success}</p>}

      <section className="task-stats">
        <article className="task-stat-card">
          <span>Total Tasks</span>
          <strong>{tasks.length}</strong>
        </article>

        <article className="task-stat-card">
          <span>Pending Tasks</span>
          <strong>{pendingCount}</strong>
        </article>

        <article className="task-stat-card">
          <span>Completed Tasks</span>
          <strong>{completedCount}</strong>
        </article>
      </section>

      {isManager && showForm && (
        <form className="task-form" onSubmit={createTask}>
          <h2>Assign a New Task</h2>

          <label htmlFor="assigned_to">Select Employee</label>
          <select
            id="assigned_to"
            name="assigned_to"
            value={form.assigned_to}
            onChange={updateForm}
            required
          >
            <option value="">Choose an employee</option>
            {employees.map((employee) => (
              <option key={employee.id} value={employee.id}>
                {employee.full_name || employee.name || `Employee ${employee.id}`}
                {" "} (ID: {employee.id})
              </option>
            ))}
          </select>

          <label htmlFor="task-title">Task Title</label>
          <input
            id="task-title"
            name="title"
            value={form.title}
            onChange={updateForm}
            placeholder="Enter task title"
            maxLength={200}
            required
          />

          <label htmlFor="task-description">Description</label>
          <textarea
            id="task-description"
            name="description"
            value={form.description}
            onChange={updateForm}
            placeholder="Describe what needs to be done"
            rows={4}
            required
          />

          <label htmlFor="task-due-date">Due Date</label>
          <input
            id="task-due-date"
            type="date"
            name="due_date"
            value={form.due_date}
            onChange={updateForm}
            required
          />

          <button className="task-primary-btn" type="submit">
            Assign Task
          </button>
        </form>
      )}

      <section className="task-list-section">
        <div className="task-list-heading">
          <div>
            <h2>{isManager ? "All Assigned Tasks" : "My Tasks"}</h2>
            <p>Review task details and current progress.</p>
          </div>
          <span>{tasks.length} tasks</span>
        </div>

        {loading && <p>Loading tasks...</p>}

        {!loading && tasks.length === 0 && (
          <div className="task-empty">
            <h3>No tasks found</h3>
            <p>Tasks will appear here when they are assigned.</p>
          </div>
        )}

        <div className="task-list">
          {tasks.map((task) => (
            <article className="task-card" key={task.id}>
              <div className="task-card-top">
                <div>
                  <span className="task-id">TASK #{task.id}</span>
                  <h3>{task.title}</h3>
                </div>

                <span
                  className={`task-status ${
                    task.status === "COMPLETED"
                      ? "task-status-completed"
                      : "task-status-pending"
                  }`}
                >
                  {task.status}
                </span>
              </div>

              <p className="task-description">{task.description}</p>

              <div className="task-meta">
                {isManager && (
                  <span>Employee ID: {task.assigned_to}</span>
                )}
                <span>
                  Due: {new Date(`${task.due_date}T00:00:00`).toLocaleDateString()}
                </span>
              </div>

              {task.status === "PENDING" && (
                <button
                  className="task-complete-btn"
                  onClick={() => completeTask(task.id)}
                >
                  Mark as Completed
                </button>
              )}
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
