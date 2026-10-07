import MedicalRecord from '../models/MedicalRecord.js';
import { countAccessRequestsByDoctor, getAccessRequestsByDoctor, populatePatientProfile, getDoctorProfile } from '../utils/accessHelper.js';

// @desc    Get doctor stats
// @route   GET /api/doctor/stats
// @access  Private/Doctor
export const getDoctorStats = async (req, res) => {
  try {
    const doctorId = req.user._id;

    const authorizedPatients = await countAccessRequestsByDoctor(doctorId, 'APPROVED');
    const pendingRequests = await countAccessRequestsByDoctor(doctorId, 'PENDING');
    const rejectedOrRevokedRequests = await countAccessRequestsByDoctor(doctorId, { $in: ['REJECTED', 'REVOKED'] });
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

    const accessRequests = await getAccessRequestsByDoctor(doctorId, 'APPROVED');

    const patients = [];
    for (const request of accessRequests) {
        if (!request.patient) continue; // Skip if patient is null/deleted

        const populatedDoc = await populatePatientProfile(request);
        const lastRecord = await MedicalRecord.findOne({ patient: request.patient._id }).sort({ visitDate: -1 });
        
        patients.push({
            accessId: populatedDoc._id,
            patientId: populatedDoc.patient._id,
            patientProfileId: populatedDoc.patientProfileId || null,
            email: populatedDoc.patient.email,
            firstName: populatedDoc.firstName || null,
            lastName: populatedDoc.lastName || null,
            accessDate: populatedDoc.respondedAt,
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
    const doctorId = req.user._id;
    const requests = await getAccessRequestsByDoctor(doctorId, { $in: ['APPROVED', 'PENDING', 'REJECTED', 'REVOKED'] }); // fetch all
    
    const populatedRequests = [];
    for (const reqObj of requests) {
      const doc = await populatePatientProfile(reqObj);
      populatedRequests.push(doc);
    }

    res.json(populatedRequests);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
