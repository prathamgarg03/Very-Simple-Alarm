// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract FriendshipAlarmDAO {
    struct Friend {
        uint256 weight;
    }

    address[] public friendList;
    mapping(address => Friend) public friends;
    uint256 public totalWeight;
    uint256 public yesWeight;

    event AlarmStopApproved(bool approved);

    constructor(address[] memory _friends, uint256[] memory _weights) {
        for (uint256 i = 0; i < _friends.length; i++) {
            friends[_friends[i]] = Friend(_weights[i]);
            friendList.push(_friends[i]);
            totalWeight += _weights[i];
        }
    }

    function checkConsensus() public {
        yesWeight = 0;
        for (uint256 i = 0; i < friendList.length; i++) {
            bool randomVote = (uint256(keccak256(abi.encodePacked(block.timestamp, i))) % 2 == 0);
            if (randomVote) yesWeight += friends[friendList[i]].weight;
        }
        bool approved = yesWeight * 100 / totalWeight >= 51;
        emit AlarmStopApproved(approved);
    }
}
