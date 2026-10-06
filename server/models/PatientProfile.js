import mongoose from 'mongoose';

const patientProfileSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  firstName: { type: String, required: true },
  lastName: { type: String, required: true },
  dob: { type: Date, required: true },
  gender: { type: String, enum: ['Male', 'Female', 'Other'] },
  bloodGroup: { type: String },
  contactNumber: { type: String },
  address: { type: String }
}, { timestamps: true });

export default mongoose.model('PatientProfile', patientProfileSchema);
