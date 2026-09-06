import express from 'express';
import { chatbotQuery } from '../controllers/chatbotController.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();
router.use(protect);

router.post('/query', chatbotQuery);

export default router;
