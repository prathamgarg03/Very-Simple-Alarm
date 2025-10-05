async function main() {
  const [deployer] = await ethers.getSigners();
  console.log('Deploying AlarmStopDAO with', deployer.address);

  const Alarm = await ethers.getContractFactory('AlarmStopDAO');
  // for demo, initialize with the first three accounts as friends and quorum 2
  const accounts = await ethers.getSigners();
  const init = [accounts[0].address, accounts[1].address, accounts[2].address];
  const alarm = await Alarm.deploy(init, 2);
  await alarm.waitForDeployment();
  console.log('AlarmStopDAO deployed to:', await alarm.getAddress());
}

main().catch((e) => { console.error(e); process.exit(1); });
