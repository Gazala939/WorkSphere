
import { useAuth } from "../auth/AuthContext";
import { useNavigate } from "react-router-dom";

export default function Dashboard() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  async function handleLogout() {
    await logout();
    navigate("/login");
  }

  return (
    <div style={{ padding: "40px", fontFamily: "Arial" }}>
      <h1>WorkSphere HRMS</h1>
      <h2>Welcome, {user?.username}!</h2>
      <p>Email: {user?.email}</p>
      <p>Role: {user?.role}</p>

      <h3>{user?.role} Dashboard</h3>
      <p>Your account is authenticated successfully.</p>

      <button onClick={handleLogout}>Logout</button>
    </div>
  );
}
