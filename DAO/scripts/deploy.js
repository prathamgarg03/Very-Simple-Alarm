async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying contracts with", deployer.address);

  const Friend = await ethers.getContractFactory("FriendForHireDAO");
  // use deployer as treasury for demo
  const friend = await Friend.deploy(deployer.address);
  // ethers v6 contracts use waitForDeployment()
  await friend.waitForDeployment();

  const addr = await friend.getAddress();
  console.log("FriendForHireDAO deployed to:", addr);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
