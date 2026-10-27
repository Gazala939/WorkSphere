
import { useCallback, useEffect, useState } from "react";
import api from "../api";
import "../styles/LeaveCalendar.css";

function getLocalDateString(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function getMonthString(date = new Date()) {
  return getLocalDateString(date).slice(0, 7);
}

function getMonthRange(monthString) {
  const [year, month] = monthString.split("-").map(Number);

  return {
    start: `${year}-${String(month).padStart(2, "0")}-01`,
    end: getLocalDateString(new Date(year, month, 0)),
  };
}

function formatDate(value) {
  if (!value) return "—";

  return new Date(`${value}T00:00:00`).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export default function LeaveCalendar() {
  const today = getLocalDateString();

  const [startDate, setStartDate] = useState(
    `${today.slice(0, 7)}-01`
  );
  const [endDate, setEndDate] = useState(today);
  const [selectedDate, setSelectedDate] = useState(today);
  const [calendarMonth, setCalendarMonth] = useState(getMonthString());
  const [department, setDepartment] = useState("");

  const [leaves, setLeaves] = useState([]);
  const [calendarLeaves, setCalendarLeaves] = useState([]);
  const [team, setTeam] = useState([]);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const loadData = useCallback(async () => {
    if (!startDate || !endDate || !selectedDate || !calendarMonth) {
      return;
    }

    if (startDate > endDate) {
      setError("Leave start date cannot be after leave end date.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const monthRange = getMonthRange(calendarMonth);

      const leaveParams = {
        start_date: startDate,
        end_date: endDate,
      };

      const calendarParams = {
        start_date: monthRange.start,
        end_date: monthRange.end,
      };

      const teamParams = {
        selected_date: selectedDate,
      };

      if (department.trim()) {
        leaveParams.department = department.trim();
        calendarParams.department = department.trim();
        teamParams.department = department.trim();
      }

      const [leaveResponse, calendarResponse, teamResponse] =
        await Promise.all([
          api.get("/leave-calendar", { params: leaveParams }),
          api.get("/leave-calendar", { params: calendarParams }),
          api.get("/team-availability", { params: teamParams }),
        ]);

      setLeaves(leaveResponse.data);
      setCalendarLeaves(calendarResponse.data);
      setTeam(teamResponse.data);
    } catch (err) {
      setError(
        err.response?.data?.detail ||
          "Unable to load leave calendar. Please check your login and try again."
      );
    } finally {
      setLoading(false);
    }
  }, [startDate, endDate, selectedDate, calendarMonth, department]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  function getMonthDays() {
    const [year, month] = calendarMonth.split("-").map(Number);

    const firstWeekday = new Date(year, month - 1, 1).getDay();
    const daysInMonth = new Date(year, month, 0).getDate();

    return [
      ...Array(firstWeekday).fill(null),
      ...Array.from({ length: daysInMonth }, (_, index) => index + 1),
    ];
  }

  function getLeavesForDay(day) {
    if (!day) return [];

    const [year, month] = calendarMonth.split("-").map(Number);

    const date = [
      year,
      String(month).padStart(2, "0"),
      String(day).padStart(2, "0"),
    ].join("-");

    return calendarLeaves.filter(
      (leave) =>
        leave.status === "APPROVED" &&
        leave.start_date <= date &&
        leave.end_date >= date
    );
  }

  function changeMonth(amount) {
    const [year, month] = calendarMonth.split("-").map(Number);
    const nextMonth = new Date(year, month - 1 + amount, 1);

    setCalendarMonth(getMonthString(nextMonth));
  }

  function handleDepartmentChange(event) {
    setDepartment(event.target.value);
  }

  const monthLabel = new Date(
    `${calendarMonth}-01T00:00:00`
  ).toLocaleDateString("en-IN", {
    month: "long",
    year: "numeric",
  });

  const onLeaveCount = team.filter(
    (employee) => employee.availability === "ON_LEAVE"
  ).length;

  return (
    <main className="leave-calendar-page">
      <header className="leave-calendar-header">
        <div>
          <p className="leave-calendar-eyebrow">WORKSPHERE HRMS</p>
          <h1>Leave Calendar &amp; Team Availability</h1>
          <p>
            View approved employee leaves and check team availability.
          </p>
        </div>

        <button
          type="button"
          className="leave-refresh-button"
          onClick={loadData}
          disabled={loading}
        >
          {loading ? "Loading..." : "↻ Refresh"}
        </button>
      </header>

      {error && <div className="leave-error">{error}</div>}

      {/* Filters */}
      <section className="leave-filter-panel">
        <div className="leave-filter-field">
          <label htmlFor="leave-start-date">Leave start date</label>
          <input
            id="leave-start-date"
            type="date"
            value={startDate}
            max={endDate}
            onChange={(event) => setStartDate(event.target.value)}
          />
        </div>

        <div className="leave-filter-field">
          <label htmlFor="leave-end-date">Leave end date</label>
          <input
            id="leave-end-date"
            type="date"
            value={endDate}
            min={startDate}
            onChange={(event) => setEndDate(event.target.value)}
          />
        </div>

        <div className="leave-filter-field">
          <label htmlFor="team-date">Check team on</label>
          <input
            id="team-date"
            type="date"
            value={selectedDate}
            onChange={(event) => setSelectedDate(event.target.value)}
          />
        </div>

        <div className="leave-filter-field">
          <label htmlFor="leave-department">Department</label>
          <input
            id="leave-department"
            type="text"
            placeholder="All departments"
            value={department}
            onChange={handleDepartmentChange}
          />
        </div>
      </section>

      {/* Summary cards */}
      <section className="leave-summary-grid">
        <article className="leave-summary-card">
          <span className="leave-summary-icon">📅</span>
          <div>
            <p>Approved Leave Records</p>
            <h2>{leaves.length}</h2>
          </div>
        </article>

        <article className="leave-summary-card">
          <span className="leave-summary-icon">👥</span>
          <div>
            <p>Employees in Team</p>
            <h2>{team.length}</h2>
          </div>
        </article>

        <article className="leave-summary-card">
          <span className="leave-summary-icon">🏖️</span>
          <div>
            <p>On Approved Leave</p>
            <h2>{onLeaveCount}</h2>
          </div>
        </article>
      </section>

      {/* Monthly calendar */}
      <section className="leave-section">
        <div className="leave-section-heading monthly-calendar-heading">
          <div>
            <h2>Monthly Leave Calendar</h2>
            <p>
              Approved leaves for {monthLabel}. Employees on leave are
              highlighted.
            </p>
          </div>

          <div className="calendar-month-controls">
            <button
              type="button"
              className="calendar-nav-button"
              onClick={() => changeMonth(-1)}
              aria-label="Previous month"
            >
              ‹
            </button>

            <input
              type="month"
              aria-label="Choose calendar month"
              value={calendarMonth}
              onChange={(event) => {
                if (event.target.value) {
                  setCalendarMonth(event.target.value);
                }
              }}
            />

            <button
              type="button"
              className="calendar-nav-button"
              onClick={() => changeMonth(1)}
              aria-label="Next month"
            >
              ›
            </button>
          </div>
        </div>

        {loading ? (
          <p className="leave-message">Loading monthly calendar...</p>
        ) : (
          <>
            <div className="monthly-calendar-grid">
              {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map(
                (day) => (
                  <div className="calendar-weekday" key={day}>
                    {day}
                  </div>
                )
              )}

              {getMonthDays().map((day, index) => {
                const dayLeaves = getLeavesForDay(day);

                return (
                  <div
                    className={`calendar-day ${
                      day && dayLeaves.length ? "calendar-day-has-leave" : ""
                    }`}
                    key={`${calendarMonth}-${index}`}
                  >
                    {day && (
                      <>
                        <span className="calendar-day-number">{day}</span>

                        {dayLeaves.map((leave) => (
                          <div
                            className="calendar-leave"
                            key={leave.leave_id}
                            title={`${leave.employee_name} — ${leave.leave_type}`}
                          >
                            <span>{leave.employee_name}</span>
                            <small>{leave.leave_type}</small>
                          </div>
                        ))}
                      </>
                    )}
                  </div>
                );
              })}
            </div>

            <p className="calendar-legend">
              <span className="calendar-legend-dot" />
              Approved employee leave
            </p>
          </>
        )}
      </section>

      {/* Approved leave records */}
      <section className="leave-section">
        <div className="leave-section-heading">
          <div>
            <h2>Approved Leave Records</h2>
            <p>
              Approved leaves overlapping {formatDate(startDate)} to{" "}
              {formatDate(endDate)}
            </p>
          </div>
        </div>

        {loading ? (
          <p className="leave-message">Loading leave records...</p>
        ) : leaves.length === 0 ? (
          <p className="leave-message">
            No approved leaves found for these filters.
          </p>
        ) : (
          <div className="leave-table-wrapper">
            <table className="leave-table">
              <thead>
                <tr>
                  <th>Employee</th>
                  <th>Department</th>
                  <th>Leave Type</th>
                  <th>Start Date</th>
                  <th>End Date</th>
                  <th>Status</th>
                </tr>
              </thead>

              <tbody>
                {leaves.map((leave) => (
                  <tr key={leave.leave_id}>
                    <td>{leave.employee_name}</td>
                    <td>{leave.department}</td>
                    <td>{leave.leave_type}</td>
                    <td>{formatDate(leave.start_date)}</td>
                    <td>{formatDate(leave.end_date)}</td>
                    <td>
                      <span className="leave-status-approved">
                        {leave.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Team availability */}
      <section className="leave-section">
        <div className="leave-section-heading">
          <div>
            <h2>Team Availability</h2>
            <p>Availability on {formatDate(selectedDate)}</p>
          </div>
        </div>

        {loading ? (
          <p className="leave-message">Loading team availability...</p>
        ) : team.length === 0 ? (
          <p className="leave-message">
            No eligible employees found for these filters.
          </p>
        ) : (
          <div className="leave-table-wrapper">
            <table className="leave-table">
              <thead>
                <tr>
                  <th>Employee</th>
                  <th>Department</th>
                  <th>Availability</th>
                  <th>Leave Type</th>
                  <th>Leave Dates</th>
                </tr>
              </thead>

              <tbody>
                {team.map((employee) => (
                  <tr key={employee.employee_id}>
                    <td>{employee.employee_name}</td>
                    <td>{employee.department}</td>
                    <td>
                      <span
                        className={
                          employee.availability === "ON_LEAVE"
                            ? "leave-status-away"
                            : "leave-status-available"
                        }
                      >
                        {employee.availability.replace("_", " ")}
                      </span>
                    </td>
                    <td>{employee.leave_type || "—"}</td>
                    <td>
                      {employee.leave_start_date
                        ? `${formatDate(employee.leave_start_date)} – ${formatDate(employee.leave_end_date)}`
                        : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </main>
  );
}
