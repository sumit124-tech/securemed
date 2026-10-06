import mongoose from 'mongoose';

const accessRequestSchema = new mongoose.Schema({
  patient: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  doctor: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  status: { type: String, enum: ['PENDING', 'APPROVED', 'REJECTED', 'REVOKED'], default: 'PENDING' },
  requestedAt: { type: Date, default: Date.now },
  respondedAt: { type: Date }
}, { timestamps: true });

accessRequestSchema.index({ patient: 1, doctor: 1 });

export default mongoose.model('AccessRequest', accessRequestSchema);
