import blockchainService from './blockchainService.js';
import { generateRecordHash } from '../utils/hashHelper.js';

/**
 * Unified Record Verification Status Function.
 *
 * Requirements:
 * - Must NEVER return 'TAMPERED' for a missing transaction (returns 'NOT_ANCHORED').
 * - Must NEVER return 'TAMPERED' for an unreachable node or undeployed contract (returns 'UNVERIFIABLE').
 * - Returns 'CHAIN_MISMATCH' if the record was anchored to an older contract before a chain reset.
 * - Returns 'TAMPERED' ONLY when an on-chain anchor exists and differs from calculated data,
 *   or when stored DB fingerprint differs from calculated data.
 * - Returns 'VERIFIED' when on-chain anchor matches current calculated data.
 *
 * @param {Object} record - MedicalRecord document or plain object
 * @returns {Promise<Object>} Verification status object
 */
export const verifyRecordStatus = async (record) => {
  if (!record) {
    return { status: 'UNVERIFIABLE', isVerified: false, error: 'No record provided' };
  }

  // 1. Calculate cryptographic hash from current database fields
  const currentData = {
    patient: record.patient?._id ? record.patient._id.toString() : (record.patient?.toString() || ''),
    doctor: record.doctor?._id ? record.doctor._id.toString() : (record.doctor?.toString() || ''),
    visitDate: record.visitDate,
    symptoms: record.symptoms || '',
    diagnosis: record.diagnosis || '',
    treatment: record.treatment || '',
    prescription: record.prescription || ''
  };

  const calculatedHash = generateRecordHash(currentData);
  const storedFingerprint = record.currentHash || null;

  // 2. Check internal DB tampering: if stored fingerprint exists and doesn't match current data
  if (storedFingerprint && storedFingerprint !== calculatedHash) {
    return {
      status: 'TAMPERED',
      isVerified: false,
      calculatedHash,
      storedHash: storedFingerprint,
      blockchainHash: null,
      blockchainTxHash: record.blockchainTxHash || null,
      reason: 'DATABASE_DATA_MODIFIED'
    };
  }

  // 3. Check for missing blockchain transaction
  // A record without a transaction receipt was never anchored; this is NOT tampering.
  if (!record.blockchainTxHash) {
    return {
      status: 'NOT_ANCHORED',
      isVerified: false,
      calculatedHash,
      storedHash: storedFingerprint,
      blockchainHash: null,
      blockchainTxHash: null,
      reason: 'TRANSACTION_RECEIPT_MISSING'
    };
  }

  // 4. Inspect blockchain node and contract
  const currentContract = blockchainService.getContractAddress();

  let onChainData = null;
  try {
    onChainData = await blockchainService.getRecordHistory(record._id);
  } catch (err) {
    const errMsg = err?.message || '';

    // Handle Unreachable Node: must return UNVERIFIABLE, NEVER TAMPERED
    if (
      errMsg === 'BLOCKCHAIN_UNREACHABLE' ||
      err?.code === 'NETWORK_ERROR' ||
      errMsg.includes('ECONNREFUSED') ||
      errMsg.includes('could not detect network') ||
      errMsg.includes('timeout')
    ) {
      return {
        status: 'UNVERIFIABLE',
        isVerified: false,
        calculatedHash,
        storedHash: storedFingerprint,
        blockchainHash: null,
        blockchainTxHash: record.blockchainTxHash,
        error: 'BLOCKCHAIN_UNREACHABLE'
      };
    }

    // Handle Undeployed Contract: must return UNVERIFIABLE, NEVER TAMPERED
    if (errMsg === 'CONTRACT_NOT_DEPLOYED' || errMsg.includes('no code at address')) {
      return {
        status: 'UNVERIFIABLE',
        isVerified: false,
        calculatedHash,
        storedHash: storedFingerprint,
        blockchainHash: null,
        blockchainTxHash: record.blockchainTxHash,
        error: 'CONTRACT_NOT_DEPLOYED'
      };
    }

    // Handle Missing On-chain Record:
    // If the contract address changed since anchoring, flag CHAIN_MISMATCH.
    // Otherwise flag NOT_ANCHORED. In neither case is this TAMPERED.
    if (errMsg === 'NOT_ANCHORED' || errMsg.includes('Record not found on blockchain') || errMsg.includes('revert')) {
      if (
        record.contractAddress &&
        currentContract &&
        record.contractAddress.toLowerCase() !== currentContract.toLowerCase()
      ) {
        return {
          status: 'CHAIN_MISMATCH',
          isVerified: false,
          calculatedHash,
          storedHash: storedFingerprint,
          blockchainHash: null,
          blockchainTxHash: record.blockchainTxHash,
          contractAddress: record.contractAddress,
          currentContract
        };
      }

      return {
        status: 'NOT_ANCHORED',
        isVerified: false,
        calculatedHash,
        storedHash: storedFingerprint,
        blockchainHash: null,
        blockchainTxHash: record.blockchainTxHash,
        reason: 'NOT_FOUND_ON_CURRENT_CHAIN'
      };
    }

    // Any other error contacting blockchain node
    return {
      status: 'UNVERIFIABLE',
      isVerified: false,
      calculatedHash,
      storedHash: storedFingerprint,
      blockchainHash: null,
      blockchainTxHash: record.blockchainTxHash,
      error: errMsg
    };
  }

  // 5. On-chain record found: compare on-chain hash with calculated hash
  const onChainHash = onChainData ? onChainData.hash : null;

  if (onChainHash && onChainHash.toLowerCase() === calculatedHash.toLowerCase()) {
    return {
      status: 'VERIFIED',
      isVerified: true,
      calculatedHash,
      storedHash: storedFingerprint,
      blockchainHash: onChainHash,
      blockchainTxHash: record.blockchainTxHash,
      contractAddress: currentContract,
      timestamp: onChainData.timestamp,
      anchoredBy: onChainData.anchoredBy
    };
  }

  // On-chain anchor exists but hash does not match calculated data: genuine tampering detected!
  return {
    status: 'TAMPERED',
    isVerified: false,
    calculatedHash,
    storedHash: storedFingerprint,
    blockchainHash: onChainHash,
    blockchainTxHash: record.blockchainTxHash,
    contractAddress: currentContract,
    reason: 'ON_CHAIN_HASH_MISMATCH'
  };
};

export default verifyRecordStatus;
