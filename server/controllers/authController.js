import User from '../models/User.js';
import PatientProfile from '../models/PatientProfile.js';
import DoctorProfile from '../models/DoctorProfile.js';
import generateToken from '../utils/generateToken.js';
import AuditLog from '../models/AuditLog.js';

// @desc    Register new user
// @route   POST /api/auth/register
export const registerUser = async (req, res) => {
  const { email, password, role, firstName, lastName, ...profileData } = req.body;
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
    await AuditLog.create({ actor: user._id, role, action: 'REGISTER', ipAddress: req.ip });

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
  try {
    const user = await User.findOne({ email });
    
    if (user && (await user.matchPassword(password))) {
      if (!user.isActive) return res.status(401).json({ message: 'Account deactivated' });
      
      await AuditLog.create({ actor: user._id, role: user.role, action: 'LOGIN', ipAddress: req.ip });
      
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
