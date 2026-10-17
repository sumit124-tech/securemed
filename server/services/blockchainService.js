import { ethers } from 'ethers';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

// Load base environment variables
dotenv.config();
const envCandidates = [
  path.resolve(process.cwd(), '.env'),
  path.resolve(process.cwd(), 'server/.env'),
  path.resolve(process.cwd(), '../server/.env')
];
for (const p of envCandidates) {
  if (fs.existsSync(p)) {
    dotenv.config({ path: p });
  }
}

// Load .env.blockchain if present
const blockchainEnvCandidates = [
  path.resolve(process.cwd(), '.env.blockchain'),
  path.resolve(process.cwd(), 'server/.env.blockchain'),
  path.resolve(process.cwd(), '../server/.env.blockchain')
];
for (const p of blockchainEnvCandidates) {
  if (fs.existsSync(p)) {
    try {
      const parsed = dotenv.parse(fs.readFileSync(p));
      for (const k in parsed) {
        process.env[k] = parsed[k];
      }
    } catch (e) {
      // ignore
    }
  }
}

// ABI for RecordIntegrity contract
const contractABI = [
  "function addRecordHash(string memory _recordId, string memory _hash) public",
  "function getLatestHash(string memory _recordId) public view returns (string memory, uint256, address)",
  "function verifyRecord(string memory _recordId, string memory _providedHash) public view returns (bool)"
];

const DEFAULT_HARDHAT_KEY = '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80';

/**
 * Safely masks an RPC URL so secrets and API keys are never leaked to logs or UI.
 * e.g. https://eth-sepolia.g.alchemy.com/v2/abc123xyz -> https://eth-sepolia.g.alchemy.com/v2/****
 */
export const maskRpcUrl = (rawUrl) => {
  if (!rawUrl) return 'Not configured';
  try {
    const parsed = new URL(rawUrl);
    if (parsed.pathname && parsed.pathname.length > 5) {
      const parts = parsed.pathname.split('/');
      if (parts.length > 2) {
        parts[parts.length - 1] = '****';
        return `${parsed.protocol}//${parsed.host}${parts.join('/')}`;
      }
    }
    return `${parsed.protocol}//${parsed.host} (masked)`;
  } catch (e) {
    return 'https://... (masked RPC)';
  }
};

class BlockchainService {
  constructor() {
    this.reloadConfig();
  }

  reloadConfig() {
    // 1. Reload .env.blockchain dynamically if present
    for (const p of blockchainEnvCandidates) {
      if (fs.existsSync(p)) {
        try {
          const parsed = dotenv.parse(fs.readFileSync(p));
          for (const k in parsed) {
            process.env[k] = parsed[k];
          }
        } catch (e) {
          // ignore
        }
      }
    }

    // 2. Determine target network
    this.networkName = (process.env.CHAIN_NETWORK || 'hardhat').toLowerCase();
    this.isSepoliaNetwork = this.networkName === 'sepolia';

    // 3. Resolve RPC URL
    if (this.isSepoliaNetwork) {
      this.rpcUrl = process.env.SEPOLIA_RPC_URL || process.env.SEPOLIA_RPC_UR || process.env.BLOCKCHAIN_RPC_URL;
      
      // Fallback check in blockchain/.env if not in server/.env
      if (!this.rpcUrl) {
        const bcEnvPath = path.resolve(process.cwd(), '../blockchain/.env');
        const bcEnvLocal = path.resolve(process.cwd(), 'blockchain/.env');
        const candidate = fs.existsSync(bcEnvPath) ? bcEnvPath : fs.existsSync(bcEnvLocal) ? bcEnvLocal : null;
        if (candidate) {
          try {
            const parsed = dotenv.parse(fs.readFileSync(candidate));
            this.rpcUrl = parsed.SEPOLIA_RPC_URL || parsed.SEPOLIA_RPC_UR;
          } catch (e) {}
        }
      }
    } else {
      this.rpcUrl = process.env.BLOCKCHAIN_RPC_URL || 'http://127.0.0.1:8545';
    }

    // 4. Resolve Private Key
    if (this.isSepoliaNetwork) {
      this.privateKey = process.env.DEPLOYER_PRIVATE_KEY || process.env.SYSTEM_WALLET_PRIVATE_KEY;

      // Fallback check in blockchain/.env if not in server/.env
      if (!this.privateKey) {
        const bcEnvPath = path.resolve(process.cwd(), '../blockchain/.env');
        const bcEnvLocal = path.resolve(process.cwd(), 'blockchain/.env');
        const candidate = fs.existsSync(bcEnvPath) ? bcEnvPath : fs.existsSync(bcEnvLocal) ? bcEnvLocal : null;
        if (candidate) {
          try {
            const parsed = dotenv.parse(fs.readFileSync(candidate));
            this.privateKey = parsed.DEPLOYER_PRIVATE_KEY;
          } catch (e) {}
        }
      }

      if (this.privateKey) {
        this.privateKey = this.privateKey.trim();
        if (!this.privateKey.startsWith('0x')) {
          this.privateKey = `0x${this.privateKey}`;
        }
      }
    } else {
      this.privateKey = process.env.SYSTEM_WALLET_PRIVATE_KEY || DEFAULT_HARDHAT_KEY;
    }

    // 5. Resolve Contract Address
    this.contractAddress = process.env.SMART_CONTRACT_ADDRESS || null;
    if (this.contractAddress === 'your_deployed_contract_address_here') {
      this.contractAddress = null;
    }

    // 6. Build Provider & Wallet
    if (this.rpcUrl) {
      try {
        this.provider = new ethers.JsonRpcProvider(this.rpcUrl);
      } catch (e) {
        this.provider = null;
      }
    } else {
      this.provider = null;
    }

    if (this.provider && this.privateKey && /^[0-9a-fA-Fx]{64,66}$/.test(this.privateKey)) {
      try {
        this.wallet = new ethers.Wallet(this.privateKey, this.provider);
      } catch (e) {
        this.wallet = null;
      }
    } else {
      this.wallet = null;
    }

    // 7. Build Contract instance
    if (this.contractAddress && this.wallet) {
      try {
        this.contract = new ethers.Contract(this.contractAddress, contractABI, this.wallet);
      } catch (e) {
        this.contract = null;
      }
    } else if (this.contractAddress && this.provider) {
      try {
        this.contract = new ethers.Contract(this.contractAddress, contractABI, this.provider);
      } catch (e) {
        this.contract = null;
      }
    } else {
      this.contract = null;
    }
  }

  /**
   * Re-reads server/.env.blockchain (dotenv override: true),
   * rebuilds provider, signer, and contract by reusing existing initializer logic,
   * and returns the contract.
   *
   * @returns {ethers.Contract|null} The initialized contract instance
   */
  reloadContract() {
    const blockchainEnvCandidates = [
      path.resolve(process.cwd(), '.env.blockchain'),
      path.resolve(process.cwd(), 'server/.env.blockchain'),
      path.resolve(process.cwd(), '../server/.env.blockchain'),
      path.resolve(path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1')), '../.env.blockchain')
    ];

    for (const p of blockchainEnvCandidates) {
      if (fs.existsSync(p)) {
        try {
          dotenv.config({ path: p, override: true });
        } catch (e) {
          // ignore
        }
      }
    }

    this.reloadConfig();
    return this.contract;
  }

  getNetworkName() {
    this.reloadConfig();
    return this.networkName;
  }

  isSepolia() {
    return this.networkName === 'sepolia';
  }

  getContractAddress() {
    this.reloadConfig();
    return this.contractAddress;
  }

  getSignerAddress() {
    return this.wallet ? this.wallet.address : null;
  }

  async getSignerBalance() {
    try {
      if (!this.provider || !this.wallet) return null;
      const balance = await this.provider.getBalance(this.wallet.address);
      return ethers.formatEther(balance);
    } catch (err) {
      return null;
    }
  }

  getMaskedRpcUrl() {
    return maskRpcUrl(this.rpcUrl);
  }

  /**
   * Broadcasts the addRecordHash transaction to the blockchain and returns the txHash immediately.
   * Does not wait for block confirmations (essential for Sepolia 10-15s confirmation times).
   *
   * @param {string} recordId
   * @param {string} hash
   * @returns {Promise<{ txHash: string, tx: ethers.ContractTransactionResponse, contractAddress: string, network: string }>}
   */
  async sendHash(recordId, hash) {
    this.reloadConfig();

    if (!this.contract || !this.wallet) {
      throw new Error('Smart contract or signer wallet is not initialized');
    }

    let lastError = null;
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        const nonce = await this.wallet.getNonce('pending');
        const tx = await this.contract.addRecordHash(recordId.toString(), hash, { nonce });

        return {
          txHash: tx.hash,
          tx,
          contractAddress: this.contractAddress,
          network: this.networkName
        };
      } catch (error) {
        lastError = error;
        const msg = error?.message || '';
        if (error.code === 'NONCE_EXPIRED' || msg.includes('Nonce too low') || msg.includes('nonce')) {
          await new Promise(r => setTimeout(r, 400));
          continue;
        }
        throw error;
      }
    }

    throw lastError || new Error('Failed to broadcast record hash transaction');
  }

  /**
   * Synchronously stores the hash and waits for confirmation.
   */
  async storeHash(recordId, hash) {
    const sendResult = await this.sendHash(recordId, hash);
    const confirmations = this.isSepolia() ? 1 : 1;
    const receipt = await sendResult.tx.wait(confirmations);

    return {
      txHash: receipt.hash,
      blockNumber: receipt.blockNumber,
      contractAddress: this.contractAddress,
      network: this.networkName
    };
  }

  async verifyHash(recordId, currentHash) {
    this.reloadConfig();
    try {
      if (!this.provider || !this.contractAddress) {
        throw new Error('BLOCKCHAIN_UNREACHABLE');
      }

      const code = await this.provider.getCode(this.contractAddress);
      if (code === '0x') throw new Error('CONTRACT_NOT_DEPLOYED');

      const isVerified = await this.contract.verifyRecord(recordId.toString(), currentHash);
      return isVerified;
    } catch (error) {
      if (error.message === 'CONTRACT_NOT_DEPLOYED') throw error;
      const msg = error?.message || '';
      if (
        error.code === 'NETWORK_ERROR' ||
        msg.includes('ECONNREFUSED') ||
        msg.includes('could not detect network') ||
        msg.includes('401') ||
        msg.includes('429')
      ) {
        throw new Error('BLOCKCHAIN_UNREACHABLE');
      }
      if (msg.includes('revert') || msg.includes('execution reverted')) {
        throw new Error('NOT_ANCHORED');
      }
      return false;
    }
  }

  async getRecordHistory(recordId) {
    this.reloadConfig();
    try {
      if (!this.provider || !this.contractAddress) {
        throw new Error('BLOCKCHAIN_UNREACHABLE');
      }

      const code = await this.provider.getCode(this.contractAddress);
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
      const msg = error?.message || '';
      if (
        error.code === 'NETWORK_ERROR' ||
        msg.includes('ECONNREFUSED') ||
        msg.includes('could not detect network') ||
        msg.includes('401') ||
        msg.includes('429')
      ) {
        throw new Error('BLOCKCHAIN_UNREACHABLE');
      }
      if (msg.includes('revert') || msg.includes('execution reverted')) {
        throw new Error('NOT_ANCHORED');
      }
      return null;
    }
  }
}

export default new BlockchainService();
