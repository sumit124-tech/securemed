import Notification from '../models/Notification.js';

/**
 * Safely dispatches a role-targeted notification to all admins.
 * Wrapped in try/catch: will never throw or interrupt caller flow.
 *
 * @param {Object} options
 * @param {string} options.type - Notification category/type (e.g. 'DOCTOR_REGISTERED', 'DOCTOR_VERIFIED', 'DOCTOR_REJECTED', 'SECURITY_ALERT')
 * @param {string} [options.title] - Short heading for notification
 * @param {string} options.message - Descriptive notification text
 * @param {string} [options.link] - Target app path (e.g. '/admin-dashboard?tab=PENDING')
 * @param {string|mongoose.Types.ObjectId} [options.relatedId] - Associated entity ID
 */
export const notifyAdmins = async ({ type, title, message, link, relatedId }) => {
  try {
    if (!message) {
      console.warn('[NOTIFY ADMINS WARNING] Notification message is required.');
      return null;
    }

    const notification = await Notification.create({
      targetRole: 'ADMIN',
      type: type || 'SYSTEM',
      title: title || null,
      message,
      link: link || '/admin-dashboard',
      relatedId: relatedId || null,
      readBy: []
    });

    return notification;
  } catch (error) {
    console.warn('[NOTIFY ADMINS WARNING] Failed to create admin notification:', error.message);
    return null;
  }
};

export default notifyAdmins;
