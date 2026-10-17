import AuditLog from '../models/AuditLog.js';
import User from '../models/User.js';
import DoctorProfile from '../models/DoctorProfile.js';
import PatientProfile from '../models/PatientProfile.js';
import AccessRequest from '../models/AccessRequest.js';
import { logAudit } from '../utils/auditHelper.js';

export const ACTION_LABELS = {
  LOGIN: 'User logged in',
  REGISTER: 'User registered',
  VERIFY_DOCTOR: 'Doctor verified',
  REVERIFY_DOCTOR: 'Doctor re-verified',
  REJECT_DOCTOR: 'Doctor rejected',
  ADMIN_VIEWED_RECORDS_OVERVIEW: 'Records overview viewed',
  ADMIN_VIEWED_PATIENTS: 'Patients directory viewed',
  ADMIN_EXPORTED_AUDIT_LOG: 'Audit log exported',
  CREATE_RECORD: 'Medical record created',
  EDIT_RECORD: 'Medical record updated',
  VIEW_RECORDS: 'Medical records viewed',
  VERIFY_RECORD: 'Integrity verified',
  VERIFY_RECORD_FAILED: 'Integrity check failed',
  REQUEST_ACCESS: 'Access requested',
  RE_REQUEST_ACCESS: 'Access re-requested',
  ACCESS_APPROVED: 'Access approved',
  ACCESS_REJECTED: 'Access rejected',
  ACCESS_REVOKED: 'Access revoked',
  ACTIVATE_USER: 'User activated',
  DEACTIVATE_USER: 'User deactivated'
};

// Helper: build filter based on user role and query parameters
const buildAuditFilter = async (req) => {
  const userId = req.user._id;
  let filter = {};

  if (req.user.role === 'PATIENT') {
    filter = { $or: [{ actor: userId }, { relatedPatient: userId }] };
  } else if (req.user.role === 'DOCTOR') {
    filter = { actor: userId };
  } else if (req.user.role === 'ADMIN') {
    filter = {};
  } else {
    filter = { actor: userId };
  }

  const { startDate, endDate, from, to, action, search } = req.query;

  const effectiveStart = startDate || from;
  const effectiveEnd = endDate || to;

  if (effectiveStart || effectiveEnd) {
    filter.timestamp = {};
    if (effectiveStart) filter.timestamp.$gte = new Date(effectiveStart);
    if (effectiveEnd) {
      const endD = new Date(effectiveEnd);
      // If only date string like YYYY-MM-DD was passed, end of that day
      if (effectiveEnd.length === 10) {
        endD.setHours(23, 59, 59, 999);
      }
      filter.timestamp.$lte = endD;
    }
  }

  if (action && action !== 'ALL') {
    filter.action = action;
  }

  if (search && search.trim()) {
    const trimmed = search.trim();
    const matchingUsers = await User.find({
      email: { $regex: trimmed, $options: 'i' }
    }).select('_id');
    const userIds = matchingUsers.map(u => u._id);

    if (filter.actor) {
      filter.$and = [
        { actor: filter.actor },
        { actor: { $in: userIds } }
      ];
      delete filter.actor;
    } else {
      filter.actor = { $in: userIds };
    }
  }

  return filter;
};

// Helper: resolve human-readable labels for older/unpopulated records
const populateLogDetails = async (logs, reqUser) => {
  // Pre-fetch access requests for doctor accessibility check
  let activeDoctorAccess = [];
  if (reqUser.role === 'DOCTOR') {
    const requests = await AccessRequest.find({ doctor: reqUser._id, status: 'APPROVED' });
    activeDoctorAccess = requests.map(r => r.patient.toString());
  }

  const populated = [];

  for (const log of logs) {
    const logObj = log.toObject();

    // 1. Resolve Actor Display Details (WHO column)
    let actorDisplayName = null;
    let actorEmail = log.actor?.email || null;
    let actorRole = log.role || log.actor?.role || 'USER';

    if (log.actor) {
      if (log.actor.role === 'DOCTOR') {
        const doc = await DoctorProfile.findOne({ user: log.actor._id });
        if (doc && (doc.firstName || doc.lastName)) {
          actorDisplayName = `Dr. ${doc.firstName || ''} ${doc.lastName || ''}`.trim();
        }
      } else if (log.actor.role === 'PATIENT') {
        const pat = await PatientProfile.findOne({ user: log.actor._id });
        if (pat && (pat.firstName || pat.lastName)) {
          actorDisplayName = `${pat.firstName || ''} ${pat.lastName || ''}`.trim();
        }
      }
    }

    // Rule: For admins or any user without profile name, show email as main line, never raw ObjectId
    if (!actorDisplayName) {
      actorDisplayName = actorEmail || (log.role === 'SYSTEM' ? 'System' : 'Unknown User');
    }

    logObj.actorName = actorDisplayName;
    logObj.actorEmail = actorEmail;
    logObj.displayRole = actorRole;

    // 2. Resolve Resource Details (RESOURCE column)
    let label = log.resourceLabel;

    if (!label) {
      if (log.action === 'REGISTER') {
        if (log.actor) {
          if (log.actor.role === 'DOCTOR') {
            const doc = await DoctorProfile.findOne({ user: log.actor._id });
            label = doc ? `Doctor account: Dr. ${doc.firstName || ''} ${doc.lastName || ''}`.trim() : `Doctor account: ${actorEmail || 'Doctor'}`;
          } else if (log.actor.role === 'PATIENT') {
            const pat = await PatientProfile.findOne({ user: log.actor._id });
            label = pat ? `Patient account: ${pat.firstName || ''} ${pat.lastName || ''}`.trim() : `Patient account: ${actorEmail || 'Patient'}`;
          } else {
            label = `User account: ${actorEmail || 'New account'}`;
          }
        } else {
          label = 'New account';
        }
      } else if (log.action === 'LOGIN') {
        label = actorEmail ? `User account: ${actorEmail}` : 'User account';
      } else if (log.resourceType === 'DoctorProfile' && log.resourceId) {
        const doc = await DoctorProfile.findById(log.resourceId);
        if (doc) {
          label = `Doctor: Dr. ${doc.firstName || ''} ${doc.lastName || ''}`.trim();
        } else {
          label = `Doctor #${String(log.resourceId).slice(-6)}`;
        }
      } else if (log.resourceType === 'MedicalRecord' && log.resourceId) {
        label = `Medical record #${String(log.resourceId).slice(-6)}`;
      } else if (log.resourceType === 'AccessRequest' && log.resourceId) {
        label = `Access request #${String(log.resourceId).slice(-6)}`;
      } else if (log.resourceType === 'SystemReport') {
        label = log.details || 'System report';
      } else if (log.resourceType) {
        const cleanType = log.resourceType.replace(/Profile$/, '');
        label = log.resourceId ? `${cleanType} #${String(log.resourceId).slice(-6)}` : cleanType;
      } else {
        label = '—';
      }
    }

    logObj.resourceLabel = label || '—';

    // 3. Readable Action Label
    logObj.actionLabel = ACTION_LABELS[log.action] || log.action?.replace(/_/g, ' ').toLowerCase().replace(/^\w/, c => c.toUpperCase()) || 'Unknown Action';

    // 4. Accessibility / clickability check for records
    logObj.isAccessible = false;
    if (reqUser.role === 'PATIENT') {
      if (logObj.relatedPatient && logObj.relatedPatient.toString() === reqUser._id.toString()) {
        logObj.isAccessible = true;
      }
    } else if (reqUser.role === 'DOCTOR') {
      if (logObj.relatedPatient && activeDoctorAccess.includes(logObj.relatedPatient.toString())) {
        logObj.isAccessible = true;
      }
    }

    populated.push(logObj);
  }

  return populated;
};

// @desc    Get audit actions list with human-readable labels
// @route   GET /api/audit/actions
// @access  Private
export const getAuditActions = async (req, res) => {
  try {
    const actions = Object.entries(ACTION_LABELS).map(([action, label]) => ({
      action,
      label
    }));
    res.json({ success: true, data: actions });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get audit logs for the logged-in user
// @route   GET /api/audit/my
// @access  Private
export const getMyAuditLogs = async (req, res) => {
  try {
    const filter = await buildAuditFilter(req);

    const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
    const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 20, 1), 100);
    const skip = (page - 1) * limit;

    const totalLogs = await AuditLog.countDocuments(filter);
    const logs = await AuditLog.find(filter)
      .populate('actor', 'role email')
      .sort({ timestamp: -1 })
      .skip(skip)
      .limit(limit);

    const populatedLogs = await populateLogDetails(logs, req.user);
    const totalPages = Math.ceil(totalLogs / limit) || 1;

    res.json({
      success: true,
      data: populatedLogs,
      pagination: {
        page,
        limit,
        total: totalLogs,
        pages: totalPages
      },
      // Backwards compatibility for existing client consumers
      logs: populatedLogs,
      totalPages,
      currentPage: page,
      totalLogs
    });
  } catch (error) {
    console.error('getMyAuditLogs error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// CSV escaping and formula injection protection
const sanitizeCsvCell = (val) => {
  if (val === null || val === undefined) return '""';
  let str = String(val).replace(/\r\n/g, ' ').replace(/[\r\n]/g, ' ').trim();
  // CSV Formula injection guard: if string begins with =, +, -, @, prefix with single quote
  if (/^[=+\-@]/.test(str)) {
    str = `'${str}`;
  }
  return `"${str.replace(/"/g, '""')}"`;
};

// @desc    Export audit logs to CSV
// @route   GET /api/audit/export
// @access  Private/Admin
export const exportAuditLogs = async (req, res) => {
  try {
    const filter = await buildAuditFilter(req);

    // Fetch matching audit logs (up to 10,000)
    const logs = await AuditLog.find(filter)
      .populate('actor', 'role email')
      .sort({ timestamp: -1 })
      .limit(10000);

    const populatedLogs = await populateLogDetails(logs, req.user);

    // Write audit log entry for the export itself
    try {
      await logAudit(req, {
        actor: req.user._id,
        role: req.user.role,
        action: 'ADMIN_EXPORTED_AUDIT_LOG',
        resourceType: 'SystemReport',
        resourceLabel: 'Audit log CSV export',
        details: `Exported ${populatedLogs.length} audit trail records`
      });
    } catch (auditErr) {
      console.warn('[AUDIT WARNING] Failed to record ADMIN_EXPORTED_AUDIT_LOG:', auditErr.message);
    }

    const headers = ['Timestamp', 'User Email', 'Role', 'Action', 'Resource', 'IP Address'];
    const rows = [headers.map(sanitizeCsvCell).join(',')];

    for (const log of populatedLogs) {
      const email = log.actorEmail || 'N/A';
      const role = log.displayRole || log.role || 'USER';
      const actionName = log.actionLabel || log.action;
      const resource = log.resourceLabel || '—';
      const ip = log.ipAddress || 'Unknown';
      const timestamp = new Date(log.timestamp).toISOString();

      rows.push([
        sanitizeCsvCell(timestamp),
        sanitizeCsvCell(email),
        sanitizeCsvCell(role),
        sanitizeCsvCell(actionName),
        sanitizeCsvCell(resource),
        sanitizeCsvCell(ip)
      ].join(','));
    }

    const csvContent = rows.join('\r\n');
    const filename = `audit-logs-${new Date().toISOString().slice(0, 10)}.csv`;

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    return res.status(200).send(csvContent);
  } catch (error) {
    console.error('exportAuditLogs error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};
