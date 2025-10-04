require("@nomicfoundation/hardhat-toolbox");
require("dotenv").config();   // <-- ADD THIS

// console.log("PRIVATE_KEY:", process.env.PRIVATE_KEY);
// console.log("ALCHEMY_API_KEY:", process.env.ALCHEMY_API_KEY);

module.exports = {
  solidity: "0.8.20",
  networks: {
    mumbai: {
      url: `https://eth-mainnet.g.alchemy.com/v2/${process.env.ALCHEMY_API_KEY}`,
      accounts: [process.env.PRIVATE_KEY],
    },
  },
};
