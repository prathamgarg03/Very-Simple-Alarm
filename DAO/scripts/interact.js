async function main() {
  const [deployer, hirer] = await ethers.getSigners();
  const contractAddress = process.env.CONTRACT_ADDRESS || "0x5FbDB2315678afecb367f032d93F642f64180aa3";

  console.log('Deployer:', deployer.address);
  console.log('Hirer:', hirer.address);
  console.log('Using contract:', contractAddress);

  const friend = await ethers.getContractAt('FriendForHireDAO', contractAddress);

  // show next profile id (will be used for creation)
  const nextBefore = await friend.getNextProfileId();
  const profileId = nextBefore; // this will be the id created

  console.log('Creating profile id', profileId.toString());
  const rate = ethers.parseEther('0.01');
  const txCreate = await friend.createProfile('Demo Friend', 'Friendly demo profile', rate);
  await txCreate.wait();
  console.log('Profile created');

  // show contract balance before hire
  const balBefore = await ethers.provider.getBalance(contractAddress);
  console.log('Contract balance before hire:', ethers.formatEther(balBefore));

  // hirer hires the friend by sending value
  const hireValue = ethers.parseEther('0.01');
  console.log('Hirer sending', ethers.formatEther(hireValue), 'ETH to hire');
  const txHire = await friend.connect(hirer).hire(profileId, { value: hireValue });
  await txHire.wait();
  console.log('Hired');

  const balAfter = await ethers.provider.getBalance(contractAddress);
  console.log('Contract balance after hire (fees kept):', ethers.formatEther(balAfter));

  // withdraw fees (treasury is deployer in demo)
  console.log('Withdrawing fees to treasury (deployer)');
  const txWithdraw = await friend.withdrawFees();
  await txWithdraw.wait();

  const balFinal = await ethers.provider.getBalance(contractAddress);
  console.log('Contract balance after withdraw:', ethers.formatEther(balFinal));
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
