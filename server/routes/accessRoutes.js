import express from 'express';
import { requestAccess, respondToRequest, revokeAccess, getMyRequests } from '../controllers/accessController.js';
import { protect, authorize } from '../middleware/authMiddleware.js';

const router = express.Router();

// Only DOCTORS can request access
router.post('/request', protect, authorize('DOCTOR'), requestAccess);

// Only PATIENTS can approve/reject/revoke access
router.get('/my-requests', protect, authorize('PATIENT'), getMyRequests);
router.put('/respond/:requestId', protect, authorize('PATIENT'), respondToRequest);
router.put('/revoke/:doctorId', protect, authorize('PATIENT'), revokeAccess);

export default router;
