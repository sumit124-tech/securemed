import AccessRequest from '../models/AccessRequest.js';
import DoctorProfile from '../models/DoctorProfile.js';
import PatientProfile from '../models/PatientProfile.js';

export const getDoctorProfile = async (req) => {
    return await DoctorProfile.findOne({ user: req.user._id });
};

// Common lookup logic to ensure we are always matching correctly
export const getAccessRequestsByDoctor = async (doctorId, statusCondition) => {
    return await AccessRequest.find({ doctor: doctorId, status: statusCondition })
      .populate('patient', 'email')
      .sort({ requestedAt: -1, respondedAt: -1 });
};

export const countAccessRequestsByDoctor = async (doctorId, statusCondition) => {
    return await AccessRequest.countDocuments({ doctor: doctorId, status: statusCondition });
};

export const populatePatientProfile = async (requestObj) => {
    const doc = typeof requestObj.toObject === 'function' ? requestObj.toObject() : requestObj;
    if (doc.patient && doc.patient._id) {
        const profile = await PatientProfile.findOne({ user: doc.patient._id });
        if (profile) {
            doc.patientProfileId = profile._id;
            doc.firstName = profile.firstName;
            doc.lastName = profile.lastName;
        }
    }
    return doc;
};
