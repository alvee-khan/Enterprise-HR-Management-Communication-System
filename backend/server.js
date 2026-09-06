import express from 'express';
import http from 'http';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import connectDB from './config/db.js';
import { initSocket } from './config/socket.js';
import { errorHandler, notFound } from './middleware/errorHandler.js';

// Routes
import authRoutes from './routes/auth.js';
import userRoutes from './routes/users.js';
import companyRoutes from './routes/companies.js';
import employeeRoutes from './routes/employees.js';
import departmentRoutes from './routes/departments.js';
import attendanceRoutes from './routes/attendance.js';
import leaveRoutes from './routes/leaves.js';
import recruitmentRoutes from './routes/recruitment.js';
import interviewRoutes from './routes/interviews.js';
import taskRoutes from './routes/tasks.js';
import projectRoutes from './routes/projects.js';
import reviewRoutes from './routes/reviews.js';
import payrollRoutes from './routes/payroll.js';
import skillRoutes from './routes/skills.js';
import documentRoutes from './routes/documents.js';
import notificationRoutes from './routes/notifications.js';
import chatRoutes from './routes/chat.js';
import announcementRoutes from './routes/announcements.js';
import reportRoutes from './routes/reports.js';
import auditRoutes from './routes/audit.js';
import chatbotRoutes from './routes/chatbot.js';
import securityRoutes from './routes/security.js';
import postRoutes from './routes/posts.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const server = http.createServer(app);

// Initialize Socket.io
initSocket(server);

// Connect to PostgreSQL
connectDB();

// Rate limiting - relaxed for localhost and development so test suites don't block user browsing
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: process.env.NODE_ENV === 'production' ? 2000 : 100000,
  skip: (req) => {
    // Don't throttle localhost / development requests
    if (process.env.NODE_ENV !== 'production') return true;
    const ip = req.ip || req.connection?.remoteAddress || '';
    return ip === '127.0.0.1' || ip === '::1' || ip.includes('127.0.0.1');
  },
  message: { success: false, message: 'Too many requests, please try again later.' }
});

// Middleware
app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:5173',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(compression());
app.use(morgan('dev'));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());

// Compatibility middleware for frontend (_id and employeeId alias)
app.use((req, res, next) => {
  const originalJson = res.json;
  res.json = function (data) {
    const transform = (obj) => {
      if (!obj || typeof obj !== 'object') return obj;
      if (Array.isArray(obj)) return obj.map(transform);
      if (obj instanceof Date || obj instanceof Buffer) return obj;

      const newObj = { ...obj };
      if (newObj.id !== undefined && newObj._id === undefined) {
        newObj._id = newObj.id;
      }
      if (newObj.employeeCode !== undefined && newObj.employeeId === undefined) {
        newObj.employeeId = newObj.employeeCode;
      }
      for (const key of Object.keys(newObj)) {
        if (newObj[key] && typeof newObj[key] === 'object') {
          newObj[key] = transform(newObj[key]);
        }
      }
      return newObj;
    };

    return originalJson.call(this, transform(data));
  };
  next();
});

app.use('/api/', limiter);

// Static files - serve uploads
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/companies', companyRoutes);
app.use('/api/employees', employeeRoutes);
app.use('/api/departments', departmentRoutes);
app.use('/api/attendance', attendanceRoutes);
app.use('/api/leaves', leaveRoutes);
app.use('/api/recruitment', recruitmentRoutes);
app.use('/api/interviews', interviewRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/reviews', reviewRoutes);
app.use('/api/payroll', payrollRoutes);
app.use('/api/skills', skillRoutes);
app.use('/api/documents', documentRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/announcements', announcementRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/audit', auditRoutes);
app.use('/api/chatbot', chatbotRoutes);
app.use('/api/security', securityRoutes);
app.use('/api/posts', postRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ success: true, message: 'HRMS API is running', timestamp: new Date().toISOString() });
});

// Error handling
app.use(notFound);
app.use(errorHandler);

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`\n🚀 HRMS Server running on port ${PORT}`);
  console.log(`📡 Environment: ${process.env.NODE_ENV}`);
  console.log(`🔗 API: http://localhost:${PORT}/api/health\n`);
});

export default app;
