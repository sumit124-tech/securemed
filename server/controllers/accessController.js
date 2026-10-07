import AccessRequest from '../models/AccessRequest.js';
import AuditLog from '../models/AuditLog.js';
import { logAudit } from '../utils/auditHelper.js';
import DoctorProfile from '../models/DoctorProfile.js';
import Notification from '../models/Notification.js';

// @desc    Doctor requests access to patient records
// @route   POST /api/access/request
// @access  Private/Doctor
export const requestAccess = async (req, res) => {
  const { patientId } = req.body;
  const doctorId = req.user._id;

  try {
    // 1. Ensure doctor is verified by admin before allowing requests
    const doctorProfile = await DoctorProfile.findOne({ user: doctorId });
    if (!doctorProfile || !doctorProfile.isVerified) {
      return res.status(403).json({ message: 'Your doctor account must be verified by an admin first.' });
    }

    // 2. Check if request already exists
    const existingRequest = await AccessRequest.findOne({ patient: patientId, doctor: doctorId });
    if (existingRequest) {
      if (existingRequest.status === 'APPROVED') return res.status(400).json({ message: 'Access already granted' });
      if (existingRequest.status === 'PENDING') return res.status(400).json({ message: 'Access request is already pending' });
      
      // If REJECTED or REVOKED, allow them to re-request
      existingRequest.status = 'PENDING';
      existingRequest.requestedAt = Date.now();
      await existingRequest.save();
      
      await logAudit(req, { actor: doctorId, role: 'DOCTOR', action: 'RE_REQUEST_ACCESS', resourceType: 'AccessRequest', resourceId: existingRequest._id, relatedPatient: patientId });
      
      await Notification.create({ user: patientId, type: 'ACCESS_REQUEST', message: 'A doctor has requested access to your records.', relatedId: existingRequest._id });
      
      return res.status(200).json(existingRequest);
    }

    // 3. Create new request
    const newRequest = await AccessRequest.create({ patient: patientId, doctor: doctorId });
    await logAudit(req, { actor: doctorId, role: 'DOCTOR', action: 'REQUEST_ACCESS', resourceType: 'AccessRequest', resourceId: newRequest._id, relatedPatient: patientId });

    await Notification.create({ user: patientId, type: 'ACCESS_REQUEST', message: 'A doctor has requested access to your records.', relatedId: newRequest._id });

    res.status(201).json(newRequest);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Patient responds to access request (Approve/Reject)
// @route   PUT /api/access/respond/:requestId
// @access  Private/Patient
export const respondToRequest = async (req, res) => {
  const { status } = req.body; // 'APPROVED' or 'REJECTED'
  
  try {
    const request = await AccessRequest.findById(req.params.requestId);
    if (!request) return res.status(404).json({ message: 'Request not found' });

    // Authorization check: Only the targeted patient can respond
    if (request.patient.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized to respond to this request' });
    }

    if (!['APPROVED', 'REJECTED'].includes(status)) {
      return res.status(400).json({ message: 'Invalid status update' });
    }

    request.status = status;
    request.respondedAt = Date.now();
    await request.save();

    await logAudit(req, { actor: req.user._id, role: 'PATIENT', action: `ACCESS_${status}`, resourceType: 'AccessRequest', resourceId: request._id, relatedPatient: req.user._id });

    await Notification.create({ user: request.doctor, type: `ACCESS_${status}`, message: `Your access request was ${status.toLowerCase()}.`, relatedId: request._id });

    res.json(request);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Patient revokes previously approved access
// @route   PUT /api/access/revoke/:doctorId
// @access  Private/Patient
export const revokeAccess = async (req, res) => {
  try {
    const request = await AccessRequest.findOne({ patient: req.user._id, doctor: req.params.doctorId });
    if (!request) return res.status(404).json({ message: 'Access record not found' });

    request.status = 'REVOKED';
    request.respondedAt = Date.now();
    await request.save();

    await logAudit(req, { actor: req.user._id, role: 'PATIENT', action: 'ACCESS_REVOKED', resourceType: 'AccessRequest', resourceId: request._id, relatedPatient: req.user._id });

    await Notification.create({ user: request.doctor, type: 'ACCESS_REVOKED', message: 'Your access to a patient has been revoked.', relatedId: request._id });

    res.json({ message: 'Access revoked successfully', request });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get patient's access requests
// @route   GET /api/access/my-requests
// @access  Private/Patient
export const getMyRequests = async (req, res) => {
  try {
    const requests = await AccessRequest.find({ patient: req.user._id })
      .populate('doctor', 'email role')
      .sort({ requestedAt: -1 });
    
    // Populate doctor profile info manually
    const populatedRequests = [];
    for (const req of requests) {
      const docObj = req.toObject();
      if (req.doctor && req.doctor._id) {
        const profile = await DoctorProfile.findOne({ user: req.doctor._id });
        if (profile) {
          docObj.doctorProfileId = profile._id;
          docObj.firstName = profile.firstName;
          docObj.lastName = profile.lastName;
          docObj.specialization = profile.specialization;
          docObj.licenseNumber = profile.licenseNumber;
          docObj.isVerified = profile.isVerified;
          docObj.email = req.doctor.email;
        }
      }
      populatedRequests.push(docObj);
    }
    
    res.json(populatedRequests);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
