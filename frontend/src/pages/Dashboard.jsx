
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
        error.response?.data?.detail || "Unable to load notifications."
      );
    } finally {
      setNotificationLoading(false);
    }
  }

  async function handleMarkAsRead(notificationId) {
    try {
      await api.patch(`/notifications/${notificationId}/read`);

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
    if (!user) {
      setNotifications([]);
      return;
    }

    // Load notifications immediately after login.
    loadNotifications();

    // Refresh notifications every 10 seconds.
    const intervalId = setInterval(() => {
      loadNotifications();
    }, 10000);

    return () => clearInterval(intervalId);
  }, [user]);


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
              <p>
                Overview of employees, attendance, leaves, and payroll.
              </p>
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
                    gridTemplateColumns:
                      "repeat(auto-fit, minmax(210px, 1fr))",
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
                    gridTemplateColumns:
                      "repeat(auto-fit, minmax(210px, 1fr))",
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
              <div className="attendance-icon">👤</div>
              <div className="workspace-content">
                <span className="workspace-tag">EMPLOYEE SERVICE</span>
                <h2>My Profile</h2>
                <p>
                  View your personal details, employee information,
                  department, designation, and joining date.
                </p>
                <button
                  className="attendance-btn"
                  onClick={() => navigate("/my-profile")}
                >
                  View My Profile <span>→</span>
                </button>
              </div>
              <div className="workspace-decoration">W</div>
            </section>

            <section className="workspace-card">
              <div className="attendance-icon">📋</div>
              <div className="workspace-content">
                <span className="workspace-tag">EMPLOYEE SERVICE</span>
                <h2>My Tasks</h2>
                <p>View assigned tasks, deadlines, and update your progress.</p>
                <button
                  className="attendance-btn"
                  onClick={() => navigate("/tasks")}
                >
                  View My Tasks <span>→</span>
                </button>
              </div>
              <div className="workspace-decoration">W</div>
            </section>

            
            {/* MODULE 23: ANNOUNCEMENTS */}
            <section className="workspace-card">
              <div className="attendance-icon">📢</div>

              <div className="workspace-content">
                <span className="workspace-tag">EMPLOYEE SERVICE</span>

                <h2>Announcements</h2>

                <p>
                  View company announcements, important notices,
                  and organizational updates.
                </p>

                <button
                  className="attendance-btn"
                  onClick={() => navigate("/announcements")}
                >
                  View Announcements <span>→</span>
                </button>
              </div>

              <div className="workspace-decoration">W</div>
            </section>


            
            {/* MODULE 22: Resignation & Exit */}
            <section className="workspace-card">
              <div className="attendance-icon">📋</div>

              <div className="workspace-content">
                <span className="workspace-tag">
                  EMPLOYEE SERVICE
                </span>

                <h2>Resignation & Exit</h2>

                <p>
                  Submit your resignation, provide your notice period,
                  and track your exit request status.
                </p>

                <button
                  className="attendance-btn"
                  onClick={() => navigate("/resignation")}
                >
                  Manage Resignation <span>→</span>
                </button>
              </div>

              <div className="workspace-decoration">W</div>
            </section>


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

            {/* Module 11: Leave Balance & Policies */}
            <section className="workspace-card">
              <div className="attendance-icon">📊</div>
              <div className="workspace-content">
                <span className="workspace-tag">EMPLOYEE SERVICE</span>
                <h2>Leave Balance & Policies</h2>
                <p>
                  View your remaining casual, sick, and paid leave
                  days and check company leave policies.
                </p>
                <button
                  className="attendance-btn"
                  onClick={() => navigate("/leave-balance")}
                >
                  View Leave Balance <span>→</span>
                </button>
              </div>
              <div className="workspace-decoration">W</div>
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

            {/* Module 16: Document Management */}
            <section className="workspace-card">
              <div className="attendance-icon">📁</div>
              <div className="workspace-content">
                <span className="workspace-tag">EMPLOYEE SERVICE</span>
                <h2>My Documents</h2>
                <p>
                  Upload, view, and download your identity documents,
                  certificates, and other important files.
                </p>
                <button
                  className="attendance-btn"
                  onClick={() => navigate("/documents")}
                >
                  Open My Documents <span>→</span>
                </button>
              </div>
              <div className="workspace-decoration">W</div>
            </section>

            
            {/* MODULE 21: Employee Onboarding */}
            <section className="workspace-card">
              <div className="attendance-icon">🎯</div>

              <div className="workspace-content">
                <span className="workspace-tag">EMPLOYEE SERVICE</span>

                <h2>Employee Onboarding</h2>

                <p>
                  View your onboarding checklist, track your progress,
                  check task due dates, and mark assigned tasks as completed.
                </p>

                <button
                  className="attendance-btn"
                  onClick={() => navigate("/onboarding")}
                >
                  Open Onboarding <span>→</span>
                </button>
              </div>

              <div className="workspace-decoration">W</div>
            </section>


            {/* MODULE 17: My Performance Reviews */}
            <section className="workspace-card">
              <div className="attendance-icon">⭐</div>
              <div className="workspace-content">
                <span className="workspace-tag">EMPLOYEE SERVICE</span>
                <h2>My Performance Reviews</h2>
                <p>
                  View your performance ratings, manager feedback,
                  and review history.
                </p>
                <button
                  className="attendance-btn"
                  onClick={() => navigate("/performance-reviews")}
                >
                  View My Reviews <span>→</span>
                </button>
              </div>
              <div className="workspace-decoration">W</div>
            </section>
          </>
        )}

        

        {/* Admin-only services */}
        {isAdmin && (
          <section className="workspace-card">
            <div className="attendance-icon">🛡️</div>
            <div className="workspace-content">
              <span className="workspace-tag">ADMIN SERVICE</span>
              <h2>User Management</h2>
              <p>
                Create user accounts, assign roles, edit user details,
                and activate or deactivate accounts.
              </p>
              <button
                className="attendance-btn"
                onClick={() => navigate("/admin/users")}
              >
                Open User Management <span>→</span>
              </button>
            </div>
            <div className="workspace-decoration">W</div>
          </section>
        )}

        {/* HR/Admin services */}
        {canManageLeaves && (
          <>
            <section className="workspace-card">
              <div className="attendance-icon">👥</div>
              <div className="workspace-content">
                <span className="workspace-tag">HR / ADMIN SERVICE</span>
                <h2>Employee Management</h2>
                <p>View, search, add, and manage employee records.</p>
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
                <h2>Task Management</h2>
                <p>Assign employee tasks and monitor completion progress.</p>
                <button
                  className="attendance-btn"
                  onClick={() => navigate("/tasks")}
                >
                  Manage Tasks <span>→</span>
                </button>
              </div>
              <div className="workspace-decoration">W</div>
            </section>

            
            {/* MODULE 21: Onboarding Management - HR / ADMIN */}
            {(isHR || isAdmin) && (
              <section className="workspace-card">
                <div className="attendance-icon">🎯</div>

                <div className="workspace-content">
                  <span className="workspace-tag">HR MANAGEMENT</span>

                  <h2>Onboarding Management</h2>

                  <p>
                    Assign onboarding tasks, set due dates, and monitor
                    employee task completion.
                  </p>

                  <button
                    className="attendance-btn"
                    onClick={() => navigate("/onboarding-management")}
                  >
                    Manage Onboarding <span>→</span>
                  </button>
                </div>

                <div className="workspace-decoration">W</div>
              </section>
            )}

            
            <section className="workspace-card">
              <div className="attendance-icon">🔗</div>

              <div className="workspace-content">
                <span className="workspace-tag">HR / ADMIN SERVICE</span>
                <h2>Third-Party Integrations</h2>
                <p>
                  Test email notifications, export employee reports,
                  and export tasks to your calendar.
                </p>

                <button
                  className="attendance-btn"
                  onClick={() => navigate("/integrations")}
                >
                  Open Integrations <span>→</span>
                </button>
              </div>

              <div className="workspace-decoration">W</div>
            </section>

            {/* MODULE 22: Resignation Management - HR / ADMIN */}
            <section className="workspace-card">
              <div className="attendance-icon">📋</div>

              <div className="workspace-content">
                <span className="workspace-tag">HR MANAGEMENT</span>

                <h2>Resignation Management</h2>

                <p>
                  Review employee resignation requests, approve or reject
                  them, and track exit status.
                </p>

                <button
                  className="attendance-btn"
                  onClick={() => navigate("/resignation-management")}
                >
                  Manage Resignations <span>→</span>
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

            <div
              className="workspace-card"
              onClick={() => navigate("/feedback")}
              role="link"
              tabIndex={0}
            >
              <div className="workspace-content">
                <div className="attendance-icon">💬</div>
                <h3>Employee Feedback</h3>
                <p>
                  {user?.role === "EMPLOYEE"
                    ? "Share your feedback and rate your experience."
                    : "Review employee feedback and ratings."}
                </p>
                <span className="workspace-tag">
                  Feedback System
                </span>
              </div>
            </div>

                        
            {/* MODULE 23: ANNOUNCEMENTS */}
            <section className="workspace-card">
              <div className="attendance-icon">📢</div>

              <div className="workspace-content">
                <span className="workspace-tag">HR / ADMIN SERVICE</span>

                <h2>Announcements</h2>

                <p>
                  Publish and view important company announcements
                  and organization-wide updates.
                </p>

                <button
                  className="attendance-btn"
                  onClick={() => navigate("/announcements")}
                >
                  View Announcements <span>→</span>
                </button>
              </div>

              <div className="workspace-decoration">W</div>
            </section>

            <div
              className="workspace-card"
              onClick={() => navigate("/profile-settings")}
              role="link"
              tabIndex={0}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  navigate("/profile-settings");
                }
              }}
            >
              <div className="workspace-content">
                <div className="attendance-icon">⚙️</div>

                <h3>Profile & Settings</h3>

                <p>
                  Manage your personal details, password,
                  and notification preferences.
                </p>

                <span className="workspace-tag">
                  Account Settings
                </span>
              </div>
            </div>
            
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

            {/* Module 14: Shift Management */}
            <div className="dashboard-card shift-service-card">
              <div className="dashboard-card-icon shift-service-icon">🕒</div>
              <div className="shift-service-content">
                <p className="dashboard-card-label">HR / ADMIN SERVICE</p>
                <h2>Shift Management</h2>
                <p>
                  Create and manage Morning, Evening, and Night shifts,
                  including their start and end times.
                </p>
                <button onClick={() => navigate("/shifts")}>
                  Open Shift Management <span>→</span>
                </button>
              </div>
            </div>

            {/* Module 14: Shift Assignments */}
            <div className="dashboard-card shift-service-card">
              <div className="dashboard-card-icon shift-service-icon">👥</div>
              <div className="shift-service-content">
                <p className="dashboard-card-label">HR / ADMIN SERVICE</p>
                <h2>Shift Assignments</h2>
                <p>
                  Assign work shifts to employees and view their current
                  shift assignments.
                </p>
                <button onClick={() => navigate("/shift-assignments")}>
                  Open Shift Assignments <span>→</span>
                </button>
              </div>
            </div>

            {/* Module 15: Leave Calendar */}
            <div className="dashboard-card shift-service-card">
              <div className="dashboard-card-icon shift-service-icon">
                📅
              </div>
              <div className="shift-service-content">
                <p className="dashboard-card-label">HR / ADMIN SERVICE</p>
                <h2>Leave Calendar & Availability</h2>
                <p>
                  View approved employee leaves, filter by date and
                  department, and check team availability.
                </p>
                <button onClick={() => navigate("/leave-calendar")}>
                  Open Leave Calendar <span>→</span>
                </button>
              </div>
            </div>

            {/* Module 16: Document Management */}
            <div className="dashboard-card shift-service-card">
              <div className="dashboard-card-icon shift-service-icon">📁</div>
              <div className="shift-service-content">
                <p className="dashboard-card-label">HR / ADMIN SERVICE</p>
                <h2>Document Management</h2>
                <p>
                  Access employee documents and manage important
                  certificates and files.
                </p>
                <button onClick={() => navigate("/documents")}>
                  Open Document Management <span>→</span>
                </button>
              </div>
            </div>

            
            
            <div
              className="document-service-card"
              onClick={() => navigate("/advanced-reports")}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  navigate("/advanced-reports");
                }
              }}
            >
              <div className="document-service-icon">📊</div>

              <div className="document-service-content">
                <span className="document-service-label">HR / ADMIN SERVICE</span>

                <h2>Advanced Analytics & Reports</h2>

                <p>
                  View attendance trends, leave statistics, employee performance,
                  and department-wise reports.
                </p>

                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    navigate("/advanced-reports");
                  }}
                >
                  Open Advanced Reports <span>→</span>
                </button>
              </div>
            </div>



            {/* MODULE 17: Performance Management */}
            <div className="dashboard-card shift-service-card">
              <div className="dashboard-card-icon shift-service-icon">
                ⭐
              </div>
              <div className="shift-service-content">
                <p className="dashboard-card-label">HR / ADMIN SERVICE</p>
                <h2>Performance Management</h2>
                <p>
                  Add employee performance reviews, assign ratings,
                  provide feedback, and review performance history.
                </p>
                <button onClick={() => navigate("/performance-reviews")}>
                  Open Performance Management <span>→</span>
                </button>
              </div>
            </div>
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
