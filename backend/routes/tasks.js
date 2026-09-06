import express from 'express';
import { getTasks, getKanbanTasks, createTask, updateTask, updateTaskStatus, deleteTask, addComment } from '../controllers/taskController.js';
import { protect } from '../middleware/auth.js';
import { authorize } from '../middleware/roleCheck.js';

const router = express.Router();
router.use(protect);

router.get('/', getTasks);
router.get('/kanban', getKanbanTasks);
router.post('/', authorize('superAdmin', 'companyAdmin', 'hrManager', 'manager'), createTask);
router.put('/:id', updateTask);
router.patch('/:id/status', updateTaskStatus);
router.delete('/:id', authorize('superAdmin', 'companyAdmin', 'hrManager', 'manager'), deleteTask);
router.post('/:id/comments', addComment);

export default router;
