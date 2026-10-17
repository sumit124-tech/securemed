import express from 'express';
import { getMyAuditLogs, getAuditActions, exportAuditLogs } from '../controllers/auditController.js';
import { protect, authorize } from '../middleware/authMiddleware.js';

const router = express.Router();

// Read-only and append-only ledger endpoints (no PUT, PATCH, or DELETE routes exist)
router.get('/actions', protect, getAuditActions);
router.get('/export', protect, authorize('ADMIN'), exportAuditLogs);
router.get('/my', protect, getMyAuditLogs);

export default router;
