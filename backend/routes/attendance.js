import express from 'express';
import { checkIn, checkOut, getAttendance, generateQR, getMonthlyReport } from '../controllers/attendanceController.js';
import { protect } from '../middleware/auth.js';
import { authorize } from '../middleware/roleCheck.js';

const router = express.Router();
router.use(protect);

router.get('/', getAttendance);
router.get('/monthly-report', getMonthlyReport);
router.get('/generate-qr', authorize('superAdmin', 'companyAdmin', 'hrManager'), generateQR);
router.post('/check-in', checkIn);
router.post('/check-out', checkOut);

export default router;
