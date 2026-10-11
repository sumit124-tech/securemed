import express from 'express';
import { getDoctorStats, getMyPatients, getMySentRequests, uploadDoctorDocuments } from '../controllers/doctorController.js';
import { protect, authorize } from '../middleware/authMiddleware.js';

const router = express.Router();

router.get('/stats', protect, authorize('DOCTOR'), getDoctorStats);
router.get('/patients', protect, authorize('DOCTOR'), getMyPatients);
router.get('/requests', protect, authorize('DOCTOR'), getMySentRequests);
router.post('/documents', protect, authorize('DOCTOR'), uploadDoctorDocuments);

export default router;
