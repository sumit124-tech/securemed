import mongoose from 'mongoose';
import User from '../models/User.js';
import DoctorProfile from '../models/DoctorProfile.js';
import PatientProfile from '../models/PatientProfile.js';
import MedicalRecord from '../models/MedicalRecord.js';
import Notification from '../models/Notification.js';
import AuditLog from '../models/AuditLog.js';
import { logAudit } from '../utils/auditHelper.js';
import { notifyAdmins, createNotification } from '../utils/notifyHelper.js';
import blockchainService from '../services/blockchainService.js';
import { getChainResetStatus } from '../services/chainResetService.js';
import { reanchorRecords } from '../scripts/reanchorRecords.js';

// Track last known service status in-memory to notify admins only once per outage
const lastHealthStatus = {
  mongodb: 'up',
  blockchain: 'up'
};

// @desc    Get system health status for server, mongodb, and blockchain
// @route   GET /api/admin/health
// @access  Private/Admin
export const getSystemHealth = async (req, res) => {
  try {
    const checkedAt = new Date().toISOString();

    // 1. Server info (process uptime and node version)
    const server = {
      status: 'up',
      uptimeSeconds: Math.floor(process.uptime()),
      nodeVersion: process.version
    };

    // 2. MongoDB check (readyState === 1 means connected)
    const mongoReady = mongoose.connection.readyState === 1;
    let mongodb = {
      status: mongoReady ? 'up' : 'down'
    };
    if (!mongoReady) {
      const stateMap = { 0: 'disconnected', 2: 'connecting', 3: 'disconnecting' };
      mongodb.error = `Database connection not active (${stateMap[mongoose.connection.readyState] || 'unknown state'})`;
    }

    // Outage alert for MongoDB on up -> down transition
    if (mongodb.status === 'down' && lastHealthStatus.mongodb === 'up') {
      lastHealthStatus.mongodb = 'down';
      try {
        await notifyAdmins({
          type: 'SYSTEM_ALERT',
          title: 'MongoDB Service Outage',
          message: `MongoDB has become unreachable. ${mongodb.error || ''}`.trim(),
          link: '/admin-dashboard'
        });
      } catch (notifyErr) {
        console.warn('[HEALTH ALERT WARNING] Failed to notify admins of MongoDB outage:', notifyErr.message);
      }
    } else if (mongodb.status === 'up' && lastHealthStatus.mongodb === 'down') {
      lastHealthStatus.mongodb = 'up';
    }

    // 3. Blockchain check with 2-second timeout and contract address
    let blockchain = {
      status: 'down',
      contractAddress: null
    };

    try {
      if (typeof blockchainService?.getContractAddress === 'function') {
        blockchain.contractAddress = blockchainService.getContractAddress();
      }
    } catch (e) {
      // ignore contract address resolution error
    }

    try {
      if (!blockchainService?.provider) {
        throw new Error('Blockchain provider is not configured');
      }

      // Race getBlockNumber with a 2-second timeout
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Blockchain provider request timed out (2s)')), 2000)
      );

      const blockNumber = await Promise.race([
        blockchainService.provider.getBlockNumber(),
        timeoutPromise
      ]);

      blockchain.status = 'up';
      blockchain.latestBlock = blockNumber;
    } catch (bcErr) {
      blockchain.status = 'down';
      blockchain.error = bcErr.message || 'Unable to connect to blockchain node';
    }

    // Outage alert for Blockchain on up -> down transition
    if (blockchain.status === 'down' && lastHealthStatus.blockchain === 'up') {
      lastHealthStatus.blockchain = 'down';
      try {
        await notifyAdmins({
          type: 'SYSTEM_ALERT',
          title: 'Blockchain Node Outage',
          message: `Blockchain node is unreachable (${blockchain.error || 'Connection failed'}). Start the Hardhat node and redeploy the contract.`,
          link: '/admin-dashboard'
        });
      } catch (notifyErr) {
        console.warn('[HEALTH ALERT WARNING] Failed to notify admins of Blockchain outage:', notifyErr.message);
      }
    } else if (blockchain.status === 'up' && lastHealthStatus.blockchain === 'down') {
      lastHealthStatus.blockchain = 'up';
    }

    // 4. Chain Reset Inspection
    try {
      const chainResetInfo = await getChainResetStatus();
      blockchain.chainReset = chainResetInfo.isReset;
      blockchain.chainResetWarning = chainResetInfo.warning;
      blockchain.storedContractAddress = chainResetInfo.storedAddress;
    } catch (crErr) {
      blockchain.chainReset = false;
      blockchain.chainResetWarning = null;
    }

    return res.json({
      success: true,
      data: {
        server,
        mongodb,
        blockchain,
        checkedAt
      }
    });
  } catch (error) {
    // Top-level catch guard: ensure endpoint NEVER throws 500
    console.error('getSystemHealth unexpected error:', error);
    return res.json({
      success: true,
      data: {
        server: { status: 'up', uptimeSeconds: Math.floor(process.uptime()), nodeVersion: process.version },
        mongodb: { status: 'down', error: 'Failed to inspect database state' },
        blockchain: { status: 'down', error: 'Failed to inspect blockchain state' },
        checkedAt: new Date().toISOString()
      }
    });
  }
};

// @desc    Re-anchor records to the active smart contract (Admin only)
// @route   POST /api/admin/reanchor
// @access  Private/Admin
export const reanchorRecordsController = async (req, res) => {
  try {
    if (process.env.NODE_ENV === 'production') {
      return res.status(403).json({
        success: false,
        message: 'Re-anchoring records is not permitted in production environment.'
      });
    }

    const summary = await reanchorRecords({ calledBy: `Admin (${req.user.email})` });

    try {
      await logAudit(req, {
        actor: req.user._id,
        role: 'ADMIN',
        action: 'ADMIN_REANCHORED_RECORDS',
        resourceType: 'SystemConfig',
        resourceId: req.user._id,
        resourceLabel: 'Blockchain Contract',
        details: `Re-anchored ${summary.reanchored} records. ${summary.tampered} tampered, ${summary.skipped} skipped, ${summary.errors} errors. Contract: ${summary.contractAddress}`
      });
    } catch (auditError) {
      console.warn('[AUDIT WARNING] Failed to record re-anchor audit log:', auditError.message);
    }

    return res.json({
      success: true,
      message: `Re-anchoring completed: ${summary.reanchored} re-anchored, ${summary.tampered} tampered, ${summary.skipped} skipped.`,
      data: summary
    });
  } catch (err) {
    console.error('Re-anchor records error:', err);
    return res.status(500).json({
      success: false,
      message: err.message || 'Failed to re-anchor records'
    });
  }
};


// @desc    Get dashboard statistics for admin
// @route   GET /api/admin/stats
// @access  Private/Admin
export const getAdminStats = async (req, res) => {
  try {
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    const safeCount = async (promise, name) => {
      try {
        return await promise;
      } catch (err) {
        console.warn(`[ADMIN STATS WARNING] Failed to compute count for ${name}:`, err.message);
        return 0;
      }
    };

    const [
      pendingDoctors,
      verifiedDoctors,
      rejectedDoctors,
      totalPatients,
      totalRecords,
      recordsThisWeek,
      auditEventsLast24h
    ] = await Promise.all([
      safeCount(
        DoctorProfile.countDocuments({
          $or: [
            { verificationStatus: 'PENDING' },
            { verificationStatus: { $exists: false }, isVerified: false },
            { verificationStatus: null, isVerified: false }
          ]
        }),
        'pendingDoctors'
      ),
      safeCount(
        DoctorProfile.countDocuments({
          $or: [
            { verificationStatus: 'VERIFIED' },
            { isVerified: true }
          ]
        }),
        'verifiedDoctors'
      ),
      safeCount(
        DoctorProfile.countDocuments({ verificationStatus: 'REJECTED' }),
        'rejectedDoctors'
      ),
      safeCount(
        PatientProfile.countDocuments({}),
        'totalPatients'
      ),
      safeCount(
        MedicalRecord.countDocuments({}),
        'totalRecords'
      ),
      safeCount(
        MedicalRecord.countDocuments({ createdAt: { $gte: sevenDaysAgo } }),
        'recordsThisWeek'
      ),
      safeCount(
        AuditLog.countDocuments({ timestamp: { $gte: twentyFourHoursAgo } }),
        'auditEventsLast24h'
      )
    ]);

    const totalDoctors = pendingDoctors + verifiedDoctors + rejectedDoctors;

    res.json({
      success: true,
      data: {
        totalDoctors,
        pendingDoctors,
        verifiedDoctors,
        rejectedDoctors,
        totalPatients,
        totalRecords,
        recordsThisWeek,
        auditEventsLast24h
      }
    });
  } catch (error) {
    console.error('getAdminStats unexpected error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getUnverifiedDoctors = async (req, res) => {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;
    const skip = (page - 1) * limit;

    const requestedStatus = (req.query.status || 'PENDING').toUpperCase();
    const cleanSearch = req.query.search ? req.query.search.trim() : '';

    // Build status filter
    let statusFilter = {};
    if (requestedStatus === 'PENDING') {
      statusFilter = { 
        $or: [
          { verificationStatus: 'PENDING' },
          { verificationStatus: { $exists: false }, isVerified: false },
          { verificationStatus: null, isVerified: false }
        ] 
      };
    } else if (requestedStatus === 'VERIFIED') {
      statusFilter = { 
        $or: [
          { verificationStatus: 'VERIFIED' },
          { isVerified: true }
        ] 
      };
    } else if (requestedStatus === 'REJECTED') {
      statusFilter = { verificationStatus: 'REJECTED' };
    } else if (requestedStatus === 'ALL') {
      statusFilter = {};
    }

    // Build final combined query
    let finalQuery = { ...statusFilter };

    if (cleanSearch) {
      const matchingUsers = await User.find({ email: { $regex: cleanSearch, $options: 'i' } }).select('_id');
      const userIds = matchingUsers.map(u => u._id);

      const searchConditions = [
        { firstName: { $regex: cleanSearch, $options: 'i' } },
        { lastName: { $regex: cleanSearch, $options: 'i' } },
        { licenseNumber: { $regex: cleanSearch, $options: 'i' } },
        { specialization: { $regex: cleanSearch, $options: 'i' } },
        { user: { $in: userIds } }
      ];

      if (Object.keys(statusFilter).length > 0) {
        finalQuery = {
          $and: [
            statusFilter,
            { $or: searchConditions }
          ]
        };
      } else {
        finalQuery = { $or: searchConditions };
      }
    }

    // Sort Pending by oldest registration first (createdAt: 1), others by newest first (createdAt: -1)
    const sortOrder = requestedStatus === 'PENDING' ? { createdAt: 1 } : { createdAt: -1 };

    const [total, doctors, pendingCount, verifiedCount, rejectedCount] = await Promise.all([
      DoctorProfile.countDocuments(finalQuery),
      DoctorProfile.find(finalQuery)
        .populate('user', 'email firstName lastName role')
        .sort(sortOrder)
        .skip(skip)
        .limit(limit),
      DoctorProfile.countDocuments({ 
        $or: [
          { verificationStatus: 'PENDING' },
          { verificationStatus: { $exists: false }, isVerified: false },
          { verificationStatus: null, isVerified: false }
        ] 
      }),
      DoctorProfile.countDocuments({ 
        $or: [
          { verificationStatus: 'VERIFIED' },
          { isVerified: true }
        ] 
      }),
      DoctorProfile.countDocuments({ verificationStatus: 'REJECTED' })
    ]);

    const pages = Math.ceil(total / limit) || 1;
    const allCount = pendingCount + verifiedCount + rejectedCount;

    res.json({
      success: true,
      data: doctors,
      pagination: {
        page,
        limit,
        total,
        pages
      },
      counts: {
        all: allCount,
        pending: pendingCount,
        verified: verifiedCount,
        rejected: rejectedCount
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get paginated patients list for admin (NO medical data exposed)
// @route   GET /api/admin/patients
// @access  Private/Admin
export const getAdminPatients = async (req, res) => {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;
    const skip = (page - 1) * limit;
    const search = req.query.search ? req.query.search.trim() : '';

    let query = {};

    if (search) {
      // Find matching user IDs by email
      const matchingUsers = await User.find({ 
        role: 'PATIENT',
        email: { $regex: search, $options: 'i' } 
      }).select('_id');
      const userIds = matchingUsers.map(u => u._id);

      query = {
        $or: [
          { firstName: { $regex: search, $options: 'i' } },
          { lastName: { $regex: search, $options: 'i' } },
          { user: { $in: userIds } }
        ]
      };
    }

    const [total, patients] = await Promise.all([
      PatientProfile.countDocuments(query),
      PatientProfile.find(query)
        .populate('user', 'email isActive')
        .select('firstName lastName createdAt user') // strictly select only demographic & account fields
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
    ]);

    // Format safe patient records
    const formattedPatients = patients.map(p => ({
      _id: p._id,
      name: `${p.firstName || ''} ${p.lastName || ''}`.trim() || 'Unnamed Patient',
      firstName: p.firstName,
      lastName: p.lastName,
      email: p.user?.email || 'N/A',
      status: p.user?.isActive === false ? 'Inactive' : 'Active',
      createdAt: p.createdAt
    }));

    const pages = Math.ceil(total / limit) || 1;

    // Write audit log entry for admin viewing patients directory
    try {
      await logAudit(req, {
        actor: req.user._id,
        role: req.user.role,
        action: 'ADMIN_VIEWED_PATIENTS',
        resourceType: 'SystemReport',
        resourceLabel: 'Patients directory',
        details: search ? `Filtered by search: "${search}"` : 'Viewed patients directory'
      });
    } catch (auditErr) {
      console.warn('[AUDIT WARNING] Failed to record ADMIN_VIEWED_PATIENTS:', auditErr.message);
    }

    res.json({
      success: true,
      data: formattedPatients,
      pagination: {
        page,
        limit,
        total,
        pages
      }
    });
  } catch (error) {
    console.error('getAdminPatients error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get aggregated overview of medical records (NO private content returned)
// @route   GET /api/admin/records/overview
// @access  Private/Admin
export const getRecordsOverview = async (req, res) => {
  try {
    // Write audit log entry for admin viewing records overview
    try {
      await logAudit(req, {
        actor: req.user._id,
        role: req.user.role,
        action: 'ADMIN_VIEWED_RECORDS_OVERVIEW',
        resourceType: 'SystemReport',
        resourceLabel: 'Records overview',
        details: 'Admin accessed medical records statistical overview'
      });
    } catch (auditErr) {
      console.warn('[AUDIT WARNING] Failed to record ADMIN_VIEWED_RECORDS_OVERVIEW:', auditErr.message);
    }

    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    const safeOp = async (promise, fallback, label) => {
      try {
        return await promise;
      } catch (err) {
        console.warn(`[RECORDS OVERVIEW WARNING] Failed to compute ${label}:`, err.message);
        return fallback;
      }
    };

    const [
      total,
      today,
      thisWeek,
      thisMonth,
      anchoredOnChain,
      notAnchored,
      byTypeRaw,
      perDayRaw
    ] = await Promise.all([
      safeOp(MedicalRecord.countDocuments({}), 0, 'total'),
      safeOp(MedicalRecord.countDocuments({ createdAt: { $gte: startOfToday } }), 0, 'today'),
      safeOp(MedicalRecord.countDocuments({ createdAt: { $gte: sevenDaysAgo } }), 0, 'thisWeek'),
      safeOp(MedicalRecord.countDocuments({ createdAt: { $gte: startOfMonth } }), 0, 'thisMonth'),
      safeOp(
        MedicalRecord.countDocuments({
          blockchainTxHash: { $exists: true, $ne: null, $nin: ['', null] }
        }),
        0,
        'anchoredOnChain'
      ),
      safeOp(
        MedicalRecord.countDocuments({
          $or: [
            { blockchainTxHash: { $exists: false } },
            { blockchainTxHash: null },
            { blockchainTxHash: '' }
          ]
        }),
        0,
        'notAnchored'
      ),
      safeOp(
        MedicalRecord.aggregate([
          {
            $project: {
              computedType: {
                $cond: {
                  if: { $and: [{ $ne: ['$recordType', null] }, { $ne: ['$recordType', ''] }] },
                  then: '$recordType',
                  else: {
                    $cond: {
                      if: { $gt: [{ $size: { $ifNull: ['$documentUrls', []] } }, 0] },
                      then: 'Lab/Document Report',
                      else: 'General Consultation'
                    }
                  }
                }
              }
            }
          },
          {
            $group: {
              _id: '$computedType',
              count: { $sum: 1 }
            }
          },
          { $sort: { count: -1 } }
        ]),
        [],
        'byType'
      ),
      safeOp(
        MedicalRecord.aggregate([
          {
            $match: {
              createdAt: { $gte: thirtyDaysAgo }
            }
          },
          {
            $group: {
              _id: {
                $dateToString: { format: '%Y-%m-%d', date: '$createdAt' }
              },
              count: { $sum: 1 }
            }
          },
          { $sort: { _id: 1 } }
        ]),
        [],
        'perDay'
      )
    ]);

    // Format byType cleanly
    const byType = (Array.isArray(byTypeRaw) ? byTypeRaw : []).map(item => ({
      type: item._id || 'General Consultation',
      count: item.count || 0
    }));

    // Generate zero-filled 30-day timeline
    const countMap = {};
    if (Array.isArray(perDayRaw)) {
      perDayRaw.forEach(item => {
        if (item._id) countMap[item._id] = item.count;
      });
    }

    const perDay = [];
    for (let i = 29; i >= 0; i--) {
      const d = new Date(Date.now() - i * 24 * 60 * 60 * 1000);
      const dateStr = d.toISOString().split('T')[0];
      perDay.push({
        date: dateStr,
        count: countMap[dateStr] || 0
      });
    }

    res.json({
      success: true,
      data: {
        total,
        today,
        thisWeek,
        thisMonth,
        byType,
        perDay,
        anchoredOnChain,
        notAnchored
      }
    });
  } catch (error) {
    console.error('getRecordsOverview unexpected error:', error);
    res.json({
      success: true,
      data: {
        total: 0,
        today: 0,
        thisWeek: 0,
        thisMonth: 0,
        byType: [],
        perDay: [],
        anchoredOnChain: 0,
        notAnchored: 0
      }
    });
  }
};

export const verifyDoctor = async (req, res) => {
  try {
    const doctorProfile = await DoctorProfile.findById(req.params.id).populate('user');
    if (!doctorProfile) {
      return res.status(404).json({ success: false, message: 'Doctor profile not found' });
    }

    // Guard: reject if already verified
    if (doctorProfile.isVerified || doctorProfile.verificationStatus === 'VERIFIED') {
      return res.status(400).json({ success: false, message: 'Doctor is already verified' });
    }

    const isReverifying = doctorProfile.verificationStatus === 'REJECTED';
    const { reverificationReason } = req.body || {};

    if (isReverifying) {
      const cleanReason = (reverificationReason || '').trim();
      if (cleanReason.length < 10) {
        return res.status(400).json({
          success: false,
          message: 'Re-verification reason is required and must be at least 10 characters long.'
        });
      }
      doctorProfile.reverificationReason = cleanReason;
    }

    const previousRejectionReason = doctorProfile.rejectionReason;

    doctorProfile.isVerified = true;
    doctorProfile.verificationStatus = 'VERIFIED';
    doctorProfile.rejectionReason = null; // Clear rejection reason on verification / re-verification
    await doctorProfile.save();

    // Safe Audit Log
    try {
      const auditDetails = isReverifying
        ? `Doctor Dr. ${doctorProfile.firstName || ''} ${doctorProfile.lastName || ''} re-verified. Reverification Reason: "${doctorProfile.reverificationReason || ''}". Previous Rejection Reason: "${previousRejectionReason || 'None'}"`
        : `Doctor Dr. ${doctorProfile.firstName || ''} ${doctorProfile.lastName || ''} verified`;

      await logAudit(req, {
        actor: req.user._id,
        role: req.user.role,
        action: isReverifying ? 'REVERIFY_DOCTOR' : 'VERIFY_DOCTOR',
        resourceType: 'DoctorProfile',
        resourceId: doctorProfile._id,
        resourceLabel: `Doctor: Dr. ${doctorProfile.firstName || ''} ${doctorProfile.lastName || ''}`.trim(),
        details: auditDetails
      });
    } catch (auditError) {
      console.warn('[AUDIT WARNING] Failed to record doctor verification audit log:', auditError.message);
    }

    // Safe Blockchain execution
    try {
      if (blockchainService) {
        // Log or anchor verification safely if blockchain is configured
      }
    } catch (bcError) {
      console.warn('[BLOCKCHAIN WARNING] Offline Hardhat node or contract error during doctor verification:', bcError.message);
    }

    // Safe Notification to Doctor
    try {
      const recipientId = doctorProfile.user?._id || doctorProfile.user;
      if (recipientId) {
        await createNotification({
          user: recipientId,
          message: isReverifying
            ? 'Your doctor account has been re-verified. You can now request access to patient records.'
            : 'Your account has been verified. You can now request access to patient records.',
          type: 'SYSTEM'
        });
      }
    } catch (notifError) {
      console.warn('[NOTIFICATION WARNING] Failed to create doctor verification notification:', notifError.message);
    }

    // Safe Notification to Admin Team
    try {
      await notifyAdmins({
        type: isReverifying ? 'DOCTOR_REVERIFIED' : 'DOCTOR_VERIFIED',
        title: isReverifying ? 'Doctor Re-verified' : 'Doctor Verified',
        message: `Dr. ${doctorProfile.firstName || ''} ${doctorProfile.lastName || ''} has been ${isReverifying ? 're-verified' : 'verified'} by ${req.user.email}.`,
        link: '/admin-dashboard?tab=VERIFIED',
        relatedId: doctorProfile._id
      });
    } catch (adminNotifError) {
      console.warn('[ADMIN NOTIFICATION WARNING] Failed to notify admins of doctor verification:', adminNotifError.message);
    }

    return res.json({ success: true, message: 'Doctor verified successfully', doctor: doctorProfile });
  } catch (error) {
    console.error('verifyDoctor error:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const rejectDoctor = async (req, res) => {
  try {
    const { reason } = req.body;
    if (!reason || typeof reason !== 'string' || reason.trim().length < 10) {
      return res.status(400).json({ 
        success: false, 
        message: 'Rejection reason is required and must be at least 10 characters long.' 
      });
    }

    const doctorProfile = await DoctorProfile.findById(req.params.id).populate('user');
    if (!doctorProfile) {
      return res.status(404).json({ success: false, message: 'Doctor profile not found' });
    }

    // Guard: reject if already rejected
    if (doctorProfile.verificationStatus === 'REJECTED') {
      return res.status(400).json({ success: false, message: 'Doctor is already rejected' });
    }

    const cleanReason = reason.trim();
    doctorProfile.isVerified = false;
    doctorProfile.verificationStatus = 'REJECTED';
    doctorProfile.rejectionReason = cleanReason;
    doctorProfile.rejectedAt = new Date();
    await doctorProfile.save();

    // Safe Audit Log
    try {
      await logAudit(req, {
        actor: req.user._id,
        role: req.user.role,
        action: 'REJECT_DOCTOR',
        resourceType: 'DoctorProfile',
        resourceId: doctorProfile._id,
        resourceLabel: `Doctor: Dr. ${doctorProfile.firstName || ''} ${doctorProfile.lastName || ''}`.trim(),
        details: `Reason: ${cleanReason}`
      });
    } catch (auditError) {
      console.warn('[AUDIT WARNING] Failed to record doctor rejection audit log:', auditError.message);
    }

    // Safe Blockchain execution
    try {
      if (blockchainService) {
        // Log or anchor rejection safely if blockchain is configured
      }
    } catch (bcError) {
      console.warn('[BLOCKCHAIN WARNING] Offline Hardhat node or contract error during doctor rejection:', bcError.message);
    }

    // Safe Notification to Doctor
    try {
      const recipientId = doctorProfile.user?._id || doctorProfile.user;
      if (recipientId) {
        await createNotification({
          user: recipientId,
          message: `Your account verification has been rejected. Reason: ${cleanReason}`,
          type: 'SYSTEM'
        });
      }
    } catch (notifError) {
      console.warn('[NOTIFICATION WARNING] Failed to send doctor rejection notification:', notifError.message);
    }

    // Safe Notification to Admin Team
    try {
      await notifyAdmins({
        type: 'DOCTOR_REJECTED',
        title: 'Doctor Verification Rejected',
        message: `Dr. ${doctorProfile.firstName || ''} ${doctorProfile.lastName || ''} was rejected by ${req.user.email}. Reason: "${cleanReason}"`,
        link: '/admin-dashboard?tab=REJECTED',
        relatedId: doctorProfile._id
      });
    } catch (adminNotifError) {
      console.warn('[ADMIN NOTIFICATION WARNING] Failed to notify admins of doctor rejection:', adminNotifError.message);
    }

    return res.json({ 
      success: true, 
      message: 'Doctor rejected successfully', 
      doctor: doctorProfile 
    });
  } catch (error) {
    console.error('rejectDoctor error:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

