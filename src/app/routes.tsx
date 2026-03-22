import { createBrowserRouter } from "react-router";
import SplashScreen from "./components/SplashScreen";
import LoginPage from "./components/LoginPage";
import StudentDashboard from "./components/student/StudentDashboard";
import CoordinatorDashboard from "./components/coordinator/CoordinatorDashboard";
import JuryDashboard from "./components/jury/JuryDashboard";
import AdminDashboard from "./components/admin/AdminDashboard";
import ProtectedRoute from "./components/ProtectedRoute";

export const router = createBrowserRouter([
  {
    path: "/",
    Component: SplashScreen,
  },
  {
    path: "/login",
    Component: LoginPage,
  },
  {
    path: "/student",
    element: (
      <ProtectedRoute allowedRole="student">
        <StudentDashboard />
      </ProtectedRoute>
    ),
  },
  {
    path: "/coordinator",
    element: (
      <ProtectedRoute allowedRole="coordinator">
        <CoordinatorDashboard />
      </ProtectedRoute>
    ),
  },
  {
    path: "/jury",
    element: (
      <ProtectedRoute allowedRole="jury">
        <JuryDashboard />
      </ProtectedRoute>
    ),
  },
  {
    path: "/admin",
    element: (
      <ProtectedRoute allowedRole="admin">
        <AdminDashboard />
      </ProtectedRoute>
    ),
  },
]);
