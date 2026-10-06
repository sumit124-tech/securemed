import express from 'express';
import { getMyAuditLogs } from '../controllers/auditController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

router.get('/my', protect, getMyAuditLogs);

export default router;
