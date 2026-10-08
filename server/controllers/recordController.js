import MedicalRecord from '../models/MedicalRecord.js';
import AccessRequest from '../models/AccessRequest.js';
import AuditLog from '../models/AuditLog.js';
import { logAudit } from '../utils/auditHelper.js';
import Notification from '../models/Notification.js';
import { generateRecordHash } from '../utils/hashHelper.js';
import blockchainService from '../services/blockchainService.js';
import PatientProfile from '../models/PatientProfile.js';

import { countAccessRequestsByDoctor } from '../utils/accessHelper.js';

// Helper: Verify if doctor has active approved access
const hasAccess = async (patientId, doctorId) => {
  const count = await countAccessRequestsByDoctor(doctorId, 'APPROVED');
  // Need to also match patientId. Let's just use AccessRequest directly for this since it needs patient matching
  const access = await AccessRequest.findOne({ patient: patientId, doctor: doctorId, status: 'APPROVED' });
  return !!access;
};

// Helper: Resolve a potential PatientProfile id to a User id
const resolveToUserId = async (id) => {
  try {
    const profile = await PatientProfile.findById(id);
    if (profile && profile.user) return profile.user.toString();
  } catch (e) {
    // ignore
  }
  return id;
};

// @desc    Create a new medical record
// @route   POST /api/records
// @access  Private/Doctor
export const createRecord = async (req, res) => {
  let { patientId, symptoms, diagnosis, treatment, prescription } = req.body;
  const doctorId = req.user._id;

  try {
    patientId = await resolveToUserId(patientId);
    
    // 1. Strict RBAC Check
    if (!(await hasAccess(patientId, doctorId))) {
      return res.status(403).json({ message: 'You do not have approved access to this patient\'s records.' });
    }

    const recordData = {
      patient: patientId,
      doctor: doctorId,
      visitDate: new Date(),
      symptoms,
      diagnosis,
      treatment,
      prescription,
    };

    // 2. Generate Cryptographic Hash
    const hash = generateRecordHash(recordData);

    // 3. Save Record off-chain (in MongoDB)
    const newRecord = await MedicalRecord.create({
      ...recordData,
      currentHash: hash
    });

    // 4. Anchor Hash on Blockchain
    const blockchainData = await blockchainService.storeHash(newRecord._id, hash);
    newRecord.blockchainTxHash = blockchainData.txHash;
    await newRecord.save();

    await logAudit(req, { actor: doctorId, role: 'DOCTOR', action: 'CREATE_RECORD', resourceType: 'MedicalRecord', resourceId: newRecord._id, relatedPatient: patientId });

    await Notification.create({ user: patientId, type: 'RECORD_CREATED', message: 'A new medical record has been authored for you.', relatedId: newRecord._id });

    res.status(201).json(newRecord);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get patient records
// @route   GET /api/records/patient/:patientId
// @access  Private (Patient or Authorized Doctor)
export const getPatientRecords = async (req, res) => {
  let { patientId } = req.params;

  try {
    patientId = await resolveToUserId(patientId);

    if (req.user.role === 'PATIENT') {
      if (req.user._id.toString() !== patientId) return res.status(403).json({ message: 'Unauthorized' });
    } else if (req.user.role === 'DOCTOR') {
      if (!(await hasAccess(patientId, req.user._id))) return res.status(403).json({ message: 'Unauthorized' });
    } else if (req.user.role !== 'ADMIN') {
       return res.status(403).json({ message: 'Unauthorized' });
    }

    const records = await MedicalRecord.find({ patient: patientId }).populate('doctor', 'firstName lastName email').sort({ visitDate: -1 });

    await logAudit(req, { actor: req.user._id, role: req.user.role, action: 'VIEW_RECORDS', resourceType: 'User', resourceId: patientId, relatedPatient: patientId });

    if (req.query.verify === 'true') {
       const verifiedRecords = await Promise.all(records.map(async (rec) => {
           const recordObj = rec.toObject ? rec.toObject() : rec;
           const currentData = {
              patient: rec.patient,
              doctor: rec.doctor ? rec.doctor._id : rec.doctor,
              visitDate: rec.visitDate,
              symptoms: rec.symptoms,
              diagnosis: rec.diagnosis,
              treatment: rec.treatment,
              prescription: rec.prescription,
           };
           const calculatedHash = generateRecordHash(currentData);
           let isVerified = false;
           let onChainData = null;
           let status = 'TAMPERED';
           try {
             isVerified = await blockchainService.verifyHash(rec._id, calculatedHash);
             onChainData = await blockchainService.getRecordHistory(rec._id);
             if (isVerified) status = 'VERIFIED';
           } catch(e) {
             if (e.message === 'BLOCKCHAIN_UNREACHABLE') status = 'BLOCKCHAIN_UNREACHABLE';
             else if (e.message === 'CONTRACT_NOT_DEPLOYED') status = 'CONTRACT_NOT_DEPLOYED';
             else if (e.message === 'NOT_ANCHORED') status = 'NOT_ANCHORED';
           }
           return {
               ...recordObj,
               verificationStatus: status,
               calculatedHash,
               blockchainHash: onChainData ? onChainData.hash : null
           };
       }));
       return res.json(verifiedRecords);
    }

    res.json(records);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Verify record integrity against the blockchain
// @route   GET /api/records/verify/:recordId
// @access  Private (Patient or Authorized Doctor)
export const verifyRecordIntegrity = async (req, res) => {
  try {
    const record = await MedicalRecord.findById(req.params.recordId);
    if (!record) return res.status(404).json({ message: 'Record not found' });

    // Enforce Authorization Context
    if (req.user.role === 'PATIENT' && record.patient.toString() !== req.user._id.toString()) {
       return res.status(403).json({ message: 'Unauthorized' });
    } else if (req.user.role === 'DOCTOR') {
       if (!(await hasAccess(record.patient, req.user._id))) return res.status(403).json({ message: 'Unauthorized' });
    }

    // Generate hash of current DB data
    const currentData = {
      patient: record.patient,
      doctor: record.doctor,
      visitDate: record.visitDate,
      symptoms: record.symptoms,
      diagnosis: record.diagnosis,
      treatment: record.treatment,
      prescription: record.prescription,
    };
    const calculatedHash = generateRecordHash(currentData);

    // Consult the Smart Contract
    let isVerified = false;
    let onChainData = null;
    let status = 'INTEGRITY_CHECK_FAILED';
    try {
      isVerified = await blockchainService.verifyHash(record._id, calculatedHash);
      onChainData = await blockchainService.getRecordHistory(record._id);
      status = isVerified ? 'VERIFIED' : 'INTEGRITY_CHECK_FAILED';
    } catch (e) {
      if (e.message === 'BLOCKCHAIN_UNREACHABLE') status = 'BLOCKCHAIN_UNREACHABLE';
      else if (e.message === 'CONTRACT_NOT_DEPLOYED') status = 'CONTRACT_NOT_DEPLOYED';
      else if (e.message === 'NOT_ANCHORED') status = 'NOT_ANCHORED';
    }

    if (status === 'VERIFIED') {
      await logAudit(req, { actor: req.user._id, role: req.user.role, action: 'VERIFY_RECORD', resourceType: 'MedicalRecord', resourceId: record._id, relatedPatient: record.patient, forceLog: req.query.forceLog === 'true' });
    } else {
      await logAudit(req, { actor: req.user._id, role: req.user.role, action: 'VERIFY_RECORD_FAILED', resourceType: 'MedicalRecord', resourceId: record._id, relatedPatient: record.patient });
    }

    res.json({
      status: status,
      calculatedHash,
      blockchainHash: onChainData ? onChainData.hash : null,
      transactionHash: record.blockchainTxHash,
      timestamp: onChainData ? new Date(Number(onChainData.timestamp) * 1000) : null,
      recordData: currentData,
      createdAt: record.createdAt
    });

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
