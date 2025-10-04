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

  // Support running under Hardhat (where `ethers` is injected) or as a plain node script.
  let ethersLib;
  let dao;
  let accounts;
  let provider;
  if (typeof globalThis.ethers !== 'undefined' && globalThis.ethers.getContractAt) {
    // running with `npx hardhat run` or similar
    ethersLib = globalThis.ethers;
    dao = await ethersLib.getContractAt('AlarmStopDAO', contractAddress);
    accounts = await ethersLib.getSigners();
  } else {
    // running with `node` directly
    ethersLib = require('ethers');
    const path = require('path');
  provider = new ethersLib.JsonRpcProvider(process.env.RPC_URL || 'http://127.0.0.1:8545');

  // get unlocked accounts from the local node (keep as address strings)
  const addrs = await provider.listAccounts();
  accounts = addrs; // array of addresses

    // load ABI from Hardhat artifacts (assumes you've compiled/deployed locally)
    const artifactPath = path.resolve(__dirname, '..', 'artifacts', 'contracts', 'AlarmStopDAO.sol', 'AlarmStopDAO.json');
    let abi;
    try {
      const artifact = require(artifactPath);
      abi = artifact.abi;
    } catch (e) {
      console.error('Could not load artifact at', artifactPath, '- did you run a compile/deploy?');
      throw e;
    }

    dao = new ethersLib.Contract(contractAddress, abi, provider);
  }

  if (cmd === 'create') {
    const idx = parseInt(args[1] || '3', 10);
    // resolve signer: accounts[] may be addresses (node mode) or Signer objects (hardhat mode)
    let signer = accounts[idx];
    if (typeof signer === 'string') {
      signer = provider.getSigner(signer);
    }
    const signerAddr = typeof signer.getAddress === 'function' ? await signer.getAddress() : signer.address;
    console.log('Creating stop request with account', signerAddr);
    const tx = await dao.connect(signer).createStopRequest();
    await tx.wait?.();
    // try reading nextRequestId; cast to bigint/number safely
    const next = await dao.nextRequestId();
    // form a string-friendly id
    const nextId = typeof next === 'bigint' ? next - 1n : (BigInt(next.toString()) - 1n);
    console.log('Created requestId', nextId.toString());
    return;
  }

  if (cmd === 'vote') {
    const requestId = BigInt(args[1]);
    const idx = parseInt(args[2] || '0', 10);
    const support = args[3] === 'yes' || args[3] === 'true';
    // resolve signer: accounts[] may be addresses (node mode) or Signer objects (hardhat mode)
    let signer = accounts[idx];
    if (typeof signer === 'string') {
      signer = provider.getSigner(signer);
    }
    const signerAddr = typeof signer.getAddress === 'function' ? await signer.getAddress() : signer.address;
    console.log('Voting', support ? 'YES' : 'NO', 'on', requestId.toString(), 'with', signerAddr);
    const tx = await dao.connect(signer).vote(requestId, support);
    await tx.wait?.();
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
