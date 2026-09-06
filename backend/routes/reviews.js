import express from 'express';
import { getReviews, createReview, updateReview, acknowledgeReview } from '../controllers/reviewController.js';
import { protect } from '../middleware/auth.js';
import { authorize } from '../middleware/roleCheck.js';

const router = express.Router();
router.use(protect);

router.get('/', getReviews);
router.post('/', authorize('superAdmin', 'companyAdmin', 'hrManager', 'manager'), createReview);
router.put('/:id', authorize('superAdmin', 'companyAdmin', 'hrManager', 'manager'), updateReview);
router.post('/:id/acknowledge', acknowledgeReview);

export default router;
