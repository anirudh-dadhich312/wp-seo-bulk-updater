import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import Layout from './components/Layout.jsx';
import Landing from './pages/Landing.jsx';
import Login from './pages/Login.jsx';
import Register from './pages/Register.jsx';
import ForgotPassword from './pages/ForgotPassword.jsx';
import ResetPassword from './pages/ResetPassword.jsx';
import AcceptInvite from './pages/AcceptInvite.jsx';
import RequestAccess from './pages/RequestAccess.jsx';
import Dashboard from './pages/Dashboard.jsx';
import Sites from './pages/Sites.jsx';
import SiteForm from './pages/SiteForm.jsx';
import BulkUpdate from './pages/BulkUpdate.jsx';
import JobDetail from './pages/JobDetail.jsx';
import AltTagUpdate from './pages/AltTagUpdate.jsx';
import AltTagJobDetail from './pages/AltTagJobDetail.jsx';
import AuditLogs from './pages/AuditLogs.jsx';
import UserManagement from './pages/UserManagement.jsx';
import TeamManagement from './pages/TeamManagement.jsx';

const ROLE_LEVELS = { super_admin: 4, admin: 3, team_leader: 2, team_member: 1, operator: 1 };

const PrivateRoute = ({ children, minRole }) => {
  const { user, loading } = useAuth();
  if (loading) return <div className="p-8 text-gray-500">Loading…</div>;
  if (!user) return <Navigate to="/login" replace />;
  if (minRole && (ROLE_LEVELS[user.role] ?? 0) < (ROLE_LEVELS[minRole] ?? 0)) {
    return <Navigate to="/app" replace />;
  }
  return children;
};

export default function App() {
  return (
    <Routes>
      <Route path="/"                      element={<Landing />} />
      <Route path="/login"                 element={<Login />} />
      <Route path="/register"              element={<Register />} />
      <Route path="/forgot-password"       element={<ForgotPassword />} />
      <Route path="/reset-password/:token" element={<ResetPassword />} />
      <Route path="/accept-invite/:token"  element={<AcceptInvite />} />
      <Route path="/request-access"        element={<RequestAccess />} />
      <Route
        path="/app"
        element={<PrivateRoute><Layout /></PrivateRoute>}
      >
        <Route index                 element={<Dashboard />} />
        <Route path="sites"          element={<Sites />} />
        <Route path="sites/new"      element={<SiteForm />} />
        <Route path="sites/:id/edit" element={<SiteForm />} />
        <Route path="bulk-update"       element={<BulkUpdate />} />
        <Route path="jobs/:id"          element={<JobDetail />} />
        <Route path="alt-tags"          element={<AltTagUpdate />} />
        <Route path="alt-tags/:id"      element={<AltTagJobDetail />} />
        <Route path="audit"          element={<AuditLogs />} />
        <Route path="users"          element={<PrivateRoute minRole="admin"><UserManagement /></PrivateRoute>} />
        <Route path="teams"          element={<PrivateRoute minRole="team_leader"><TeamManagement /></PrivateRoute>} />
      </Route>
    </Routes>
  );
}
