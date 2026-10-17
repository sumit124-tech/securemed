import rateLimit from 'express-rate-limit';
import { logAudit } from '../utils/auditHelper.js';

/**
 * General API Rate Limiter
 * - 300 requests per 15 minutes per IP
 * - Skips polling/critical paths: system health, notifications, and integrity audit
 * - Skips CORS preflight OPTIONS requests
 */
export const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
  validate: { trustProxy: false },
  skip: (req) => {
    if (req.method === 'OPTIONS') return true;
    const url = req.originalUrl || req.url || '';
    // Do NOT apply to health, notifications, or integrity audit polling
    return (
      url.includes('/health') ||
      url.includes('/notifications') ||
      url.includes('/integrity-audit')
    );
  },
  handler: (req, res) => {
    return res.status(429).json({
      success: false,
      message: 'Too many requests from this IP, please try again after 15 minutes.'
    });
  }
});

/**
 * Strict Authentication Rate Limiter
 * - 10 requests per 15 minutes per IP
 * - Protects login, registration, and admin login endpoints against brute force
 * - Writes an audit entry when rate limit is exceeded
 * - Returns 429 with clean JSON
 */
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  validate: { trustProxy: false },
  skip: (req) => req.method === 'OPTIONS',
  handler: async (req, res) => {
    const rawIp = req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.ip || req.socket?.remoteAddress;
    const attemptedEmail = req.body?.email ? String(req.body.email).trim().toLowerCase() : 'unknown';

    try {
      await logAudit(req, {
        role: 'SYSTEM',
        action: 'RATE_LIMIT_EXCEEDED',
        resourceType: 'Auth',
        resourceLabel: `Authentication endpoint: ${req.originalUrl}`,
        details: `Rate limit blocked: Too many authentication attempts (max 10 per 15m) from IP ${rawIp}. Attempted target: ${attemptedEmail}`,
        forceLog: true
      });
    } catch (auditErr) {
      console.warn('[AUTH LIMITER AUDIT WARNING] Failed to record rate limit audit:', auditErr.message);
    }

    return res.status(429).json({
      success: false,
      message: 'Too many authentication attempts from this IP. Please try again after 15 minutes.'
    });
  }
});
