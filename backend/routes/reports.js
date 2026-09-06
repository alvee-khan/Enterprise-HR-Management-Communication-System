import express from 'express';
import { getDashboardStats, getEmployeeDashboard, exportExcel, exportPDF } from '../controllers/reportController.js';
import { protect } from '../middleware/auth.js';
import { authorize } from '../middleware/roleCheck.js';

const router = express.Router();
router.use(protect);

router.get('/dashboard', getDashboardStats);
router.get('/employee-dashboard', getEmployeeDashboard);
router.get('/export/excel', exportExcel);
router.get('/export/pdf', exportPDF);

export default router;
