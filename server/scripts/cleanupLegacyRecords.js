import mongoose from 'mongoose';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

import MedicalRecord from '../models/MedicalRecord.js';
import Notification from '../models/Notification.js';
import { isLegacyEmptyRecord } from '../utils/hashHelper.js';
import { logAudit } from '../utils/auditHelper.js';

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

const PROTECTED_DEMO_ID = '6ace433545cdf0a154858cce';

/**
 * Dev-only cleanup script for legacy empty test records.
 *
 * Rules:
 * - Refuses execution when NODE_ENV === 'production'.
 * - Default is --dry-run (lists records it would delete).
 * - Only deletes with explicit --confirm.
 * - Takes an explicit list of IDs (--ids=id1,id2 or positional args) or detected LEGACY_EMPTY set.
 * - Always skips 6ace433545cdf0a154858cce unless --include-demo is passed.
 * - Writes a RECORD_DELETED audit log entry per deletion.
 * - Prints a clear backup reminder.
 */
export const cleanupLegacyRecords = async () => {
  // 1. Refuse execution in production
  if (process.env.NODE_ENV === 'production') {
    console.error('\n[CRITICAL ERROR] cleanupLegacyRecords is a dev-only utility and cannot be executed in production (NODE_ENV=production).\n');
    throw new Error('Refusing to run cleanupLegacyRecords in production');
  }

  const args = process.argv.slice(2);
  const isConfirm = args.includes('--confirm');
  const isDryRun = !isConfirm || args.includes('--dry-run');
  const includeDemo = args.includes('--include-demo');

  // Parse explicit IDs if provided
  let explicitIds = [];
  const idsArg = args.find(a => a.startsWith('--ids='));
  if (idsArg) {
    explicitIds = idsArg.replace('--ids=', '').split(',').map(s => s.trim()).filter(Boolean);
  } else {
    // Positional arguments that look like 24-char hex ObjectIds
    explicitIds = args.filter(a => !a.startsWith('--') && /^[0-9a-fA-F]{24}$/.test(a));
  }

  // 2. Connect to MongoDB
  if (mongoose.connection.readyState !== 1) {
    const mongoUri = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/secure-medical-records';
    await mongoose.connect(mongoUri);
    console.log('[Cleanup] Connected to MongoDB.');
  }

  console.log(`\n================================================================================`);
  console.log(`  LEGACY RECORDS CLEANUP UTILITY ${isDryRun ? '(DRY RUN - NO WRITES)' : '(CONFIRMED DELETION)'}`);
  console.log(`================================================================================`);

  let candidateRecords = [];

  if (explicitIds.length > 0) {
    console.log(`[Target Selection] Targeting ${explicitIds.length} explicitly provided record ID(s)...`);
    candidateRecords = await MedicalRecord.find({ _id: { $in: explicitIds } });
  } else {
    console.log(`[Target Selection] Scanning database for LEGACY_EMPTY records...`);
    const allRecords = await MedicalRecord.find({});
    candidateRecords = allRecords.filter(r => {
      return r.verificationStatus === 'LEGACY_EMPTY' || isLegacyEmptyRecord(r);
    });
  }

  // 3. Filter candidates and enforce protected demo record rule
  let skippedDemoCount = 0;
  const toProcess = [];

  for (const rec of candidateRecords) {
    const idStr = rec._id.toString();
    if (idStr === PROTECTED_DEMO_ID && !includeDemo) {
      skippedDemoCount++;
      console.log(`  [PROTECTED DEMO SKIPPED] Record #${idStr} is protected demo data. Skipped (pass --include-demo to override).`);
      continue;
    }
    toProcess.push(rec);
  }

  console.log(`\n[Audit] Found ${toProcess.length} record(s) matching deletion criteria${skippedDemoCount > 0 ? ` (${skippedDemoCount} protected demo record skipped)` : ''}:`);

  if (toProcess.length === 0) {
    console.log('  No records to clean up.\n');
  } else {
    toProcess.forEach((r, idx) => {
      console.log(`  ${idx + 1}. ID: ${r._id} | v${r.version} | Status: ${r.verificationStatus || 'N/A'} | Created: ${r.createdAt?.toISOString()}`);
      console.log(`     Symptoms: [${r.symptoms || ''}] | Diagnosis: [${r.diagnosis || ''}] | Treatment: [${r.treatment || ''}] | Rx: [${r.prescription || ''}]`);
    });
  }

  // 4. Handle Dry Run vs Confirmed Execution
  if (isDryRun) {
    console.log(`\n--------------------------------------------------------------------------------`);
    console.log(`  DRY RUN SUMMARY: ${toProcess.length} record(s) would be deleted.`);
    console.log(`  To permanently delete these records, run:`);
    console.log(`    node server/scripts/cleanupLegacyRecords.js --confirm`);
    if (explicitIds.length > 0) {
      console.log(`    node server/scripts/cleanupLegacyRecords.js --ids=${explicitIds.join(',')} --confirm`);
    }
    console.log(`--------------------------------------------------------------------------------\n`);
  } else {
    console.log(`\n[Execution] Permanently deleting ${toProcess.length} record(s)...`);
    let deletedCount = 0;

    for (const rec of toProcess) {
      try {
        await MedicalRecord.deleteOne({ _id: rec._id });

        // Write RECORD_DELETED audit log entry
        await logAudit(null, {
          actor: null,
          role: 'SYSTEM',
          action: 'RECORD_DELETED',
          resourceType: 'MedicalRecord',
          resourceId: rec._id,
          resourceLabel: `Medical record #${rec._id.toString().slice(-6)} (v${rec.version || 1})`,
          relatedPatient: rec.patient,
          details: `Deleted legacy empty test record ${rec._id} via cleanupLegacyRecords.js`
        });

        // Clean up any associated notifications
        await Notification.deleteMany({ relatedId: rec._id });

        deletedCount++;
        console.log(`  [DELETED] Record #${rec._id} deleted and audit logged.`);
      } catch (err) {
        console.error(`  [ERROR] Failed to delete record #${rec._id}:`, err.message);
      }
    }

    console.log(`\n[Execution Complete] Successfully deleted ${deletedCount} record(s).`);
  }

  // 5. Print Backup Reminder
  console.log(`\n================================================================================`);
  console.log(`[BACKUP REMINDER]`);
  console.log(`Before running record cleanup operations in non-local or staging environments,`);
  console.log(`always ensure an up-to-date backup exists:`);
  console.log(`  mongodump --uri="${process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/secure-medical-records'}" --out="./backup_$(date +%Y%m%d)"`);
  console.log(`================================================================================\n`);

  return {
    candidateCount: candidateRecords.length,
    processedCount: toProcess.length,
    skippedDemoCount,
    dryRun: isDryRun
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
  cleanupLegacyRecords()
    .then(() => {
      process.exit(0);
    })
    .catch((err) => {
      console.error('[Cleanup Failed]:', err.message);
      process.exit(1);
    });
}

export default cleanupLegacyRecords;
