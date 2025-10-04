AlarmStopDAO integration notes

Overview
- `AlarmStopDAO.sol` implements a stop request lifecycle: a user creates a request, friends vote, and when the configured quorum of yes votes is reached the contract emits `AlarmStopApproved(requestId, requester)`.

What the DAO repo provides
- `contracts/AlarmStopDAO.sol` - DAO logic and event emission
- `scripts/deploy_alarmdao.js` - deploys the contract for local testing
- `scripts/listen_and_mqtt.js` - a Node.js skeleton that listens for `AlarmStopApproved` events and forwards them to an MQTT broker

Where to implement other pieces

1) Mobile App / Web3 Frontend
- Allow user to request stop: call `createStopRequest()` via ethers.js/web3.
- Allow friends to vote: call `vote(requestId, true|false)` authenticated by wallet.
- Show request status: call `getRequest(requestId)` and `hasVoted(requestId, address)` to render state.

2) AI Test (ChatGPT Math Test API)
- When a user creates a stop request, optionally obtain a test token by running an AI-based test on your backend (ChatGPT API). Return a signed attestation or result to the smart contract caller or to the event listener.
- For security, do not allow the smart contract to call ChatGPT; perform AI verification off-chain and pass a signed result (e.g., via meta-transaction or off-chain attestation) to the event listener before forwarding to IoT.

3) Event Listener and MQTT
- `scripts/listen_and_mqtt.js` subscribes to `AlarmStopApproved` events and publishes a message to an MQTT topic (e.g., `alarm/stop/<requester>`).
- Extend the listener to verify the AI test result (e.g., check a signature or a remote verification endpoint) before publishing to MQTT.

4) IoT Alarm (ESP32 / Raspberry Pi)
- Subscribe to MQTT `alarm/stop/<yourAddress>` and when an approved message arrives and the attached verification is valid, stop the alarm.
- Use secure MQTT (TLS + credentials) in production.

Security and privacy notes
- The contract currently uses a simple friend whitelist. For production use add governance, owner checks, and stricter friend management.
- The AI verification step must stay off-chain; the on-chain contract only records votes and emits events. The event listener should perform any final checks before triggering physical devices.

Testing locally
1. Run a Hardhat node
  npx hardhat node
2. Deploy AlarmStopDAO
  npx hardhat run --network localhost scripts/deploy_alarmdao.js
3. Run the listener (in another terminal)
  CONTRACT_ADDRESS=<deployed> MQTT_URL=mqtt://localhost:1883 node scripts/listen_and_mqtt.js
4. Use a script or the console to create requests and vote; the listener will publish to MQTT when quorum is reached.

Next steps I can implement for you
- Add unit tests for `AlarmStopDAO.sol` (create, vote, quorum, event emission)
- Implement AI verification attestation flow (sign/verify)
- Build a small frontend to create requests and vote
- Provide an example MQTT consumer for ESP32/Raspberry Pi

Tell me which of the above you'd like next and I'll implement it.