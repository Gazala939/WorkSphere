
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import api from "../api";
import "../styles/Announcements.css";

export default function Announcements() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const canCreate =
    user?.role === "ADMIN" || user?.role === "HR";

  const [announcements, setAnnouncements] = useState([]);
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const loadAnnouncements = async () => {
    try {
      setLoading(true);
      setError("");

      const response = await api.get("/announcements");
      setAnnouncements(response.data);
    } catch (err) {
      setError(
        err.response?.data?.detail ||
        "Unable to load announcements."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAnnouncements();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!title.trim() || !message.trim()) {
      setError("Please enter both title and message.");
      return;
    }

    try {
      setLoading(true);

      await api.post("/announcements", {
        title: title.trim(),
        message: message.trim(),
      });

      setTitle("");
      setMessage("");
      setShowForm(false);
      setSuccess("Announcement published successfully.");

      await loadAnnouncements();
    } catch (err) {
      setError(
        err.response?.data?.detail ||
        "Unable to publish announcement."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="announcements-page">
      <header className="announcements-header">
        <div>
          <h1>WORKSPHERE HRMS</h1>
          <h2>Announcement Board</h2>
          <p>Stay updated with the latest company news.</p>
        </div>

        <div className="announcement-actions">
          <button
            type="button"
            className="announcement-refresh"
            onClick={loadAnnouncements}
            disabled={loading}
          >
            Refresh
          </button>

          {canCreate && (
            <button
              type="button"
              className="announcement-create"
              onClick={() => {
                setShowForm(!showForm);
                setError("");
                setSuccess("");
              }}
            >
              {showForm ? "Cancel" : "+ Create Announcement"}
            </button>
          )}
        </div>
      </header>

      {error && <p className="announcement-error">{error}</p>}
      {success && <p className="announcement-success">{success}</p>}

      {canCreate && showForm && (
        <form
          className="announcement-form"
          onSubmit={handleSubmit}
        >
          <h2>Create Announcement</h2>

          <label htmlFor="announcement-title">Title</label>
          <input
            id="announcement-title"
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Enter announcement title"
            maxLength={200}
            required
          />

          <label htmlFor="announcement-message">Message</label>
          <textarea
            id="announcement-message"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Write the announcement here..."
            rows={5}
            maxLength={10000}
            required
          />

          <button
            type="submit"
            className="announcement-create"
            disabled={loading}
          >
            {loading ? "Publishing..." : "Publish Announcement"}
          </button>
        </form>
      )}

      {loading && announcements.length === 0 && (
        <p>Loading announcements...</p>
      )}

      {!loading && announcements.length === 0 && !error && (
        <p>No announcements available yet.</p>
      )}

      <section className="announcements-grid">
        {announcements.map((item) => (
          <article className="announcement-card" key={item.id}>
            <span className="announcement-label">
              COMPANY UPDATE ↗
            </span>

            <h3>{item.title}</h3>
            <p>{item.message}</p>

            <small>
              {item.created_at
                ? new Date(item.created_at).toLocaleDateString()
                : ""}
            </small>

            <button
              type="button"
              className="announcement-read"
              onClick={() => navigate(`/announcements/${item.id}`)}
            >
              Read announcement →
            </button>
          </article>
        ))}
      </section>
    </main>
  );
}
