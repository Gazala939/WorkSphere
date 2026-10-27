import { useEffect, useState } from "react";
import api from "../api";
import "../styles/Shifts.css";

export default function ShiftAssignments() {
  const [employees, setEmployees] = useState([]);
  const [shifts, setShifts] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [employeeId, setEmployeeId] = useState("");
  const [shiftId, setShiftId] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const loadData = async () => {
    try {
      const [employeeResponse, shiftResponse, assignmentResponse] =
        await Promise.all([
          api.get("/employees"),
          api.get("/shifts"),
          api.get("/employee-shifts"),
        ]);

      setEmployees(employeeResponse.data);
      setShifts(shiftResponse.data);
      setAssignments(assignmentResponse.data);
    } catch (err) {
      setError(
        err.response?.data?.detail ||
          "Unable to load employees, shifts, or assignments."
      );
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setMessage("");
    setError("");
    setLoading(true);

    try {
      await api.post("/employee-shifts", {
        employee_id: Number(employeeId),
        shift_id: Number(shiftId),
      });

      setMessage("Employee shift assigned successfully!");
      await loadData();
    } catch (err) {
      setError(
        err.response?.data?.detail ||
          "Unable to assign the shift."
      );
    } finally {
      setLoading(false);
    }
  };

  const getEmployeeName = (id) => {
    const employee = employees.find((item) => item.id === id);
    return employee
      ? employee.full_name
      : `Employee ID: ${id}`;
  };

  const getShiftName = (id) => {
    const shift = shifts.find((item) => item.id === id);
    return shift ? shift.name : `Shift ID: ${id}`;
  };

  return (
    <div className="shifts-page">
      <h1>Employee Shift Assignments</h1>
      <p>Assign a work shift to an employee.</p>

      <section className="shift-panel">
        <h2>Assign Shift</h2>

        <form onSubmit={handleSubmit} className="shift-form">
          <label>
            Select Employee
            <select
              value={employeeId}
              onChange={(event) => setEmployeeId(event.target.value)}
              required
            >
              <option value="">Choose an employee</option>
              {employees.map((employee) => (
                <option key={employee.id} value={employee.id}>
                  {employee.full_name} (ID: {employee.id})
                </option>
              ))}
            </select>
          </label>

          <label>
            Select Shift
            <select
              value={shiftId}
              onChange={(event) => setShiftId(event.target.value)}
              required
            >
              <option value="">Choose a shift</option>
              {shifts.map((shift) => (
                <option key={shift.id} value={shift.id}>
                  {shift.name} ({String(shift.start_time).slice(0, 5)} -{" "}
                  {String(shift.end_time).slice(0, 5)})
                </option>
              ))}
            </select>
          </label>

          <button type="submit" disabled={loading}>
            {loading ? "Saving..." : "Assign Shift"}
          </button>
        </form>

        {message && <p className="shift-success">{message}</p>}
        {error && <p className="shift-error">{error}</p>}
      </section>

      <section className="shift-panel">
        <h2>Current Assignments</h2>

        {assignments.length === 0 ? (
          <p>No shift assignments found.</p>
        ) : (
          <div className="shift-table-wrapper">
            <table className="shift-table">
              <thead>
                <tr>
                  <th>Assignment ID</th>
                  <th>Employee</th>
                  <th>Shift</th>
                </tr>
              </thead>

              <tbody>
                {assignments.map((assignment) => (
                  <tr key={assignment.id}>
                    <td>{assignment.id}</td>
                    <td>{getEmployeeName(assignment.employee_id)}</td>
                    <td>{getShiftName(assignment.shift_id)}</td>
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