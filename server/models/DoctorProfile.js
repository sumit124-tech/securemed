import mongoose from 'mongoose';

const doctorProfileSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  firstName: { type: String, required: true },
  lastName: { type: String, required: true },
  specialization: { type: String, required: true },
  licenseNumber: { type: String, required: true, unique: true },
  hospitalAffiliation: { type: String },
  isVerified: { type: Boolean, default: false } // Must be verified by ADMIN before accessing records
}, { timestamps: true });

export default mongoose.model('DoctorProfile', doctorProfileSchema);
