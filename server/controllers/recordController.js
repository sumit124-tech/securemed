import mongoose from 'mongoose';
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
  symptoms = symptoms?.trim() || '';
  diagnosis = diagnosis?.trim() || '';
  treatment = treatment?.trim() || '';
  prescription = prescription?.trim() || '';
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
    const newRecordId = new mongoose.Types.ObjectId();
    const newRecord = await MedicalRecord.create({
      _id: newRecordId,
      ...recordData,
      currentHash: hash,
      recordGroupId: newRecordId
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

    const records = await MedicalRecord.find({ patient: patientId, status: 'ACTIVE' }).populate('doctor', 'firstName lastName email').sort({ visitDate: -1 });

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
           if (status === 'TAMPERED') {
             const tenMinsAgo = new Date(Date.now() - 10 * 60 * 1000);
             const recent = await Notification.findOne({
               user: rec.patient,
               type: 'INTEGRITY_CHECK_FAILED',
               relatedId: rec._id,
               createdAt: { $gte: tenMinsAgo }
             });
             if (!recent) {
               await Notification.create({
                 user: rec.patient,
                 type: 'INTEGRITY_CHECK_FAILED',
                 message: `Integrity check failed for record ${rec._id}. The data has been modified.`,
                 relatedId: rec._id
               });
             }
           }

           return {
               ...recordObj,
               verificationStatus: status,
               calculatedHash,
               blockchainHash: onChainData ? onChainData.hash : null,
               blockchainTxHash: rec.blockchainTxHash
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
    let status = 'TAMPERED';
    try {
      isVerified = await blockchainService.verifyHash(record._id, calculatedHash);
      onChainData = await blockchainService.getRecordHistory(record._id);
      status = isVerified ? 'VERIFIED' : 'TAMPERED';
    } catch (e) {
      if (e.message === 'BLOCKCHAIN_UNREACHABLE') status = 'BLOCKCHAIN_UNREACHABLE';
      else if (e.message === 'CONTRACT_NOT_DEPLOYED') status = 'CONTRACT_NOT_DEPLOYED';
      else if (e.message === 'NOT_ANCHORED') status = 'NOT_ANCHORED';
    }

    if (status === 'VERIFIED') {
      await logAudit(req, { actor: req.user._id, role: req.user.role, action: 'VERIFY_RECORD', resourceType: 'MedicalRecord', resourceId: record._id, relatedPatient: record.patient, forceLog: req.query.forceLog === 'true' });
    } else {
      await logAudit(req, { actor: req.user._id, role: req.user.role, action: 'VERIFY_RECORD_FAILED', resourceType: 'MedicalRecord', resourceId: record._id, relatedPatient: record.patient });
      
      if (status === 'INTEGRITY_CHECK_FAILED') {
        const tenMinsAgo = new Date(Date.now() - 10 * 60 * 1000);
        const recent = await Notification.findOne({
          user: record.patient,
          type: 'INTEGRITY_CHECK_FAILED',
          relatedId: record._id,
          createdAt: { $gte: tenMinsAgo }
        });
        if (!recent) {
          await Notification.create({
            user: record.patient,
            type: 'INTEGRITY_CHECK_FAILED',
            message: `Integrity check failed for record ${record._id}. The data has been modified.`,
            relatedId: record._id
          });
        }
      }
    }

    res.json({
      status: status,
      calculatedHash,
      blockchainHash: onChainData ? onChainData.hash : null,
      blockchainTxHash: record.blockchainTxHash,
      timestamp: onChainData ? new Date(Number(onChainData.timestamp) * 1000) : null,
      recordData: currentData,
      createdAt: record.createdAt,
      version: record.version,
      recordStatus: record.status
    });

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Edit a medical record (creates a new version)
// @route   POST /api/records/:id/version
// @access  Private/Doctor
export const editRecord = async (req, res) => {
  let { symptoms, diagnosis, treatment, prescription } = req.body;
  symptoms = symptoms?.trim() || '';
  diagnosis = diagnosis?.trim() || '';
  treatment = treatment?.trim() || '';
  prescription = prescription?.trim() || '';
  const doctorId = req.user._id;

  try {
    const oldRecord = await MedicalRecord.findById(req.params.id);
    if (!oldRecord) return res.status(404).json({ message: 'Record not found' });
    if (oldRecord.status !== 'ACTIVE') return res.status(400).json({ message: 'Can only edit the latest active version' });

    // 1. Strict RBAC Check
    if (!(await hasAccess(oldRecord.patient, doctorId))) {
      return res.status(403).json({ message: 'You do not have approved access to this patient\'s records.' });
    }

    // Change old record status
    oldRecord.status = 'HISTORICAL';
    await oldRecord.save();

    const recordData = {
      patient: oldRecord.patient,
      doctor: doctorId,
      visitDate: oldRecord.visitDate,
      symptoms,
      diagnosis,
      treatment,
      prescription,
    };

    // 2. Generate Cryptographic Hash
    const hash = generateRecordHash(recordData);

    // 3. Save New Version off-chain (in MongoDB)
    const newRecordId = new mongoose.Types.ObjectId();
    const newRecord = await MedicalRecord.create({
      _id: newRecordId,
      ...recordData,
      currentHash: hash,
      recordGroupId: oldRecord.recordGroupId || oldRecord._id,
      version: oldRecord.version + 1,
      previousVersion: oldRecord._id,
      status: 'ACTIVE'
    });

    // 4. Anchor Hash on Blockchain
    const blockchainData = await blockchainService.storeHash(newRecord._id, hash);
    newRecord.blockchainTxHash = blockchainData.txHash;
    await newRecord.save();

    await logAudit(req, { actor: doctorId, role: 'DOCTOR', action: 'EDIT_RECORD', resourceType: 'MedicalRecord', resourceId: newRecord._id, relatedPatient: oldRecord.patient });

    await Notification.create({ user: oldRecord.patient, type: 'RECORD_EDITED', message: `A new version (v${newRecord.version}) of your medical record has been authored.`, relatedId: newRecord._id });

    res.status(201).json(newRecord);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get record version history
// @route   GET /api/records/:id/history
// @access  Private (Patient or Authorized Doctor)
export const getRecordHistory = async (req, res) => {
  try {
    const record = await MedicalRecord.findById(req.params.id);
    if (!record) return res.status(404).json({ message: 'Record not found' });
    
    // Enforce Authorization Context
    if (req.user.role === 'PATIENT' && record.patient.toString() !== req.user._id.toString()) {
       return res.status(403).json({ message: 'Unauthorized' });
    } else if (req.user.role === 'DOCTOR') {
       if (!(await hasAccess(record.patient, req.user._id))) return res.status(403).json({ message: 'Unauthorized' });
    }

    const groupId = record.recordGroupId || record._id;
    const history = await MedicalRecord.find({ $or: [{ _id: groupId }, { recordGroupId: groupId }] })
      .populate('doctor', 'firstName lastName email')
      .sort({ version: -1 });

    const verifiedHistory = await Promise.all(history.map(async (rec) => {
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
        let status = 'TAMPERED';
        try {
          isVerified = await blockchainService.verifyHash(rec._id, calculatedHash);
          if (isVerified) status = 'VERIFIED';
        } catch(e) {
          if (e.message === 'BLOCKCHAIN_UNREACHABLE') status = 'BLOCKCHAIN_UNREACHABLE';
          else if (e.message === 'CONTRACT_NOT_DEPLOYED') status = 'CONTRACT_NOT_DEPLOYED';
          else if (e.message === 'NOT_ANCHORED') status = 'NOT_ANCHORED';
        }
        return {
            ...recordObj,
            verificationStatus: status,
            blockchainTxHash: rec.blockchainTxHash
        };
    }));

    res.json(verifiedHistory);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
