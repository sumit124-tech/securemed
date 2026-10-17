import Notification from '../models/Notification.js';

/**
 * Safely creates a notification after removing null, undefined, and empty string fields.
 * Wrapped in try/catch: logs a warning and returns null on failure so it never throws or interrupts caller flow.
 *
 * @param {Object} data - Notification fields (user, targetRole, type, title, message, link, relatedId, etc.)
 * @returns {Promise<Object|null>}
 */
export const createNotification = async (data = {}) => {
  try {
    if (!data || typeof data !== 'object') {
      console.warn('[NOTIFICATION WARNING] Invalid notification data provided.');
      return null;
    }

    // Clean data: remove null, undefined, or empty string fields
    const cleaned = {};
    for (const [key, value] of Object.entries(data)) {
      if (value !== null && value !== undefined && value !== '') {
        cleaned[key] = value;
      }
    }

    if (!cleaned.message) {
      console.warn('[NOTIFICATION WARNING] Notification message is required.');
      return null;
    }

    if (!cleaned.type) {
      cleaned.type = 'SYSTEM';
    }

    const notification = await Notification.create(cleaned);
    return notification;
  } catch (error) {
    console.warn('[NOTIFICATION WARNING] Failed to create notification:', error.message);
    return null;
  }
};

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
  return createNotification({
    targetRole: 'ADMIN',
    type: type || 'SYSTEM',
    title: title || undefined,
    message,
    link: link || '/admin-dashboard',
    relatedId: relatedId || undefined,
    readBy: []
  });
};

export default notifyAdmins;

