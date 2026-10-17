import express from 'express';
import { protect, authorize } from '../middleware/authMiddleware.js';
import { 
  getAdminStats, 
  getSystemHealth, 
  getUnverifiedDoctors, 
  getAdminPatients, 
  getRecordsOverview,
  verifyDoctor, 
  rejectDoctor,
  reanchorRecordsController,
  retryAnchorQueueController,
  runIntegrityAuditController,
  getLatestIntegrityAuditsController
} from '../controllers/adminController.js';

const router = express.Router();

router.get('/health', protect, authorize('ADMIN'), getSystemHealth);
router.post('/reanchor', protect, authorize('ADMIN'), reanchorRecordsController);
router.post('/retry-anchor', protect, authorize('ADMIN'), retryAnchorQueueController);
router.post('/integrity-audit/run', protect, authorize('ADMIN'), runIntegrityAuditController);
router.get('/integrity-audit/latest', protect, authorize('ADMIN'), getLatestIntegrityAuditsController);
router.get('/stats', protect, authorize('ADMIN'), getAdminStats);
router.get('/doctors', protect, authorize('ADMIN'), getUnverifiedDoctors);
router.get('/patients', protect, authorize('ADMIN'), getAdminPatients);
router.get('/records/overview', protect, authorize('ADMIN'), getRecordsOverview);
router.put('/verify-doctor/:id', protect, authorize('ADMIN'), verifyDoctor);
router.put('/reject-doctor/:id', protect, authorize('ADMIN'), rejectDoctor);

export default router;


