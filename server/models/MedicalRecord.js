import mongoose from 'mongoose';

const medicalRecordSchema = new mongoose.Schema({
  patient: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  doctor: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  visitDate: { type: Date, default: Date.now },
  symptoms: { type: String, required: true },
  diagnosis: { type: String, required: true },
  treatment: { type: String },
  prescription: { type: String },
  documentUrls: [{ type: String }],     // Paths to local files uploaded via multer
  currentHash: { type: String },        // SHA-256 hash computed before saving
  blockchainTxHash: { type: String },   // Tx receipt from Hardhat
  status: { type: String, enum: ['ACTIVE', 'AMENDED', 'HISTORICAL'], default: 'ACTIVE' },
  previousVersion: { type: mongoose.Schema.Types.ObjectId, ref: 'MedicalRecord' },
  version: { type: Number, default: 1 },
  recordGroupId: { type: mongoose.Schema.Types.ObjectId, ref: 'MedicalRecord' }
}, { timestamps: true });

medicalRecordSchema.index({ patient: 1 });
medicalRecordSchema.index({ doctor: 1 });

export default mongoose.model('MedicalRecord', medicalRecordSchema);
