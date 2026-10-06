import AccessRequest from '../models/AccessRequest.js';
import MedicalRecord from '../models/MedicalRecord.js';
import DoctorProfile from '../models/DoctorProfile.js';

// @desc    Get doctor stats
// @route   GET /api/doctor/stats
// @access  Private/Doctor
export const getDoctorStats = async (req, res) => {
  try {
    const doctorId = req.user._id;

    const authorizedPatients = await AccessRequest.countDocuments({ doctor: doctorId, status: 'APPROVED' });
    const pendingRequests = await AccessRequest.countDocuments({ doctor: doctorId, status: 'PENDING' });
    const rejectedOrRevokedRequests = await AccessRequest.countDocuments({ doctor: doctorId, status: { $in: ['REJECTED', 'REVOKED'] } });
    const recordsCreated = await MedicalRecord.countDocuments({ doctor: doctorId });

    res.json({
      authorizedPatients,
      pendingRequests,
      rejectedOrRevokedRequests,
      recordsCreated
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get patients the doctor has approved access to
// @route   GET /api/doctor/patients
// @access  Private/Doctor
export const getMyPatients = async (req, res) => {
  try {
    const doctorId = req.user._id;

    const accessRequests = await AccessRequest.find({ doctor: doctorId, status: 'APPROVED' })
      .populate('patient', 'email')
      .sort({ respondedAt: -1 });

    const patients = [];
    
    for (const request of accessRequests) {
        if (!request.patient) continue; // Skip if patient is null/deleted

        const lastRecord = await MedicalRecord.findOne({ patient: request.patient._id }).sort({ visitDate: -1 });
        
        patients.push({
            accessId: request._id,
            patientId: request.patient._id,
            email: request.patient.email,
            accessDate: request.respondedAt,
            lastRecordDate: lastRecord ? lastRecord.visitDate : null,
        });
    }

    res.json(patients);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get doctor's sent requests
// @route   GET /api/doctor/requests
// @access  Private/Doctor
export const getMySentRequests = async (req, res) => {
  try {
    const requests = await AccessRequest.find({ doctor: req.user._id })
      .populate('patient', 'email')
      .sort({ requestedAt: -1 });
    
    res.json(requests);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
