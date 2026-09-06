import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { SocketProvider } from './context/SocketContext';
import ProtectedRoute from './components/common/ProtectedRoute';

// Layouts
import DashboardLayout from './layouts/DashboardLayout';
import AuthLayout from './layouts/AuthLayout';

// Auth Pages
import Login from './pages/auth/Login';
import Register from './pages/auth/Register';
import ForgotPassword from './pages/auth/ForgotPassword';

// Dashboard & App Pages
import Dashboard from './pages/dashboard/Dashboard';
import EmployeeList from './pages/employees/EmployeeList';
import DepartmentList from './pages/departments/DepartmentList';
import OrgChart from './pages/departments/OrgChart';
import AttendanceList from './pages/attendance/AttendanceList';
import LeaveList from './pages/leaves/LeaveList';
import JobList from './pages/recruitment/JobList';
import KanbanBoard from './pages/tasks/KanbanBoard';
import ReviewList from './pages/performance/ReviewList';
import PayrollList from './pages/payroll/PayrollList';
import SkillMatrix from './pages/skills/SkillMatrix';
import DocumentList from './pages/documents/DocumentList';
import ChatPage from './pages/chat/ChatPage';
import AnnouncementList from './pages/announcements/AnnouncementList';
import ReportsPage from './pages/reports/ReportsPage';
import AuditLogList from './pages/audit/AuditLogList';
import CompanyList from './pages/companies/CompanyList';
import ProfilePage from './pages/profile/ProfilePage';
import SecurityDashboard from './pages/security/SecurityDashboard';

export function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <SocketProvider>
          <BrowserRouter>
            <Routes>
              {/* Public Auth Routes */}
              <Route element={<AuthLayout />}>
                <Route path="/login" element={<Login />} />
                <Route path="/register" element={<Register />} />
                <Route path="/forgot-password" element={<ForgotPassword />} />
              </Route>

              {/* Protected Workspace Routes */}
              <Route
                path="/"
                element={
                  <ProtectedRoute>
                    <DashboardLayout />
                  </ProtectedRoute>
                }
              >
                <Route index element={<Navigate to="/dashboard" replace />} />
                <Route path="dashboard" element={<Dashboard />} />
                <Route path="employees" element={<EmployeeList />} />
                <Route path="departments" element={<DepartmentList />} />
                <Route path="departments/org-chart" element={<OrgChart />} />
                <Route path="attendance" element={<AttendanceList />} />
                <Route path="leaves" element={<LeaveList />} />
                <Route path="recruitment" element={<JobList />} />
                <Route path="tasks" element={<KanbanBoard />} />
                <Route path="performance" element={<ReviewList />} />
                <Route path="payroll" element={<PayrollList />} />
                <Route path="skills" element={<SkillMatrix />} />
                <Route path="documents" element={<DocumentList />} />
                <Route path="chat" element={<ChatPage />} />
                <Route path="announcements" element={<AnnouncementList />} />
                <Route path="reports" element={<ReportsPage />} />
                <Route path="audit" element={<AuditLogList />} />
                <Route path="security" element={<SecurityDashboard />} />
                <Route path="companies" element={<CompanyList />} />
                <Route path="profile" element={<ProfilePage />} />
              </Route>

              {/* Catch-all */}
              <Route path="*" element={<Navigate to="/dashboard" replace />} />
            </Routes>
          </BrowserRouter>
        </SocketProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
