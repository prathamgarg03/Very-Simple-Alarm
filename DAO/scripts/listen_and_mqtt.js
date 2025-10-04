/********************************************************
 * Skeleton Node.js listener: listen for AlarmStopApproved
 * events and forward them to an MQTT broker
 *
 * Usage: set env MQTT_URL (e.g. mqtt://localhost:1883)
 *        set env CONTRACT_ADDRESS to the deployed contract
 *        run: node scripts/listen_and_mqtt.js
 ********************************************************/

// support running under `npx hardhat run` (hardhat injects ethers) or directly with node
let ethers;
try {
  // when executed with `npx hardhat run` this is available
  ethers = globalThis.ethers || require('hardhat').ethers;
} catch (e) {
  // fallback to standalone ethers when running with `node`
  ethers = require('ethers');
}
const mqtt = require('mqtt');

async function main() {
  const rpc = process.env.RPC_URL || 'http://127.0.0.1:8545';
  // support ethers v6 (ethers.JsonRpcProvider) and v5 (ethers.providers.JsonRpcProvider)
  const ProviderClass = ethers.JsonRpcProvider || (ethers.providers && ethers.providers.JsonRpcProvider);
  if (!ProviderClass) throw new Error('JsonRpcProvider not found on ethers - ensure ethers is installed');
  const provider = new ProviderClass(rpc);
  const contractAddress = process.env.CONTRACT_ADDRESS || '0x5FbDB2315678afecb367f032d93F642f64180aa3';

  const abi = [
    'event AlarmStopApproved(uint256 indexed requestId, address indexed requester)'
  ];

  const client = mqtt.connect(process.env.MQTT_URL || 'mqtt://localhost:1883');
  client.on('connect', () => console.log('MQTT connected'));

  const contract = new ethers.Contract(contractAddress, abi, provider);

  contract.on('AlarmStopApproved', (requestId, requester) => {
    console.log('AlarmStopApproved', requestId.toString(), requester);
    // send a simple message to topic `alarm/stop/<requester>` with requestId
    const topic = `alarm/stop/${requester}`;
    const payload = JSON.stringify({ requestId: requestId.toString(), requester });
    client.publish(topic, payload, { qos: 1 }, (err) => {
      if (err) console.error('MQTT publish error', err);
      else console.log('Published to MQTT', topic);
    });
  });

  console.log('Listening for AlarmStopApproved events...');
}

main().catch((e) => { console.error(e); process.exit(1); });
