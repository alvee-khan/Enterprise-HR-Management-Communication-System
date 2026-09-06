import express from 'express';
import { getPayrolls, generatePayroll, updatePayroll, markAsPaid, getPayrollStats } from '../controllers/payrollController.js';
import { protect } from '../middleware/auth.js';
import { authorize } from '../middleware/roleCheck.js';

const router = express.Router();
router.use(protect);

router.get('/', getPayrolls);
router.get('/stats', authorize('superAdmin', 'companyAdmin', 'hrManager'), getPayrollStats);
router.post('/', authorize('superAdmin', 'companyAdmin', 'hrManager'), generatePayroll);
router.put('/:id', authorize('superAdmin', 'companyAdmin', 'hrManager'), updatePayroll);
router.patch('/:id/pay', authorize('superAdmin', 'companyAdmin', 'hrManager'), markAsPaid);

export default router;
