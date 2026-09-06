import express from 'express';
import { createPost, getPosts, getPost, updatePost, deletePost } from '../controllers/postController.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();
router.use(protect); // All post routes require authentication

// All authenticated users can create and view posts (Req 6)
router.get('/',    getPosts);
router.post('/',   createPost);
router.get('/:id',    getPost);
router.put('/:id',    updatePost);
router.delete('/:id', deletePost);

export default router;
