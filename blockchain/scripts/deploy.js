const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  console.log("Deploying RecordIntegrity contract...");

  const RecordIntegrity = await hre.ethers.getContractFactory("RecordIntegrity");
  const contract = await RecordIntegrity.deploy();

  await contract.waitForDeployment();

  const address = await contract.getAddress();
  console.log(`RecordIntegrity deployed to: ${address}`);

  // Save the contract address to an env file so the Node.js backend can use it seamlessly
  const configPath = path.join(__dirname, "../../server/.env.blockchain");
  fs.writeFileSync(configPath, `SMART_CONTRACT_ADDRESS=${address}\n`);
  console.log(`Saved contract address to ${configPath}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
