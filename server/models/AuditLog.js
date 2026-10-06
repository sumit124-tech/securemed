import mongoose from 'mongoose';

const auditLogSchema = new mongoose.Schema({
  actor: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  role: { type: String, enum: ['PATIENT', 'DOCTOR', 'ADMIN', 'SYSTEM'] },
  action: { type: String, required: true }, // e.g., 'LOGIN', 'CREATE_RECORD', 'APPROVE_ACCESS'
  resourceType: { type: String }, // e.g., 'MedicalRecord', 'AccessRequest'
  resourceId: { type: mongoose.Schema.Types.ObjectId },
  relatedPatient: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  ipAddress: { type: String },
  timestamp: { type: Date, default: Date.now }
});

export default mongoose.model('AuditLog', auditLogSchema);
