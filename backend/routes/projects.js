import express from 'express';
import { getProjects, createProject, updateProject, deleteProject } from '../controllers/projectController.js';
import { protect } from '../middleware/auth.js';
import { authorize } from '../middleware/roleCheck.js';

const router = express.Router();
router.use(protect);

router.get('/', getProjects);
router.post('/', authorize('superAdmin', 'companyAdmin', 'hrManager', 'manager'), createProject);
router.put('/:id', authorize('superAdmin', 'companyAdmin', 'hrManager', 'manager'), updateProject);
router.delete('/:id', authorize('superAdmin', 'companyAdmin'), deleteProject);

export default router;
