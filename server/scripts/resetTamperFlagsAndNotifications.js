import mongoose from 'mongoose';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

import MedicalRecord from '../models/MedicalRecord.js';
import Notification from '../models/Notification.js';
import { verifyRecordStatus } from '../services/verificationService.js';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const serverDir = path.resolve(scriptDir, '..');

// Load environment configuration
const envCandidates = [
  path.resolve(serverDir, '.env'),
  path.resolve(process.cwd(), '.env'),
  path.resolve(process.cwd(), 'server/.env')
];
for (const p of envCandidates) {
  if (fs.existsSync(p)) {
    dotenv.config({ path: p });
  }
}

/**
 * Resets false TAMPERED status flags in the database and cleans up
 * false positive tampering alerts from the admin notification bell.
 */
export const resetTamperFlagsAndNotifications = async () => {
  if (mongoose.connection.readyState !== 1) {
    const mongoUri = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/secure-medical-records';
    await mongoose.connect(mongoUri);
    console.log('[Reset] Connected to MongoDB.');
  }

  console.log('[Reset] Evaluating records and resetting false TAMPERED flags...');
  const records = await MedicalRecord.find({});
  let resetCount = 0;
  const resetRecordIds = [];

  for (const rec of records) {
    const result = await verifyRecordStatus(rec);
    if (rec.verificationStatus === 'TAMPERED' && result.status !== 'TAMPERED') {
      rec.verificationStatus = result.status;
      await rec.save();
      resetCount++;
      resetRecordIds.push(rec._id);
      console.log(`  [RESET] Record #${rec._id.toString().slice(-6)} flag reset from TAMPERED to ${result.status} (${result.reason || 'OK'})`);
    }
  }

  // Clear false tampering notifications from admin bell
  console.log('[Reset] Clearing false tampering notifications from Notification collection...');
  const notifResult = await Notification.deleteMany({
    $or: [
      { type: 'RECORD_TAMPERING_DETECTED' },
      { type: 'SECURITY_ALERT', message: /tamper|Integrity check failed/i },
      { type: 'INTEGRITY_CHECK_FAILED' }
    ]
  });

  console.log(`[Reset Complete] Reset ${resetCount} record(s). Removed ${notifResult.deletedCount} false tampering notification(s).\n`);

  return {
    recordsReset: resetCount,
    notificationsCleared: notifResult.deletedCount,
    resetRecordIds
  };
};

// Direct CLI invocation
const isDirectCliRun = () => {
  try {
    if (process.argv[1]) {
      const scriptPath = fileURLToPath(import.meta.url);
      return path.resolve(process.argv[1]) === path.resolve(scriptPath);
    }
  } catch (e) {
    // ignore
  }
  return false;
};

if (isDirectCliRun()) {
  resetTamperFlagsAndNotifications()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('[Reset Error]:', err);
      process.exit(1);
    });
}

export default resetTamperFlagsAndNotifications;
