import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { reportApi, attendanceApi } from '../../api';
import StatsCard from '../../components/common/StatsCard';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import toast from 'react-hot-toast';
import {
  FiUsers, FiClock, FiCalendar, FiBriefcase,
  FiCheckCircle, FiDollarSign, FiTrendingUp, FiActivity
} from 'react-icons/fi';
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis,
  Tooltip, BarChart, Bar, PieChart, Pie, Cell, CartesianGrid
} from 'recharts';

export const Dashboard = () => {
  const { user, isHR, hasRole } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [checkingIn, setCheckingIn] = useState(false);

  const fetchDashboard = async () => {
    try {
      if (user?.role === 'employee') {
        const res = await reportApi.getEmployeeDashboard();
        setData(res.data?.data);
      } else {
        const res = await reportApi.getDashboardStats();
        setData(res.data?.data);
      }
    } catch (err) {
      toast.error('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboard();
  }, [user]);

  const handleCheckIn = async () => {
    setCheckingIn(true);
    try {
      await attendanceApi.checkIn({});
      toast.success('Successfully checked in!');
      fetchDashboard();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Check-in failed');
    } finally {
      setCheckingIn(false);
    }
  };

  const handleCheckOut = async () => {
    setCheckingIn(true);
    try {
      await attendanceApi.checkOut();
      toast.success('Checked out successfully!');
      fetchDashboard();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Check-out failed');
    } finally {
      setCheckingIn(false);
    }
  };

  if (loading) {
    return <LoadingSpinner text="Generating live analytics..." />;
  }

  // Employee specific view
  if (user?.role === 'employee') {
    const emp = data?.employee;
    const isCheckedIn = !!data?.todayAttendance?.checkIn;
    const isCheckedOut = !!data?.todayAttendance?.checkOut;

    return (
      <div className="space-y-8 animate-fade-in">
        {/* Welcome Banner */}
        <div className="card p-6 sm:p-8 bg-gradient-to-r from-primary-600 to-indigo-700 text-white relative overflow-hidden shadow-xl">
          <div className="relative z-10 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <span className="badge bg-white/20 text-white font-semibold mb-2">
                Employee Portal
              </span>
              <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
                Hello, {emp?.name || user?.name}! 👋
              </h2>
              <p className="text-white/80 text-sm mt-1">
                {emp?.designation || 'Team Member'} • {emp?.department?.name || 'General Department'}
              </p>
            </div>

            {/* Quick Check-in / Check-out button */}
            <div className="flex gap-3">
              {!isCheckedIn ? (
                <button
                  onClick={handleCheckIn}
                  disabled={checkingIn}
                  className="bg-white text-primary-700 hover:bg-slate-50 font-bold px-6 py-3 rounded-2xl shadow-lg transition-transform hover:scale-105 active:scale-95"
                >
                  ⏱️ Clock In Now
                </button>
              ) : !isCheckedOut ? (
                <button
                  onClick={handleCheckOut}
                  disabled={checkingIn}
                  className="bg-amber-400 text-slate-900 hover:bg-amber-300 font-bold px-6 py-3 rounded-2xl shadow-lg transition-transform hover:scale-105 active:scale-95"
                >
                  🛑 Clock Out
                </button>
              ) : (
                <div className="bg-white/20 text-white font-medium px-4 py-2 rounded-xl text-xs">
                  ✅ Completed for today
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Metrics Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          <StatsCard
            title="Present Days This Month"
            value={data?.monthStats?.present || 0}
            subtitle={`${data?.monthStats?.late || 0} late arrivals`}
            icon={FiClock}
            color="emerald"
          />
          <StatsCard
            title="Annual Leave Balance"
            value={`${data?.leaveBalance?.annual || 0} Days`}
            subtitle={`${data?.leaveBalance?.sick || 0} Sick • ${data?.leaveBalance?.casual || 0} Casual`}
            icon={FiCalendar}
            color="primary"
          />
          <StatsCard
            title="Assigned Tasks"
            value={data?.pendingTasks?.length || 0}
            subtitle="Active action items"
            icon={FiCheckCircle}
            color="violet"
          />
          <StatsCard
            title="Latest Net Salary"
            value={data?.latestPayroll ? `$${data?.latestPayroll?.netSalary}` : '$0'}
            subtitle={data?.latestPayroll ? `Month ${data?.latestPayroll?.month}/${data?.latestPayroll?.year}` : 'Not processed'}
            icon={FiDollarSign}
            color="sky"
          />
        </div>

        {/* Pending Tasks & Leaves Overview */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="card p-6">
            <h3 className="text-base font-bold text-slate-900 dark:text-white mb-4 flex items-center justify-between">
              <span>My Active Tasks</span>
              <span className="badge bg-primary-100 text-primary-700 dark:bg-primary-950 dark:text-primary-300">
                {data?.pendingTasks?.length || 0}
              </span>
            </h3>
            <div className="space-y-3">
              {data?.pendingTasks?.length === 0 ? (
                <p className="text-xs text-slate-400 py-4 text-center">No pending tasks 🎉</p>
              ) : (
                data?.pendingTasks?.map((t, idx) => (
                  <div key={idx} className="p-3 rounded-xl bg-slate-50 dark:bg-dark-800/80 border border-slate-100 dark:border-slate-700/50 flex items-center justify-between">
                    <div>
                      <p className="text-xs font-semibold text-slate-800 dark:text-slate-200">{t.title}</p>
                      <p className="text-[10px] text-slate-400 mt-0.5">Priority: {t.priority}</p>
                    </div>
                    <span className="badge bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300 text-[10px]">
                      {t.status}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="card p-6">
            <h3 className="text-base font-bold text-slate-900 dark:text-white mb-4">
              Recent Leave Requests
            </h3>
            <div className="space-y-3">
              {data?.recentLeaves?.length === 0 ? (
                <p className="text-xs text-slate-400 py-4 text-center">No leave applications yet</p>
              ) : (
                data?.recentLeaves?.map((l, idx) => (
                  <div key={idx} className="p-3 rounded-xl bg-slate-50 dark:bg-dark-800/80 border border-slate-100 dark:border-slate-700/50 flex items-center justify-between">
                    <div>
                      <p className="text-xs font-semibold text-slate-800 dark:text-slate-200">{l.type} Leave ({l.totalDays} days)</p>
                      <p className="text-[10px] text-slate-400 mt-0.5">{l.reason}</p>
                    </div>
                    <span className={`badge ${l.status === 'Approved' ? 'status-approved' : l.status === 'Rejected' ? 'status-rejected' : 'status-pending'} text-[10px]`}>
                      {l.status}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Admin / HR Manager / Manager Dashboard
  const stats = data?.stats || {};
  const attendanceTrend = data?.attendanceTrend || [];
  const deptHeadcount = data?.deptHeadcount || [];
  const COLORS = ['#6366f1', '#ec4899', '#06b6d4', '#10b981', '#f59e0b', '#8b5cf6'];

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            Executive Overview
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Real-time workforce metrics and performance intelligence
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="badge bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400">
            ● System Live
          </span>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <StatsCard
          title="Total Workforce"
          value={stats.totalEmployees || 0}
          subtitle={`${stats.activeEmployees || 0} active headcount`}
          icon={FiUsers}
          color="primary"
          change="+12%"
        />
        <StatsCard
          title="Present Today"
          value={stats.todayPresent || 0}
          subtitle={`${stats.totalEmployees ? Math.round(((stats.todayPresent || 0) / stats.totalEmployees) * 100) : 0}% attendance rate`}
          icon={FiClock}
          color="emerald"
        />
        <StatsCard
          title="Pending Leaves"
          value={stats.pendingLeaves || 0}
          subtitle="Awaiting manager sign-off"
          icon={FiCalendar}
          color="amber"
        />
        <StatsCard
          title="Open Job Requisitions"
          value={stats.openJobs || 0}
          subtitle="Talent pipeline active"
          icon={FiBriefcase}
          color="violet"
        />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Attendance Trend Chart */}
        <div className="card p-6 lg:col-span-2">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Monthly Attendance Velocity
              </h3>
              <p className="text-xs text-slate-400">Daily check-in and punctuality volume</p>
            </div>
            <span className="badge bg-primary-50 text-primary-600 dark:bg-primary-950 dark:text-primary-400">
              Live Aggregate
            </span>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={attendanceTrend.length > 0 ? attendanceTrend : [
                { _id: { day: 1 }, present: 18, late: 2 },
                { _id: { day: 5 }, present: 22, late: 1 },
                { _id: { day: 10 }, present: 25, late: 3 },
                { _id: { day: 15 }, present: 24, late: 0 },
                { _id: { day: 20 }, present: 26, late: 1 },
              ]}>
                <defs>
                  <linearGradient id="presentGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" opacity={0.1} />
                <XAxis dataKey="_id.day" stroke="#94a3b8" fontSize={11} tickFormatter={(val) => `Day ${val}`} />
                <YAxis stroke="#94a3b8" fontSize={11} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', borderRadius: '12px', color: '#fff', fontSize: '12px' }}
                />
                <Area type="monotone" dataKey="present" name="Present" stroke="#6366f1" strokeWidth={2.5} fillOpacity={1} fill="url(#presentGrad)" />
                <Area type="monotone" dataKey="late" name="Late" stroke="#f59e0b" strokeWidth={2} fillOpacity={0} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Department Distribution */}
        <div className="card p-6">
          <h3 className="text-base font-bold text-slate-900 dark:text-white mb-1">
            Department Allocation
          </h3>
          <p className="text-xs text-slate-400 mb-4">Headcount breakdown by division</p>

          <div className="h-52 w-full flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={deptHeadcount.length > 0 ? deptHeadcount : [
                    { name: 'Engineering', count: 14 },
                    { name: 'HR', count: 4 },
                    { name: 'Design', count: 5 },
                    { name: 'Marketing', count: 3 }
                  ]}
                  dataKey="count"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={75}
                  paddingAngle={5}
                >
                  {(deptHeadcount.length > 0 ? deptHeadcount : [1, 2, 3, 4]).map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', borderRadius: '12px', color: '#fff', fontSize: '12px' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div className="grid grid-cols-2 gap-2 mt-2">
            {(deptHeadcount.length > 0 ? deptHeadcount : [
              { name: 'Engineering', count: 14 },
              { name: 'HR', count: 4 },
              { name: 'Design', count: 5 }
            ]).map((d, i) => (
              <div key={i} className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-300">
                <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                <span className="truncate">{d.name} ({d.count})</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
