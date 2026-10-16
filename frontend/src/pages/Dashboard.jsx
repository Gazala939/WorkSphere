import { useEffect, useState } from "react";
import { useAuth } from "../auth/AuthContext";
import { useNavigate } from "react-router-dom";
import "../styles/Dashboard.css";
import api from "../api";
import "../styles/NotificationBell.css";

export default function Dashboard() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const isAdmin = user?.role === "ADMIN";
  const isHR = user?.role === "HR";
  const isEmployee = user?.role === "EMPLOYEE";
  const canManageLeaves = isAdmin || isHR;

  
  const [analytics, setAnalytics] = useState(null);
  const [analyticsLoading, setAnalyticsLoading] = useState(false);
  const [analyticsError, setAnalyticsError] = useState("");

    // MODULE 7: Notifications
  const [notifications, setNotifications] = useState([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [notificationLoading, setNotificationLoading] = useState(false);
  const [notificationError, setNotificationError] = useState("");

  const unreadCount = notifications.filter(
    (notification) => !notification.is_read
  ).length;

  async function loadNotifications() {
    setNotificationLoading(true);
    setNotificationError("");

    try {
      const response = await api.get("/notifications");
      setNotifications(response.data);
    } catch (error) {
      setNotificationError(
        error.response?.data?.detail ||
          "Unable to load notifications."
      );
    } finally {
      setNotificationLoading(false);
    }
  }

  async function handleMarkAsRead(notificationId) {
    try {
      await api.patch(
        `/notifications/${notificationId}/read`
      );

      setNotifications((previous) =>
        previous.map((notification) =>
          notification.id === notificationId
            ? { ...notification, is_read: true }
            : notification
        )
      );
    } catch (error) {
      setNotificationError(
        error.response?.data?.detail ||
          "Unable to mark notification as read."
      );
    }
  }

  function toggleNotifications() {
    const willOpen = !showNotifications;
    setShowNotifications(willOpen);

    if (willOpen) {
      loadNotifications();
    }
  }

  useEffect(() => {
    if (!canManageLeaves) return;

    let cancelled = false;

    async function loadAnalytics() {
      setAnalyticsLoading(true);
      setAnalyticsError("");

      try {
        const response = await api.get("/analytics/dashboard");

        if (!cancelled) {
          setAnalytics(response.data);
        }
      } catch (error) {
        if (!cancelled) {
          setAnalyticsError(
            error.response?.data?.detail ||
              "Unable to load dashboard analytics."
          );
        }
      } finally {
        if (!cancelled) {
          setAnalyticsLoading(false);
        }
      }
    }

    loadAnalytics();

    return () => {
      cancelled = true;
    };
  }, [canManageLeaves]);

  const formatCurrency = (amount) =>
    new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 2,
    }).format(amount ?? 0);


    function handleLogout() {
      logout();
      navigate("/login");
    }

  return (
    <div className="dashboard-page">
      <header className="dashboard-navbar">
        <div className="dashboard-brand">
          <div className="brand-icon">W</div>
          <div>
            <h2>WorkSphere</h2>
            <span>Human Resource Management</span>
          </div>
        </div>

        <div className="navbar-actions">
          <div className="notification-wrapper">
            <button
              type="button"
              className="notification-bell"
              onClick={toggleNotifications}
              aria-label={`Notifications, ${unreadCount} unread`}
              aria-expanded={showNotifications}
            >
              <span className="bell-symbol">🔔</span>

              {unreadCount > 0 && (
                <span className="notification-badge">
                  {unreadCount > 99 ? "99+" : unreadCount}
                </span>
              )}
            </button>

            {showNotifications && (
              <div className="notification-dropdown">
                <div className="notification-header">
                  <h3>Notifications</h3>

                  <button
                    type="button"
                    className="notification-refresh"
                    onClick={loadNotifications}
                  >
                    Refresh
                  </button>
                </div>

                {notificationLoading && (
                  <p className="notification-message">
                    Loading notifications...
                  </p>
                )}

                {notificationError && (
                  <p className="notification-error">
                    {notificationError}
                  </p>
                )}

                {!notificationLoading &&
                  !notificationError &&
                  notifications.length === 0 && (
                    <p className="notification-message">
                      No notifications yet.
                    </p>
                  )}

                {!notificationLoading &&
                  notifications.map((notification) => (
                    <div
                      key={notification.id}
                      className={`notification-item ${
                        notification.is_read ? "read" : "unread"
                      }`}
                    >
                      <div className="notification-item-content">
                        <h4>{notification.title}</h4>

                        <p>{notification.message}</p>

                        <small>
                          {notification.created_at
                            ? new Date(
                                notification.created_at
                              ).toLocaleString("en-IN")
                            : ""}
                        </small>
                      </div>

                      {!notification.is_read && (
                        <button
                          type="button"
                          className="mark-read-btn"
                          onClick={() =>
                            handleMarkAsRead(notification.id)
                          }
                        >
                          Mark read
                        </button>
                      )}
                    </div>
                  ))}
              </div>
            )}
          </div>

          <button className="logout-btn" onClick={handleLogout}>
            Logout <span>↗</span>
          </button>
        </div>
      </header>

      <main className="dashboard-container">
        <section className="welcome-section">
          <div>
            <p className="welcome-label">
              {isAdmin
                ? "ADMIN WORKSPACE"
                : isHR
                ? "HR WORKSPACE"
                : "EMPLOYEE WORKSPACE"}
            </p>

            <h1>Welcome, {user?.username || "User"}!</h1>

            <p className="welcome-description">
              {canManageLeaves
                ? "Manage employee services and review leave applications."
                : "Manage your attendance, working hours, and leave applications."}
            </p>
          </div>

          <div className="welcome-avatar">
            {(user?.username || "U").charAt(0).toUpperCase()}
          </div>
        </section>

        <section className="dashboard-info-grid">
          <div className="info-card">
            <div className="info-icon email-icon">@</div>
            <div>
              <p>Email Address</p>
              <h3>{user?.email || "Not available"}</h3>
            </div>
          </div>

          <div className="info-card">
            <div className="info-icon role-icon">♙</div>
            <div>
              <p>Account Role</p>
              <h3>{user?.role || "EMPLOYEE"}</h3>
            </div>
          </div>

          <div className="info-card">
            <div className="info-icon status-icon">✓</div>
            <div>
              <p>Account Status</p>
              <h3 className="authenticated-status">Authenticated</h3>
            </div>
          </div>
        </section>

        <section className="dashboard-section-heading">
          <div>
            <h2>Your Workspace</h2>
            <p>Quick access to your available services.</p>
          </div>
        </section>

                
        {/* MODULE 6: DASHBOARD & ANALYTICS */}
        {canManageLeaves && (
          <section style={{ marginBottom: "30px" }}>
            <div style={{ marginBottom: "18px" }}>
              <h2>Dashboard & Analytics</h2>
              <p>Overview of employees, attendance, leaves, and payroll.</p>
            </div>

            {analyticsLoading && <p>Loading analytics...</p>}

            {analyticsError && (
              <p style={{ color: "#dc2626" }}>{analyticsError}</p>
            )}

            {analytics && (
              <>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))",
                    gap: "16px",
                    marginBottom: "20px",
                  }}
                >
                  <div className="info-card">
                    <div className="info-icon role-icon">👥</div>
                    <div>
                      <p>Total Employees</p>
                      <h3>{analytics.total_employees}</h3>
                    </div>
                  </div>

                  <div className="info-card">
                    <div className="info-icon status-icon">✓</div>
                    <div>
                      <p>Present Records</p>
                      <h3>{analytics.attendance_summary.PRESENT}</h3>
                    </div>
                  </div>

                  <div className="info-card">
                    <div className="info-icon role-icon">◷</div>
                    <div>
                      <p>Half-Day Records</p>
                      <h3>{analytics.attendance_summary.HALF_DAY}</h3>
                    </div>
                  </div>

                  <div className="info-card">
                    <div className="info-icon email-icon">📋</div>
                    <div>
                      <p>Absent Records</p>
                      <h3>{analytics.attendance_summary.ABSENT}</h3>
                    </div>
                  </div>
                </div>

                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))",
                    gap: "16px",
                  }}
                >
                  <div className="info-card">
                    <div className="info-icon email-icon">⏳</div>
                    <div>
                      <p>Pending Leaves</p>
                      <h3>{analytics.leave_statistics.PENDING}</h3>
                    </div>
                  </div>

                  <div className="info-card">
                    <div className="info-icon status-icon">✓</div>
                    <div>
                      <p>Approved Leaves</p>
                      <h3>{analytics.leave_statistics.APPROVED}</h3>
                    </div>
                  </div>

                  <div className="info-card">
                    <div className="info-icon role-icon">✕</div>
                    <div>
                      <p>Rejected Leaves</p>
                      <h3>{analytics.leave_statistics.REJECTED}</h3>
                    </div>
                  </div>

                  <div className="info-card">
                    <div className="info-icon role-icon">💰</div>
                    <div>
                      <p>Payroll Records</p>
                      <h3>{analytics.payroll_overview.total_records}</h3>
                    </div>
                  </div>

                  <div className="info-card">
                    <div className="info-icon status-icon">₹</div>
                    <div>
                      <p>Total Net Payroll</p>
                      <h3>
                        {formatCurrency(
                          analytics.payroll_overview.total_net_payroll
                        )}
                      </h3>
                    </div>
                  </div>
                </div>
              </>
            )}
          </section>
        )}


        {/* Employee-only services */}
        {isEmployee && (
          <>
            <section className="workspace-card">
              <div className="attendance-icon">◷</div>

              <div className="workspace-content">
                <span className="workspace-tag">EMPLOYEE SERVICE</span>
                <h2>Attendance Management</h2>
                <p>
                  Record your daily check-in and check-out times, view
                  attendance history, and monitor your working hours.
                </p>

                <button
                  className="attendance-btn"
                  onClick={() => navigate("/attendance")}
                >
                  Open Attendance Dashboard <span>→</span>
                </button>
              </div>

              <div className="workspace-decoration">W</div>
            </section>

            <section className="leave-workspace-card">
              <div className="leave-workspace-icon">📅</div>

              <div className="leave-workspace-content">
                <span className="workspace-tag">EMPLOYEE SERVICE</span>
                <h2>Leave Management</h2>
                <p>
                  Apply for sick, casual, or paid leave and track whether
                  your requests are pending, approved, or rejected.
                </p>

                <div className="leave-dashboard-actions">
                  <button
                    className="leave-dashboard-apply"
                    onClick={() => navigate("/leaves/apply")}
                  >
                    + Apply for Leave <span>→</span>
                  </button>

                  <button
                    className="leave-dashboard-history"
                    onClick={() => navigate("/leaves/history")}
                  >
                    View Leave History <span>→</span>
                  </button>
                </div>
              </div>
            </section>
            <section className="workspace-card">
              <div className="attendance-icon">💰</div>

              <div className="workspace-content">
                <span className="workspace-tag">EMPLOYEE SERVICE</span>
                <h2>My Salary Details</h2>
                <p>
                  View your monthly basic salary, deductions, bonus,
                  and final net salary.
                </p>

                <button
                  className="attendance-btn"
                  onClick={() => navigate("/salary-details")}
                >
                  View Salary Details <span>→</span>
                </button>
              </div>

              <div className="workspace-decoration">W</div>
            </section>

          </>
        )}

        {/* HR/Admin services */}
        {canManageLeaves && (
          <>
            <section className="workspace-card">
              <div className="attendance-icon">👥</div>

              <div className="workspace-content">
                <span className="workspace-tag">HR / ADMIN SERVICE</span>
                <h2>Employee Management</h2>
                <p>
                  View, search, add, and manage employee records.
                </p>

                <button
                  className="attendance-btn"
                  onClick={() => navigate("/employees")}
                >
                  Open Employee Management <span>→</span>
                </button>
              </div>

              <div className="workspace-decoration">W</div>
            </section>

            <section className="workspace-card">
              <div className="attendance-icon">📋</div>

              <div className="workspace-content">
                <span className="workspace-tag">HR / ADMIN SERVICE</span>
                <h2>Manage Leave Requests</h2>
                <p>
                  View employee leave applications, filter requests by
                  status, and approve or reject pending leaves.
                </p>

                <button
                  className="attendance-btn"
                  onClick={() => navigate("/leaves/manage")}
                >
                  Open Leave Management <span>→</span>
                </button>
              </div>

              <div className="workspace-decoration">W</div>
            </section>

            
            <section className="workspace-card">
              <div className="attendance-icon">💰</div>

              <div className="workspace-content">
                <span className="workspace-tag">HR / ADMIN SERVICE</span>
                <h2>Payroll Management</h2>
                <p>
                  Generate employee payroll, calculate net salaries,
                  and review monthly salary records.
                </p>

                <button
                  className="attendance-btn"
                  onClick={() => navigate("/payroll")}
                >
                  Open Payroll Dashboard <span>→</span>
                </button>
              </div>

              <div className="workspace-decoration">W</div>
            </section>

          </>
        )}

        <footer className="dashboard-footer">
          <p>© 2026 WorkSphere HRMS</p>
          <p>WorkSphere · Secure Workspace</p>
        </footer>
      </main>
    </div>
  );
}
