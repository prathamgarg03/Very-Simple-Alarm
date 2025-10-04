async function main() {
  const accounts = await ethers.getSigners();
  const contractAddress = process.env.CONTRACT_ADDRESS || '0x5FbDB2315678afecb367f032d93F642f64180aa3';

  console.log('Using contract:', contractAddress);

  const requester = accounts[3];
  const voter1 = accounts[0];
  const voter2 = accounts[1];

  const dao = await ethers.getContractAt('AlarmStopDAO', contractAddress);

  console.log('Requester will create a stop request:', requester.address);
  const txCreate = await dao.connect(requester).createStopRequest();
  await txCreate.wait();

  // request id is nextRequestId - 1
  const next = await dao.nextRequestId();
  const requestId = next - 1n;
  console.log('Created requestId', requestId.toString());

  console.log('Voter1 voting YES:', voter1.address);
  const tx1 = await dao.connect(voter1).vote(requestId, true);
  await tx1.wait();

  console.log('Voter2 voting YES:', voter2.address);
  const tx2 = await dao.connect(voter2).vote(requestId, true);
  await tx2.wait();

  const info = await dao.getRequest(requestId);
  console.log('Request info:', {
    requester: info.requester,
    createdAt: info.createdAt.toString(),
    yesVotes: info.yesVotes.toString(),
    noVotes: info.noVotes.toString(),
    executed: info.executed
  });
}

main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
