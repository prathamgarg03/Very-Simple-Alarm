const hre = require("hardhat");

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  console.log("Deploying with account:", deployer.address);

  // Example friends and weights
  const friends = [
    "0x1111111111111111111111111111111111111111",
    "0x2222222222222222222222222222222222222222"
  ];
  const weights = [5, 10];

  const DAO = await hre.ethers.deployContract("FriendshipAlarmDAO", [friends, weights]);
  await DAO.waitForDeployment();

  console.log("FriendshipAlarmDAO deployed at:", DAO.target);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
