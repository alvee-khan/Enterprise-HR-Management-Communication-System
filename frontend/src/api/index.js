import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  withCredentials: true,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('accessToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    if (error.response?.status === 401 && !originalRequest._retry && !originalRequest.url.includes('/auth/login')) {
      originalRequest._retry = true;
      try {
        const { data } = await axios.post('/api/auth/refresh', {}, { withCredentials: true });
        if (data?.accessToken) {
          localStorage.setItem('accessToken', data.accessToken);
          originalRequest.headers.Authorization = `Bearer ${data.accessToken}`;
          return api(originalRequest);
        }
      } catch (e) {
        localStorage.removeItem('accessToken');
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

// Auth
export const authApi = {
  login: (data) => api.post('/auth/login', data),
  register: (data) => api.post('/auth/register', data),
  logout: () => api.post('/auth/logout'),
  getMe: () => api.get('/auth/me'),
  forgotPassword: (data) => api.post('/auth/forgot-password', data),
  resetPassword: (token, data) => api.post(`/auth/reset-password/${token}`, data),
  updatePassword: (data) => api.put('/auth/update-password', data),
};

// Users & Companies
export const userApi = {
  getAll: (params) => api.get('/users', { params }),
  getOne: (id) => api.get(`/users/${id}`),
  updateProfile: (data) => api.put('/users/profile/me', data),
  updateUser: (id, data) => api.put(`/users/${id}`, data),
  deactivate: (id) => api.delete(`/users/${id}`),
};

export const companyApi = {
  getAll: () => api.get('/companies'),
  getOne: (id) => api.get(`/companies/${id}`),
  create: (data) => api.post('/companies', data),
  update: (id, data) => api.put(`/companies/${id}`, data),
  delete: (id) => api.delete(`/companies/${id}`),
};

// Employees & Departments
export const employeeApi = {
  getAll: (params) => api.get('/employees', { params }),
  getOne: (id) => api.get(`/employees/${id}`),
  create: (data) => api.post('/employees', data),
  update: (id, data) => api.put(`/employees/${id}`, data),
  delete: (id) => api.delete(`/employees/${id}`),
  uploadAvatar: (id, formData) => api.post(`/employees/${id}/avatar`, formData),
  getStats: () => api.get('/employees/stats'),
};

export const departmentApi = {
  getAll: () => api.get('/departments'),
  getOne: (id) => api.get(`/departments/${id}`),
  create: (data) => api.post('/departments', data),
  update: (id, data) => api.put(`/departments/${id}`, data),
  delete: (id) => api.delete(`/departments/${id}`),
  getOrgChart: () => api.get('/departments/org-chart'),
};

// Attendance & Leaves
export const attendanceApi = {
  getAll: (params) => api.get('/attendance', { params }),
  getMonthlyReport: (params) => api.get('/attendance/monthly-report', { params }),
  generateQR: (date) => api.get('/attendance/generate-qr', { params: { date } }),
  checkIn: (data) => api.post('/attendance/check-in', data),
  checkOut: () => api.post('/attendance/check-out'),
};

export const leaveApi = {
  getAll: (params) => api.get('/leaves', { params }),
  getBalance: () => api.get('/leaves/balance'),
  apply: (data) => api.post('/leaves', data),
  processAction: (id, data) => api.put(`/leaves/${id}/action`, data),
  cancel: (id) => api.put(`/leaves/${id}/cancel`),
};

// Recruitment & Interviews
export const recruitmentApi = {
  getJobs: (params) => api.get('/recruitment/jobs', { params }),
  createJob: (data) => api.post('/recruitment/jobs', data),
  updateJob: (id, data) => api.put(`/recruitment/jobs/${id}`, data),
  deleteJob: (id) => api.delete(`/recruitment/jobs/${id}`),
  getCandidates: (params) => api.get('/recruitment/candidates', { params }),
  getCandidate: (id) => api.get(`/recruitment/candidates/${id}`),
  createCandidate: (data) => api.post('/recruitment/candidates', data),
  updateStatus: (id, data) => api.put(`/recruitment/candidates/${id}/status`, data),
  uploadResume: (id, formData) => api.post(`/recruitment/candidates/${id}/resume`, formData),
  getRanked: (jobId) => api.get(`/recruitment/candidates/ranked/${jobId}`),
};

export const interviewApi = {
  getAll: (params) => api.get('/interviews', { params }),
  schedule: (data) => api.post('/interviews', data),
  update: (id, data) => api.put(`/interviews/${id}`, data),
  submitFeedback: (id, data) => api.post(`/interviews/${id}/feedback`, data),
};

// Tasks & Projects
export const taskApi = {
  getAll: (params) => api.get('/tasks', { params }),
  getKanban: (params) => api.get('/tasks/kanban', { params }),
  create: (data) => api.post('/tasks', data),
  update: (id, data) => api.put(`/tasks/${id}`, data),
  updateStatus: (id, data) => api.patch(`/tasks/${id}/status`, data),
  delete: (id) => api.delete(`/tasks/${id}`),
  addComment: (id, data) => api.post(`/tasks/${id}/comments`, data),
};

export const projectApi = {
  getAll: (params) => api.get('/projects', { params }),
  create: (data) => api.post('/projects', data),
  update: (id, data) => api.put(`/projects/${id}`, data),
  delete: (id) => api.delete(`/projects/${id}`),
};

// Performance, Payroll, Skills, Documents
export const reviewApi = {
  getAll: (params) => api.get('/reviews', { params }),
  create: (data) => api.post('/reviews', data),
  update: (id, data) => api.put(`/reviews/${id}`, data),
  acknowledge: (id) => api.post(`/reviews/${id}/acknowledge`),
};

export const payrollApi = {
  getAll: (params) => api.get('/payroll', { params }),
  getStats: (params) => api.get('/payroll/stats', { params }),
  generate: (data) => api.post('/payroll', data),
  update: (id, data) => api.put(`/payroll/${id}`, data),
  markPaid: (id, data) => api.patch(`/payroll/${id}/pay`, data),
};

export const skillApi = {
  getMatrix: (params) => api.get('/skills', { params }),
  updateEmployeeSkills: (id, data) => api.put(`/skills/employee/${id}`, data),
};

export const documentApi = {
  getAll: (params) => api.get('/documents', { params }),
  upload: (formData) => api.post('/documents', formData),
  delete: (id) => api.delete(`/documents/${id}`),
};

// Real-time, Chat, Announcements, Reports, Audit, Chatbot
export const notificationApi = {
  getAll: (params) => api.get('/notifications', { params }),
  markRead: (id) => api.put(`/notifications/${id}/read`),
  markAllRead: () => api.put('/notifications/mark-all-read'),
  delete: (id) => api.delete(`/notifications/${id}`),
};

export const chatApi = {
  getConversations: () => api.get('/chat/conversations'),
  getMessages: (params) => api.get('/chat', { params }),
  sendMessage: (data) => api.post('/chat', data),
  deleteMessage: (id) => api.delete(`/chat/${id}`),
};

export const announcementApi = {
  getAll: (params) => api.get('/announcements', { params }),
  create: (data) => api.post('/announcements', data),
  update: (id, data) => api.put(`/announcements/${id}`, data),
  delete: (id) => api.delete(`/announcements/${id}`),
  markRead: (id) => api.post(`/announcements/${id}/read`),
};

export const reportApi = {
  getDashboardStats: (params) => api.get('/reports/dashboard', { params }),
  getEmployeeDashboard: () => api.get('/reports/employee-dashboard'),
  exportExcel: (type, params) => api.get(`/reports/export/excel?type=${type}`, { params, responseType: 'blob' }),
  exportPDF: (type) => api.get(`/reports/export/pdf?type=${type}`, { responseType: 'blob' }),
};

export const auditApi = {
  getAll: (params) => api.get('/audit', { params }),
};

export const chatbotApi = {
  query: (message) => api.post('/chatbot/query', { message }),
};

export const securityApi = {
  getStatus: () => api.get('/security/status'),
  runTests: () => api.post('/security/test'),
  rotateKey: (data) => api.post('/security/keys/rotate', data),
  revokeKey: (id, data) => api.post(`/security/keys/${id}/revoke`, data),
  verifyAudit: () => api.get('/security/audit/verify'),
  getSessions: () => api.get('/auth/sessions'),
  revokeSession: (id) => api.delete(`/auth/sessions/${id}`),
  setup2FA: () => api.post('/auth/2fa/setup'),
  verify2FA: (data) => api.post('/auth/2fa/verify', data),
  disable2FA: (data) => api.post('/auth/2fa/disable', data),
};

export default api;
