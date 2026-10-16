
import { useEffect, useState } from "react";
import api from "../api";
import "../styles/Payroll.css";

export default function SalaryDetails() {
  const [payrolls, setPayrolls] = useState([]);
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
          <h1>My Salary Details</h1>
          <p>View your monthly salary, deductions, and bonus.</p>
        </div>
      </header>

      {error && <p className="payroll-error">{String(error)}</p>}

      {loading ? (
        <p>Loading your salary details...</p>
      ) : payrolls.length === 0 ? (
        <section className="payroll-panel">
          <h2>No Salary Records Yet</h2>
          <p>Your payroll records will appear here after payroll is generated.</p>
        </section>
      ) : (
        <section className="salary-cards">
          {payrolls.map((item) => (
            <article className="salary-card" key={item.id}>
              <p className="payroll-eyebrow">SALARY MONTH</p>
              <h2>{item.month}</h2>

              <div className="salary-net">
                <span>Net Salary</span>
                <strong>{money(item.net_salary)}</strong>
              </div>

              <div className="salary-line">
                <span>Basic Salary</span>
                <strong>{money(item.basic_salary)}</strong>
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
                <span>Payroll Record ID</span>
                <strong>{item.id}</strong>
              </div>
            </article>
          ))}
        </section>
      )}
    </div>
  );
}
