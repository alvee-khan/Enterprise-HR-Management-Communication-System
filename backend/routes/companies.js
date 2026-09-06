import express from 'express';
import { getCompanies, getCompany, createCompany, updateCompany, deleteCompany } from '../controllers/companyController.js';
import { protect } from '../middleware/auth.js';
import { authorize } from '../middleware/roleCheck.js';

const router = express.Router();
router.use(protect);

router.get('/', authorize('superAdmin', 'companyAdmin', 'hrManager'), getCompanies);
router.get('/:id', getCompany);
router.post('/', authorize('superAdmin'), createCompany);
router.put('/:id', authorize('superAdmin', 'companyAdmin'), updateCompany);
router.delete('/:id', authorize('superAdmin'), deleteCompany);

export default router;
