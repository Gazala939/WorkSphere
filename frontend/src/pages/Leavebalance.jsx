
import { useEffect, useState } from "react";
import api from "../api";
import "../styles/LeaveBalance.css";

export default function LeaveBalance() {
  const [balances, setBalances] = useState([]);
  const [policies, setPolicies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadLeaveData() {
      try {
        setError("");

        const [balanceResponse, policyResponse] = await Promise.all([
          api.get("/leave-balances/me"),
          api.get("/leave-policies/overview"),
        ]);

        setBalances(balanceResponse.data);
        setPolicies(policyResponse.data);
      } catch (err) {
        setError(
          err.response?.data?.detail ||
            "Unable to load leave information."
        );
      } finally {
        setLoading(false);
      }
    }

    loadLeaveData();
  }, []);

  if (loading) {
    return <div className="leave-page">Loading leave information...</div>;
  }

  return (
    <div className="leave-page">
      <div className="leave-page-header">
        <div>
          <h1>Leave Balance & Policies</h1>
          <p>View your remaining leave days and company leave policies.</p>
        </div>
      </div>

      {error && <div className="leave-error">{error}</div>}

      {!error && (
        <>
          <section className="leave-section">
            <h2>My Leave Balance</h2>

            {balances.length === 0 ? (
              <p className="leave-empty">
                No leave balances are assigned to your account yet.
              </p>
            ) : (
              <div className="leave-card-grid">
                {balances.map((balance) => (
                  <article className="leave-card" key={balance.id}>
                    <p className="leave-type">{balance.leave_type} LEAVE</p>
                    <h3>{balance.remaining_days}</h3>
                    <p>Days remaining</p>
                  </article>
                ))}
              </div>
            )}
          </section>

          <section className="leave-section">
            <h2>Leave Policy Overview</h2>

            {policies.length === 0 ? (
              <p className="leave-empty">No leave policies are available.</p>
            ) : (
              <div className="leave-table-wrapper">
                <table className="leave-table">
                  <thead>
                    <tr>
                      <th>Leave Type</th>
                      <th>Total Days Allowed</th>
                    </tr>
                  </thead>
                  <tbody>
                    {policies.map((policy) => (
                      <tr key={policy.id}>
                        <td>{policy.leave_type}</td>
                        <td>{policy.total_days_allowed} days</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );
}
