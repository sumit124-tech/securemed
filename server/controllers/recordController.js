import mongoose from 'mongoose';
import MedicalRecord from '../models/MedicalRecord.js';
import AccessRequest from '../models/AccessRequest.js';
import AuditLog from '../models/AuditLog.js';
import { logAudit } from '../utils/auditHelper.js';
import Notification from '../models/Notification.js';
import { createNotification } from '../utils/notifyHelper.js';
import { generateRecordHash } from '../utils/hashHelper.js';
import blockchainService from '../services/blockchainService.js';
import { verifyRecordStatus } from '../services/verificationService.js';
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

    await logAudit(req, { 
      actor: doctorId, 
      role: 'DOCTOR', 
      action: 'CREATE_RECORD', 
      resourceType: 'MedicalRecord', 
      resourceId: newRecord._id, 
      resourceLabel: `Medical record #${newRecord._id.toString().slice(-6)}`,
      relatedPatient: patientId 
    });

    try {
      await createNotification({ user: patientId, type: 'RECORD_CREATED', message: 'A new medical record has been authored for you.', relatedId: newRecord._id });
    } catch (notifErr) {
      console.warn('[NOTIFICATION WARNING] Failed to send record created notification:', notifErr.message);
    }

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

    await logAudit(req, { 
      actor: req.user._id, 
      role: req.user.role, 
      action: 'VIEW_RECORDS', 
      resourceType: 'User', 
      resourceId: patientId, 
      resourceLabel: 'Patient records',
      relatedPatient: patientId 
    });

    if (req.query.verify === 'true') {
       const verifiedRecords = await Promise.all(records.map(async (rec) => {
           const recordObj = rec.toObject ? rec.toObject() : rec;
           const statusResult = await verifyRecordStatus(rec);

           if (statusResult.status === 'TAMPERED') {
             const tenMinsAgo = new Date(Date.now() - 10 * 60 * 1000);
             const recent = await Notification.findOne({
               user: rec.patient,
               type: 'INTEGRITY_CHECK_FAILED',
               relatedId: rec._id,
               createdAt: { $gte: tenMinsAgo }
             });
             if (!recent) {
               await createNotification({
                 user: rec.patient,
                 type: 'INTEGRITY_CHECK_FAILED',
                 message: `Integrity check failed for record ${rec._id}. The data has been modified.`,
                 relatedId: rec._id
               });
             }
           }

           return {
               ...recordObj,
               verificationStatus: statusResult.status,
               calculatedHash: statusResult.calculatedHash,
               blockchainHash: statusResult.blockchainHash,
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

    const statusResult = await verifyRecordStatus(record);
    const status = statusResult.status;
    const isVerified = statusResult.isVerified;

    if (status === 'VERIFIED') {
      await logAudit(req, { 
        actor: req.user._id, 
        role: req.user.role, 
        action: 'VERIFY_RECORD', 
        resourceType: 'MedicalRecord', 
        resourceId: record._id, 
        resourceLabel: `Medical record #${record._id.toString().slice(-6)}`,
        relatedPatient: record.patient, 
        forceLog: req.query.forceLog === 'true' 
      });
      if (req.user.role === 'DOCTOR' && req.query.forceLog === 'true') {
        await createNotification({
          user: req.user._id,
          type: 'RECORD_VERIFIED',
          message: `You successfully verified record ${record._id}.`,
          relatedId: record._id
        });
      }
    } else {
      await logAudit(req, { 
        actor: req.user._id, 
        role: req.user.role, 
        action: 'VERIFY_RECORD_FAILED', 
        resourceType: 'MedicalRecord', 
        resourceId: record._id, 
        resourceLabel: `Medical record #${record._id.toString().slice(-6)}`,
        relatedPatient: record.patient,
        details: `Verification status: ${status}`
      });
      
      if (status === 'TAMPERED') {
        const tenMinsAgo = new Date(Date.now() - 10 * 60 * 1000);
        const recent = await Notification.findOne({
          user: record.patient,
          type: 'INTEGRITY_CHECK_FAILED',
          relatedId: record._id,
          createdAt: { $gte: tenMinsAgo }
        });
        if (!recent) {
          await createNotification({
            user: record.patient,
            type: 'INTEGRITY_CHECK_FAILED',
            message: `Integrity check failed for record ${record._id}. The data has been modified.`,
            relatedId: record._id
          });
        }
      }
    }

    res.json({
      ...statusResult,
      status: status,
      isVerified,
      calculatedHash: statusResult.calculatedHash,
      blockchainHash: statusResult.blockchainHash,
      blockchainTxHash: record.blockchainTxHash,
      timestamp: statusResult.timestamp ? new Date(Number(statusResult.timestamp) * 1000) : null,
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

    await logAudit(req, { 
      actor: doctorId, 
      role: 'DOCTOR', 
      action: 'EDIT_RECORD', 
      resourceType: 'MedicalRecord', 
      resourceId: newRecord._id, 
      resourceLabel: `Medical record #${newRecord._id.toString().slice(-6)} (v${newRecord.version || 2})`,
      relatedPatient: oldRecord.patient 
    });

    try {
      await createNotification({ user: oldRecord.patient, type: 'RECORD_EDITED', message: `A new version (v${newRecord.version}) of your medical record has been authored.`, relatedId: newRecord._id });
    } catch (notifErr) {
      console.warn('[NOTIFICATION WARNING] Failed to send record edited notification:', notifErr.message);
    }

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
        const statusResult = await verifyRecordStatus(rec);
        return {
            ...recordObj,
            verificationStatus: statusResult.status,
            calculatedHash: statusResult.calculatedHash,
            blockchainHash: statusResult.blockchainHash,
            blockchainTxHash: rec.blockchainTxHash
        };
    }));

    res.json(verifiedHistory);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
