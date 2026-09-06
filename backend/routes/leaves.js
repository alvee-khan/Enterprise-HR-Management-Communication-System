import express from 'express';
import { applyLeave, getLeaves, approveLeave, cancelLeave, getLeaveBalance } from '../controllers/leaveController.js';
import { protect } from '../middleware/auth.js';
import { authorize } from '../middleware/roleCheck.js';

const router = express.Router();
router.use(protect);

router.get('/', getLeaves);
router.get('/balance', getLeaveBalance);
router.post('/', applyLeave);
router.put('/:id/action', authorize('superAdmin', 'companyAdmin', 'hrManager', 'manager'), approveLeave);
router.put('/:id/cancel', cancelLeave);

export default router;
