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

    // Optional server-side filters for date range and pagination
    const { startDate, endDate, page = 1, limit = 20, action } = req.query;
    
    if (startDate || endDate) {
      filter.timestamp = {};
      if (startDate) filter.timestamp.$gte = new Date(startDate);
      if (endDate) filter.timestamp.$lte = new Date(endDate);
    }
    if (action && action !== 'ALL') {
      filter.action = action;
    }

    const skip = (page - 1) * limit;

    const totalLogs = await AuditLog.countDocuments(filter);
    const logs = await AuditLog.find(filter)
      .populate('actor', 'role email')
      .sort({ timestamp: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const { default: AccessRequest } = await import('../models/AccessRequest.js');
    const { default: PatientProfile } = await import('../models/PatientProfile.js');
    const { default: DoctorProfile } = await import('../models/DoctorProfile.js');
    
    // Pre-fetch access requests for doctor to check visibility
    let activeDoctorAccess = [];
    if (req.user.role === 'DOCTOR') {
      const requests = await AccessRequest.find({ doctor: userId, status: 'APPROVED' });
      activeDoctorAccess = requests.map(r => r.patient.toString());
    }

    const populatedLogs = [];
    for (const log of logs) {
      const logObj = log.toObject();
      if (log.actor) {
        let profile = null;
        if (log.actor.role === 'PATIENT') profile = await PatientProfile.findOne({ user: log.actor._id });
        if (log.actor.role === 'DOCTOR') profile = await DoctorProfile.findOne({ user: log.actor._id });
        
        if (profile) {
          logObj.actorName = log.actor.role === 'DOCTOR' ? `Dr. ${profile.firstName} ${profile.lastName}` : `${profile.firstName} ${profile.lastName}`;
        }
      }
      
      // Determine if resource is clickable
      logObj.isAccessible = false;
      if (req.user.role === 'PATIENT') {
        // Patient can access their own records
        if (logObj.relatedPatient && logObj.relatedPatient.toString() === userId.toString()) {
          logObj.isAccessible = true;
        }
      } else if (req.user.role === 'DOCTOR') {
        // Doctor can access if they have approved access
        if (logObj.relatedPatient && activeDoctorAccess.includes(logObj.relatedPatient.toString())) {
          logObj.isAccessible = true;
        }
      }
      
      populatedLogs.push(logObj);
    }

    res.json({
      logs: populatedLogs,
      totalPages: Math.ceil(totalLogs / limit),
      currentPage: parseInt(page),
      totalLogs
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
