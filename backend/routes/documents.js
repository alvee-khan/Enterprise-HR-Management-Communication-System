import express from 'express';
import { getDocuments, uploadDocument, deleteDocument } from '../controllers/documentController.js';
import { protect } from '../middleware/auth.js';
import { uploadSingle } from '../middleware/upload.js';

const router = express.Router();
router.use(protect);

router.get('/', getDocuments);
router.post('/', uploadSingle('document'), uploadDocument);
router.delete('/:id', deleteDocument);

export default router;
