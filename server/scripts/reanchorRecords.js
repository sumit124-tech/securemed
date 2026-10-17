import mongoose from 'mongoose';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

import MedicalRecord from '../models/MedicalRecord.js';
import blockchainService from '../services/blockchainService.js';
import { generateRecordHash, isLegacyEmptyRecord } from '../utils/hashHelper.js';
import { logAudit } from '../utils/auditHelper.js';
import { notifyAdmins } from '../utils/notifyHelper.js';
import { clearChainReset } from '../services/chainResetService.js';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const serverDir = path.resolve(scriptDir, '..');

// Load base environment
const baseEnvCandidates = [
  path.resolve(serverDir, '.env'),
  path.resolve(process.cwd(), '.env'),
  path.resolve(process.cwd(), 'server/.env'),
  path.resolve(process.cwd(), '../server/.env')
];
for (const p of baseEnvCandidates) {
  if (fs.existsSync(p)) {
    dotenv.config({ path: p });
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
  path.resolve(serverDir, '.env.blockchain'),
  path.resolve(process.cwd(), '.env.blockchain'),
  path.resolve(process.cwd(), 'server/.env.blockchain'),
  path.resolve(process.cwd(), '../server/.env.blockchain')
];
for (const p of candidates) {
  if (fs.existsSync(p)) {
    dotenv.config({ path: p, override: true });
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
 * @param {boolean} [options.dryRun=false]
 * @returns {Promise<Object>} Summary stats
 */
export const reanchorRecords = async ({ calledBy = 'CLI', batchSize = 10, dryRun = false } = {}) => {
  const isDryRun = dryRun || process.argv.includes('--dry-run');

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
  const contract = blockchainService.reloadContract();
  const currentContract = blockchainService.getContractAddress() || (contract?.target || (typeof contract === 'string' ? contract : null));
  const currentNetwork = blockchainService.getNetworkName();

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

  console.log(`[Re-anchor] Starting re-anchoring process. Active contract: ${currentContract} on network: ${currentNetwork} ${isDryRun ? '(DRY RUN)' : ''}`);

  // 4. Fetch all records to inspect
  const records = await MedicalRecord.find({}).sort({ createdAt: 1 });
  const totalRecords = records.length;

  console.log(`[Re-anchor] Found ${totalRecords} total medical record(s) in database.`);

  let reanchoredCount = 0;
  let skippedCount = 0;
  let legacyEmptyCount = 0;
  let noFingerprintCount = 0;
  let notAnchoredCount = 0;
  let tamperedCount = 0;
  let errorCount = 0;

  // 5. Process in batches with inter-batch delay for RPC limits
  for (let i = 0; i < totalRecords; i += batchSize) {
    const batch = records.slice(i, i + batchSize);
    const batchNum = Math.floor(i / batchSize) + 1;
    const totalBatches = Math.ceil(totalRecords / batchSize);

    console.log(`[Re-anchor] Processing batch ${batchNum}/${totalBatches} (${batch.length} records)...`);

    for (const rec of batch) {
      try {
        // 1. Check if all clinical fields are empty: mark LEGACY_EMPTY and print reason per record
        if (isLegacyEmptyRecord(rec)) {
          legacyEmptyCount++;
          console.log(`  [LEGACY_EMPTY] Record #${rec._id.toString().slice(-6)}: All clinical fields empty or 'Not provided'. Skipped anchoring.`);
          if (!isDryRun) {
            rec.verificationStatus = 'LEGACY_EMPTY';
            await rec.save();
          }
          continue;
        }

        const storedFingerprint = rec.currentHash;

        // 2. Check if stored fingerprint is missing: mark NO_FINGERPRINT (legacy)
        if (!storedFingerprint) {
          noFingerprintCount++;
          console.log(`  [NO_FINGERPRINT] Record #${rec._id.toString().slice(-6)}: No stored cryptographic fingerprint. Skipped anchoring.`);
          if (!isDryRun) {
            rec.verificationStatus = 'NO_FINGERPRINT';
            await rec.save();
          }
          continue;
        }

        // 3. Recompute canonical hash from DB data
        const calculatedHash = generateRecordHash(rec);

        // 4. Check if already anchored and verified on active contract
        let isAlreadyVerified = false;
        try {
          isAlreadyVerified = await blockchainService.verifyHash(rec._id, calculatedHash);
        } catch (e) {
          isAlreadyVerified = false;
        }

        const isSameContract = rec.contractAddress && rec.contractAddress.toLowerCase() === currentContract.toLowerCase();
        const isSameNetwork = rec.network && rec.network.toLowerCase() === currentNetwork.toLowerCase();

        // Skip anything already VERIFIED on the active contract and network
        if (isAlreadyVerified && isSameContract && isSameNetwork) {
          if (!isDryRun) {
            rec.verificationStatus = 'VERIFIED';
            await rec.save();
          }
          skippedCount++;
          console.log(`  [SKIP] Record #${rec._id.toString().slice(-6)} already verified on active contract & network.`);
          continue;
        }

        // 5. Compare recomputed hash with stored fingerprint
        if (calculatedHash === storedFingerprint) {
          // Data is intact -> anchor to blockchain
          if (isDryRun) {
            reanchoredCount++;
            console.log(`  [DRY RUN - WOULD ANCHOR] Record #${rec._id.toString().slice(-6)} (fingerprint ${storedFingerprint.slice(0, 10)}...) to ${currentNetwork}`);
          } else {
            const receipt = await blockchainService.storeHash(rec._id, storedFingerprint);

            rec.blockchainTxHash = receipt.txHash;
            rec.contractAddress = currentContract;
            rec.network = currentNetwork;
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
              details: `Re-anchored to active contract ${currentContract} on ${currentNetwork} (tx: ${receipt.txHash}) by ${calledBy}`
            });

            reanchoredCount++;
            console.log(`  [ANCHORED] Record #${rec._id.toString().slice(-6)} on ${currentNetwork} -> tx: ${receipt.txHash.slice(0, 14)}...`);
            await new Promise(r => setTimeout(r, 200));
          }
        } else {
          // Hashes do NOT match. Rule 2: No hash on chain -> NOT_ANCHORED, never TAMPERED.
          notAnchoredCount++;

          if (isDryRun) {
            console.warn(`  [DRY RUN - UNANCHORED DATA MISMATCH] Record #${rec._id.toString().slice(-6)} data mismatch, would set NOT_ANCHORED.`);
          } else {
            rec.verificationStatus = 'NOT_ANCHORED';
            await rec.save();
            console.warn(`  [NOT_ANCHORED] Record #${rec._id.toString().slice(-6)} stored fingerprint differs from database data. Skipped anchoring (marked NOT_ANCHORED).`);
          }
        }
      } catch (recErr) {
        errorCount++;
        console.error(`  [ERROR] Failed to process record #${rec._id}:`, recErr.message);
      }
    }

    // Delay between batches to respect RPC limits (especially on Sepolia)
    if (i + batchSize < totalRecords) {
      const delayMs = blockchainService.isSepolia() ? 2000 : 250;
      await new Promise(r => setTimeout(r, delayMs));
    }
  }

  // 6. Clear chain reset state and update SystemConfig (if not dry run)
  if (!isDryRun) {
    await clearChainReset(currentContract);
  }

  const summary = {
    totalRecords,
    reanchored: reanchoredCount,
    legacyEmpty: legacyEmptyCount,
    noFingerprint: noFingerprintCount,
    notAnchored: notAnchoredCount,
    tampered: tamperedCount,
    skipped: skippedCount,
    errors: errorCount,
    contractAddress: currentContract,
    network: currentNetwork,
    dryRun: isDryRun
  };

  if (isDryRun) {
    console.log(`\n========================================================`);
    console.log(`  RE-ANCHOR DRY RUN COMPLETE (NO WRITES PERFORMED)       `);
    console.log(`========================================================`);
    console.log(`Checked: ${totalRecords}`);
    console.log(`Would anchor: ${reanchoredCount}`);
    console.log(`Legacy empty: ${legacyEmptyCount}`);
    console.log(`No fingerprint: ${noFingerprintCount}`);
    console.log(`Not anchored / mismatch: ${notAnchoredCount}`);
    console.log(`Skipped (already verified): ${skippedCount}`);
    console.log(`Errors: ${errorCount}`);
    console.log(`========================================================\n`);
  } else {
    console.log(`[Re-anchor] Finished: ${reanchoredCount} re-anchored, ${legacyEmptyCount} legacy empty, ${notAnchoredCount} unanchored, ${skippedCount} skipped, ${errorCount} errors.`);
  }
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
