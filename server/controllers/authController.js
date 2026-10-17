import User from '../models/User.js';
import PatientProfile from '../models/PatientProfile.js';
import DoctorProfile from '../models/DoctorProfile.js';
import generateToken from '../utils/generateToken.js';
import AuditLog from '../models/AuditLog.js';
import { logAudit } from '../utils/auditHelper.js';
import { notifyAdmins } from '../utils/notifyHelper.js';
import { validateAndParseDob } from '../utils/dateValidator.js';

// In-memory failed login tracking for admin logins (email -> array of timestamps)
const failedAdminLogins = new Map();

// Helper to track failed admin logins
const recordFailedLogin = async (email) => {
  try {
    const cleanEmail = (email || '').trim().toLowerCase();
    const now = Date.now();
    const windowMs = 15 * 60 * 1000; // 15 minutes

    const timestamps = (failedAdminLogins.get(cleanEmail) || []).filter(t => now - t < windowMs);
    timestamps.push(now);
    failedAdminLogins.set(cleanEmail, timestamps);

    if (timestamps.length === 5) {
      await notifyAdmins({
        type: 'SECURITY_ALERT',
        title: 'Security Alert: Repeated Failed Logins',
        message: `Security Alert: 5 failed admin login attempts detected for ${cleanEmail} within 15 minutes.`,
        link: '/audit-trail'
      });
    }
  } catch (err) {
    console.warn('[FAILED LOGIN TRACKING WARNING]', err.message);
  }
};

// @desc    Register new user
// @route   POST /api/auth/register
export const registerUser = async (req, res) => {
  const { email, password, role, firstName, lastName, dob, ...profileData } = req.body;
  if (!email || !password || !role || !firstName || !lastName) {
    return res.status(400).json({ message: 'All fields are required' });
  }

  // Validate Date of Birth on the server
  if (role === 'PATIENT' || role === 'DOCTOR') {
    const dobValidation = validateAndParseDob(dob, role);
    if (dobValidation.error) {
      return res.status(400).json({ message: dobValidation.error });
    }
    profileData.dob = dobValidation.dobUtc;
  }

  try {
    const userExists = await User.findOne({ email });
    if (userExists) return res.status(400).json({ message: 'User already exists' });

    // Create Base User
    const user = await User.create({ email, password, role });

    // Create Role-Specific Profile
    let createdProfile = null;
    if (role === 'PATIENT') {
      createdProfile = await PatientProfile.create({ user: user._id, firstName, lastName, ...profileData });
    } else if (role === 'DOCTOR') {
      createdProfile = await DoctorProfile.create({ user: user._id, firstName, lastName, ...profileData });
      
      // Notify Admins when a new doctor registers
      try {
        await notifyAdmins({
          type: 'DOCTOR_REGISTERED',
          title: 'New Doctor Registration',
          message: `Dr. ${firstName} ${lastName} (${email}) has registered and requires license verification.`,
          link: '/admin-dashboard?tab=PENDING',
          relatedId: createdProfile._id
        });
      } catch (notifErr) {
        console.warn('[NOTIFY ADMINS WARNING] Doctor registration notification failed:', notifErr.message);
      }
    }

    // Record Audit Log
    try {
      const regLabel = role === 'DOCTOR' 
        ? `Doctor account: Dr. ${firstName} ${lastName}`.trim() 
        : `Patient account: ${firstName} ${lastName}`.trim();

      await logAudit(req, { 
        actor: user._id, 
        role, 
        action: 'REGISTER',
        resourceType: 'User',
        resourceId: user._id,
        resourceLabel: regLabel
      });
    } catch (auditErr) {
      console.warn('[AUDIT LOG WARNING]', auditErr.message);
    }

    res.status(201).json({
      _id: user._id,
      email: user.email,
      role: user.role,
      token: generateToken(user._id),
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Auth user & get token
// @route   POST /api/auth/login
export const loginUser = async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ message: 'Email and password are required' });
  }
  try {
    const user = await User.findOne({ email }).select('+password');
    
    if (user && (await user.matchPassword(password))) {
      if (!user.isActive) return res.status(401).json({ message: 'Account deactivated' });
      
      // Reset failed login counter on success
      failedAdminLogins.delete(email.trim().toLowerCase());

      try {
        await logAudit(req, { 
          actor: user._id, 
          role: user.role, 
          action: 'LOGIN',
          resourceType: 'User',
          resourceId: user._id,
          resourceLabel: `User account: ${user.email}`
        });
      } catch (auditErr) {
        console.warn('[AUDIT LOG WARNING]', auditErr.message);
      }
      
      res.json({
        _id: user._id,
        email: user.email,
        role: user.role,
        token: generateToken(user._id),
      });
    } else {
      // Record failed login attempt if it's an admin attempt or potential admin account
      if (user?.role === 'ADMIN' || req.originalUrl?.includes('admin') || req.headers['referer']?.includes('admin')) {
        await recordFailedLogin(email);
      } else if (!user) {
        // Unknown user: track email in case it's an admin brute-force probe
        await recordFailedLogin(email);
      }

      res.status(401).json({ message: 'Invalid email or password' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get user profile context
// @route   GET /api/auth/me
export const getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('-password');
    let profile = null;
    
    if (user.role === 'PATIENT') profile = await PatientProfile.findOne({ user: user._id });
    if (user.role === 'DOCTOR') profile = await DoctorProfile.findOne({ user: user._id });
    
    res.json({ user, profile });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
