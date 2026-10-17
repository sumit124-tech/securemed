import MedicalRecord from '../models/MedicalRecord.js';
import blockchainService from '../services/blockchainService.js';
import { logAudit } from '../utils/auditHelper.js';
import { notifyAdmins } from '../utils/notifyHelper.js';

let isQueueProcessing = false;
let workerIntervalId = null;

export const isAnchorQueueRunning = () => isQueueProcessing;

/**
 * Checks if the blockchain node is active and responsive to JSON-RPC calls.
 */
export const checkBlockchainReachable = async () => {
  try {
    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Blockchain provider request timed out (2s)')), 2000)
    );

    await Promise.race([
      blockchainService.provider.getBlockNumber(),
      timeoutPromise
    ]);
    return true;
  } catch (err) {
    return false;
  }
};

/**
 * Worker routine to process records waiting to be anchored to the blockchain.
 *
 * Requirements:
 * 1. Find versions with PENDING_ANCHOR, oldest first, in batches of 20.
 * 2. Check the node is reachable first; skip the run if not.
 * 3. Anchor the stored fingerprint, save txHash, anchoredAt, contractAddress,
 *    and write a RECORD_ANCHORED audit entry.
 * 4. Count failed attempts; after 5, set ANCHOR_FAILED and notifyAdmins once.
 * 5. Prevent double runs (in-process lock) and anchoring the same version twice.
 *
 * @param {Object} [options]
 * @param {string} [options.calledBy='WORKER'] - Trigger source
 * @returns {Promise<Object>} Execution summary
 */
export const processAnchorQueue = async ({ calledBy = 'WORKER' } = {}) => {
  // 1. Prevent double runs via in-process lock
  if (isQueueProcessing) {
    console.log(`[Anchor Queue] Previous run still in progress. Skipping trigger by ${calledBy}.`);
    return {
      status: 'LOCKED',
      message: 'Anchor queue is already processing. Please wait for current run to finish.'
    };
  }

  isQueueProcessing = true;

  try {
    // 2. Check if blockchain node is reachable first
    const isReachable = await checkBlockchainReachable();
    if (!isReachable) {
      console.log(`[Anchor Queue] Blockchain node is unreachable. Skipping run triggered by ${calledBy}.`);
      return {
        status: 'SKIPPED',
        reason: 'BLOCKCHAIN_UNREACHABLE',
        message: 'Blockchain node is currently unreachable. Queue run skipped.'
      };
    }

    // 3. Find versions with status PENDING_ANCHOR, oldest first, batch of 20
    const pendingRecords = await MedicalRecord.find({
      verificationStatus: 'PENDING_ANCHOR'
    })
      .sort({ createdAt: 1 })
      .limit(20);

    const totalFound = pendingRecords.length;
    if (totalFound === 0) {
      return {
        status: 'IDLE',
        message: 'No records waiting to be anchored.',
        totalProcessed: 0,
        anchored: 0,
        failed: 0,
        permanentlyFailed: 0
      };
    }

    console.log(`[Anchor Queue] Processing ${totalFound} pending record(s) triggered by ${calledBy}...`);

    let anchoredCount = 0;
    let failedCount = 0;
    let permanentlyFailedCount = 0;
    const currentContract = blockchainService.getContractAddress();

    // 4. Process records sequentially to avoid nonce race conditions
    for (const rec of pendingRecords) {
      // Prevent anchoring the same version twice
      if (rec.verificationStatus === 'VERIFIED') {
        continue;
      }

      if (!rec.currentHash) {
        console.warn(`[Anchor Queue] Record #${rec._id} is missing currentHash. Cannot anchor.`);
        continue;
      }

      try {
        // Step 1: Broadcast transaction to network and store txHash immediately as soon as sent
        let tx = null;
        if (!rec.blockchainTxHash) {
          const sendResult = await blockchainService.sendHash(rec._id, rec.currentHash);
          rec.blockchainTxHash = sendResult.txHash;
          rec.contractAddress = currentContract;
          rec.network = blockchainService.getNetworkName();
          await rec.save(); // Stored as soon as it is sent!
          tx = sendResult.tx;
        }

        // Step 2: Wait for confirmation (1 block on Sepolia or local)
        if (tx) {
          const confirmations = blockchainService.isSepolia() ? 1 : 1;
          await tx.wait(confirmations);
        } else if (rec.blockchainTxHash && blockchainService.provider) {
          await blockchainService.provider.waitForTransaction(rec.blockchainTxHash, blockchainService.isSepolia() ? 1 : 1);
        }

        // Step 3: Mark VERIFIED when confirmed
        rec.anchoredAt = new Date();
        rec.verificationStatus = 'VERIFIED';
        rec.anchorError = null;
        await rec.save();

        // Write RECORD_ANCHORED audit entry
        try {
          await logAudit(null, {
            actor: null,
            role: 'SYSTEM',
            action: 'RECORD_ANCHORED',
            resourceType: 'MedicalRecord',
            resourceId: rec._id,
            resourceLabel: `Medical record #${rec._id.toString().slice(-6)} (v${rec.version || 1})`,
            relatedPatient: rec.patient,
            details: `Successfully anchored fingerprint ${rec.currentHash.slice(0, 10)}... (tx: ${rec.blockchainTxHash}) on ${blockchainService.getNetworkName()} via queue worker (${calledBy})`
          });
        } catch (auditErr) {
          console.warn('[Anchor Queue] Failed to write audit log:', auditErr.message);
        }

        anchoredCount++;
        console.log(`[Anchor Queue] Anchored record #${rec._id.toString().slice(-6)} on ${blockchainService.getNetworkName()} (tx: ${rec.blockchainTxHash.slice(0, 14)}...)`);
        
        // Pause between transactions to allow block mining and respect rate limits
        await new Promise(r => setTimeout(r, blockchainService.isSepolia() ? 1500 : 100));
      } catch (anchorErr) {
        failedCount++;
        const currentAttempts = (rec.anchorAttempts || 0) + 1;
        rec.anchorAttempts = currentAttempts;
        rec.lastAnchorAttemptAt = new Date();
        rec.anchorError = anchorErr.message;

        console.warn(`[Anchor Queue] Failed attempt ${currentAttempts}/5 for record #${rec._id}: ${anchorErr.message}`);

        // Count failed attempts; after 5, set ANCHOR_FAILED and notifyAdmins once
        if (currentAttempts >= 5) {
          rec.verificationStatus = 'ANCHOR_FAILED';
          permanentlyFailedCount++;

          try {
            await notifyAdmins({
              type: 'ANCHOR_FAILED',
              title: 'Blockchain Anchoring Failed',
              message: `Medical record #${rec._id.toString().slice(-6)} (v${rec.version || 1}) failed to anchor after 5 attempts. Error: ${anchorErr.message}`,
              link: `/record/${rec._id}`,
              relatedId: rec._id
            });
          } catch (notifErr) {
            console.warn('[Anchor Queue] Failed to notify admins of ANCHOR_FAILED:', notifErr.message);
          }
        }

        await rec.save();
      }
    }

    const remainingCount = await MedicalRecord.countDocuments({ verificationStatus: 'PENDING_ANCHOR' });

    const summary = {
      status: 'COMPLETED',
      totalProcessed: totalFound,
      anchored: anchoredCount,
      failed: failedCount,
      permanentlyFailed: permanentlyFailedCount,
      pendingRemaining: remainingCount,
      message: `Queue execution complete: ${anchoredCount} anchored, ${failedCount} failed, ${remainingCount} pending remaining.`
    };

    console.log(`[Anchor Queue] ${summary.message}`);
    return summary;
  } finally {
    isQueueProcessing = false;
  }
};

/**
 * Starts the anchor queue worker on a periodic schedule (default 60 seconds).
 */
export const startAnchorQueueWorker = (intervalMs = 60000) => {
  if (workerIntervalId) {
    return workerIntervalId;
  }

  console.log(`[Anchor Queue] Background worker scheduled every ${intervalMs / 1000} seconds.`);

  workerIntervalId = setInterval(async () => {
    try {
      await processAnchorQueue({ calledBy: 'CRON_WORKER' });
    } catch (err) {
      console.error('[Anchor Queue Worker Uncaught Error]:', err.message);
    }
  }, intervalMs);

  if (workerIntervalId && workerIntervalId.unref) {
    workerIntervalId.unref();
  }

  return workerIntervalId;
};

export const stopAnchorQueueWorker = () => {
  if (workerIntervalId) {
    clearInterval(workerIntervalId);
    workerIntervalId = null;
  }
};

export default {
  checkBlockchainReachable,
  processAnchorQueue,
  startAnchorQueueWorker,
  stopAnchorQueueWorker
};
