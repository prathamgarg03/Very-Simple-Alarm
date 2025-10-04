/**
 * Simple CLI for local testing using Hardhat accounts.
 * Usage examples:
 *  node scripts/cli_action.js create 3           # create request using account index 3
 *  node scripts/cli_action.js vote <reqId> <idx> <yes|no>  # vote on requestId using account index idx
 */

async function main() {
  const args = process.argv.slice(2);
  if (args.length === 0) {
    console.log('Usage: node scripts/cli_action.js <create|vote|status> ...');
    process.exit(0);
  }

  const cmd = args[0];
  const contractAddress = process.env.CONTRACT_ADDRESS || '0x5FbDB2315678afecb367f032d93F642f64180aa3';
  const dao = await ethers.getContractAt('AlarmStopDAO', contractAddress);
  const accounts = await ethers.getSigners();

  if (cmd === 'create') {
    const idx = parseInt(args[1] || '3', 10);
    const signer = accounts[idx];
    console.log('Creating stop request with account', signer.address);
    const tx = await dao.connect(signer).createStopRequest();
    await tx.wait();
    const next = await dao.nextRequestId();
    console.log('Created requestId', (next - 1n).toString());
    return;
  }

  if (cmd === 'vote') {
    const requestId = BigInt(args[1]);
    const idx = parseInt(args[2] || '0', 10);
    const support = args[3] === 'yes' || args[3] === 'true';
    const signer = accounts[idx];
    console.log('Voting', support ? 'YES' : 'NO', 'on', requestId.toString(), 'with', signer.address);
    const tx = await dao.connect(signer).vote(requestId, support);
    await tx.wait();
    console.log('Voted');
    return;
  }

  if (cmd === 'status') {
    const requestId = BigInt(args[1]);
    const info = await dao.getRequest(requestId);
    console.log('Request', requestId.toString(), info);
    return;
  }

  console.log('Unknown command', cmd);
}

main().catch((e) => { console.error(e); process.exit(1); });
