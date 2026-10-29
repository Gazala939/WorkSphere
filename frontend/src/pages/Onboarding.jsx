
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../api";
import "../styles/Onboarding.css";

export default function Onboarding() {
  const [tasks, setTasks] = useState([]);
  const [progress, setProgress] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [updatingId, setUpdatingId] = useState(null);

  async function loadOnboarding() {
    try {
      setError("");

      const [tasksResponse, progressResponse] = await Promise.all([
        api.get("/onboarding/me"),
        api.get("/onboarding/me/progress"),
      ]);

      setTasks(tasksResponse.data);
      setProgress(progressResponse.data);
    } catch (err) {
      setError(
        err.response?.data?.detail ||
          "Unable to load onboarding tasks."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadOnboarding();
  }, []);

  async function markCompleted(taskId) {
    try {
      setUpdatingId(taskId);
      setError("");

      await api.patch(`/onboarding/${taskId}/status`, {
        status: "COMPLETED",
      });

      await loadOnboarding();
    } catch (err) {
      setError(
        err.response?.data?.detail ||
          "Unable to update the task."
      );
    } finally {
      setUpdatingId(null);
    }
  }

  if (loading) {
    return <div className="onboarding-page">Loading onboarding...</div>;
  }

  return (
    <div className="onboarding-page">
      <header className="onboarding-header">
        <div>
          <h1>Employee Onboarding</h1>
          <p>Complete your assigned tasks to finish onboarding.</p>
        </div>

        <Link to="/dashboard" className="onboarding-back">
          Back to Dashboard
        </Link>
      </header>

      {error && <div className="onboarding-error">{error}</div>}

      {progress && (
        <section className="onboarding-progress-card">
          <div className="onboarding-progress-heading">
            <div>
              <h2>Your Progress</h2>
              <p>Keep going and complete your remaining tasks.</p>
            </div>

            <strong>{progress.progress_percentage}%</strong>
          </div>

          <div
            className="onboarding-progress-track"
            role="progressbar"
            aria-valuenow={progress.progress_percentage}
            aria-valuemin="0"
            aria-valuemax="100"
          >
            <div
              className="onboarding-progress-fill"
              style={{
                width: `${progress.progress_percentage}%`,
              }}
            />
          </div>

          <div className="onboarding-stats">
            <div>
              <span>Total Tasks</span>
              <strong>{progress.total_tasks}</strong>
            </div>

            <div>
              <span>Completed</span>
              <strong>{progress.completed_tasks}</strong>
            </div>

            <div>
              <span>Pending</span>
              <strong>{progress.pending_tasks}</strong>
            </div>
          </div>
        </section>
      )}

      <section className="onboarding-task-section">
        <h2>My Onboarding Checklist</h2>

        {tasks.length === 0 ? (
          <div className="onboarding-empty">
            <h3>No onboarding tasks yet</h3>
            <p>Your HR team has not assigned any tasks.</p>
          </div>
        ) : (
          <div className="onboarding-task-list">
            {tasks.map((task) => (
              <article className="onboarding-task-card" key={task.id}>
                <div className="onboarding-task-info">
                  <h3>{task.task_name}</h3>

                  <p>
                    Due date:{" "}
                    {new Date(
                      `${task.due_date}T00:00:00`
                    ).toLocaleDateString("en-IN")}
                  </p>
                </div>

                <div className="onboarding-task-actions">
                  <span
                    className={`onboarding-status ${
                      task.status === "COMPLETED"
                        ? "completed"
                        : "pending"
                    }`}
                  >
                    {task.status}
                  </span>

                  {task.status === "PENDING" && (
                    <button
                      className="onboarding-complete-btn"
                      onClick={() => markCompleted(task.id)}
                      disabled={updatingId !== null}
                    >
                      {updatingId === task.id
                        ? "Updating..."
                        : "Mark Completed"}
                    </button>
                  )}
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
