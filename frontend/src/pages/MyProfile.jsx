
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../api";
import "../styles/MyProfile.css";

export default function MyProfile() {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function fetchProfile() {
      try {
        const response = await api.get("/employees/me");
        setProfile(response.data);
      } catch (err) {
        setError(
          err.response?.data?.detail ||
            "Unable to load your profile. Please try again."
        );
      } finally {
        setLoading(false);
      }
    }

    fetchProfile();
  }, []);

  if (loading) {
    return <div className="my-profile-page">Loading your profile...</div>;
  }

  if (error) {
    return (
      <div className="my-profile-page">
        <p className="profile-error">{error}</p>
        <Link to="/employee" className="profile-back-link">
          Back to Dashboard
        </Link>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="my-profile-page">
        <p>No employee profile was found for your account.</p>
        <Link to="/employee" className="profile-back-link">
          Back to Dashboard
        </Link>
      </div>
    );
  }

  return (
    <main className="my-profile-page">
      <header className="my-profile-header">
        <div>
          <p className="profile-eyebrow">WORKSPHERE HRMS</p>
          <h1>My Profile</h1>
          <p>View your personal and employment details.</p>
        </div>

        <Link to="/employee" className="profile-back-link">
          Back to Dashboard
        </Link>
      </header>

      <section className="profile-card">
        <div className="profile-avatar">
          {profile.full_name?.charAt(0)?.toUpperCase() || "E"}
        </div>

        <h2>{profile.full_name || "Employee"}</h2>
        <p className="profile-designation">
          {profile.designation || "Designation not available"}
        </p>
        <span className="profile-status">
          {profile.status || "Status unavailable"}
        </span>

        <div className="profile-details">
          <div className="profile-detail">
            <span>Employee ID</span>
            <strong>{profile.id ?? "—"}</strong>
          </div>

          <div className="profile-detail">
            <span>User Account ID</span>
            <strong>{profile.user_id ?? "—"}</strong>
          </div>

          <div className="profile-detail">
            <span>Full Name</span>
            <strong>{profile.full_name || "—"}</strong>
          </div>

          <div className="profile-detail">
            <span>Designation</span>
            <strong>{profile.designation || "—"}</strong>
          </div>

          <div className="profile-detail">
            <span>Department</span>
            <strong>{profile.department || "—"}</strong>
          </div>

          <div className="profile-detail">
            <span>Joining Date</span>
            <strong>{profile.joining_date || "—"}</strong>
          </div>

          <div className="profile-detail">
            <span>Employment Status</span>
            <strong>{profile.status || "—"}</strong>
          </div>
        </div>
      </section>
    </main>
  );
}
