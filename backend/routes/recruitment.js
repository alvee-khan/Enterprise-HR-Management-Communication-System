import express from 'express';
import { getJobs, createJob, updateJob, deleteJob, getCandidates, getCandidate, createCandidate, updateCandidateStatus, uploadResume, getRankedCandidates } from '../controllers/recruitmentController.js';
import { protect } from '../middleware/auth.js';
import { authorize } from '../middleware/roleCheck.js';
import { uploadSingle } from '../middleware/upload.js';

const router = express.Router();
router.use(protect);

// Jobs
router.get('/jobs', getJobs);
router.post('/jobs', authorize('superAdmin', 'companyAdmin', 'hrManager'), createJob);
router.put('/jobs/:id', authorize('superAdmin', 'companyAdmin', 'hrManager'), updateJob);
router.delete('/jobs/:id', authorize('superAdmin', 'companyAdmin', 'hrManager'), deleteJob);

// Candidates
router.get('/candidates', getCandidates);
router.get('/candidates/ranked/:jobId', getRankedCandidates);
router.get('/candidates/:id', getCandidate);
router.post('/candidates', authorize('superAdmin', 'companyAdmin', 'hrManager'), createCandidate);
router.put('/candidates/:id/status', authorize('superAdmin', 'companyAdmin', 'hrManager'), updateCandidateStatus);
router.post('/candidates/:id/resume', uploadSingle('resume'), uploadResume);

export default router;
