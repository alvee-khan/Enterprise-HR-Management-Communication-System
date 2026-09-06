import React, { useState } from 'react';
import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useSocket } from '../context/SocketContext';
import ChatbotWidget from '../components/chatbot/ChatbotWidget';
import {
  FiHome, FiUsers, FiLayers, FiClock, FiCalendar,
  FiBriefcase, FiCheckSquare, FiAward, FiDollarSign,
  FiCpu, FiFolder, FiMessageSquare, FiVolume2,
  FiBarChart2, FiShield, FiLock, FiSettings, FiLogOut,
  FiSun, FiMoon, FiBell, FiMenu, FiX, FiChevronRight,
  FiUser
} from 'react-icons/fi';

export const DashboardLayout = () => {
  const { user, logout, isHR, isManager, hasRole } = useAuth();
  const { isDark, toggleTheme } = useTheme();
  const { notifications, unreadCount, clearUnreadCount } = useSocket();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const navItems = [
    { label: 'Dashboard', path: '/dashboard', icon: FiHome, show: true },
    { label: 'Companies', path: '/companies', icon: FiSettings, show: hasRole('superAdmin') },
    { label: 'Employees', path: '/employees', icon: FiUsers, show: true },
    { label: 'Departments', path: '/departments', icon: FiLayers, show: true },
    { label: 'Attendance', path: '/attendance', icon: FiClock, show: true },
    { label: 'Leaves', path: '/leaves', icon: FiCalendar, show: true },
    { label: 'Recruitment', path: '/recruitment', icon: FiBriefcase, show: isHR() },
    { label: 'Tasks & Kanban', path: '/tasks', icon: FiCheckSquare, show: true },
    { label: 'Performance', path: '/performance', icon: FiAward, show: true },
    { label: 'Payroll', path: '/payroll', icon: FiDollarSign, show: true },
    { label: 'Skill Matrix', path: '/skills', icon: FiCpu, show: true },
    { label: 'Documents', path: '/documents', icon: FiFolder, show: true },
    { label: 'Team Chat', path: '/chat', icon: FiMessageSquare, show: true },
    { label: 'Announcements', path: '/announcements', icon: FiVolume2, show: true },
    { label: 'Analytics & Reports', path: '/reports', icon: FiBarChart2, show: isHR() || hasRole('superAdmin') },
    { label: 'Security', path: '/security', icon: FiLock, show: isHR() || hasRole('superAdmin') || isManager() },
    { label: 'Audit Logs', path: '/audit', icon: FiShield, show: isHR() || hasRole('superAdmin') },
  ];

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-dark-950 text-slate-900 dark:text-slate-100 flex flex-col lg:flex-row transition-colors duration-300">
      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-40 lg:hidden animate-fade-in"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed lg:sticky top-0 left-0 z-50 h-screen w-72 bg-white dark:bg-dark-900 border-r border-slate-200/80 dark:border-slate-800/80 flex flex-col justify-between transition-transform duration-300 ease-in-out lg:translate-x-0 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Brand Header */}
        <div>
          <div className="h-16 px-6 flex items-center justify-between border-b border-slate-100 dark:border-slate-800/60">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-primary-600 to-indigo-500 flex items-center justify-center text-white shadow-glow">
                <FiUsers className="w-5 h-5" />
              </div>
              <div>
                <h1 className="font-extrabold text-base tracking-tight bg-gradient-to-r from-primary-600 to-indigo-600 bg-clip-text text-transparent">
                  Nexus HRMS
                </h1>
                <p className="text-[10px] text-slate-400 font-medium tracking-wide uppercase">
                  Enterprise Suite
                </p>
              </div>
            </div>
            <button
              onClick={() => setSidebarOpen(false)}
              className="lg:hidden p-1.5 text-slate-400 hover:bg-slate-100 dark:hover:bg-dark-800 rounded-lg"
            >
              <FiX className="w-5 h-5" />
            </button>
          </div>

          {/* Navigation Links */}
          <nav className="p-3.5 space-y-1 overflow-y-auto max-h-[calc(100vh-140px)]">
            {navItems
              .filter((item) => item.show)
              .map((item) => {
                const Icon = item.icon;
                const isActive = location.pathname.startsWith(item.path);
                return (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    onClick={() => setSidebarOpen(false)}
                    className={`sidebar-item ${isActive ? 'active' : ''}`}
                  >
                    <Icon className="w-4 h-4 shrink-0" />
                    <span className="truncate">{item.label}</span>
                  </NavLink>
                );
              })}
          </nav>
        </div>

        {/* User Card & Logout */}
        <div className="p-4 border-t border-slate-100 dark:border-slate-800/60 bg-slate-50/50 dark:bg-dark-900/50">
          <div className="flex items-center justify-between gap-3">
            <div
              onClick={() => navigate('/profile')}
              className="flex items-center gap-3 cursor-pointer min-w-0 flex-1 hover:opacity-80 transition-opacity"
            >
              <div className="w-9 h-9 rounded-xl bg-primary-100 dark:bg-primary-900/50 text-primary-600 dark:text-primary-400 flex items-center justify-center font-bold text-sm">
                {user?.name?.[0]?.toUpperCase() || <FiUser />}
              </div>
              <div className="truncate">
                <p className="text-xs font-semibold text-slate-900 dark:text-white truncate">
                  {user?.name}
                </p>
                <p className="text-[10px] text-slate-400 capitalize truncate">
                  {user?.role}
                </p>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="p-2 text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-xl transition-colors"
              title="Logout"
            >
              <FiLogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Navbar */}
        <header className="sticky top-0 z-30 h-16 bg-white/80 dark:bg-dark-900/80 backdrop-blur-xl border-b border-slate-200/80 dark:border-slate-800/80 px-4 sm:px-8 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden p-2 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-dark-800 rounded-xl"
            >
              <FiMenu className="w-5 h-5" />
            </button>
            <div className="hidden sm:block text-xs text-slate-400">
              Welcome back, <span className="font-semibold text-slate-700 dark:text-slate-200">{user?.name}</span>
            </div>
          </div>

          {/* Right actions */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Theme Toggle */}
            <button
              onClick={toggleTheme}
              className="p-2.5 text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-dark-800 rounded-xl transition-colors"
              title="Toggle Theme"
            >
              {isDark ? <FiSun className="w-4 h-4 text-amber-400" /> : <FiMoon className="w-4 h-4 text-indigo-500" />}
            </button>

            {/* Notifications */}
            <div className="relative">
              <button
                onClick={() => {
                  setShowNotifications(!showNotifications);
                  clearUnreadCount();
                }}
                className="relative p-2.5 text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-dark-800 rounded-xl transition-colors"
                title="Notifications"
              >
                <FiBell className="w-4 h-4" />
                {unreadCount > 0 && (
                  <span className="absolute top-1.5 right-1.5 w-4 h-4 bg-rose-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center animate-pulse">
                    {unreadCount}
                  </span>
                )}
              </button>

              {/* Notification Dropdown */}
              {showNotifications && (
                <div className="absolute right-0 mt-2 w-80 sm:w-96 card shadow-2xl border border-slate-200 dark:border-slate-700 p-4 z-50 animate-slide-down">
                  <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-700/60 pb-3 mb-3">
                    <h4 className="font-semibold text-sm">Notifications</h4>
                    <span className="text-xs text-primary-600 dark:text-primary-400 cursor-pointer" onClick={() => setShowNotifications(false)}>
                      Close
                    </span>
                  </div>
                  <div className="max-h-72 overflow-y-auto space-y-2">
                    {notifications.length === 0 ? (
                      <p className="text-xs text-center text-slate-400 py-6">No new notifications</p>
                    ) : (
                      notifications.map((n, i) => (
                        <div key={i} className="p-2.5 rounded-xl bg-slate-50 dark:bg-dark-700/40 text-xs">
                          <p className="font-semibold text-slate-800 dark:text-slate-200">{n.title}</p>
                          <p className="text-slate-500 dark:text-slate-400 mt-0.5">{n.message}</p>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Profile Avatar Button */}
            <button
              onClick={() => navigate('/profile')}
              className="flex items-center gap-2 p-1.5 hover:bg-slate-100 dark:hover:bg-dark-800 rounded-xl transition-colors"
            >
              <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-primary-600 to-indigo-600 text-white flex items-center justify-center font-bold text-xs">
                {user?.name?.[0]?.toUpperCase() || 'U'}
              </div>
            </button>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 p-4 sm:p-8 max-w-7xl w-full mx-auto animate-fade-in">
          <Outlet />
        </main>
      </div>

      {/* Floating Chatbot Widget */}
      <ChatbotWidget />
    </div>
  );
};

export default DashboardLayout;
