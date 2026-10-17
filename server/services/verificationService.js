import blockchainService from './blockchainService.js';
import { generateRecordHash, isLegacyEmptyRecord } from '../utils/hashHelper.js';

/**
 * Unified Record Verification Status Function.
 *
 * Requirements:
 * - TAMPERED ONLY if the chain returns a hash for this version AND it differs
 *   from the correctly recomputed hash.
 * - No hash on the chain, or no stored fingerprint -> NOT_ANCHORED or NO_FINGERPRINT (legacy),
 *   never TAMPERED.
 * - Decrypt or parse errors -> UNVERIFIABLE.
 * - Records with all clinical fields empty -> LEGACY_EMPTY.
 * - Must NEVER return 'TAMPERED' for an unreachable node or undeployed contract (returns 'UNVERIFIABLE').
 * - Returns 'CHAIN_MISMATCH' if the record was anchored to an older contract before a chain reset.
 * - Returns 'VERIFIED' when on-chain anchor matches current calculated data.
 *
 * @param {Object} record - MedicalRecord document or plain object
 * @returns {Promise<Object>} Verification status object
 */
export const verifyRecordStatus = async (record) => {
  if (!record) {
    return { status: 'UNVERIFIABLE', isVerified: false, error: 'No record provided' };
  }

  // 1. Check for decrypt or parse errors
  try {
    if (typeof record !== 'object') {
      return { status: 'UNVERIFIABLE', isVerified: false, error: 'Invalid record data format' };
    }
  } catch (parseErr) {
    return { status: 'UNVERIFIABLE', isVerified: false, error: 'DECRYPT_OR_PARSE_ERROR' };
  }

  // 2. Check if all clinical fields are empty: LEGACY_EMPTY, never TAMPERED
  if (isLegacyEmptyRecord(record)) {
    return {
      status: 'LEGACY_EMPTY',
      isVerified: false,
      calculatedHash: null,
      storedHash: record.currentHash || null,
      blockchainHash: null,
      blockchainTxHash: record.blockchainTxHash || null,
      reason: 'CLINICAL_FIELDS_EMPTY'
    };
  }

  // 3. Compute canonical cryptographic hash
  const calculatedHash = generateRecordHash(record);
  const storedFingerprint = record.currentHash || null;

  // 4. Check for missing stored fingerprint: NO_FINGERPRINT (legacy), never TAMPERED
  if (!storedFingerprint) {
    return {
      status: 'NO_FINGERPRINT',
      isVerified: false,
      calculatedHash,
      storedHash: null,
      blockchainHash: null,
      blockchainTxHash: record.blockchainTxHash || null,
      reason: 'NO_STORED_FINGERPRINT'
    };
  }

  // 5. Check if record is waiting in the retry queue
  if (record.verificationStatus === 'PENDING_ANCHOR') {
    return {
      status: 'PENDING_ANCHOR',
      isVerified: false,
      calculatedHash,
      storedHash: storedFingerprint,
      blockchainHash: null,
      blockchainTxHash: null,
      reason: 'WAITING_FOR_BLOCKCHAIN_ANCHOR'
    };
  }

  // Check if record permanently failed after 5 attempts
  if (record.verificationStatus === 'ANCHOR_FAILED') {
    return {
      status: 'ANCHOR_FAILED',
      isVerified: false,
      calculatedHash,
      storedHash: storedFingerprint,
      blockchainHash: null,
      blockchainTxHash: null,
      reason: 'MAX_ANCHOR_RETRIES_EXCEEDED',
      error: record.anchorError || null
    };
  }

  // 6. Check for missing blockchain transaction receipt: NOT_ANCHORED, never TAMPERED
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

  // 7. Inspect blockchain node and contract
  const currentContract = blockchainService.getContractAddress();
  const currentNetwork = blockchainService.getNetworkName();

  // Check network mismatch (e.g. anchored on hardhat but currently running on sepolia)
  if (
    record.network &&
    currentNetwork &&
    record.network.toLowerCase() !== currentNetwork.toLowerCase()
  ) {
    return {
      status: 'CHAIN_MISMATCH',
      isVerified: false,
      calculatedHash,
      storedHash: storedFingerprint,
      blockchainHash: null,
      blockchainTxHash: record.blockchainTxHash,
      contractAddress: record.contractAddress,
      network: record.network,
      currentNetwork,
      reason: `Anchored on ${record.network}, re-anchor to fix`
    };
  }

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

  // 8. Inspect on-chain hash
  const onChainHash = onChainData ? onChainData.hash : null;

  if (!onChainHash) {
    return {
      status: 'NOT_ANCHORED',
      isVerified: false,
      calculatedHash,
      storedHash: storedFingerprint,
      blockchainHash: null,
      blockchainTxHash: record.blockchainTxHash,
      reason: 'ON_CHAIN_HASH_EMPTY'
    };
  }

  // 9. On-chain hash matches correctly recomputed hash: VERIFIED
  if (onChainHash.toLowerCase() === calculatedHash.toLowerCase()) {
    return {
      status: 'VERIFIED',
      isVerified: true,
      calculatedHash,
      storedHash: storedFingerprint,
      blockchainHash: onChainHash,
      blockchainTxHash: record.blockchainTxHash,
      contractAddress: currentContract,
      network: record.network || currentNetwork,
      currentNetwork,
      timestamp: onChainData.timestamp,
      anchoredBy: onChainData.anchoredBy
    };
  }

  // 10. TAMPERED ONLY if the chain returns a hash for this version AND it differs from the correctly recomputed hash
  return {
    status: 'TAMPERED',
    isVerified: false,
    calculatedHash,
    storedHash: storedFingerprint,
    blockchainHash: onChainHash,
    blockchainTxHash: record.blockchainTxHash,
    contractAddress: currentContract,
    network: record.network || currentNetwork,
    currentNetwork,
    reason: 'ON_CHAIN_HASH_MISMATCH'
  };
};

export const computeIntegrityStatus = verifyRecordStatus;
export default verifyRecordStatus;
