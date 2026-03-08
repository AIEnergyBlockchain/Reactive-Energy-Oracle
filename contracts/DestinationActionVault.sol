// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "./reactive/AbstractCallback.sol";

contract DestinationActionVault is AbstractCallback {
    struct MirroredFeedState {
        bytes32 metricType;
        bytes32 sourceId;
        uint64 observedAt;
        uint64 expiresAt;
        uint64 version;
        uint64 updatedAt;
        uint256 value;
        uint256 forecastValue;
        uint256 triggerValue;
        uint256 originTxHash;
        bytes32 payloadHash;
        bytes32 signatureDigest;
    }

    address public owner;
    address public rewardRecipient;
    uint256 public rewardAmount;
    bool public payoutsEnabled;

    mapping(bytes32 => MirroredFeedState) private mirroredFeeds;
    mapping(bytes32 => bool) public processedDeliveries;
    mapping(address => uint256) public claimableRewards;

    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);
    event RewardConfigUpdated(address indexed rewardRecipient, uint256 rewardAmount, bool enabled);
    event RvmIdUpdated(address indexed rvmId);
    event ReactiveUpdateAccepted(
        bytes32 indexed feedId,
        uint64 indexed version,
        bytes32 indexed deliveryId,
        uint256 value,
        uint256 forecastValue,
        uint256 triggerValue
    );
    event RewardCredited(address indexed recipient, bytes32 indexed deliveryId, uint256 amount);
    event RewardClaimed(address indexed recipient, uint256 amount);

    modifier onlyOwner() {
        require(msg.sender == owner, "Owner only");
        _;
    }

    constructor(address callbackSender_, address rewardRecipient_, uint256 rewardAmount_)
        payable
        AbstractCallback(callbackSender_)
    {
        owner = msg.sender;
        rewardRecipient = rewardRecipient_;
        rewardAmount = rewardAmount_;
        payoutsEnabled = rewardRecipient_ != address(0) && rewardAmount_ != 0;

        emit OwnershipTransferred(address(0), msg.sender);
        emit RewardConfigUpdated(rewardRecipient_, rewardAmount_, payoutsEnabled);
    }

    function transferOwnership(address newOwner) external onlyOwner {
        require(newOwner != address(0), "Zero owner");
        emit OwnershipTransferred(owner, newOwner);
        owner = newOwner;
    }

    function setRvmId(address rvmId_) external onlyOwner {
        rvmId = rvmId_;
        emit RvmIdUpdated(rvmId_);
    }

    function setRewardConfig(address rewardRecipient_, uint256 rewardAmount_, bool enabled)
        external
        onlyOwner
    {
        if (enabled) {
            require(rewardRecipient_ != address(0), "Reward recipient required");
            require(rewardAmount_ != 0, "Reward amount required");
        }

        rewardRecipient = rewardRecipient_;
        rewardAmount = rewardAmount_;
        payoutsEnabled = enabled;

        emit RewardConfigUpdated(rewardRecipient_, rewardAmount_, enabled);
    }

    function getMirroredFeed(bytes32 feedId) external view returns (MirroredFeedState memory) {
        return mirroredFeeds[feedId];
    }

    function handleReactiveUpdate(
        address incomingRvmId,
        bytes32 feedId,
        bytes32 metricType,
        uint256 value,
        uint256 forecastValue,
        uint64 observedAt,
        uint64 expiresAt,
        uint64 version,
        bytes32 payloadHash,
        bytes32 signatureDigest,
        bytes32 sourceId,
        uint256 triggerValue,
        uint256 originTxHash
    ) external callbackOnly(incomingRvmId) {
        require(feedId != bytes32(0), "Feed id required");
        require(metricType != bytes32(0), "Metric type required");

        bytes32 deliveryId = keccak256(abi.encode(feedId, version, payloadHash, originTxHash));
        require(!processedDeliveries[deliveryId], "Delivery already processed");

        processedDeliveries[deliveryId] = true;
        mirroredFeeds[feedId] = MirroredFeedState({
            metricType: metricType,
            sourceId: sourceId,
            observedAt: observedAt,
            expiresAt: expiresAt,
            version: version,
            updatedAt: uint64(block.timestamp),
            value: value,
            forecastValue: forecastValue,
            triggerValue: triggerValue,
            originTxHash: originTxHash,
            payloadHash: payloadHash,
            signatureDigest: signatureDigest
        });

        emit ReactiveUpdateAccepted(feedId, version, deliveryId, value, forecastValue, triggerValue);

        if (payoutsEnabled && rewardRecipient != address(0) && rewardAmount != 0) {
            claimableRewards[rewardRecipient] += rewardAmount;
            emit RewardCredited(rewardRecipient, deliveryId, rewardAmount);
        }
    }

    function claimRewards() external {
        uint256 amount = claimableRewards[msg.sender];
        require(amount != 0, "No rewards");

        claimableRewards[msg.sender] = 0;
        (bool success,) = payable(msg.sender).call{value: amount}("");
        require(success, "Transfer failed");

        emit RewardClaimed(msg.sender, amount);
    }
}
