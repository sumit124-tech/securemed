import User from '../models/User.js';
import PatientProfile from '../models/PatientProfile.js';
import DoctorProfile from '../models/DoctorProfile.js';
import generateToken from '../utils/generateToken.js';
import AuditLog from '../models/AuditLog.js';
import { logAudit } from '../utils/auditHelper.js';

// @desc    Register new user
// @route   POST /api/auth/register
export const registerUser = async (req, res) => {
  const { email, password, role, firstName, lastName, ...profileData } = req.body;
  if (!email || !password || !role || !firstName || !lastName) {
    return res.status(400).json({ message: 'All fields are required' });
  }
  try {
    const userExists = await User.findOne({ email });
    if (userExists) return res.status(400).json({ message: 'User already exists' });

    // Create Base User
    const user = await User.create({ email, password, role });

    // Create Role-Specific Profile
    if (role === 'PATIENT') {
      await PatientProfile.create({ user: user._id, firstName, lastName, ...profileData });
    } else if (role === 'DOCTOR') {
      await DoctorProfile.create({ user: user._id, firstName, lastName, ...profileData });
    }

    // Record Audit Log
    await logAudit(req, { actor: user._id, role, action: 'REGISTER' });

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
      
      await logAudit(req, { actor: user._id, role: user.role, action: 'LOGIN' });
      
      res.json({
        _id: user._id,
        email: user.email,
        role: user.role,
        token: generateToken(user._id),
      });
    } else {
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
