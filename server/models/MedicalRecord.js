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
  recordType: { type: String, default: 'Consultation' },
  currentHash: { type: String },        // SHA-256 hash computed before saving
  blockchainTxHash: { type: String },   // Tx receipt from Hardhat
  contractAddress: { type: String },    // Smart contract address anchored to
  anchoredAt: { type: Date },           // Timestamp anchored to blockchain
  verificationStatus: { type: String }, // Verification status ('VERIFIED', 'NOT_ANCHORED', 'CHAIN_MISMATCH', 'TAMPERED', 'PENDING_ANCHOR', etc.)
  anchorAttempts: { type: Number, default: 0 }, // Retry count for pending blockchain anchoring
  lastAnchorAttemptAt: { type: Date },          // Timestamp of last anchoring attempt
  anchorError: { type: String },                // Last error message if anchoring failed
  status: { type: String, enum: ['ACTIVE', 'AMENDED', 'HISTORICAL'], default: 'ACTIVE' },
  previousVersion: { type: mongoose.Schema.Types.ObjectId, ref: 'MedicalRecord' },
  version: { type: Number, default: 1 },
  recordGroupId: { type: mongoose.Schema.Types.ObjectId, ref: 'MedicalRecord' }
}, { timestamps: true });

medicalRecordSchema.index({ patient: 1 });
medicalRecordSchema.index({ doctor: 1 });

export default mongoose.model('MedicalRecord', medicalRecordSchema);
