// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

import "./IPriceFeed.sol";

contract PriceFeed is IPriceFeed {
    int256 public answer;
    uint80 public roundId;
    string public description = "PriceFeed";
    address public aggregator;

    uint256 public decimals;

    address public gov;

    mapping (uint80 => int256) public answers;
    mapping (address => bool) public isAdmin;

    constructor() {
        gov = msg.sender;
        isAdmin[msg.sender] = true;
    }

    function setAdmin(address _account, bool _isAdmin) public {
        require(msg.sender == gov, "PriceFeed: forbidden");
        isAdmin[_account] = _isAdmin;
    }

    function latestAnswer() public view returns (int256) {
        return answer;
    }

    function latestRound() public view returns (uint80) {
        return roundId;
    }

    function setLatestAnswer(int256 _answer) public {
        require(isAdmin[msg.sender], "PriceFeed: forbidden");
        roundId = roundId + 1;
        answer = _answer;
        answers[roundId] = _answer;
    }

    function latestRoundData() external view returns (
        uint80,
        int256,
        uint256,
        uint256,
        uint80
    ) {
        return (
            roundId, // roundId
            answer, // answer
            0, // startedAt
            block.timestamp - 60, // updatedAt
            uint80(0) // answeredInRound
        );
    }
}
