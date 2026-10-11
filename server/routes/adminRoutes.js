import express from 'express';
import { protect, authorize } from '../middleware/authMiddleware.js';
import { 
  getAdminStats, 
  getSystemHealth, 
  getUnverifiedDoctors, 
  getAdminPatients, 
  verifyDoctor, 
  rejectDoctor 
} from '../controllers/adminController.js';

const router = express.Router();

router.get('/health', protect, authorize('ADMIN'), getSystemHealth);
router.get('/stats', protect, authorize('ADMIN'), getAdminStats);
router.get('/doctors', protect, authorize('ADMIN'), getUnverifiedDoctors);
router.get('/patients', protect, authorize('ADMIN'), getAdminPatients);
router.put('/verify-doctor/:id', protect, authorize('ADMIN'), verifyDoctor);
router.put('/reject-doctor/:id', protect, authorize('ADMIN'), rejectDoctor);

export default router;


