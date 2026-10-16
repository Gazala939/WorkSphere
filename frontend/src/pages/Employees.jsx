
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api";
import "../styles/Employees.css";

function Employees() {
  const navigate = useNavigate();

  const [employees, setEmployees] = useState([]);
  const [search, setSearch] = useState("");
  const [department, setDepartment] = useState("");
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchEmployees();
    }, 300);

    return () => clearTimeout(timer);
  }, [search, department, status]);

  async function fetchEmployees() {
    setLoading(true);
    setError("");

    try {
      const params = {};

      if (search.trim()) params.search = search.trim();
      if (department.trim()) params.department = department.trim();
      if (status) params.status = status;

      const response = await api.get("/employees", { params });
      setEmployees(response.data);
    } catch (err) {
      setError(
        err.response?.data?.detail ||
          "Unable to load employees. Please log in with an HR or ADMIN account."
      );
    } finally {
      setLoading(false);
    }
  }

  function clearFilters() {
    setSearch("");
    setDepartment("");
    setStatus("");
  }

  return (
    <div className="employees-page">
      <header className="employees-header">
        <div>
          <p className="employees-eyebrow">WORKSPHERE HRMS</p>
          <h1>Employee Management</h1>
          <p className="employees-subtitle">
            View, search, and manage employee records.
          </p>
        </div>

        <button
          className="employee-add-button"
          onClick={() => navigate("/employees/add")}
        >
          + Add Employee
        </button>
      </header>

      <section className="employee-stats">
        <div className="employee-stat-card">
          <span>Total employees shown</span>
          <strong>{employees.length}</strong>
        </div>

        <div className="employee-stat-card">
          <span>Active employees shown</span>
          <strong>
            {employees.filter((employee) => employee.status === "ACTIVE").length}
          </strong>
        </div>

        <div className="employee-stat-card">
          <span>Inactive employees shown</span>
          <strong>
            {employees.filter((employee) => employee.status === "INACTIVE").length}
          </strong>
        </div>
      </section>

      <section className="employee-list-card">
        <div className="employee-list-heading">
          <div>
            <h2>Employees</h2>
            <p>Search and filter employee records.</p>
          </div>

          <button className="employee-clear-button" onClick={clearFilters}>
            Clear filters
          </button>
        </div>

        <div className="employee-filters">
          <input
            type="text"
            placeholder="Search by name or designation..."
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            aria-label="Search employees"
          />

          <input
            type="text"
            placeholder="Filter by department"
            value={department}
            onChange={(event) => setDepartment(event.target.value)}
            aria-label="Filter by department"
          />

          <select
            value={status}
            onChange={(event) => setStatus(event.target.value)}
            aria-label="Filter by status"
          >
            <option value="">All statuses</option>
            <option value="ACTIVE">Active</option>
            <option value="INACTIVE">Inactive</option>
          </select>
        </div>

        {error && <div className="employee-error">{error}</div>}

        {loading ? (
          <p className="employee-message">Loading employees...</p>
        ) : employees.length === 0 ? (
          <div className="employee-empty">
            <h3>No employees found</h3>
            <p>Try changing your search or filters.</p>
          </div>
        ) : (
          <div className="employee-table-wrapper">
            <table className="employee-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Employee</th>
                  <th>Designation</th>
                  <th>Department</th>
                  <th>Joining Date</th>
                  <th>Salary</th>
                  <th>Status</th>
                  <th>Action</th>
                </tr>
              </thead>

              <tbody>
                {employees.map((employee) => (
                  <tr key={employee.id}>
                    <td>EMP-{String(employee.id).padStart(3, "0")}</td>

                    <td>

                      <button
                        type="button"
                        className="employee-name employee-name-link"
                        onClick={() => navigate(`/employees/${employee.id}`)}
                      >
                        {employee.full_name}
                      </button>
                      <small>User ID: {employee.user_id}</small>
                    </td>

                    <td>{employee.designation}</td>
                    <td>{employee.department}</td>

                    <td>
                      {employee.joining_date
                        ? new Date(
                            `${employee.joining_date}T00:00:00`
                          ).toLocaleDateString("en-IN")
                        : "—"}
                    </td>

                    <td>
                      {Number(employee.salary).toLocaleString("en-IN", {
                        style: "currency",
                        currency: "INR",
                        maximumFractionDigits: 2,
                      })}
                    </td>

                    <td>
                      <span
                        className={`employee-status ${
                          employee.status === "ACTIVE"
                            ? "status-active"
                            : "status-inactive"
                        }`}
                      >
                        {employee.status}
                      </span>
                    </td>

                    <td>
                      <button
                        className="employee-edit-button"
                        onClick={() =>
                          navigate(`/employees/${employee.id}/edit`)
                        }
                      >
                        Edit
                      </button>
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

export default Employees;
