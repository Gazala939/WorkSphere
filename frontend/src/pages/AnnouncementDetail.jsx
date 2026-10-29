
import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import api from "../api";
import "../styles/AnnouncementDetail.css";

export default function AnnouncementDetail() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [announcement, setAnnouncement] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const loadAnnouncement = async () => {
      try {
        const response = await api.get(`/announcements/${id}`);
        setAnnouncement(response.data);
      } catch (err) {
        setError(
          err.response?.data?.detail ||
            "Unable to load this announcement."
        );
      } finally {
        setLoading(false);
      }
    };

    loadAnnouncement();
  }, [id]);

  if (loading) {
    return <div className="announcement-detail-page">Loading...</div>;
  }

  if (error || !announcement) {
    return (
      <div className="announcement-detail-page">
        <p className="announcement-detail-error">
          {error || "Announcement not found."}
        </p>
        <button onClick={() => navigate("/announcements")}>
          Back to announcements
        </button>
      </div>
    );
  }

  return (
    <div className="announcement-detail-page">
      <button
        className="announcement-back"
        onClick={() => navigate("/announcements")}
      >
        ← Back to announcements
      </button>

      <article className="announcement-detail-card">
        <span className="announcement-label">COMPANY UPDATE</span>

        <h1>{announcement.title}</h1>

        <p className="announcement-detail-date">
          Published on{" "}
          {new Date(announcement.created_at).toLocaleString()}
        </p>

        <div className="announcement-detail-message">
          {announcement.message}
        </div>
      </article>
    </div>
  );
}
