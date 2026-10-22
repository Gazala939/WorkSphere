
import { useEffect, useState } from "react";
import api from "../api";
import "../styles/UserManagement.css";

const emptyForm = {
  username: "",
  email: "",
  password: "",
  role: "EMPLOYEE",
};

export default function UserManagement() {
  const [users, setUsers] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  async function loadUsers() {
    setLoading(true);
    setError("");

    try {
      const response = await api.get("/admin/users");
      setUsers(response.data);
    } catch (err) {
      setError(
        err.response?.data?.detail || "Unable to load users."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadUsers();
  }, []);

  function startCreate() {
    setEditingId(null);
    setForm(emptyForm);
    setShowForm(true);
    setError("");
    setMessage("");
  }

  function startEdit(user) {
    setEditingId(user.id);
    setForm({
      username: user.username,
      email: user.email,
      password: "",
      role: user.role,
    });
    setShowForm(true);
    setError("");
    setMessage("");
  }

  function closeForm() {
    setShowForm(false);
    setEditingId(null);
    setForm(emptyForm);
  }

  function handleChange(event) {
    const { name, value } = event.target;
    setForm((previous) => ({
      ...previous,
      [name]: value,
    }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setSaving(true);
    setError("");
    setMessage("");

    try {
      if (editingId !== null) {
        await api.patch(`/admin/users/${editingId}`, {
          username: form.username.trim(),
          email: form.email.trim(),
          role: form.role,
        });

        setMessage("User updated successfully.");
      } else {
        await api.post("/admin/users", {
          username: form.username.trim(),
          email: form.email.trim(),
          password: form.password,
          role: form.role,
        });

        setMessage("User created successfully.");
      }

      closeForm();
      await loadUsers();
    } catch (err) {
      setError(
        err.response?.data?.detail || "Unable to save user."
      );
    } finally {
      setSaving(false);
    }
  }

  async function toggleStatus(user) {
    const action = user.is_active ? "deactivate" : "activate";

    if (
      !window.confirm(
        `Are you sure you want to ${action} ${user.username}?`
      )
    ) {
      return;
    }

    setError("");
    setMessage("");

    try {
      await api.patch(`/admin/users/${user.id}/status`, {
        is_active: !user.is_active,
      });

      setMessage(
        `${user.username} ${action}d successfully.`
      );
      await loadUsers();
    } catch (err) {
      setError(
        err.response?.data?.detail ||
          `Unable to ${action} this user.`
      );
    }
  }

  async function deleteUser(user) {
    if (
      !window.confirm(
        `Delete ${user.username}? This action cannot be undone.`
      )
    ) {
      return;
    }

    setError("");
    setMessage("");

    try {
      await api.delete(`/admin/users/${user.id}`);

      setMessage("User deleted successfully.");
      await loadUsers();
    } catch (err) {
      setError(
        err.response?.data?.detail || "Unable to delete user."
      );
    }
  }

  return (
    <div className="user-management">
      <div className="um-header">
        <div>
          <p className="um-eyebrow">WORKSPHERE HRMS</p>
          <h1>User Management</h1>
          <p className="um-subtitle">
            Create accounts, assign roles, and control account access.
          </p>
        </div>

        <button className="um-primary-btn" onClick={startCreate}>
          + Add User
        </button>
      </div>

      {error && (
        <div className="um-alert um-error" role="alert">
          {typeof error === "string" ? error : JSON.stringify(error)}
        </div>
      )}

      {message && (
        <div className="um-alert um-success" role="status">
          {message}
        </div>
      )}

      <div className="um-summary">
        <div className="um-stat">
          <span>Total Users</span>
          <strong>{users.length}</strong>
        </div>

        <div className="um-stat">
          <span>Active</span>
          <strong>
            {users.filter((user) => user.is_active).length}
          </strong>
        </div>

        <div className="um-stat">
          <span>Inactive</span>
          <strong>
            {users.filter((user) => !user.is_active).length}
          </strong>
        </div>
      </div>

      {showForm && (
        <section className="um-form-card">
          <div className="um-form-heading">
            <h2>{editingId !== null ? "Edit User" : "Create User"}</h2>
            <button
              type="button"
              className="um-close-btn"
              onClick={closeForm}
              aria-label="Close form"
            >
              ×
            </button>
          </div>

          <form onSubmit={handleSubmit}>
            <div className="um-form-grid">
              <label>
                Username
                <input
                  name="username"
                  value={form.username}
                  onChange={handleChange}
                  minLength={3}
                  maxLength={50}
                  required
                />
              </label>

              <label>
                Email
                <input
                  type="email"
                  name="email"
                  value={form.email}
                  onChange={handleChange}
                  required
                />
              </label>

              {editingId === null && (
                <label>
                  Password
                  <input
                    type="password"
                    name="password"
                    value={form.password}
                    onChange={handleChange}
                    minLength={8}
                    maxLength={128}
                    autoComplete="new-password"
                    required
                  />
                </label>
              )}

              <label>
                Role
                <select
                  name="role"
                  value={form.role}
                  onChange={handleChange}
                  required
                >
                  <option value="EMPLOYEE">EMPLOYEE</option>
                  <option value="HR">HR</option>
                  <option value="ADMIN">ADMIN</option>
                </select>
              </label>
            </div>

            <div className="um-form-actions">
              <button
                type="button"
                className="um-secondary-btn"
                onClick={closeForm}
                disabled={saving}
              >
                Cancel
              </button>

              <button
                type="submit"
                className="um-primary-btn"
                disabled={saving}
              >
                {saving
                  ? "Saving..."
                  : editingId !== null
                    ? "Save Changes"
                    : "Create User"}
              </button>
            </div>
          </form>
        </section>
      )}

      <section className="um-table-card">
        <div className="um-table-heading">
          <div>
            <h2>All Users</h2>
            <p>Manage accounts and permissions.</p>
          </div>

          <button
            className="um-secondary-btn"
            onClick={loadUsers}
            disabled={loading}
          >
            {loading ? "Loading..." : "Refresh"}
          </button>
        </div>

        {loading ? (
          <p className="um-empty">Loading users...</p>
        ) : users.length === 0 ? (
          <p className="um-empty">No users found.</p>
        ) : (
          <div className="um-table-wrapper">
            <table className="um-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>User</th>
                  <th>Role</th>
                  <th>Status</th>
                  <th>Created</th>
                  <th>Actions</th>
                </tr>
              </thead>

              <tbody>
                {users.map((user) => (
                  <tr key={user.id}>
                    <td>#{user.id}</td>

                    <td>
                      <div className="um-user-name">
                        {user.username}
                      </div>
                      <div className="um-user-email">
                        {user.email}
                      </div>
                    </td>

                    <td>
                      <span
                        className={`um-role um-role-${user.role.toLowerCase()}`}
                      >
                        {user.role}
                      </span>
                    </td>

                    <td>
                      <span
                        className={`um-status ${
                          user.is_active ? "is-active" : "is-inactive"
                        }`}
                      >
                        {user.is_active ? "Active" : "Inactive"}
                      </span>
                    </td>

                    <td>
                      {user.created_at
                        ? new Date(user.created_at).toLocaleDateString()
                        : "—"}
                    </td>

                    <td>
                      <div className="um-actions">
                        <button
                          className="um-action-btn"
                          onClick={() => startEdit(user)}
                        >
                          Edit
                        </button>

                        <button
                          className={`um-action-btn ${
                            user.is_active ? "um-deactivate" : "um-activate"
                          }`}
                          onClick={() => toggleStatus(user)}
                        >
                          {user.is_active ? "Deactivate" : "Activate"}
                        </button>

                        <button
                          className="um-action-btn um-delete"
                          onClick={() => deleteUser(user)}
                        >
                          Delete
                        </button>
                      </div>
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
