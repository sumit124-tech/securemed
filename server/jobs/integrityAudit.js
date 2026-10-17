import cron from 'node-cron';
import MedicalRecord from '../models/MedicalRecord.js';
import IntegrityAuditRun from '../models/IntegrityAuditRun.js';
import { computeIntegrityStatus } from '../services/verificationService.js';
import { checkBlockchainReachable, isAnchorQueueRunning } from './anchorQueue.js';
import { logAudit } from '../utils/auditHelper.js';
import { notifyAdmins } from '../utils/notifyHelper.js';

let isAuditRunning = false;
let scheduledCronTask = null;

/**
 * Returns true if an integrity audit is currently executing.
 */
export const isIntegrityAuditRunning = () => isAuditRunning;

/**
 * Executes a full cryptographic integrity audit across medical records.
 *
 * Rules:
 * 1. Checks node reachability first. If unreachable, skips run with "Audit skipped: node unreachable".
 *    Never reports TAMPERED due to network/connectivity failures.
 * 2. In-process locking: ensures two audits never run at once, and doesn't run while anchor queue is active.
 * 3. Batches anchored records in groups of 50, using computeIntegrityStatus.
 * 4. PENDING_ANCHOR, NOT_ANCHORED, and ANCHOR_FAILED are counted without invoking the on-chain comparison loop.
 * 5. When a record version is newly found TAMPERED:
 *    - writes RECORD_TAMPERING_DETECTED to audit log
 *    - dispatches notifyAdmins once per record (skipped if already flagged TAMPERED)
 *    - sets record.verificationStatus = 'TAMPERED'
 * 6. Never modifies clinical record data (symptoms, diagnosis, prescription, etc.).
 *
 * @param {Object} [options]
 * @param {('SCHEDULED'|'MANUAL')} [options.trigger='SCHEDULED']
 * @param {string} [options.triggeredBy='SYSTEM']
 * @returns {Promise<Object>} Summary and audit run document
 */
export const runIntegrityAudit = async ({ trigger = 'SCHEDULED', triggeredBy = 'SYSTEM' } = {}) => {
  if (isAuditRunning) {
    console.log(`[Integrity Audit] Audit already running. Request from ${triggeredBy} rejected.`);
    return {
      status: 'LOCKED',
      message: 'An integrity audit is already in progress'
    };
  }

  if (typeof isAnchorQueueRunning === 'function' && isAnchorQueueRunning()) {
    console.log(`[Integrity Audit] Anchor queue is mid-batch. Audit deferred.`);
    return {
      status: 'LOCKED',
      message: 'Anchor queue is currently active. Please try again in a few moments.'
    };
  }

  isAuditRunning = true;
  const startedAt = new Date();

  try {
    // 1. Check if blockchain node is reachable first
    const isReachable = await checkBlockchainReachable();
    if (!isReachable) {
      console.log('[Integrity Audit] Audit skipped: node unreachable');
      
      const skippedRun = await IntegrityAuditRun.create({
        startedAt,
        finishedAt: new Date(),
        trigger,
        triggeredBy: triggeredBy || 'SYSTEM',
        status: 'SKIPPED',
        skipReason: 'Audit skipped: node unreachable',
        counts: {
          checked: 0,
          verified: 0,
          tampered: 0,
          notAnchored: 0,
          pending: 0,
          unverifiable: 0
        },
        tamperedRecords: []
      });

      return {
        status: 'SKIPPED',
        message: 'Audit skipped: node unreachable',
        auditRun: skippedRun
      };
    }

    console.log(`[Integrity Audit] Starting ${trigger} audit initiated by ${triggeredBy}...`);

    // 2. Count versions that should not be touched by verification loop
    const pendingCount = await MedicalRecord.countDocuments({ verificationStatus: 'PENDING_ANCHOR' });
    const anchorFailedCount = await MedicalRecord.countDocuments({ verificationStatus: 'ANCHOR_FAILED' });
    const notAnchoredExplicitCount = await MedicalRecord.countDocuments({ verificationStatus: 'NOT_ANCHORED' });
    const missingTxCount = await MedicalRecord.countDocuments({
      blockchainTxHash: { $in: [null, ''] },
      verificationStatus: { $nin: ['PENDING_ANCHOR', 'ANCHOR_FAILED', 'NOT_ANCHORED'] }
    });
    const totalNotAnchored = notAnchoredExplicitCount + missingTxCount;

    // 3. Query all anchored record versions in batches of 50
    // Excludes PENDING_ANCHOR, NOT_ANCHORED, and ANCHOR_FAILED
    const auditQuery = {
      blockchainTxHash: { $exists: true, $nin: [null, ''] },
      verificationStatus: { $nin: ['PENDING_ANCHOR', 'NOT_ANCHORED', 'ANCHOR_FAILED'] }
    };

    let checkedCount = 0;
    let verifiedCount = 0;
    let tamperedCount = 0;
    let unverifiableCount = 0;
    const tamperedList = [];

    const BATCH_SIZE = 50;
    let lastProcessedId = null;

    while (true) {
      const batchQuery = { ...auditQuery };
      if (lastProcessedId) {
        batchQuery._id = { $gt: lastProcessedId };
      }

      const batch = await MedicalRecord.find(batchQuery)
        .sort({ _id: 1 })
        .limit(BATCH_SIZE);

      if (!batch || batch.length === 0) {
        break;
      }

      for (const record of batch) {
        checkedCount++;
        lastProcessedId = record._id;

        try {
          const result = await computeIntegrityStatus(record);

          if (result.status === 'VERIFIED') {
            verifiedCount++;
            // If the record was previously marked TAMPERED, restore flag if clean
            if (record.verificationStatus === 'TAMPERED') {
              record.verificationStatus = 'VERIFIED';
              await record.save();
            }
          } else if (result.status === 'TAMPERED') {
            tamperedCount++;
            tamperedList.push({
              recordId: record._id,
              version: record.version || 1,
              detectedAt: new Date()
            });

            // Check if already flagged TAMPERED to prevent duplicate alerts on nightly runs
            const isAlreadyFlagged = record.verificationStatus === 'TAMPERED';

            if (!isAlreadyFlagged) {
              // Flag record status without altering clinical contents
              record.verificationStatus = 'TAMPERED';
              await record.save();

              // Write RECORD_TAMPERING_DETECTED to audit log
              try {
                await logAudit(null, {
                  actor: null,
                  role: 'SYSTEM',
                  action: 'RECORD_TAMPERING_DETECTED',
                  resourceType: 'MedicalRecord',
                  resourceId: record._id,
                  resourceLabel: `Medical record #${record._id.toString().slice(-6)} (v${record.version || 1})`,
                  relatedPatient: record.patient,
                  details: `Cryptographic tampering discovered during ${trigger} integrity audit. Reason: ${result.reason || 'Hash mismatch'}. Stored/Chain: ${(result.storedHash || result.blockchainHash)?.slice(0, 10)}... Calculated: ${result.calculatedHash?.slice(0, 10)}...`
                });
              } catch (auditErr) {
                console.warn('[Integrity Audit] Failed to log tampering audit:', auditErr.message);
              }

              // Notify admins once per record
              try {
                await notifyAdmins({
                  type: 'RECORD_TAMPERING_DETECTED',
                  title: 'CRITICAL: Data Tampering Detected',
                  message: `Integrity audit found data tampering in medical record #${record._id.toString().slice(-6)} (v${record.version || 1}). The database data does not match the immutable blockchain anchor.`,
                  link: `/record/${record._id}`,
                  relatedId: record._id
                });
              } catch (notifErr) {
                console.warn('[Integrity Audit] Failed to notify admins:', notifErr.message);
              }
            }
          } else if (result.status === 'UNVERIFIABLE' || result.status === 'BLOCKCHAIN_UNREACHABLE' || result.status === 'CONTRACT_NOT_DEPLOYED') {
            unverifiableCount++;
          } else if (result.status === 'CHAIN_MISMATCH' || result.status === 'NOT_ANCHORED') {
            // Unexpected on-chain missing state for anchored record
            unverifiableCount++;
          }
        } catch (itemErr) {
          console.warn(`[Integrity Audit] Error verifying record #${record._id}:`, itemErr.message);
          unverifiableCount++;
        }
      }
    }

    const finishedAt = new Date();

    const auditRun = await IntegrityAuditRun.create({
      startedAt,
      finishedAt,
      trigger,
      triggeredBy: triggeredBy || 'SYSTEM',
      status: 'COMPLETED',
      counts: {
        checked: checkedCount,
        verified: verifiedCount,
        tampered: tamperedCount,
        notAnchored: totalNotAnchored,
        pending: pendingCount + anchorFailedCount,
        unverifiable: unverifiableCount
      },
      tamperedRecords: tamperedList
    });

    console.log(`[Integrity Audit] Run complete (${trigger}). Checked: ${checkedCount}, Verified: ${verifiedCount}, Tampered: ${tamperedCount}, Pending: ${pendingCount + anchorFailedCount}, Not Anchored: ${totalNotAnchored}.`);

    return {
      status: 'COMPLETED',
      message: `Integrity audit completed: ${checkedCount} checked, ${verifiedCount} verified, ${tamperedCount} tampered.`,
      auditRun
    };
  } catch (error) {
    console.error('[Integrity Audit] Fatal error during audit run:', error);

    const failedRun = await IntegrityAuditRun.create({
      startedAt,
      finishedAt: new Date(),
      trigger,
      triggeredBy: triggeredBy || 'SYSTEM',
      status: 'FAILED',
      errorMessage: error.message,
      counts: {
        checked: 0,
        verified: 0,
        tampered: 0,
        notAnchored: 0,
        pending: 0,
        unverifiable: 0
      },
      tamperedRecords: []
    });

    return {
      status: 'FAILED',
      message: error.message || 'Integrity audit execution failed',
      auditRun: failedRun
    };
  } finally {
    isAuditRunning = false;
  }
};

/**
 * Initializes and schedules the node-cron job for the integrity audit.
 * Default is 02:00 daily ('0 2 * * *'), configurable with AUDIT_CRON in .env.
 */
export const startIntegrityAuditCron = () => {
  const cronSchedule = process.env.AUDIT_CRON || '0 2 * * *';

  if (!cron.validate(cronSchedule)) {
    console.warn(`[Integrity Audit] Invalid AUDIT_CRON expression "${cronSchedule}". Falling back to daily 02:00 ('0 2 * * *').`);
  }

  const effectiveSchedule = cron.validate(cronSchedule) ? cronSchedule : '0 2 * * *';

  if (scheduledCronTask) {
    scheduledCronTask.stop();
  }

  console.log(`[Integrity Audit] Scheduled audit initialized with cron expression: "${effectiveSchedule}"`);

  scheduledCronTask = cron.schedule(effectiveSchedule, async () => {
    try {
      console.log('[Integrity Audit] Triggering nightly scheduled audit run...');
      await runIntegrityAudit({ trigger: 'SCHEDULED', triggeredBy: 'SYSTEM' });
    } catch (err) {
      console.error('[Integrity Audit] Scheduled run exception:', err.message);
    }
  });

  return scheduledCronTask;
};

export const stopIntegrityAuditCron = () => {
  if (scheduledCronTask) {
    scheduledCronTask.stop();
    scheduledCronTask = null;
  }
};

export default {
  isIntegrityAuditRunning,
  runIntegrityAudit,
  startIntegrityAuditCron,
  stopIntegrityAuditCron
};
