FriendForHireDAO - Demo

This folder contains a minimal Hardhat project with a single smart contract `FriendForHireDAO.sol`.

What it does
- Let users create a "friend" profile with a rate (in wei).
- Other users can "hire" that friend by sending at least the profile rate; a small platform fee (2.5%) is kept in contract and can be withdrawn by the treasury.

Important
- This is a demonstration project for educational purposes only. Do not use it to deceive or commit fraud. The author is not responsible for misuse.

Quick start
1. cd into `DAO`
2. npm install
3. npx hardhat node  (in a separate terminal)
4. npx hardhat run --network localhost scripts/deploy.js

Files
- `contracts/FriendForHireDAO.sol` - core contract
- `scripts/deploy.js` - simple deploy script
- `hardhat.config.js` - config

Notes
- Solidity 0.8.20
- Keeps code intentionally minimal; consider adding checks, events, or a governance mechanism for production.
