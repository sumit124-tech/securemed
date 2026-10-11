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

// @desc    Upload or update doctor verification documents
// @route   POST /api/doctor/documents
// @access  Private/Doctor
export const uploadDoctorDocuments = async (req, res) => {
  try {
    const doctorId = req.user._id;
    const { documents } = req.body; // array of { name, url }

    if (!Array.isArray(documents) || documents.length === 0) {
      return res.status(400).json({ message: 'At least one document is required.' });
    }

    const doctorProfile = await getDoctorProfile(doctorId);
    if (!doctorProfile) {
      return res.status(404).json({ message: 'Doctor profile not found.' });
    }

    doctorProfile.documents = documents;
    await doctorProfile.save();

    // Notify admins that doctor uploaded/updated documents
    try {
      const { notifyAdmins } = await import('../utils/notifyHelper.js');
      await notifyAdmins({
        type: 'DOCTOR_DOCUMENTS_UPLOADED',
        title: 'Doctor Documents Uploaded',
        message: `Dr. ${doctorProfile.firstName || ''} ${doctorProfile.lastName || ''} uploaded verification documents.`,
        link: '/admin-dashboard?tab=PENDING',
        relatedId: doctorProfile._id
      });
    } catch (notifErr) {
      console.warn('[NOTIFY ADMINS WARNING] Doctor document notification failed:', notifErr.message);
    }

    res.json({ success: true, message: 'Documents uploaded successfully.', documents: doctorProfile.documents });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
