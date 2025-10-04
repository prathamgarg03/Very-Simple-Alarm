// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/// @title FriendForHireDAO (Demo)
/// @notice Minimal contract to register "friend" profiles and let users pay to "hire" them. 
/// This is for demo/educational purposes only. Do not use for fraudulent activities.
contract FriendForHireDAO {
    struct Profile {
        address payable owner;
        string name;
        string bio;
        uint256 rateWei; // price per hire in wei
        bool exists;
    }

    // profile id counter
    uint256 private nextProfileId = 1;
    // mapping profileId => Profile
    mapping(uint256 => Profile) public profiles;

    // treasury receives platform fees
    address payable public treasury;
    uint256 public platformFeeBps = 250; // 2.5%

    event ProfileCreated(uint256 indexed profileId, address indexed owner, string name, uint256 rateWei);
    event ProfileUpdated(uint256 indexed profileId, string name, uint256 rateWei);
    event Hired(uint256 indexed profileId, address indexed hirer, uint256 amountPaid);
    event FeeWithdrawn(address indexed to, uint256 amount);

    constructor(address payable _treasury) {
        require(_treasury != address(0), "treasury required");
        treasury = _treasury;
    }

    modifier onlyOwner(uint256 profileId) {
        require(profiles[profileId].exists, "profile doesn't exist");
        require(msg.sender == profiles[profileId].owner, "not profile owner");
        _;
    }

    /// @notice Create a friend profile
    function createProfile(string calldata name, string calldata bio, uint256 rateWei) external returns (uint256) {
        require(rateWei > 0, "rate must be > 0");
        uint256 pid = nextProfileId++;
        profiles[pid] = Profile(payable(msg.sender), name, bio, rateWei, true);
        emit ProfileCreated(pid, msg.sender, name, rateWei);
        return pid;
    }

    /// @notice Update your profile
    function updateProfile(uint256 profileId, string calldata name, string calldata bio, uint256 rateWei) external onlyOwner(profileId) {
        profiles[profileId].name = name;
        profiles[profileId].bio = bio;
        profiles[profileId].rateWei = rateWei;
        emit ProfileUpdated(profileId, name, rateWei);
    }

    /// @notice Hire a friend by paying their rate. Part goes to treasury as platform fee.
    function hire(uint256 profileId) external payable {
        Profile storage p = profiles[profileId];
        require(p.exists, "no such profile");
        require(msg.value >= p.rateWei, "insufficient payment");

        uint256 fee = (msg.value * platformFeeBps) / 10000;
        uint256 payout = msg.value - fee;

        // send payout to profile owner
        (bool sent, ) = p.owner.call{value: payout}("{}");
        require(sent, "payout failed");

        // keep fee in contract (treasury withdraws later)
        emit Hired(profileId, msg.sender, msg.value);
    }

    /// @notice Withdraw collected fees to treasury
    function withdrawFees() external {
        require(msg.sender == treasury, "only treasury");
        uint256 bal = address(this).balance;
        require(bal > 0, "no fees");
        (bool sent, ) = treasury.call{value: bal}("");
        require(sent, "withdraw failed");
        emit FeeWithdrawn(treasury, bal);
    }

    /// @notice Change treasury address (only current treasury)
    function setTreasury(address payable newTreasury) external {
        require(msg.sender == treasury, "only treasury");
        require(newTreasury != address(0), "bad address");
        treasury = newTreasury;
    }

    /// @notice Get profile count (simple helper)
    function getNextProfileId() external view returns (uint256) {
        return nextProfileId;
    }
}
