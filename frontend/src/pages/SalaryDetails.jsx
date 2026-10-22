
import { useEffect, useMemo, useState } from "react";
import api from "../api";
import "../styles/Payroll.css";

export default function SalaryDetails() {
  const [payrolls, setPayrolls] = useState([]);
  const [selectedMonth, setSelectedMonth] = useState("ALL");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadSalaryDetails() {
      try {
        const response = await api.get("/payroll/me");
        setPayrolls(response.data);
      } catch (err) {
        setError(
          err.response?.data?.detail ||
            "Unable to load your salary details."
        );
      } finally {
        setLoading(false);
      }
    }

    loadSalaryDetails();
  }, []);

  function money(value) {
    return Number(value || 0).toLocaleString("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 2,
    });
  }

  const months = useMemo(
    () => [...new Set(payrolls.map((item) => item.month))].sort().reverse(),
    [payrolls]
  );

  const filteredPayrolls = useMemo(
    () =>
      selectedMonth === "ALL"
        ? payrolls
        : payrolls.filter((item) => item.month === selectedMonth),
    [payrolls, selectedMonth]
  );

  const totals = useMemo(
    () =>
      filteredPayrolls.reduce(
        (result, item) => ({
          basic: result.basic + Number(item.basic_salary || 0),
          allowances: result.allowances + Number(item.allowances || 0),
          bonus: result.bonus + Number(item.bonus || 0),
          deductions: result.deductions + Number(item.deductions || 0),
          net: result.net + Number(item.net_salary || 0),
        }),
        {
          basic: 0,
          allowances: 0,
          bonus: 0,
          deductions: 0,
          net: 0,
        }
      ),
    [filteredPayrolls]
  );

  return (
    <div className="payroll-page">
      <header className="payroll-header">
        <div>
          <p className="payroll-eyebrow">WORKSPHERE HRMS</p>
          <h1>My Payslips</h1>
          <p>View your monthly salary breakdown and payroll history.</p>
        </div>
      </header>

      {error && <p className="payroll-error">{String(error)}</p>}

      {loading ? (
        <p>Loading your payslips...</p>
      ) : payrolls.length === 0 ? (
        <section className="payroll-panel">
          <h2>No Payslips Yet</h2>
          <p>
            Your salary details will appear here after HR generates
            your payroll.
          </p>
        </section>
      ) : (
        <>
          <section className="payroll-panel">
            <label>
              Select Salary Month
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
              >
                <option value="ALL">All Months</option>
                {months.map((month) => (
                  <option key={month} value={month}>
                    {month}
                  </option>
                ))}
              </select>
            </label>
          </section>

          <section className="payroll-stats">
            <article className="payroll-stat">
              <span>Payroll Records</span>
              <strong>{filteredPayrolls.length}</strong>
            </article>

            <article className="payroll-stat">
              <span>Total Basic Salary</span>
              <strong>{money(totals.basic)}</strong>
            </article>

            <article className="payroll-stat">
              <span>Total Allowances</span>
              <strong>{money(totals.allowances)}</strong>
            </article>

            <article className="payroll-stat">
              <span>Total Bonus</span>
              <strong>{money(totals.bonus)}</strong>
            </article>

            <article className="payroll-stat">
              <span>Total Deductions</span>
              <strong>{money(totals.deductions)}</strong>
            </article>

            <article className="payroll-stat">
              <span>Total Net Salary</span>
              <strong>{money(totals.net)}</strong>
            </article>
          </section>

          {filteredPayrolls.length === 0 ? (
            <section className="payroll-panel">
              <p>No payroll records for this month.</p>
            </section>
          ) : (
            <section className="payroll-panel">
              <h2>Salary History</h2>

              <div className="payroll-table-wrap">
                <table className="payroll-table">
                  <thead>
                    <tr>
                      <th>Month</th>
                      <th>Basic Salary</th>
                      <th>Allowances</th>
                      <th>Bonus</th>
                      <th>Deductions</th>
                      <th>Net Salary</th>
                      <th>Record ID</th>
                    </tr>
                  </thead>

                  <tbody>
                    {filteredPayrolls.map((item) => (
                      <tr key={item.id}>
                        <td>{item.month}</td>
                        <td>{money(item.basic_salary)}</td>
                        <td>{money(item.allowances)}</td>
                        <td>{money(item.bonus)}</td>
                        <td>{money(item.deductions)}</td>
                        <td className="payroll-amount">
                          {money(item.net_salary)}
                        </td>
                        <td>{item.id}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          )}

          {filteredPayrolls.map((item) => (
            <section className="salary-cards" key={item.id}>
              <article className="salary-card payslip-print-area">
                <p className="payroll-eyebrow">WORKSPHERE HRMS · PAYSLIP</p>
                <h2>Salary Slip — {item.month}</h2>

                <button
                  type="button"
                  className="payslip-print-btn"
                  onClick={() => window.print()}
                >
                  Print / Save as PDF
                </button>

                <div className="salary-net">
                  <span>Net Salary</span>
                  <strong>{money(item.net_salary)}</strong>
                </div>

                <div className="salary-line">
                  <span>Basic Salary</span>
                  <strong>{money(item.basic_salary)}</strong>
                </div>

                <div className="salary-line">
                  <span>Allowances</span>
                  <strong>{money(item.allowances)}</strong>
                </div>

                <div className="salary-line">
                  <span>Bonus</span>
                  <strong>{money(item.bonus)}</strong>
                </div>

                <div className="salary-line">
                  <span>Deductions</span>
                  <strong>{money(item.deductions)}</strong>
                </div>

                <div className="salary-line">
                  <span>Payroll Reference</span>
                  <strong>#{item.id}</strong>
                </div>
              </article>
            </section>
          ))}
        </>
      )}
    </div>
  );
}
