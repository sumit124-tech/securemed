import AuditLog from '../models/AuditLog.js';

const normalizeIp = (ip) => {
  if (!ip) return 'Unknown';
  if (ip === '::1' || ip === '::ffff:127.0.0.1' || ip === '127.0.0.1') {
    return '127.0.0.1 (localhost)';
  }
  return ip;
};

export const logAudit = async (req, data) => {
  try {
    const rawIp = req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.ip || req.socket?.remoteAddress;
    const ipAddress = normalizeIp(rawIp);
    
    // Extract forceLog and remove it from data to prevent saving it to Mongo
    const { forceLog, ...logData } = data;

    // Determine throttling rules
    const nonThrottledActions = ['VERIFY_RECORD_FAILED', 'ACCESS_DENIED', 'CREATE_RECORD', 'ACCESS_APPROVED', 'ACCESS_REJECTED', 'ACCESS_REVOKED', 'REQUEST_ACCESS', 'RE_REQUEST_ACCESS', 'REGISTER', 'VERIFY_DOCTOR', 'REJECT_DOCTOR', 'ACTIVATE_USER', 'DEACTIVATE_USER'];
    
    // Login failures aren't explicitly tracked with a separate action yet, but standard LOGIN is already somewhat throttled at 2s. We'll leave LOGIN at 2s unless it fails. Wait, prompt says: "Never throttle failures... and all state changes". We'll just bypass throttling for the nonThrottledActions.
    let timeWindowMs = 2000; // default 2 seconds deduplication
    
    if (data.action === 'VERIFY_RECORD' || data.action === 'VIEW_RECORDS') {
      timeWindowMs = 10 * 60 * 1000; // 10 minutes
    }
    
    const isNonThrottled = nonThrottledActions.includes(data.action) || data.action.includes('FAILED') || data.action.includes('DENIED');

    if (!forceLog && !isNonThrottled) {
      const timeThreshold = new Date(Date.now() - timeWindowMs);
      const filter = {
        actor: data.actor,
        action: data.action,
        timestamp: { $gte: timeThreshold }
      };
      
      if (data.resourceType) filter.resourceType = data.resourceType;
      if (data.resourceId) filter.resourceId = data.resourceId;
      
      const recentDuplicate = await AuditLog.findOne(filter);
      
      if (recentDuplicate) {
        return; // Skip logging duplicate
      }
    }
    
    await AuditLog.create({
      ...logData,
      ipAddress
    });
  } catch (err) {
    console.error('Failed to write audit log:', err);
  }
};
