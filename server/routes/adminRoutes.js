import express from 'express';
import { protect, authorize } from '../middleware/authMiddleware.js';
import { getUnverifiedDoctors, verifyDoctor, rejectDoctor } from '../controllers/adminController.js';

const router = express.Router();

router.get('/doctors', protect, authorize('ADMIN'), getUnverifiedDoctors);
router.put('/verify-doctor/:id', protect, authorize('ADMIN'), verifyDoctor);
router.put('/reject-doctor/:id', protect, authorize('ADMIN'), rejectDoctor);

export default router;
