import User from '../models/User.js';
import DoctorProfile from '../models/DoctorProfile.js';
import Notification from '../models/Notification.js';
import AuditLog from '../models/AuditLog.js';
import { logAudit } from '../utils/auditHelper.js';

export const getUnverifiedDoctors = async (req, res) => {
  try {
    const doctors = await DoctorProfile.find().populate('user', 'email firstName lastName role');
    res.json(doctors);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const verifyDoctor = async (req, res) => {
  try {
    const doctorProfile = await DoctorProfile.findById(req.params.id).populate('user');
    if (!doctorProfile) {
      return res.status(404).json({ message: 'Doctor profile not found' });
    }

    doctorProfile.isVerified = true;
    await doctorProfile.save();

    await logAudit(req, {
      actor: req.user._id,
      role: req.user.role,
      action: 'VERIFY_DOCTOR',
      resourceType: 'DoctorProfile',
      resourceId: doctorProfile._id
    });

    await Notification.create({
      user: doctorProfile.user._id,
      message: 'Your account has been verified. You can now request access to patient records.',
      type: 'SYSTEM'
    });

    res.json({ message: 'Doctor verified successfully', doctor: doctorProfile });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const rejectDoctor = async (req, res) => {
  try {
    const doctorProfile = await DoctorProfile.findById(req.params.id).populate('user');
    if (!doctorProfile) {
      return res.status(404).json({ message: 'Doctor profile not found' });
    }

    // In a real app we might delete or mark as rejected, here we'll just keep isVerified false
    doctorProfile.isVerified = false;
    await doctorProfile.save();

    await logAudit(req, {
      actor: req.user._id,
      role: req.user.role,
      action: 'REJECT_DOCTOR',
      resourceType: 'DoctorProfile',
      resourceId: doctorProfile._id
    });

    await Notification.create({
      user: doctorProfile.user._id,
      message: 'Your account verification has been rejected.',
      type: 'SYSTEM'
    });

    res.json({ message: 'Doctor rejected successfully', doctor: doctorProfile });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
