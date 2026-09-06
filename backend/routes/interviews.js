import express from 'express';
import { getInterviews, scheduleInterview, updateInterview, submitFeedback } from '../controllers/interviewController.js';
import { protect } from '../middleware/auth.js';
import { authorize } from '../middleware/roleCheck.js';

const router = express.Router();
router.use(protect);

router.get('/', getInterviews);
router.post('/', authorize('superAdmin', 'companyAdmin', 'hrManager'), scheduleInterview);
router.put('/:id', authorize('superAdmin', 'companyAdmin', 'hrManager'), updateInterview);
router.post('/:id/feedback', submitFeedback);

export default router;
