import mongoose from 'mongoose';

const doctorProfileSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  firstName: { type: String, required: true },
  lastName: { type: String, required: true },
  dob: { type: Date },
  specialization: { type: String, required: true },
  licenseNumber: { type: String, required: true, unique: true },
  hospitalAffiliation: { type: String },
  isVerified: { type: Boolean, default: false }, // Must be verified by ADMIN before accessing records
  verificationStatus: { 
    type: String, 
    enum: ['PENDING', 'VERIFIED', 'REJECTED'], 
    default: 'PENDING' 
  },
  rejectionReason: { type: String, default: null },
  rejectedAt: { type: Date, default: null },
  reverificationReason: { type: String, default: null },
  documents: [{
    name: { type: String },
    url: { type: String },
    uploadedAt: { type: Date, default: Date.now }
  }]
}, { timestamps: true });

export default mongoose.model('DoctorProfile', doctorProfileSchema);
