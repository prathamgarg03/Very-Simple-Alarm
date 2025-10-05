import { useEffect, useState } from "react";
import { ethers } from "ethers";
import FriendshipAlarmDAOAbi from "../../abi/FriendshipAlarmDAO.json";

const CONTRACT_ADDRESS = "0x5FbDB2315678afecb367f032d93F642f64180aa3";

export default function FriendshipAlarmDAO() {
  const [provider, setProvider] = useState(null);
  const [signer, setSigner] = useState(null);
  const [contract, setContract] = useState(null);
  const [lastVoteResult, setLastVoteResult] = useState(null);

  // Connect MetaMask
  const connectWallet = async () => {
    if (window.ethereum) {
      await window.ethereum.request({ method: "eth_requestAccounts" });
      const tempProvider = new ethers.BrowserProvider(window.ethereum);
      const tempSigner = await tempProvider.getSigner();
      const tempContract = new ethers.Contract(
        CONTRACT_ADDRESS,
        FriendshipAlarmDAOAbi.abi,
        tempSigner
      );
      setProvider(tempProvider);
      setSigner(tempSigner);
      setContract(tempContract);

      // Listen to event
      tempContract.on("AlarmStopApproved", (approved) => {
        setLastVoteResult(approved);
        console.log("Alarm stop approved?", approved);
      });
    } else {
      alert("Please install MetaMask!");
    }
  };

  // Trigger checkConsensus
  const stopAlarm = async () => {
    if (!contract) return alert("Connect wallet first!");
    try {
      const tx = await contract.checkConsensus();
      await tx.wait();
      console.log("checkConsensus transaction confirmed");
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div style={{ padding: "2rem" }}>
      <h2>Friendship Alarm DAO</h2>
      <button onClick={connectWallet}>Connect Wallet</button>
      <button onClick={stopAlarm} style={{ marginLeft: "1rem" }}>
        Press Stop
      </button>
      {lastVoteResult !== null && (
        <p>Last vote result: {lastVoteResult ? "Approved ✅" : "Denied ❌"}</p>
      )}
    </div>
  );
}
