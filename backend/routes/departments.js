import express from 'express';
import { getDepartments, getDepartment, createDepartment, updateDepartment, deleteDepartment, getOrgChart } from '../controllers/departmentController.js';
import { protect } from '../middleware/auth.js';
import { authorize } from '../middleware/roleCheck.js';

const router = express.Router();
router.use(protect);

router.get('/org-chart', getOrgChart);
router.get('/', getDepartments);
router.get('/:id', getDepartment);
router.post('/', authorize('superAdmin', 'companyAdmin', 'hrManager'), createDepartment);
router.put('/:id', authorize('superAdmin', 'companyAdmin', 'hrManager'), updateDepartment);
router.delete('/:id', authorize('superAdmin', 'companyAdmin'), deleteDepartment);

export default router;
