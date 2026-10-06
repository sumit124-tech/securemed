import AuditLog from '../models/AuditLog.js';

// @desc    Get audit logs for the logged-in user
// @route   GET /api/audit/my
// @access  Private
export const getMyAuditLogs = async (req, res) => {
  try {
    const userId = req.user._id;
    let filter = {};

    if (req.user.role === 'PATIENT') {
      // Patient sees actions they performed OR actions related to them
      filter = { $or: [{ actor: userId }, { relatedPatient: userId }] };
    } else if (req.user.role === 'DOCTOR') {
      // Doctor: same page, showing only their own actions.
      filter = { actor: userId };
    } else {
      filter = { actor: userId };
    }

    // But wait, the prompt asks for "events on that patient's records for patients".
    // Let's update `AuditLog.js` to optionally store `relatedPatient: ObjectId`.
    // Wait, the prompt says "DO NOT modify... ah wait, that was for the AUDIT ONLY step."
    // Now I am IN IMPLEMENTATION MODE.

    const logs = await AuditLog.find(filter)
      .populate('actor', 'firstName lastName role email')
      .sort({ timestamp: -1 })
      .limit(100);

    res.json(logs);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
