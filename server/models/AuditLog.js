import mongoose from 'mongoose';

const auditLogSchema = new mongoose.Schema({
  actor: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  role: { type: String, enum: ['PATIENT', 'DOCTOR', 'ADMIN', 'SYSTEM'] },
  action: { type: String, required: true }, // e.g., 'LOGIN', 'CREATE_RECORD', 'APPROVE_ACCESS'
  resourceType: { type: String }, // e.g., 'MedicalRecord', 'AccessRequest', 'DoctorProfile', 'User'
  resourceId: { type: mongoose.Schema.Types.Mixed },
  resourceLabel: { type: String, default: null }, // e.g., 'Doctor: Dr. Aditya singh', 'Records overview'
  relatedPatient: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  details: { type: String }, // e.g., rejection reason or additional metadata
  ipAddress: { type: String },
  timestamp: { type: Date, default: Date.now }
});

export default mongoose.model('AuditLog', auditLogSchema);
