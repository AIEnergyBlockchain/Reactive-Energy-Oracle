// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

contract SourceFeedEmitter {
    struct FeedUpdateInput {
        bytes32 feedId;
        bytes32 metricType;
        bytes32 sourceId;
        uint64 observedAt;
        uint64 expiresAt;
        uint64 version;
        uint256 triggerValue;
        uint256 value;
        uint256 forecastValue;
        bytes32 payloadHash;
        bytes32 signatureDigest;
    }

    struct FeedState {
        bytes32 metricType;
        bytes32 sourceId;
        uint64 observedAt;
        uint64 expiresAt;
        uint64 version;
        uint256 triggerValue;
        uint256 value;
        uint256 forecastValue;
        bytes32 payloadHash;
        bytes32 signatureDigest;
    }

    address public owner;

    mapping(address => bool) public publishers;
    mapping(bytes32 => FeedState) private latestFeeds;

    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);
    event PublisherUpdated(address indexed publisher, bool allowed);
    event FeedUpdated(
        bytes32 indexed feedId,
        bytes32 indexed metricType,
        uint256 indexed triggerValue,
        uint256 value,
        uint256 forecastValue,
        uint64 observedAt,
        uint64 expiresAt,
        uint64 version,
        bytes32 payloadHash,
        bytes32 signatureDigest,
        bytes32 sourceId
    );

    modifier onlyOwner() {
        require(msg.sender == owner, "Owner only");
        _;
    }

    modifier onlyPublisher() {
        require(publishers[msg.sender], "Publisher only");
        _;
    }

    constructor(address initialPublisher) {
        owner = msg.sender;
        publishers[msg.sender] = true;
        emit OwnershipTransferred(address(0), msg.sender);
        emit PublisherUpdated(msg.sender, true);

        if (initialPublisher != address(0) && initialPublisher != msg.sender) {
            publishers[initialPublisher] = true;
            emit PublisherUpdated(initialPublisher, true);
        }
    }

    function transferOwnership(address newOwner) external onlyOwner {
        require(newOwner != address(0), "Zero owner");
        emit OwnershipTransferred(owner, newOwner);
        owner = newOwner;
    }

    function setPublisher(address publisher, bool allowed) external onlyOwner {
        require(publisher != address(0), "Zero publisher");
        publishers[publisher] = allowed;
        emit PublisherUpdated(publisher, allowed);
    }

    function getLatestFeed(bytes32 feedId) external view returns (FeedState memory) {
        return latestFeeds[feedId];
    }

    function publishFeedUpdate(FeedUpdateInput calldata update) external onlyPublisher {
        _validateUpdate(update);

        FeedState memory current = latestFeeds[update.feedId];
        require(update.version > current.version, "Version must increase");
        if (current.observedAt != 0) {
            require(update.observedAt >= current.observedAt, "Timestamp regression");
        }

        latestFeeds[update.feedId] = FeedState({
            metricType: update.metricType,
            sourceId: update.sourceId,
            observedAt: update.observedAt,
            expiresAt: update.expiresAt,
            version: update.version,
            triggerValue: update.triggerValue,
            value: update.value,
            forecastValue: update.forecastValue,
            payloadHash: update.payloadHash,
            signatureDigest: update.signatureDigest
        });

        emit FeedUpdated(
            update.feedId,
            update.metricType,
            update.triggerValue,
            update.value,
            update.forecastValue,
            update.observedAt,
            update.expiresAt,
            update.version,
            update.payloadHash,
            update.signatureDigest,
            update.sourceId
        );
    }

    function _validateUpdate(FeedUpdateInput calldata update) internal pure {
        require(update.feedId != bytes32(0), "Feed id required");
        require(update.metricType != bytes32(0), "Metric type required");
        require(update.sourceId != bytes32(0), "Source id required");
        require(update.observedAt != 0, "Observed at required");
        require(update.expiresAt == 0 || update.expiresAt > update.observedAt, "Invalid expiry");
        require(update.version != 0, "Version required");
        require(update.payloadHash != bytes32(0), "Payload hash required");
        require(update.signatureDigest != bytes32(0), "Signature digest required");
    }
}
