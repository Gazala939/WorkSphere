
import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import api from "../api";
import "../styles/EmployeeProfile.css";

function EmployeeProfile() {
  const { employeeId } = useParams();
  const navigate = useNavigate();

  const [employee, setEmployee] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function fetchEmployee() {
      try {
        const response = await api.get(`/employees/${employeeId}`);
        setEmployee(response.data);
      } catch (err) {
        setError(
          err.response?.data?.detail ||
            "Unable to load employee profile."
        );
      } finally {
        setLoading(false);
      }
    }

    fetchEmployee();
  }, [employeeId]);

  if (loading) {
    return <p className="profile-message">Loading employee profile...</p>;
  }

  if (error) {
    return (
      <div className="employee-profile-page">
        <p className="profile-error">{error}</p>
        <button onClick={() => navigate("/employees")}>
          Back to Employees
        </button>
      </div>
    );
  }

  if (!employee) {
    return <p className="profile-message">Employee not found.</p>;
  }

  return (
    <div className="employee-profile-page">
      <header className="profile-header">
        <div>
          <p className="profile-eyebrow">WORKSPHERE HRMS</p>
          <h1>Employee Profile</h1>
          <p>View employee information and employment details.</p>
        </div>

        <button
          className="profile-back-button"
          onClick={() => navigate("/employees")}
        >
          Back to Employees
        </button>
      </header>

      <section className="profile-card">
        <div className="profile-identity">
          <div className="profile-avatar">
            {employee.full_name?.charAt(0)?.toUpperCase() || "E"}
          </div>

          <div>
            <h2>{employee.full_name}</h2>
            <p>EMP-{String(employee.id).padStart(3, "0")}</p>
            <span
              className={`profile-status ${
                employee.status === "ACTIVE"
                  ? "profile-active"
                  : "profile-inactive"
              }`}
            >
              {employee.status}
            </span>
          </div>
        </div>

        <div className="profile-details">
          <div>
            <span>Linked User ID</span>
            <strong>{employee.user_id}</strong>
          </div>

          <div>
            <span>Designation</span>
            <strong>{employee.designation}</strong>
          </div>

          <div>
            <span>Department</span>
            <strong>{employee.department}</strong>
          </div>

          <div>
            <span>Joining Date</span>
            <strong>
              {employee.joining_date
                ? new Date(
                    `${employee.joining_date}T00:00:00`
                  ).toLocaleDateString("en-IN")
                : "—"}
            </strong>
          </div>

          <div>
            <span>Salary</span>
            <strong>
              {Number(employee.salary).toLocaleString("en-IN", {
                style: "currency",
                currency: "INR",
                maximumFractionDigits: 2,
              })}
            </strong>
          </div>

          <div>
            <span>Employment Status</span>
            <strong>{employee.status}</strong>
          </div>
        </div>

        <button
          className="profile-edit-button"
          onClick={() => navigate(`/employees/${employee.id}/edit`)}
        >
          Edit Employee
        </button>
      </section>
    </div>
  );
}

export default EmployeeProfile;
