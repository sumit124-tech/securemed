import mongoose from 'mongoose';

const notificationSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  type: { type: String, required: true }, // e.g., 'ACCESS_REQUEST', 'ACCESS_APPROVED', 'ACCESS_REJECTED', 'ACCESS_REVOKED', 'RECORD_CREATED'
  message: { type: String, required: true },
  relatedId: { type: mongoose.Schema.Types.ObjectId }, // e.g., requestId, recordId
  isRead: { type: Boolean, default: false },
}, { timestamps: true });

export default mongoose.model('Notification', notificationSchema);
