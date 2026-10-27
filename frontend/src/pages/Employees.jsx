
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api";
import "../styles/Employees.css";

function Employees() {
  const navigate = useNavigate();

  const [employees, setEmployees] = useState([]);
  const [search, setSearch] = useState("");
  const [department, setDepartment] = useState("");
  const [role, setRole] = useState("");
  const [status, setStatus] = useState("");
  const [attendance, setAttendance] = useState("");
  const [performance, setPerformance] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchEmployees();
    }, 300);

    return () => clearTimeout(timer);
  }, [search, department, role, status, attendance, performance]);

  async function fetchEmployees() {
    setLoading(true);
    setError("");

    try {
      const params = {};

      if (search.trim()) params.search = search.trim();
      if (department.trim()) params.department = department.trim();
      if (role) params.role = role;
      if (status) params.status = status;
      if (attendance) params.attendance = attendance;
      if (performance) params.performance = performance;

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
    setRole("");
    setStatus("");
    setAttendance("");
    setPerformance("");
  }

  const activeCount = employees.filter(
    (employee) => employee.status === "ACTIVE"
  ).length;

  const inactiveCount = employees.filter(
    (employee) => employee.status === "INACTIVE"
  ).length;

  return (
    <div className="employees-page">
      <header className="employees-header">
        <div>
          <p className="employees-eyebrow">WORKSPHERE HRMS</p>
          <h1>Employee Management</h1>
          <p className="employees-subtitle">
            Search, filter, and manage employee records.
          </p>
        </div>

        <button
          type="button"
          className="employee-add-button"
          onClick={() => navigate("/employees/add")}
        >
          + Add Employee
        </button>
      </header>

      {/* Employee summary cards */}
      <section className="employee-stats">
        <div className="employee-stat-card">
          <span>Employees Found</span>
          <strong>{employees.length}</strong>
        </div>

        <div className="employee-stat-card">
          <span>Active Employees</span>
          <strong>{activeCount}</strong>
        </div>

        <div className="employee-stat-card">
          <span>Inactive Employees</span>
          <strong>{inactiveCount}</strong>
        </div>
      </section>

      {/* Advanced search and filters */}
      <section className="employee-list-card">
        <div className="employee-list-heading">
          <div>
            <h2>Advanced Employee Search</h2>
            <p>
              Find employees using multiple search and filter options.
            </p>
          </div>

          <button
            type="button"
            className="employee-clear-button"
            onClick={clearFilters}
          >
            Clear Filters
          </button>
        </div>

        <div className="employee-filters">
          <div className="employee-filter-field employee-search-field">
            <label htmlFor="employee-search">Search Employee</label>
            <input
              id="employee-search"
              type="text"
              placeholder="Search name or designation..."
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </div>

          <div className="employee-filter-field">
            <label htmlFor="employee-department">Department</label>
            <input
              id="employee-department"
              type="text"
              placeholder="Enter department..."
              value={department}
              onChange={(event) => setDepartment(event.target.value)}
            />
          </div>

          <div className="employee-filter-field">
            <label htmlFor="employee-role">User Role</label>
            <select
              id="employee-role"
              value={role}
              onChange={(event) => setRole(event.target.value)}
            >
              <option value="">All Roles</option>
              <option value="EMPLOYEE">Employee</option>
              <option value="HR">HR</option>
              <option value="ADMIN">Admin</option>
            </select>
          </div>

          <div className="employee-filter-field">
            <label htmlFor="employee-status">Employee Status</label>
            <select
              id="employee-status"
              value={status}
              onChange={(event) => setStatus(event.target.value)}
            >
              <option value="">All Statuses</option>
              <option value="ACTIVE">Active</option>
              <option value="INACTIVE">Inactive</option>
            </select>
          </div>

          <div className="employee-filter-field">
            <label htmlFor="employee-attendance">Attendance</label>
            <select
              id="employee-attendance"
              value={attendance}
              onChange={(event) => setAttendance(event.target.value)}
            >
              <option value="">All Attendance</option>
              <option value="PRESENT">Present</option>
              <option value="ABSENT">Absent</option>
              <option value="HALF_DAY">Half Day</option>
              <option value="NOT_RECORDED">Not Recorded</option>
            </select>
          </div>

          <div className="employee-filter-field">
            <label htmlFor="employee-performance">Performance</label>
            <select
              id="employee-performance"
              value={performance}
              onChange={(event) => setPerformance(event.target.value)}
            >
              <option value="">All Performance</option>
              <option value="HIGH">High</option>
              <option value="AVERAGE">Average</option>
              <option value="LOW">Low</option>
              <option value="NOT_REVIEWED">Not Reviewed</option>
            </select>
          </div>
        </div>

        <div className="employee-results-info">
          {loading
            ? "Updating employee results..."
            : `${employees.length} employee(s) found`}
        </div>

        {error && (
          <div className="employee-error" role="alert">
            {error}
          </div>
        )}

        {loading ? (
          <p className="employee-message">Loading employees...</p>
        ) : employees.length === 0 ? (
          <div className="employee-empty">
            <h3>No employees found</h3>
            <p>Try changing your search or clearing some filters.</p>
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
                        onClick={() =>
                          navigate(`/employees/${employee.id}`)
                        }
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
                        type="button"
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
