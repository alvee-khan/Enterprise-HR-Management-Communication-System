import express from 'express';
import { getAnnouncements, createAnnouncement, updateAnnouncement, deleteAnnouncement, markAnnouncementRead } from '../controllers/announcementController.js';
import { protect } from '../middleware/auth.js';
import { authorize } from '../middleware/roleCheck.js';

const router = express.Router();
router.use(protect);

router.get('/', getAnnouncements);
router.post('/', authorize('superAdmin', 'companyAdmin', 'hrManager'), createAnnouncement);
router.put('/:id', authorize('superAdmin', 'companyAdmin', 'hrManager'), updateAnnouncement);
router.delete('/:id', authorize('superAdmin', 'companyAdmin', 'hrManager'), deleteAnnouncement);
router.post('/:id/read', markAnnouncementRead);

export default router;
