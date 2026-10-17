require("@nomicfoundation/hardhat-toolbox");
const path = require("path");
require("dotenv").config({ path: path.resolve(__dirname, ".env") });

const sepoliaRpcUrl = process.env.SEPOLIA_RPC_URL || process.env.SEPOLIA_RPC_UR;
const deployerKey = process.env.DEPLOYER_PRIVATE_KEY;

const networks = {
  localhost: {
    url: "http://127.0.0.1:8545"
  },
  hardhat: {
    chainId: 31337
  }
};

// Only configure Sepolia if both valid RPC URL and valid 32-byte private key exist
const cleanKey = deployerKey ? deployerKey.trim().replace(/^0x/, '') : '';
const isValidKey = /^[0-9a-fA-F]{64}$/.test(cleanKey);

if (sepoliaRpcUrl && isValidKey) {
  networks.sepolia = {
    url: sepoliaRpcUrl.trim(),
    accounts: [`0x${cleanKey}`],
    chainId: 11155111
  };
}

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: "0.8.19",
  networks
};
