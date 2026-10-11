import Notification from '../models/Notification.js';
import mongoose from 'mongoose';

// @desc    Get all notifications for logged in user (personal or role-targeted)
// @route   GET /api/notifications
// @access  Private
export const getNotifications = async (req, res) => {
  try {
    const userId = req.user._id;
    const userRole = req.user.role;

    // Fetch notifications where user matches OR role matches
    const rawNotifications = await Notification.find({
      $or: [
        { user: userId },
        { targetRole: userRole }
      ]
    })
      .sort({ createdAt: -1 })
      .limit(20)
      .lean();

    // Map per-user read status
    const formatted = rawNotifications.map((n) => {
      const isRoleTargeted = Boolean(n.targetRole);
      const isReadByUser = isRoleTargeted
        ? Array.isArray(n.readBy) && n.readBy.some((id) => id.toString() === userId.toString())
        : Boolean(n.isRead || (Array.isArray(n.readBy) && n.readBy.some((id) => id.toString() === userId.toString())));

      return {
        ...n,
        isRead: isReadByUser
      };
    });

    res.json(formatted);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get unread count for logged in user
// @route   GET /api/notifications/unread-count
// @access  Private
export const getUnreadCount = async (req, res) => {
  try {
    const userId = req.user._id;
    const userRole = req.user.role;

    const count = await Notification.countDocuments({
      $or: [
        { user: userId, isRead: false },
        { targetRole: userRole, readBy: { $ne: userId } }
      ]
    });

    res.json({ unreadCount: count });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Mark a notification as read (per-user for role-targeted notifications)
// @route   PUT/PATCH /api/notifications/:id/read
// @access  Private
export const markAsRead = async (req, res) => {
  try {
    const notification = await Notification.findById(req.params.id);
    
    if (!notification) {
      return res.status(404).json({ message: 'Notification not found' });
    }
    
    const isOwner = notification.user && notification.user.toString() === req.user._id.toString();
    const isTargetRole = notification.targetRole && notification.targetRole === req.user.role;

    if (!isOwner && !isTargetRole) {
      return res.status(403).json({ message: 'Not authorized to update this notification' });
    }

    if (notification.targetRole) {
      await Notification.updateOne(
        { _id: notification._id },
        { $addToSet: { readBy: req.user._id } }
      );
    } else {
      notification.isRead = true;
      if (!notification.readBy) notification.readBy = [];
      if (!notification.readBy.some((id) => id.toString() === req.user._id.toString())) {
        notification.readBy.push(req.user._id);
      }
      await notification.save();
    }
    
    res.json({ success: true, message: 'Notification marked as read' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Mark all notifications as read for current user
// @route   PUT/PATCH /api/notifications/read-all
// @access  Private
export const markAllAsRead = async (req, res) => {
  try {
    const userId = req.user._id;
    const userRole = req.user.role;

    // 1. Mark personal notifications
    await Notification.updateMany(
      { user: userId, isRead: false },
      { $set: { isRead: true }, $addToSet: { readBy: userId } }
    );

    // 2. Mark role-targeted notifications for this user
    await Notification.updateMany(
      { targetRole: userRole },
      { $addToSet: { readBy: userId } }
    );

    res.json({ message: 'All notifications marked as read' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
