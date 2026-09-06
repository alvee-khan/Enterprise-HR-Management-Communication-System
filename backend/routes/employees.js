import express from 'express';
import { getEmployees, getEmployee, createEmployee, updateEmployee, deleteEmployee, uploadAvatar, getEmployeeStats } from '../controllers/employeeController.js';
import { protect } from '../middleware/auth.js';
import { authorize, attachCompany } from '../middleware/roleCheck.js';
import { uploadSingle } from '../middleware/upload.js';

const router = express.Router();
router.use(protect, attachCompany);

router.get('/stats', authorize('superAdmin', 'companyAdmin', 'hrManager', 'manager'), getEmployeeStats);
router.get('/', getEmployees);
router.get('/:id', getEmployee);
router.post('/', authorize('superAdmin', 'companyAdmin', 'hrManager'), createEmployee);
router.put('/:id', authorize('superAdmin', 'companyAdmin', 'hrManager'), updateEmployee);
router.delete('/:id', authorize('superAdmin', 'companyAdmin'), deleteEmployee);
router.post('/:id/avatar', uploadSingle('profileImage'), uploadAvatar);

export default router;
