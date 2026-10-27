import { useEffect, useState } from "react";
import api from "../api";
import "../styles/Shifts.css";

export default function Shifts() {
  const [shifts, setShifts] = useState([]);
  const [form, setForm] = useState({
    name: "Morning",
    start_time: "09:30",
    end_time: "18:30",
  });
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const loadShifts = async () => {
    try {
      const response = await api.get("/shifts");
      setShifts(response.data);
    } catch (err) {
      setError(
        err.response?.data?.detail || "Unable to load shifts."
      );
    }
  };

  useEffect(() => {
    loadShifts();
  }, []);

  const handleChange = (event) => {
    setForm({
      ...form,
      [event.target.name]: event.target.value,
    });
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setMessage("");
    setError("");
    setLoading(true);

    try {
      await api.post("/shifts", {
        name: form.name.trim(),
        start_time: form.start_time,
        end_time: form.end_time,
      });

      setMessage("Shift created successfully!");
      await loadShifts();
    } catch (err) {
      setError(
        err.response?.data?.detail || "Unable to create shift."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="shifts-page">
      <h1>Shift Management</h1>
      <p>Create and manage employee work shifts.</p>

      <section className="shift-panel">
        <h2>Create New Shift</h2>

        <form onSubmit={handleSubmit} className="shift-form">
          <label>
            Shift Name
            <select
              name="name"
              value={form.name}
              onChange={handleChange}
              required
            >
              <option value="Morning">Morning</option>
              <option value="Evening">Evening</option>
              <option value="Night">Night</option>
            </select>
          </label>

          <label>
            Start Time
            <input
              type="time"
              name="start_time"
              value={form.start_time}
              onChange={handleChange}
              required
            />
          </label>

          <label>
            End Time
            <input
              type="time"
              name="end_time"
              value={form.end_time}
              onChange={handleChange}
              required
            />
          </label>

          <button type="submit" disabled={loading}>
            {loading ? "Creating..." : "Create Shift"}
          </button>
        </form>

        {message && <p className="shift-success">{message}</p>}
        {error && <p className="shift-error">{error}</p>}
      </section>

      <section className="shift-panel">
        <h2>Available Shifts</h2>

        {shifts.length === 0 ? (
          <p>No shifts found. Create your first shift above.</p>
        ) : (
          <div className="shift-table-wrapper">
            <table className="shift-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Shift Name</th>
                  <th>Start Time</th>
                  <th>End Time</th>
                </tr>
              </thead>

              <tbody>
                {shifts.map((shift) => (
                  <tr key={shift.id}>
                    <td>{shift.id}</td>
                    <td>{shift.name}</td>
                    <td>{String(shift.start_time).slice(0, 5)}</td>
                    <td>{String(shift.end_time).slice(0, 5)}</td>
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