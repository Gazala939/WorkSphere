
import { useEffect, useState } from "react";
import api from "../api";
import { useAuth } from "../auth/AuthContext";
import "../styles/ProfileSettings.css";

const defaultPreferences = {
  attendance_alerts: true,
  leave_updates: true,
  announcements: true,
  task_updates: true,
};

export default function ProfileSettings() {
  const { user } = useAuth();

  const [profile, setProfile] = useState({
    username: "",
    email: "",
    full_name: "",
    role: "",
    designation: "",
    department: "",
  });

  const [preferences, setPreferences] = useState(defaultPreferences);

  const [passwords, setPasswords] = useState({
    current_password: "",
    new_password: "",
  });

  const [loading, setLoading] = useState(true);
  const [profileSaving, setProfileSaving] = useState(false);
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [preferencesSaving, setPreferencesSaving] = useState(false);

  const [profileMessage, setProfileMessage] = useState("");
  const [passwordMessage, setPasswordMessage] = useState("");
  const [preferencesMessage, setPreferencesMessage] = useState("");

  const [profileError, setProfileError] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [preferencesError, setPreferencesError] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function loadSettings() {
      setLoading(true);

      try {
        const [profileResponse, preferencesResponse] =
          await Promise.all([
            api.get("/profile"),
            api.get("/settings/notifications"),
          ]);

        if (cancelled) return;

        setProfile({
          username: profileResponse.data.username ?? "",
          email: profileResponse.data.email ?? "",
          full_name: profileResponse.data.full_name ?? "",
          role: profileResponse.data.role ?? "",
          designation: profileResponse.data.designation ?? "",
          department: profileResponse.data.department ?? "",
        });

        setPreferences({
          ...defaultPreferences,
          ...preferencesResponse.data,
        });
      } catch (error) {
        if (!cancelled) {
          setProfileError(
            error.response?.data?.detail ||
              "Unable to load profile settings."
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadSettings();

    return () => {
      cancelled = true;
    };
  }, []);

  function handleProfileChange(event) {
    const { name, value } = event.target;

    setProfile((previous) => ({
      ...previous,
      [name]: value,
    }));
  }

  function handlePasswordChange(event) {
    const { name, value } = event.target;

    setPasswords((previous) => ({
      ...previous,
      [name]: value,
    }));
  }

  function handlePreferenceChange(event) {
    const { name, checked } = event.target;

    setPreferences((previous) => ({
      ...previous,
      [name]: checked,
    }));
  }

  async function saveProfile(event) {
    event.preventDefault();

    setProfileMessage("");
    setProfileError("");
    setProfileSaving(true);

    try {
      const response = await api.patch("/profile", {
        username: profile.username.trim(),
        email: profile.email.trim(),
        full_name: profile.full_name.trim(),
      });

      setProfile((previous) => ({
        ...previous,
        ...response.data,
      }));

      setProfileMessage("Profile updated successfully.");
    } catch (error) {
      setProfileError(
        error.response?.data?.detail ||
          "Unable to update profile."
      );
    } finally {
      setProfileSaving(false);
    }
  }

  async function changePassword(event) {
    event.preventDefault();

    setPasswordMessage("");
    setPasswordError("");

    if (passwords.new_password.length < 8) {
      setPasswordError(
        "Your new password must contain at least 8 characters."
      );
      return;
    }

    if (passwords.current_password === passwords.new_password) {
      setPasswordError(
        "Your new password must differ from your current password."
      );
      return;
    }

    setPasswordSaving(true);

    try {
      const response = await api.post(
        "/profile/change-password",
        passwords
      );

      setPasswordMessage(
        response.data.message || "Password changed successfully."
      );

      setPasswords({
        current_password: "",
        new_password: "",
      });
    } catch (error) {
      setPasswordError(
        error.response?.data?.detail ||
          "Unable to change password."
      );
    } finally {
      setPasswordSaving(false);
    }
  }

  async function savePreferences(event) {
    event.preventDefault();

    setPreferencesMessage("");
    setPreferencesError("");
    setPreferencesSaving(true);

    try {
      const response = await api.put(
        "/settings/notifications",
        {
          attendance_alerts: preferences.attendance_alerts,
          leave_updates: preferences.leave_updates,
          announcements: preferences.announcements,
          task_updates: preferences.task_updates,
        }
      );

      setPreferences({
        ...defaultPreferences,
        ...response.data,
      });

      setPreferencesMessage(
        "Notification preferences saved successfully."
      );
    } catch (error) {
      setPreferencesError(
        error.response?.data?.detail ||
          "Unable to save notification preferences."
      );
    } finally {
      setPreferencesSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="profile-settings-page">
        <div className="profile-settings-loading">
          Loading profile settings...
        </div>
      </div>
    );
  }

  return (
    <div className="profile-settings-page">
      <div className="profile-settings-header">
        <div>
          <p className="profile-settings-eyebrow">
            ACCOUNT MANAGEMENT
          </p>

          <h1>Profile & Settings</h1>

          <p className="profile-settings-subtitle">
            Manage your personal information, password,
            and notification preferences.
          </p>
        </div>

        <div className="profile-avatar">
          {(profile.full_name || profile.username || "U")
            .charAt(0)
            .toUpperCase()}
        </div>
      </div>

      <div className="profile-settings-grid">
        <section className="profile-settings-card">
          <div className="settings-card-heading">
            <div className="settings-heading-icon">👤</div>
            <div>
              <h2>Personal Information</h2>
              <p>Update your account details.</p>
            </div>
          </div>

          <div className="profile-role-row">
            <span>Account role</span>
            <span className="profile-role-badge">
              {profile.role || user?.role || "USER"}
            </span>
          </div>

          {profileError && (
            <div className="settings-message settings-error">
              {profileError}
            </div>
          )}

          <form onSubmit={saveProfile}>
            <div className="settings-field">
              <label htmlFor="full_name">Full name</label>
              <input
                id="full_name"
                name="full_name"
                value={profile.full_name}
                onChange={handleProfileChange}
                minLength={2}
                maxLength={100}
                required
              />
            </div>

            <div className="settings-field">
              <label htmlFor="username">Username</label>
              <input
                id="username"
                name="username"
                value={profile.username}
                onChange={handleProfileChange}
                minLength={3}
                maxLength={50}
                required
              />
            </div>

            <div className="settings-field">
              <label htmlFor="email">Email address</label>
              <input
                id="email"
                name="email"
                type="email"
                value={profile.email}
                onChange={handleProfileChange}
                maxLength={255}
                required
              />
            </div>

            <div className="settings-readonly-fields">
              <div>
                <span>Designation</span>
                <strong>{profile.designation || "Not provided"}</strong>
              </div>

              <div>
                <span>Department</span>
                <strong>{profile.department || "Not provided"}</strong>
              </div>
            </div>

            {profileMessage && (
              <div className="settings-message settings-success">
                {profileMessage}
              </div>
            )}

            <button
              className="settings-primary-button"
              type="submit"
              disabled={profileSaving}
            >
              {profileSaving ? "Saving..." : "Save Profile"}
            </button>
          </form>
        </section>

        <section className="profile-settings-card">
          <div className="settings-card-heading">
            <div className="settings-heading-icon">🔒</div>
            <div>
              <h2>Change Password</h2>
              <p>Keep your account secure.</p>
            </div>
          </div>

          <form onSubmit={changePassword}>
            <div className="settings-field">
              <label htmlFor="current_password">
                Current password
              </label>
              <input
                id="current_password"
                name="current_password"
                type="password"
                autoComplete="current-password"
                value={passwords.current_password}
                onChange={handlePasswordChange}
                maxLength={128}
                required
              />
            </div>

            <div className="settings-field">
              <label htmlFor="new_password">New password</label>
              <input
                id="new_password"
                name="new_password"
                type="password"
                autoComplete="new-password"
                value={passwords.new_password}
                onChange={handlePasswordChange}
                minLength={8}
                maxLength={128}
                required
              />
              <small>
                Use at least 8 characters.
              </small>
            </div>

            {passwordError && (
              <div className="settings-message settings-error">
                {passwordError}
              </div>
            )}

            {passwordMessage && (
              <div className="settings-message settings-success">
                {passwordMessage}
              </div>
            )}

            <button
              className="settings-primary-button"
              type="submit"
              disabled={passwordSaving}
            >
              {passwordSaving ? "Updating..." : "Update Password"}
            </button>
          </form>
        </section>

        <section className="profile-settings-card preferences-card">
          <div className="settings-card-heading">
            <div className="settings-heading-icon">🔔</div>
            <div>
              <h2>Notification Preferences</h2>
              <p>Choose the notification categories you prefer.</p>
            </div>
          </div>

          <form onSubmit={savePreferences}>
            {[
              {
                key: "attendance_alerts",
                title: "Attendance alerts",
                description: "Attendance and absence notifications.",
              },
              {
                key: "leave_updates",
                title: "Leave updates",
                description: "Updates about leave requests.",
              },
              {
                key: "announcements",
                title: "Announcements",
                description: "Internal company announcements.",
              },
              {
                key: "task_updates",
                title: "Task updates",
                description: "Assigned tasks and task reminders.",
              },
            ].map((item) => (
              <label
                className="preference-row"
                key={item.key}
              >
                <span className="preference-copy">
                  <strong>{item.title}</strong>
                  <small>{item.description}</small>
                </span>

                <input
                  type="checkbox"
                  name={item.key}
                  checked={Boolean(preferences[item.key])}
                  onChange={handlePreferenceChange}
                />

                <span className="preference-switch" />
              </label>
            ))}

            {preferencesError && (
              <div className="settings-message settings-error">
                {preferencesError}
              </div>
            )}

            {preferencesMessage && (
              <div className="settings-message settings-success">
                {preferencesMessage}
              </div>
            )}

            <button
              className="settings-primary-button"
              type="submit"
              disabled={preferencesSaving}
            >
              {preferencesSaving
                ? "Saving..."
                : "Save Preferences"}
            </button>
          </form>
        </section>
      </div>
    </div>
  );
}
