const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  const networkName = hre.network.name;
  const [deployer] = await hre.ethers.getSigners();

  if (!deployer) {
    throw new Error(`No deployer signer configured for network "${networkName}". Please verify blockchain/.env.`);
  }

  const deployerAddress = await deployer.getAddress();
  const balance = await hre.ethers.provider.getBalance(deployerAddress);
  const formattedBalance = hre.ethers.formatEther(balance);

  console.log("========================================");
  console.log(`Network:          ${networkName}`);
  console.log(`Deployer Address: ${deployerAddress}`);
  console.log(`Deployer Balance: ${formattedBalance} ETH`);
  console.log("========================================");

  // Refuse to deploy if balance is zero
  if (balance === 0n) {
    console.error(`\n[DEPLOYMENT FAILED] Deployer account ${deployerAddress} has 0 ETH.`);
    console.error("Please fund this address with ETH before deploying.");
    process.exit(1);
  }

  console.log("Deploying RecordIntegrity contract...");

  const RecordIntegrity = await hre.ethers.getContractFactory("RecordIntegrity");
  const contract = await RecordIntegrity.deploy();

  await contract.waitForDeployment();
  const address = await contract.getAddress();

  // On Sepolia, wait for 2 block confirmations
  if (networkName === "sepolia") {
    console.log("Waiting for block confirmations on Sepolia...");
    try {
      await contract.deploymentTransaction().wait(2);
      console.log("Transaction confirmed on Sepolia network.");
    } catch (waitErr) {
      console.warn("Notice: proceeding after initial deployment transaction broadcast.");
    }
  }

  console.log(`\nRecordIntegrity successfully deployed to: ${address}`);

  // Save the contract address and network name to .env.blockchain
  const chainNetwork = networkName === "sepolia" ? "sepolia" : "hardhat";
  const configPath = path.join(__dirname, "../../server/.env.blockchain");
  const envContent = `SMART_CONTRACT_ADDRESS=${address}\nCHAIN_NETWORK=${chainNetwork}\n`;

  fs.writeFileSync(configPath, envContent);
  console.log(`Saved deployment info to ${configPath}:`);
  console.log(envContent.trim());
}

main().catch((error) => {
  console.error("Deployment error:", error.message || error);
  process.exitCode = 1;
});

