
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";

import { AuthProvider, useAuth } from "./auth/AuthContext";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Dashboard from "./pages/Dashboard";
import Employees from "./pages/Employees";
import ProtectedRoute from "./components/ProtectedRoute";

import EmployeeForm from "./pages/EmployeeForm";
import EditEmployee from "./pages/EditEmployee";
import EmployeeProfile from "./pages/EmployeeProfile";
import Attendance from "./pages/Attendance";
import ApplyLeave from "./pages/ApplyLeave";
import LeaveHistory from "./pages/LeaveHistory";
import ManageLeaves from "./pages/ManageLeaves";

import PayrollDashboard from "./pages/PayrollDashboard";
import SalaryDetails from "./pages/SalaryDetails";

import MyProfile from "./pages/MyProfile";

import LeaveBalance from "./pages/LeaveBalance";

import UserManagement from "./pages/UserManagement";

import Shifts from "./pages/Shifts";
import ShiftAssignments from "./pages/ShiftAssignments";

import LeaveCalendar from "./pages/LeaveCalendar";

import Documents from "./pages/Documents";

import PerformanceReviews from "./pages/PerformanceReviews";

import AdvancedReports from "./pages/AdvancedReports";

function DashboardRedirect() {
  const { user } = useAuth();

  if (!user) return <Navigate to="/login" replace />;

  if (user.role === "ADMIN") {
    return <Navigate to="/admin" replace />;
  }

  if (user.role === "HR") {
    return <Navigate to="/hr" replace />;
  }

  return <Navigate to="/employee" replace />;
}



function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/login" replace />} />

      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />

      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <DashboardRedirect />
          </ProtectedRoute>
        }
      />

      <Route
        path="/employee"
        element={
          <ProtectedRoute roles={["EMPLOYEE"]}>
            <Dashboard />
          </ProtectedRoute>
        }
      />

      <Route
        path="/my-profile"
        element={
          <ProtectedRoute roles={["EMPLOYEE"]}>
            <MyProfile />
          </ProtectedRoute>
        }
      />

      <Route
        path="/attendance"
        element={
          <ProtectedRoute roles={["EMPLOYEE"]}>
            <Attendance />
          </ProtectedRoute>
        }
      />

      <Route
        path="/employees/:employeeId"
        element={
          <ProtectedRoute roles={["HR", "ADMIN"]}>
            <EmployeeProfile />
          </ProtectedRoute>
        }
      />

      <Route
        path="/hr"
        element={
          <ProtectedRoute roles={["HR", "ADMIN"]}>
            <Dashboard />
          </ProtectedRoute>
        }
      />

      <Route
        path="/admin"
        element={
          <ProtectedRoute roles={["ADMIN"]}>
            <Dashboard />
          </ProtectedRoute>
        }
      />
      

      <Route
        path="/admin/users"
        element={
          <ProtectedRoute roles={["ADMIN"]}>
            <UserManagement />
          </ProtectedRoute>
        }
      />

      {/* Module 2: Employee Management */}
      <Route
        path="/employees"
        element={
          <ProtectedRoute roles={["HR", "ADMIN"]}>
            <Employees />
          </ProtectedRoute>
        }
      />

      <Route
        path="/employees/add"
        element={
          <ProtectedRoute roles={["HR", "ADMIN"]}>
            <EmployeeForm />
          </ProtectedRoute>
        }
      />

      
      <Route
        path="/employees/:employeeId/edit"
        element={
          <ProtectedRoute roles={["HR", "ADMIN"]}>
            <EditEmployee />
          </ProtectedRoute>
        }
      />

      <Route
        path="/leaves/apply"
        element={
          <ProtectedRoute roles={["EMPLOYEE"]}>
            <ApplyLeave />
          </ProtectedRoute>
        }
      />

      <Route
        path="/leaves/history"
        element={
          <ProtectedRoute roles={["EMPLOYEE"]}>
            <LeaveHistory />
          </ProtectedRoute>
        }
      />

      <Route
        path="/leave-balance"
        element={
          <ProtectedRoute roles={["EMPLOYEE"]}>
            <LeaveBalance />
          </ProtectedRoute>
        }
      />

      <Route
        path="/leaves/manage"
        element={
          <ProtectedRoute roles={["HR", "ADMIN"]}>
            <ManageLeaves />
          </ProtectedRoute>
        }
      />

      {/* Module 5: Payroll Management */}

      <Route
        path="/payroll"
        element={
          <ProtectedRoute roles={["HR", "ADMIN"]}>
            <PayrollDashboard />
          </ProtectedRoute>
        }
      />

      <Route
        path="/salary-details"
        element={
          <ProtectedRoute roles={["EMPLOYEE"]}>
            <SalaryDetails />
          </ProtectedRoute>
        }
      />

      {/* Module 14: Shift Management */}
      <Route
        path="/shifts"
        element={
          <ProtectedRoute roles={["HR", "ADMIN"]}>
            <Shifts />
          </ProtectedRoute>
        }
      />

      <Route
        path="/shift-assignments"
        element={
          <ProtectedRoute roles={["HR", "ADMIN"]}>
            <ShiftAssignments />
          </ProtectedRoute>
        }
      />

      <Route
        path="/leave-calendar"
        element={
          <ProtectedRoute roles={["EMPLOYEE", "HR", "ADMIN"]}>
            <LeaveCalendar />
          </ProtectedRoute>
        }
      />

      {/* Module 16: Document Management */}
      <Route
        path="/documents"
        element={
          <ProtectedRoute roles={["EMPLOYEE", "HR", "ADMIN"]}>
            <Documents />
          </ProtectedRoute>
        }
      />

      <Route
        path="/performance-reviews"
        element={
          <ProtectedRoute>
            <PerformanceReviews />
          </ProtectedRoute>
        }
      />

      <Route
        path="/advanced-reports"
        element={
          <ProtectedRoute roles={["HR", "ADMIN"]}>
            <AdvancedReports />
          </ProtectedRoute>
        }
      />


      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  );
}
