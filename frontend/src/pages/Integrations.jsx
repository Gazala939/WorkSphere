
import { useState } from "react";
import api from "../api";
import "../styles/Integrations.css";

export default function Integrations() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const clearMessages = () => {
    setError("");
    setSuccess("");
  };

  const downloadFile = async (url, filename, type) => {
    clearMessages();
    setLoading(type);

    try {
      const response = await api.get(url, {
        responseType: "blob",
      });

      const blobUrl = URL.createObjectURL(response.data);
      const link = document.createElement("a");

      link.href = blobUrl;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      link.remove();

      URL.revokeObjectURL(blobUrl);
      setSuccess(`${filename} downloaded successfully.`);
    } catch (err) {
      setError(
        `Unable to download ${type}. Check your login and backend.`
      );
    } finally {
      setLoading("");
    }
  };

  const sendTestEmail = async (e) => {
    e.preventDefault();
    clearMessages();
    setLoading("email");

    try {
      const response = await api.post("/integrations/email/test", {
        email: email.trim(),
      });

      setSuccess(
        response.data?.message || "Test email sent successfully."
      );
      setEmail("");
    } catch (err) {
      setError(
        err.response?.data?.detail ||
        "Unable to send email. Check your SMTP settings."
      );
    } finally {
      setLoading("");
    }
  };

  return (
    <main className="integrations-page">
      <header className="integrations-header">
        <div>
          <p className="integrations-eyebrow">WORKSPHERE HRMS</p>
          <h1>Third-Party Integrations</h1>
          <p>
            Connect email notifications, export reports, and
            prepare tasks for your calendar.
          </p>
        </div>
      </header>

      {error && <div className="integration-message error">{error}</div>}
      {success && (
        <div className="integration-message success">{success}</div>
      )}

      <section className="integration-grid">
        <article className="integration-card">
          <div className="integration-icon">✉️</div>
          <h2>Email Notifications</h2>
          <p>
            Send a test email to verify the HRMS email configuration.
            Task assignment emails are sent when SMTP is configured.
          </p>

          <form className="integration-form" onSubmit={sendTestEmail}>
            <label htmlFor="test-email">Recipient email</label>
            <input
              id="test-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter an email address"
              required
            />

            <button
              className="integration-primary-btn"
              type="submit"
              disabled={Boolean(loading)}
            >
              {loading === "email" ? "Sending..." : "Send Test Email"}
            </button>
          </form>
        </article>

        <article className="integration-card">
          <div className="integration-icon">📊</div>
          <h2>Export Employee Reports</h2>
          <p>
            Download employee records for reporting and analysis.
          </p>

          <div className="integration-button-group">
            <button
              className="integration-primary-btn"
              onClick={() =>
                downloadFile(
                  "/reports/employees.csv",
                  "worksphere_employees.csv",
                  "CSV report"
                )
              }
              disabled={Boolean(loading)}
            >
              {loading === "CSV report" ? "Exporting..." : "Export CSV"}
            </button>

            <button
              className="integration-secondary-btn"
              onClick={() =>
                downloadFile(
                  "/reports/employees.pdf",
                  "worksphere_employees.pdf",
                  "PDF report"
                )
              }
              disabled={Boolean(loading)}
            >
              {loading === "PDF report" ? "Exporting..." : "Export PDF"}
            </button>
          </div>
        </article>

        <article className="integration-card">
          <div className="integration-icon">📅</div>
          <h2>Calendar Integration</h2>
          <p>
            Export task due dates to a calendar file that you can
            import into Google Calendar or another calendar app.
          </p>

          <button
            className="integration-primary-btn"
            onClick={() =>
              downloadFile(
                "/integrations/calendar/ics",
                "worksphere_tasks.ics",
                "calendar"
              )
            }
            disabled={Boolean(loading)}
          >
            {loading === "calendar"
              ? "Preparing calendar..."
              : "Export Tasks to Calendar"}
          </button>

          <p className="integration-note">
            This downloads a calendar file. It does not automatically
            synchronize changes with Google Calendar.
          </p>
        </article>
      </section>
    </main>
  );
}
