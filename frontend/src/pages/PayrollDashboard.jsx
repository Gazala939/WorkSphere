
import { useEffect, useState } from "react";
import api from "../api";
import "../styles/Payroll.css";

export default function PayrollDashboard() {
  const [payrolls, setPayrolls] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const [summaryMonth, setSummaryMonth] = useState(
    new Date().toISOString().slice(0, 7)
  );
  const [summary, setSummary] = useState(null);
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [summaryError, setSummaryError] = useState("");

  const [form, setForm] = useState({
    employee_id: "",
    basic_salary: "",
    allowances: "0",
    deductions: "0",
    bonus: "0",
    month: new Date().toISOString().slice(0, 7),
  });

  const netSalary =
    Number(form.basic_salary || 0) +
    Number(form.allowances || 0) +
    Number(form.bonus || 0) -
    Number(form.deductions || 0);

  async function loadData() {
    setLoading(true);
    setError("");

    try {
      const [payrollResponse, employeeResponse] = await Promise.all([
        api.get("/payroll"),
        api.get("/employees"),
      ]);

      setPayrolls(payrollResponse.data);
      setEmployees(employeeResponse.data);
    } catch (err) {
      setError(
        err.response?.data?.detail ||
          "Unable to load payroll information."
      );
    } finally {
      setLoading(false);
    }
  }

  async function loadSummary(month = summaryMonth) {
    setSummaryLoading(true);
    setSummaryError("");

    try {
      const response = await api.get("/payroll/summary", {
        params: { month },
      });

      setSummary(response.data);
    } catch (err) {
      setSummaryError(
        err.response?.data?.detail ||
          "Unable to load monthly payroll summary."
      );
      setSummary(null);
    } finally {
      setSummaryLoading(false);
    }
  }

  useEffect(() => {
    loadData();
    loadSummary();
  }, []);

  function handleChange(e) {
    setForm({
      ...form,
      [e.target.name]: e.target.value,
    });
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setMessage("");

    if (netSalary < 0) {
      setError(
        "Deductions cannot exceed basic salary, allowances, and bonus."
      );
      return;
    }

    setSaving(true);

    try {
      await api.post("/payroll", {
        employee_id: Number(form.employee_id),
        basic_salary: Number(form.basic_salary),
        allowances: Number(form.allowances),
        deductions: Number(form.deductions),
        bonus: Number(form.bonus),
        month: form.month,
      });

      setMessage("Payroll generated successfully!");

      const generatedMonth = form.month;

      setForm({
        employee_id: "",
        basic_salary: "",
        allowances: "0",
        deductions: "0",
        bonus: "0",
        month: new Date().toISOString().slice(0, 7),
      });

      await loadData();

      if (generatedMonth === summaryMonth) {
        await loadSummary(summaryMonth);
      }
    } catch (err) {
      setError(
        err.response?.data?.detail ||
          "Unable to generate payroll."
      );
    } finally {
      setSaving(false);
    }
  }

  function money(value) {
    return Number(value || 0).toLocaleString("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 2,
    });
  }

  return (
    <div className="payroll-page">
      <header className="payroll-header">
        <div>
          <p className="payroll-eyebrow">WORKSPHERE HRMS</p>
          <h1>Payroll Management</h1>
          <p>Generate payroll and review employee salary records.</p>
        </div>
      </header>

      <section className="payroll-panel">
        <h2>Monthly Payroll Summary</h2>
        <p>Review salary totals for a selected month.</p>

        <div className="payroll-summary-controls">
          <label>
            Select Payroll Month
            <input
              type="month"
              value={summaryMonth}
              onChange={(e) => setSummaryMonth(e.target.value)}
            />
          </label>

          <button
            type="button"
            disabled={summaryLoading}
            onClick={() => loadSummary(summaryMonth)}
          >
            {summaryLoading ? "Loading..." : "View Summary"}
          </button>
        </div>

        {summaryError && (
          <p className="payroll-error">{summaryError}</p>
        )}

        {summaryLoading && <p>Loading monthly summary...</p>}

        {!summaryLoading && summary && (
          <>
            <p>
              Summary for <strong>{summary.month}</strong>
            </p>

            <div className="payroll-stats">
              <article className="payroll-stat">
                <span>Total Payroll Records</span>
                <strong>{summary.total_records}</strong>
              </article>

              <article className="payroll-stat">
                <span>Total Basic Salary</span>
                <strong>{money(summary.total_basic_salary)}</strong>
              </article>

              <article className="payroll-stat">
                <span>Total Allowances</span>
                <strong>{money(summary.total_allowances)}</strong>
              </article>

              <article className="payroll-stat">
                <span>Total Bonus</span>
                <strong>{money(summary.total_bonus)}</strong>
              </article>

              <article className="payroll-stat">
                <span>Total Deductions</span>
                <strong>{money(summary.total_deductions)}</strong>
              </article>

              <article className="payroll-stat">
                <span>Total Net Salary</span>
                <strong>{money(summary.total_net_salary)}</strong>
              </article>
            </div>
          </>
        )}
      </section>

      <section className="payroll-stats">
        <article className="payroll-stat">
          <span>Total Payroll Records</span>
          <strong>{payrolls.length}</strong>
        </article>

        <article className="payroll-stat">
          <span>Total Net Payroll</span>
          <strong>
            {money(
              payrolls.reduce(
                (total, item) => total + Number(item.net_salary || 0),
                0
              )
            )}
          </strong>
        </article>
      </section>

      <section className="payroll-panel">
        <h2>Generate Payroll</h2>

        {error && <p className="payroll-error">{String(error)}</p>}
        {message && <p className="payroll-success">{message}</p>}

        <form className="payroll-form" onSubmit={handleSubmit}>
          <label>
            Employee
            <select
              name="employee_id"
              value={form.employee_id}
              onChange={handleChange}
              required
            >
              <option value="">Select employee</option>
              {employees.map((employee) => (
                <option key={employee.id} value={employee.id}>
                  {employee.full_name} (ID: {employee.id})
                </option>
              ))}
            </select>
          </label>

          <label>
            Basic Salary (₹)
            <input
              type="number"
              name="basic_salary"
              min="0"
              step="0.01"
              value={form.basic_salary}
              onChange={handleChange}
              required
            />
          </label>

          <label>
            Allowances (₹)
            <input
              type="number"
              name="allowances"
              min="0"
              step="0.01"
              value={form.allowances}
              onChange={handleChange}
              required
            />
          </label>

          <label>
            Deductions (₹)
            <input
              type="number"
              name="deductions"
              min="0"
              step="0.01"
              value={form.deductions}
              onChange={handleChange}
              required
            />
          </label>

          <label>
            Bonus (₹)
            <input
              type="number"
              name="bonus"
              min="0"
              step="0.01"
              value={form.bonus}
              onChange={handleChange}
              required
            />
          </label>

          <label>
            Payroll Month
            <input
              type="month"
              name="month"
              value={form.month}
              onChange={handleChange}
              required
            />
          </label>

          <div className="payroll-net-preview">
            <span>Calculated Net Salary</span>
            <strong>{money(netSalary)}</strong>
          </div>

          <button type="submit" disabled={saving}>
            {saving ? "Generating..." : "Generate Payroll"}
          </button>
        </form>
      </section>

      <section className="payroll-panel">
        <h2>Salary Records</h2>

        {loading ? (
          <p>Loading payroll records...</p>
        ) : payrolls.length === 0 ? (
          <p>No payroll records found.</p>
        ) : (
          <div className="payroll-table-wrap">
            <table className="payroll-table">
              <thead>
                <tr>
                  <th>Payroll ID</th>
                  <th>Employee ID</th>
                  <th>Month</th>
                  <th>Basic Salary</th>
                  <th>Allowances</th>
                  <th>Deductions</th>
                  <th>Bonus</th>
                  <th>Net Salary</th>
                </tr>
              </thead>

              <tbody>
                {payrolls.map((item) => (
                  <tr key={item.id}>
                    <td>{item.id}</td>
                    <td>{item.employee_id}</td>
                    <td>{item.month}</td>
                    <td>{money(item.basic_salary)}</td>
                    <td>{money(item.allowances)}</td>
                    <td>{money(item.deductions)}</td>
                    <td>{money(item.bonus)}</td>
                    <td className="payroll-amount">
                      {money(item.net_salary)}
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
