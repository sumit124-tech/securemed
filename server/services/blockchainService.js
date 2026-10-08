import { ethers } from 'ethers';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

// Load base env vars
dotenv.config();

// Hardhat default local RPC URL
const RPC_URL = process.env.BLOCKCHAIN_RPC_URL || 'http://127.0.0.1:8545';

// We use Hardhat Test Account #0 as the "System Wallet" to handle transactions securely on behalf of doctors
let PRIVATE_KEY = process.env.SYSTEM_WALLET_PRIVATE_KEY;
if (!PRIVATE_KEY || PRIVATE_KEY === 'your_hardhat_test_account_private_key_here') {
  PRIVATE_KEY = '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80';
}

// The address from our deployment script
let CONTRACT_ADDRESS = process.env.SMART_CONTRACT_ADDRESS;
if (!CONTRACT_ADDRESS || CONTRACT_ADDRESS === 'your_deployed_contract_address_here') {
  try {
    const envBlockchain = fs.readFileSync(path.resolve(process.cwd(), '.env.blockchain'), 'utf8');
    const match = envBlockchain.match(/SMART_CONTRACT_ADDRESS=(0x[a-fA-F0-9]{40})/);
    if (match) CONTRACT_ADDRESS = match[1];
  } catch (e) {
    console.warn("Could not read .env.blockchain");
  }
}

// ABI for RecordIntegrity
const contractABI = [
  "function addRecordHash(string memory _recordId, string memory _hash) public",
  "function getLatestHash(string memory _recordId) public view returns (string memory, uint256, address)",
  "function verifyRecord(string memory _recordId, string memory _providedHash) public view returns (bool)"
];

class BlockchainService {
  constructor() {
    this.provider = new ethers.JsonRpcProvider(RPC_URL);
    this.wallet = new ethers.Wallet(PRIVATE_KEY, this.provider);
    this.contract = new ethers.Contract(CONTRACT_ADDRESS, contractABI, this.wallet);
  }

  async storeHash(recordId, hash) {
    try {
      const tx = await this.contract.addRecordHash(recordId.toString(), hash);
      const receipt = await tx.wait(); 
      
      return {
        txHash: receipt.hash,
        blockNumber: receipt.blockNumber,
        contractAddress: CONTRACT_ADDRESS,
        network: 'Local Hardhat'
      };
    } catch (error) {
      console.error('Blockchain store error:', error);
      throw new Error('Failed to anchor record to blockchain');
    }
  }

  async verifyHash(recordId, currentHash) {
    try {
      const code = await this.provider.getCode(CONTRACT_ADDRESS);
      if (code === '0x') throw new Error('CONTRACT_NOT_DEPLOYED');
      
      const isVerified = await this.contract.verifyRecord(recordId.toString(), currentHash);
      return isVerified;
    } catch (error) {
      if (error.message === 'CONTRACT_NOT_DEPLOYED') throw error;
      if (error.code === 'NETWORK_ERROR' || (error.message && (error.message.includes('ECONNREFUSED') || error.message.includes('could not detect network')))) throw new Error('BLOCKCHAIN_UNREACHABLE');
      if (error.message && (error.message.includes('revert') || error.message.includes('execution reverted'))) throw new Error('NOT_ANCHORED');
      console.error('Blockchain verify error:', error);
      return false;
    }
  }
  
  async getRecordHistory(recordId) {
    try {
        const code = await this.provider.getCode(CONTRACT_ADDRESS);
        if (code === '0x') throw new Error('CONTRACT_NOT_DEPLOYED');
        
        const result = await this.contract.getLatestHash(recordId.toString());
        if (!result || !result[0]) throw new Error('NOT_ANCHORED');
        
        return {
            hash: result[0],
            timestamp: result[1].toString(),
            anchoredBy: result[2]
        };
    } catch (error) {
        if (error.message === 'CONTRACT_NOT_DEPLOYED' || error.message === 'NOT_ANCHORED') throw error;
        if (error.code === 'NETWORK_ERROR' || (error.message && (error.message.includes('ECONNREFUSED') || error.message.includes('could not detect network')))) throw new Error('BLOCKCHAIN_UNREACHABLE');
        if (error.message && (error.message.includes('revert') || error.message.includes('execution reverted'))) throw new Error('NOT_ANCHORED');
        return null;
    }
  }
  
  getContractAddress() {
    return CONTRACT_ADDRESS;
  }
}

export default new BlockchainService();
