/**
 * CSE447 Security and Cryptography
 * Security Routes
 */

import express from 'express';
import {
  getSecurityStatus,
  runSecurityTests,
  handleKeyRotation,
  handleKeyRevocation,
  verifyAuditLogLedger
} from '../controllers/securityController.js';
import { protect } from '../middleware/auth.js';
import { authorize } from '../middleware/roleMiddleware.js';

const router = express.Router();

router.use(protect);

router.get('/status', authorize('superAdmin', 'companyAdmin', 'hrManager'), getSecurityStatus);
router.post('/test', authorize('superAdmin', 'companyAdmin', 'hrManager'), runSecurityTests);
router.post('/keys/rotate', authorize('superAdmin', 'companyAdmin'), handleKeyRotation);
router.post('/keys/:id/revoke', authorize('superAdmin', 'companyAdmin'), handleKeyRevocation);
router.get('/audit/verify', authorize('superAdmin', 'companyAdmin', 'hrManager'), verifyAuditLogLedger);

export default router;
