import express from 'express';
import { createRecord, getPatientRecords, verifyRecordIntegrity, editRecord, getRecordHistory } from '../controllers/recordController.js';
import { protect, authorize } from '../middleware/authMiddleware.js';

const router = express.Router();

router.post('/', protect, authorize('DOCTOR'), createRecord);
router.get('/patient/:patientId', protect, getPatientRecords);
router.get('/verify/:recordId', protect, verifyRecordIntegrity);
router.post('/:id/version', protect, authorize('DOCTOR'), editRecord);
router.get('/:id/history', protect, getRecordHistory);

export default router;
