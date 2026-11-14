import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";

import LoginPage from "./pages/auth/LoginPage";
import RegisterPage from "./pages/auth/RegisterPage";
import OverviewPage from "./pages/dashboard/OverviewPage";

import ProtectedRoute from "./routes/ProtectedRoute";
import DashboardLayout from "./layouts/DashboardLayout";
import WorkflowsPage from "./pages/workflows/WorkflowsPage";
import MyRequestsPage from "./pages/requests/MyRequestsPage";
import PendingApprovalsPage from "./pages/approvals/PendingApprovalsPage";
import ActivityPage from "./pages/activity/ActivityPage";
import SettingsPage from "./pages/settings/SettingsPage";

function ComingSoon() {
  return <h2>This FlowPilot module is coming soon.</h2>;
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/login" replace />} />

        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />

        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <DashboardLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<OverviewPage />} />
          <Route path="workflows" element={<WorkflowsPage />} />
          <Route path="requests" element={<MyRequestsPage />} />
          <Route path="approvals" element={<PendingApprovalsPage />} />
          <Route path="activity" element={<ActivityPage />} />
          <Route path="settings" element={<SettingsPage />} />
        </Route>

        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
