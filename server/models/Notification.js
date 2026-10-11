import mongoose from 'mongoose';

const notificationSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: false, default: null },
  targetRole: { type: String, enum: ['ADMIN', 'DOCTOR', 'PATIENT'], default: null },
  type: { type: String, required: true }, // e.g., 'ACCESS_REQUEST', 'DOCTOR_REGISTERED', 'DOCTOR_VERIFIED', 'DOCTOR_REJECTED', 'SECURITY_ALERT', etc.
  title: { type: String, default: null },
  message: { type: String, required: true },
  link: { type: String, default: null },
  relatedId: { type: mongoose.Schema.Types.ObjectId },
  isRead: { type: Boolean, default: false },
  readBy: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }]
}, { timestamps: true });

export default mongoose.model('Notification', notificationSchema);
