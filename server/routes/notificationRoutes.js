import express from 'express';
import { getNotifications, getUnreadCount, markAsRead, markAllAsRead } from '../controllers/notificationController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

router.get('/', protect, getNotifications);
router.get('/unread-count', protect, getUnreadCount);

// Support both PUT and PATCH
router.put('/read-all', protect, markAllAsRead);
router.patch('/read-all', protect, markAllAsRead);

router.put('/:id/read', protect, markAsRead);
router.patch('/:id/read', protect, markAsRead);

export default router;
