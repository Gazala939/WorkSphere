
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

  const [form, setForm] = useState({
    employee_id: "",
    basic_salary: "",
    deductions: "0",
    bonus: "0",
    month: new Date().toISOString().slice(0, 7),
  });

  const netSalary =
    Number(form.basic_salary || 0) +
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
        err.response?.data?.detail || "Unable to load payroll information."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  function handleChange(e) {
    setForm({ ...form, [e.target.name]: e.target.value });
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setMessage("");

    if (netSalary < 0) {
      setError("Deductions cannot exceed basic salary plus bonus.");
      return;
    }

    setSaving(true);

    try {
      await api.post("/payroll", {
        employee_id: Number(form.employee_id),
        basic_salary: Number(form.basic_salary),
        deductions: Number(form.deductions),
        bonus: Number(form.bonus),
        month: form.month,
      });

      setMessage("Payroll generated successfully!");

      setForm({
        employee_id: "",
        basic_salary: "",
        deductions: "0",
        bonus: "0",
        month: new Date().toISOString().slice(0, 7),
      });

      await loadData();
    } catch (err) {
      setError(
        err.response?.data?.detail || "Unable to generate payroll."
      );
    } finally {
      setSaving(false);
    }
  }

  function money(value) {
    return Number(value).toLocaleString("en-IN", {
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

      <section className="payroll-stats">
        <article className="payroll-stat">
          <span>Total payroll records</span>
          <strong>{payrolls.length}</strong>
        </article>

        <article className="payroll-stat">
          <span>Total net payroll</span>
          <strong>
            {money(
              payrolls.reduce(
                (total, item) => total + Number(item.net_salary),
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
