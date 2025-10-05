import { ethers } from "ethers";

const provider = new ethers.JsonRpcProvider("http://127.0.0.1:8545");
const signer = new ethers.Wallet("0x689af8efa8c651a91ad287602527f3af2fe9f6501a7ac4b061667b5a93e037fd", provider);

(async () => {
  // Dynamically import JSON ABI
  const FriendshipAlarmDAOAbi = await import("../abi/FriendshipAlarmDAO.json", {
    assert: { type: "json" }
  });

  const contract = new ethers.Contract(
    "0x5FbDB2315678afecb367f032d93F642f64180aa3",
    FriendshipAlarmDAOAbi.default.abi,
    signer
  );

  const tx = await contract.checkConsensus();
  const receipt = await tx.wait();
  console.log("Transaction mined:", receipt.transactionHash);
})();
