
import { Navigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";

export default function ProtectedRoute({ children, roles }) {
  const { user, loading } = useAuth();

  // Wait until saved login information has been checked
  if (loading) {
    return <p>Checking login...</p>;
  }

  // Redirect if the user is not logged in
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // Restrict access based on role
  if (roles && !roles.includes(user.role)) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
}
