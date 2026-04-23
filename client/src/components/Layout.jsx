import { lazy, Suspense, useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Zap, LayoutDashboard, Globe, UploadCloud,
  ClipboardList, LogOut, Menu, X, ChevronRight,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const DashboardBG = lazy(() => import('./DashboardBG'));

const NAV = [
  { to: '/',            end: true, icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/sites',                  icon: Globe,            label: 'Client Sites' },
  { to: '/bulk-update',            icon: UploadCloud,      label: 'Bulk Update' },
  { to: '/audit',                  icon: ClipboardList,    label: 'Audit Log' },
];

function Sidebar({ onClose }) {
  const { user, logout } = useAuth();
  const nav = useNavigate();

  const handleLogout = () => { logout(); nav('/login'); };

  return (
    <div className="flex flex-col h-full w-64 bg-white/[0.03] backdrop-blur-2xl border-r border-white/[0.07]">
      {/* Logo */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.06]">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 bg-gradient-to-br from-indigo-500 to-violet-600 rounded-lg flex items-center justify-center shadow-lg shadow-indigo-600/40">
            <Zap className="w-4 h-4 text-white" />
          </div>
          <div>
            <p className="text-white font-bold text-sm leading-none">SEO Bulk Updater</p>
            <p className="text-gray-400 text-[10px] mt-0.5">WordPress meta automation</p>
          </div>
        </div>
        {onClose && (
          <button onClick={onClose} className="text-gray-500 hover:text-gray-300 lg:hidden">
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto">
        <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider px-2 pt-2 pb-1.5">
          Navigation
        </p>
        {NAV.map(({ to, end, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            onClick={onClose}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 group ${
                isActive
                  ? 'bg-indigo-500/15 text-indigo-300 border border-indigo-500/25 shadow-sm shadow-indigo-500/10'
                  : 'text-gray-500 hover:text-gray-200 hover:bg-white/[0.06]'
              }`
            }
          >
            {({ isActive }) => (
              <>
                <Icon className={`w-4 h-4 flex-shrink-0 transition-colors ${isActive ? 'text-indigo-400' : 'group-hover:text-gray-300'}`} />
                <span className="flex-1">{label}</span>
                {isActive && <ChevronRight className="w-3.5 h-3.5 text-indigo-400/60" />}
              </>
            )}
          </NavLink>
        ))}
      </nav>

      {/* User */}
      <div className="p-3 border-t border-white/[0.06]">
        <div className="flex items-center gap-2.5 px-2 py-2 rounded-xl">
          <div className="w-7 h-7 bg-gradient-to-br from-indigo-500 to-violet-600 rounded-full flex items-center justify-center flex-shrink-0 text-white text-xs font-bold shadow">
            {user?.email?.[0]?.toUpperCase() || 'U'}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs text-gray-200 truncate leading-none">{user?.email}</p>
            <p className="text-[10px] text-gray-400 mt-0.5 capitalize">{user?.role || 'admin'}</p>
          </div>
          <button
            onClick={handleLogout}
            title="Sign out"
            className="w-7 h-7 rounded-md flex items-center justify-center text-gray-600 hover:text-red-400 hover:bg-red-400/10 transition-all flex-shrink-0"
          >
            <LogOut className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}

export default function Layout() {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="min-h-screen bg-[#07071a]">
      {/* Three.js ambient background */}
      <Suspense fallback={<div className="fixed inset-0 bg-[#07071a]" />}>
        <DashboardBG />
      </Suspense>

      {/* Content layer */}
      <div className="relative z-10 flex min-h-screen">

        {/* Desktop sidebar */}
        <div className="hidden lg:flex flex-col w-64 flex-shrink-0 sticky top-0 h-screen">
          <Sidebar />
        </div>

        {/* Mobile overlay */}
        <AnimatePresence>
          {mobileOpen && (
            <>
              <motion.div
                key="overlay"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                onClick={() => setMobileOpen(false)}
                className="fixed inset-0 bg-black/70 backdrop-blur-sm z-30 lg:hidden"
              />
              <motion.div
                key="drawer"
                initial={{ x: -280 }}
                animate={{ x: 0 }}
                exit={{ x: -280 }}
                transition={{ type: 'spring', stiffness: 320, damping: 32 }}
                className="fixed top-0 left-0 h-full z-40 lg:hidden shadow-2xl shadow-black/50"
              >
                <Sidebar onClose={() => setMobileOpen(false)} />
              </motion.div>
            </>
          )}
        </AnimatePresence>

        {/* Main */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Mobile top bar */}
          <div className="lg:hidden flex items-center gap-3 px-4 py-3 bg-white/[0.04] backdrop-blur-xl border-b border-white/[0.07] sticky top-0 z-20">
            <button
              onClick={() => setMobileOpen(true)}
              className="w-9 h-9 flex items-center justify-center rounded-xl border border-white/10 text-gray-400 hover:text-white hover:bg-white/10 transition"
            >
              <Menu className="w-4 h-4" />
            </button>
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 bg-gradient-to-br from-indigo-500 to-violet-600 rounded-md flex items-center justify-center">
                <Zap className="w-3 h-3 text-white" />
              </div>
              <span className="text-sm font-bold text-white">SEO Bulk Updater</span>
            </div>
          </div>

          <main className="flex-1 p-5 sm:p-6 lg:p-8 overflow-auto">
            <Outlet />
          </main>
        </div>
      </div>
    </div>
  );
}
