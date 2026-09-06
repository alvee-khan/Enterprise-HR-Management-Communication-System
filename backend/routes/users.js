import express from 'express';
import { getUsers, getUser, updateUser, updateProfile, deactivateUser } from '../controllers/userController.js';
import { protect } from '../middleware/auth.js';
import { authorize } from '../middleware/roleCheck.js';
import { uploadSingle } from '../middleware/upload.js';

const router = express.Router();
router.use(protect);

router.get('/', authorize('superAdmin', 'companyAdmin', 'hrManager'), getUsers);
router.get('/:id', getUser);
router.put('/profile/me', uploadSingle('profileImage'), updateProfile);
router.put('/:id', authorize('superAdmin', 'companyAdmin'), updateUser);
router.delete('/:id', authorize('superAdmin', 'companyAdmin'), deactivateUser);

export default router;
