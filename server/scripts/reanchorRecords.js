import mongoose from 'mongoose';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

import MedicalRecord from '../models/MedicalRecord.js';
import blockchainService from '../services/blockchainService.js';
import { generateRecordHash } from '../utils/hashHelper.js';
import { logAudit } from '../utils/auditHelper.js';
import { notifyAdmins } from '../utils/notifyHelper.js';
import { clearChainReset } from '../services/chainResetService.js';

// Load base environment
const baseEnvCandidates = [
  path.resolve(process.cwd(), '.env'),
  path.resolve(process.cwd(), 'server/.env'),
  path.resolve(process.cwd(), '../server/.env')
];
for (const p of baseEnvCandidates) {
  if (fs.existsSync(p)) {
    const envConfig = dotenv.parse(fs.readFileSync(p));
    for (const k in envConfig) {
      if (!process.env[k]) {
        process.env[k] = envConfig[k];
      }
    }
  }
}

// Load blockchain env if available
const candidates = [
  path.resolve(process.cwd(), '.env.blockchain'),
  path.resolve(process.cwd(), 'server/.env.blockchain'),
  path.resolve(process.cwd(), '../server/.env.blockchain')
];
for (const p of candidates) {
  if (fs.existsSync(p)) {
    const envConfig = dotenv.parse(fs.readFileSync(p));
    for (const k in envConfig) {
      process.env[k] = envConfig[k];
    }
  }
}

/**
 * Re-anchors medical records to the active smart contract after a chain reset.
 *
 * Rules:
 * 1. Refuses to run if NODE_ENV === 'production'.
 * 2. Processes records with status NOT_ANCHORED or CHAIN_MISMATCH.
 * 3. Recomputes the hash from stored data and compares it with stored fingerprint (currentHash).
 * 4. If equal: sends stored fingerprint to the contract, saves txHash, anchoredAt, contractAddress,
 *    and writes a RECORD_ANCHORED audit log entry.
 * 5. If different: does NOT anchor; marks record TAMPERED, writes RECORD_TAMPERING_DETECTED,
 *    and calls notifyAdmins once per record.
 * 6. Processes in batches, logs progress, and skips anything already VERIFIED on active contract.
 *
 * @param {Object} [options]
 * @param {string} [options.calledBy] - 'CLI' or 'ADMIN'
 * @param {number} [options.batchSize=10]
 * @returns {Promise<Object>} Summary stats
 */
export const reanchorRecords = async ({ calledBy = 'CLI', batchSize = 10 } = {}) => {
  // 1. Refuse to run in production
  if (process.env.NODE_ENV === 'production') {
    const errorMsg = 'CRITICAL: Refusing to run reanchorRecords in production environment.';
    console.error(errorMsg);
    throw new Error(errorMsg);
  }

  // 2. Ensure Database connection
  if (mongoose.connection.readyState !== 1) {
    const mongoUri = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/secure-medical-records';
    await mongoose.connect(mongoUri);
    console.log('[Re-anchor] Connected to MongoDB.');
  }

  // 3. Ensure contract address is refreshed
  const currentContract = blockchainService.reloadContract();
  if (!currentContract || currentContract === 'your_deployed_contract_address_here') {
    throw new Error('No valid contract address found in .env.blockchain. Deploy contract first.');
  }

  // Verify contract is deployed on chain
  try {
    const code = await blockchainService.provider.getCode(currentContract);
    if (code === '0x') {
      throw new Error(`No contract deployed at address ${currentContract}. Start the node and run deploy.js first.`);
    }
  } catch (err) {
    throw new Error(`Failed to verify contract code at ${currentContract}: ${err.message}`);
  }

  console.log(`[Re-anchor] Starting re-anchoring process. Active contract: ${currentContract}`);

  // 4. Fetch all records to inspect
  const records = await MedicalRecord.find({}).sort({ createdAt: 1 });
  const totalRecords = records.length;

  console.log(`[Re-anchor] Found ${totalRecords} total medical record(s) in database.`);

  let reanchoredCount = 0;
  let skippedCount = 0;
  let tamperedCount = 0;
  let errorCount = 0;

  // 5. Process in batches
  for (let i = 0; i < totalRecords; i += batchSize) {
    const batch = records.slice(i, i + batchSize);
    const batchNum = Math.floor(i / batchSize) + 1;
    const totalBatches = Math.ceil(totalRecords / batchSize);

    console.log(`[Re-anchor] Processing batch ${batchNum}/${totalBatches} (${batch.length} records)...`);

    for (const rec of batch) {
      try {
        // Recompute hash from the stored DB data fields
        const currentData = {
          patient: rec.patient?._id ? rec.patient._id.toString() : (rec.patient?.toString() || ''),
          doctor: rec.doctor?._id ? rec.doctor._id.toString() : (rec.doctor?.toString() || ''),
          visitDate: rec.visitDate,
          symptoms: rec.symptoms || '',
          diagnosis: rec.diagnosis || '',
          treatment: rec.treatment || '',
          prescription: rec.prescription || ''
        };

        const calculatedHash = generateRecordHash(currentData);
        const storedFingerprint = rec.currentHash;

        // Check if already anchored and verified on current contract
        let isAlreadyVerified = false;
        try {
          isAlreadyVerified = await blockchainService.verifyHash(rec._id, calculatedHash);
        } catch (e) {
          isAlreadyVerified = false;
        }

        const isSameContract = rec.contractAddress && rec.contractAddress.toLowerCase() === currentContract.toLowerCase();

        // Skip anything already VERIFIED on the active contract
        if (isAlreadyVerified && isSameContract) {
          rec.verificationStatus = 'VERIFIED';
          await rec.save();
          skippedCount++;
          console.log(`  [SKIP] Record #${rec._id.toString().slice(-6)} already verified on active contract.`);
          continue;
        }

        // Compare recomputed hash with stored fingerprint
        if (calculatedHash === storedFingerprint) {
          // Data is intact: anchor stored fingerprint to current contract
          const receipt = await blockchainService.storeHash(rec._id, storedFingerprint);

          rec.blockchainTxHash = receipt.txHash;
          rec.contractAddress = currentContract;
          rec.anchoredAt = new Date();
          rec.verificationStatus = 'VERIFIED';
          await rec.save();

          // Write RECORD_ANCHORED audit log entry
          await logAudit(null, {
            actor: null,
            role: 'SYSTEM',
            action: 'RECORD_ANCHORED',
            resourceType: 'MedicalRecord',
            resourceId: rec._id,
            resourceLabel: `Medical record #${rec._id.toString().slice(-6)}`,
            relatedPatient: rec.patient,
            details: `Re-anchored to active contract ${currentContract} (tx: ${receipt.txHash}) by ${calledBy}`
          });

          reanchoredCount++;
          console.log(`  [ANCHORED] Record #${rec._id.toString().slice(-6)} -> tx: ${receipt.txHash.slice(0, 14)}...`);
          await new Promise(r => setTimeout(r, 100));
        } else {
          // Hashes do NOT match: data tampering detected! Do NOT anchor.
          rec.verificationStatus = 'TAMPERED';
          await rec.save();

          // Write RECORD_TAMPERING_DETECTED audit log entry
          await logAudit(null, {
            actor: null,
            role: 'SYSTEM',
            action: 'RECORD_TAMPERING_DETECTED',
            resourceType: 'MedicalRecord',
            resourceId: rec._id,
            resourceLabel: `Medical record #${rec._id.toString().slice(-6)}`,
            relatedPatient: rec.patient,
            details: `Tampering detected during re-anchor: stored fingerprint ${storedFingerprint} differs from calculated data hash ${calculatedHash}`
          });

          // Dispatch notification to admins once per tampered record
          await notifyAdmins({
            type: 'SECURITY_ALERT',
            title: 'Record Tampering Detected',
            message: `Integrity check failed during re-anchor for record #${rec._id.toString().slice(-6)}. Database content differs from cryptographic fingerprint.`,
            link: `/record/${rec._id}`,
            relatedId: rec._id
          });

          tamperedCount++;
          console.warn(`  [TAMPERED] Record #${rec._id.toString().slice(-6)} data mismatch! Skipped anchoring and notified admins.`);
        }
      } catch (recErr) {
        errorCount++;
        console.error(`  [ERROR] Failed to process record #${rec._id}:`, recErr.message);
      }
    }
  }

  // 6. Clear chain reset state and update SystemConfig
  await clearChainReset(currentContract);

  const summary = {
    totalRecords,
    reanchored: reanchoredCount,
    tampered: tamperedCount,
    skipped: skippedCount,
    errors: errorCount,
    contractAddress: currentContract
  };

  console.log(`[Re-anchor] Finished: ${reanchoredCount} re-anchored, ${tamperedCount} tampered, ${skippedCount} skipped, ${errorCount} errors.`);
  return summary;
};

// Check if this script was executed directly from CLI
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
  reanchorRecords({ calledBy: 'CLI' })
    .then((summary) => {
      console.log('[Re-anchor] Script execution complete:', summary);
      process.exit(0);
    })
    .catch((err) => {
      console.error('[Re-anchor] Execution failed:', err);
      process.exit(1);
    });
}

export default reanchorRecords;
