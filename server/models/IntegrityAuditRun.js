import mongoose from 'mongoose';

const integrityAuditRunSchema = new mongoose.Schema({
  startedAt: {
    type: Date,
    default: Date.now,
    required: true
  },
  finishedAt: {
    type: Date
  },
  trigger: {
    type: String,
    enum: ['SCHEDULED', 'MANUAL'],
    default: 'SCHEDULED'
  },
  triggeredBy: {
    type: String,
    default: 'SYSTEM'
  },
  status: {
    type: String,
    enum: ['COMPLETED', 'SKIPPED', 'FAILED'],
    required: true
  },
  skipReason: {
    type: String
  },
  errorMessage: {
    type: String
  },
  counts: {
    checked: { type: Number, default: 0 },
    verified: { type: Number, default: 0 },
    tampered: { type: Number, default: 0 },
    notAnchored: { type: Number, default: 0 },
    pending: { type: Number, default: 0 },
    unverifiable: { type: Number, default: 0 }
  },
  tamperedRecords: [
    {
      recordId: { type: mongoose.Schema.Types.ObjectId, ref: 'MedicalRecord' },
      version: { type: Number },
      detectedAt: { type: Date, default: Date.now }
    }
  ]
}, { timestamps: true });

integrityAuditRunSchema.index({ startedAt: -1 });

export default mongoose.model('IntegrityAuditRun', integrityAuditRunSchema);
