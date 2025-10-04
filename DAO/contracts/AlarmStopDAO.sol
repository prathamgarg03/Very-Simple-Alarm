// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/// @title AlarmStopDAO
/// @notice DAO for voting to stop a user's alarm. A StopRequest is created by a user, friends vote, and when quorum is reached the contract emits an event.
contract AlarmStopDAO {
    struct StopRequest {
        address requester;      // who wants the alarm stopped
        uint256 createdAt;      // block timestamp
        uint256 yesVotes;       // count of yes votes
        uint256 noVotes;        // count of no votes
        bool executed;          // whether stop event emitted
        mapping(address => bool) voted; // track who voted
    }

    uint256 public nextRequestId = 1;
    mapping(uint256 => StopRequest) private requests;

    // governance / trusted friends list (simple whitelist)
    mapping(address => bool) public isFriend;
    uint256 public friendCount;

    // quorum: number of yes votes required (absolute count)
    uint256 public quorum;

    // events
    event StopRequested(uint256 indexed requestId, address indexed requester);
    event Voted(uint256 indexed requestId, address indexed voter, bool support);
    event AlarmStopApproved(uint256 indexed requestId, address indexed requester);

    modifier onlyFriend() {
        require(isFriend[msg.sender], "not a friend");
        _;
    }

    constructor(address[] memory initialFriends, uint256 _quorum) {
        require(_quorum > 0, "quorum > 0");
        for (uint i = 0; i < initialFriends.length; i++) {
            if (!isFriend[initialFriends[i]]) {
                isFriend[initialFriends[i]] = true;
                friendCount++;
            }
        }
        quorum = _quorum;
    }

    function addFriend(address who) external {
        // simple open function; you can change to onlyOwner in production
        if (!isFriend[who]) {
            isFriend[who] = true;
            friendCount++;
        }
    }

    function removeFriend(address who) external {
        if (isFriend[who]) {
            isFriend[who] = false;
            friendCount--;
        }
    }

    function createStopRequest() external returns (uint256) {
        uint256 rid = nextRequestId++;
        StopRequest storage r = requests[rid];
        r.requester = msg.sender;
        r.createdAt = block.timestamp;
        r.yesVotes = 0;
        r.noVotes = 0;
        r.executed = false;
        emit StopRequested(rid, msg.sender);
        return rid;
    }

    function vote(uint256 requestId, bool support) external onlyFriend {
        StopRequest storage r = requests[requestId];
        require(r.requester != address(0), "no such request");
        require(!r.voted[msg.sender], "already voted");
        r.voted[msg.sender] = true;
        if (support) {
            r.yesVotes++;
            emit Voted(requestId, msg.sender, true);
            if (!r.executed && r.yesVotes >= quorum) {
                r.executed = true;
                emit AlarmStopApproved(requestId, r.requester);
            }
        } else {
            r.noVotes++;
            emit Voted(requestId, msg.sender, false);
        }
    }

    // view helpers
    function getRequest(uint256 requestId) external view returns (address requester, uint256 createdAt, uint256 yesVotes, uint256 noVotes, bool executed) {
        StopRequest storage r = requests[requestId];
        return (r.requester, r.createdAt, r.yesVotes, r.noVotes, r.executed);
    }

    function hasVoted(uint256 requestId, address voter) external view returns (bool) {
        return requests[requestId].voted[voter];
    }
}
