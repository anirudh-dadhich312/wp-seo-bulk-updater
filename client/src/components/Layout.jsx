import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const navClass = ({ isActive }) =>
  `block px-4 py-2 rounded-md text-sm font-medium ${
    isActive ? 'bg-indigo-600 text-white' : 'text-gray-700 hover:bg-gray-100'
  }`;

export default function Layout() {
  const { user, logout } = useAuth();
  const nav = useNavigate();

  const handleLogout = () => {
    logout();
    nav('/login');
  };

  return (
    <div className="min-h-screen flex bg-gray-50">
      <aside className="w-64 bg-white border-r shadow-sm flex flex-col">
        <div className="p-6 border-b">
          <h1 className="text-lg font-bold text-indigo-600">SEO Bulk Updater</h1>
          <p className="text-xs text-gray-500 mt-1">WordPress meta automation</p>
        </div>
        <nav className="flex-1 p-4 space-y-1">
          <NavLink to="/" end className={navClass}>
            Dashboard
          </NavLink>
          <NavLink to="/sites" className={navClass}>
            Client Sites
          </NavLink>
          <NavLink to="/bulk-update" className={navClass}>
            New Bulk Update
          </NavLink>
          <NavLink to="/audit" className={navClass}>
            Audit Log
          </NavLink>
        </nav>
        <div className="p-4 border-t">
          <p className="text-sm text-gray-700 truncate">{user?.email}</p>
          <button
            onClick={handleLogout}
            className="mt-2 text-sm text-red-600 hover:underline"
          >
            Logout
          </button>
        </div>
      </aside>
      <main className="flex-1 p-8 overflow-auto">
        <Outlet />
      </main>
    </div>
  );
}
