import SystemConfig from '../models/SystemConfig.js';
import MedicalRecord from '../models/MedicalRecord.js';
import blockchainService from './blockchainService.js';

let isChainResetDetected = false;
let chainResetDetails = null;

/**
 * On server startup, compares the stored contract address with the current one.
 * If they differ, logs "Chain was reset" and flags the reset state.
 */
export const checkChainResetOnStartup = async () => {
  try {
    const currentContract = blockchainService.getContractAddress();
    if (!currentContract || currentContract === 'your_deployed_contract_address_here') {
      return { isReset: false };
    }

    // 1. Check stored contract address in SystemConfig
    const storedConfig = await SystemConfig.findOne({ key: 'contractAddress' });

    // 2. Check contract address stored on existing MedicalRecord documents
    let storedAddress = storedConfig?.value || null;
    if (!storedAddress) {
      const existingRecord = await MedicalRecord.findOne({ 
        contractAddress: { $exists: true, $ne: null } 
      }).sort({ updatedAt: -1 });

      if (existingRecord?.contractAddress) {
        storedAddress = existingRecord.contractAddress;
      }
    }

    // If a previous contract exists and does not match the active one
    if (storedAddress && currentContract && storedAddress.toLowerCase() !== currentContract.toLowerCase()) {
      console.log("Chain was reset");
      isChainResetDetected = true;
      chainResetDetails = {
        storedAddress,
        currentAddress: currentContract,
        detectedAt: new Date()
      };
      return { isReset: true, storedAddress, currentAddress: currentContract };
    }

    // First startup or addresses match: ensure SystemConfig is populated
    if (!storedConfig && currentContract) {
      await SystemConfig.create({ key: 'contractAddress', value: currentContract });
    }

    isChainResetDetected = false;
    chainResetDetails = null;
    return { isReset: false, currentAddress: currentContract };
  } catch (err) {
    console.warn('[CHAIN RESET CHECK] Could not check chain reset status:', err.message);
    return { isReset: false };
  }
};

/**
 * Returns current chain reset status for the admin health endpoint.
 */
export const getChainResetStatus = async () => {
  const currentContract = blockchainService.getContractAddress();

  if (isChainResetDetected) {
    return {
      isReset: true,
      storedAddress: chainResetDetails?.storedAddress || null,
      currentAddress: currentContract,
      warning: 'Chain was reset. Stored contract address differs from the active contract address.'
    };
  }

  try {
    const storedConfig = await SystemConfig.findOne({ key: 'contractAddress' });
    if (storedConfig?.value && currentContract && storedConfig.value.toLowerCase() !== currentContract.toLowerCase()) {
      isChainResetDetected = true;
      return {
        isReset: true,
        storedAddress: storedConfig.value,
        currentAddress: currentContract,
        warning: 'Chain was reset. Stored contract address differs from the active contract address.'
      };
    }

    // Check if any records are marked CHAIN_MISMATCH or have an older contract address
    const mismatchedRecord = await MedicalRecord.findOne({
      $or: [
        { verificationStatus: 'CHAIN_MISMATCH' },
        { 
          contractAddress: { $exists: true, $ne: null, $nin: [currentContract, currentContract.toLowerCase()] } 
        }
      ]
    });

    if (mismatchedRecord) {
      return {
        isReset: true,
        storedAddress: mismatchedRecord.contractAddress || null,
        currentAddress: currentContract,
        warning: 'Chain was reset. Records need to be re-anchored to the active contract.'
      };
    }
  } catch (e) {
    // ignore
  }

  return {
    isReset: false,
    currentAddress: currentContract,
    warning: null
  };
};

/**
 * Clears chain reset flag and updates stored contract address in SystemConfig.
 */
export const clearChainReset = async (newContractAddress) => {
  isChainResetDetected = false;
  chainResetDetails = null;
  const addressToSave = newContractAddress || blockchainService.getContractAddress();
  if (addressToSave) {
    await SystemConfig.updateOne(
      { key: 'contractAddress' },
      { value: addressToSave, updatedAt: new Date() },
      { upsert: true }
    );
  }
};
