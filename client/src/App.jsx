import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import Layout from './components/Layout.jsx';
import Login from './pages/Login.jsx';
import Register from './pages/Register.jsx';
import Dashboard from './pages/Dashboard.jsx';
import Sites from './pages/Sites.jsx';
import SiteForm from './pages/SiteForm.jsx';
import BulkUpdate from './pages/BulkUpdate.jsx';
import JobDetail from './pages/JobDetail.jsx';
import AuditLogs from './pages/AuditLogs.jsx';

const PrivateRoute = ({ children }) => {
  const { user, loading } = useAuth();
  if (loading) return <div className="p-8 text-gray-500">Loading…</div>;
  if (!user) return <Navigate to="/login" replace />;
  return children;
};

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route
        path="/"
        element={
          <PrivateRoute>
            <Layout />
          </PrivateRoute>
        }
      >
        <Route index element={<Dashboard />} />
        <Route path="sites" element={<Sites />} />
        <Route path="sites/new" element={<SiteForm />} />
        <Route path="sites/:id/edit" element={<SiteForm />} />
        <Route path="bulk-update" element={<BulkUpdate />} />
        <Route path="jobs/:id" element={<JobDetail />} />
        <Route path="audit" element={<AuditLogs />} />
      </Route>
    </Routes>
  );
}
