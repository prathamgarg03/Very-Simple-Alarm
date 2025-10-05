import { useEffect, useState } from "react";
import { ethers } from "ethers";
import FriendshipAlarmDAOAbi from "../../abi/FriendshipAlarmDAO.json";

const CONTRACT_ADDRESS = "0x5FbDB2315678afecb367f032d93F642f64180aa3";

export interface DAOState {
  provider: ethers.BrowserProvider | null;
  signer: ethers.JsonRpcSigner | null;
  contract: ethers.Contract | null;
  lastVoteResult: boolean | null;
  isConnected: boolean;
}

export interface DAOActions {
  connectWallet: () => Promise<void>;
  stopAlarm: () => Promise<void>;
}

export function useFriendshipAlarmDAO(): DAOState & DAOActions {
  const [provider, setProvider] = useState<ethers.BrowserProvider | null>(null);
  const [signer, setSigner] = useState<ethers.JsonRpcSigner | null>(null);
  const [contract, setContract] = useState<ethers.Contract | null>(null);
  const [lastVoteResult, setLastVoteResult] = useState<boolean | null>(null);

  const isConnected = !!contract;

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
      tempContract.on("AlarmStopApproved", (approved: boolean) => {
        setLastVoteResult(approved);
        console.log("Alarm stop approved?", approved);
      });
    } else {
      alert("Please install MetaMask!");
    }
  };

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

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (contract) {
        contract.removeAllListeners("AlarmStopApproved");
      }
    };
  }, [contract]);

  return {
    provider,
    signer,
    contract,
    lastVoteResult,
    isConnected,
    connectWallet,
    stopAlarm,
  };
}
