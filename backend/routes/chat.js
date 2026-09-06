import express from 'express';
import { getMessages, sendMessage, deleteMessage, getConversations } from '../controllers/chatController.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();
router.use(protect);

router.get('/conversations', getConversations);
router.get('/', getMessages);
router.post('/', sendMessage);
router.delete('/:id', deleteMessage);

export default router;
