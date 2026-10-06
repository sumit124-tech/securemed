import express from 'express';
import { getDoctorStats, getMyPatients, getMySentRequests } from '../controllers/doctorController.js';
import { protect, authorize } from '../middleware/authMiddleware.js';

const router = express.Router();

router.get('/stats', protect, authorize('DOCTOR'), getDoctorStats);
router.get('/patients', protect, authorize('DOCTOR'), getMyPatients);
router.get('/requests', protect, authorize('DOCTOR'), getMySentRequests);

export default router;
