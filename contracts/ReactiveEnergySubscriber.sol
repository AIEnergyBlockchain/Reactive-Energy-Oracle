// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "./reactive/AbstractReactive.sol";

contract ReactiveEnergySubscriber is AbstractReactive {
    uint256 private constant FEED_UPDATED_TOPIC_0 =
        uint256(
            keccak256(
                "FeedUpdated(bytes32,bytes32,uint256,uint256,uint256,uint64,uint64,uint64,bytes32,bytes32,bytes32)"
            )
        );

    uint256 public immutable originChainId;
    uint256 public immutable destinationChainId;
    address public immutable originContract;
    address public immutable destinationContract;
    bytes32 public immutable monitoredFeedId;
    bytes32 public immutable monitoredMetricType;
    uint256 public immutable triggerThreshold;
    uint64 public immutable callbackGasLimit;

    uint256 public reactionCount;

    event SubscriptionConfigured(
        uint256 indexed originChainId,
        address indexed originContract,
        bytes32 indexed feedId,
        bytes32 metricType,
        uint256 triggerThreshold,
        uint256 destinationChainId,
        address destinationContract,
        uint64 callbackGasLimit
    );
    event ThresholdEvaluated(
        bytes32 indexed feedId,
        uint64 indexed version,
        uint256 triggerValue,
        bool dispatched
    );

    constructor(
        uint256 originChainId_,
        address originContract_,
        bytes32 monitoredFeedId_,
        bytes32 monitoredMetricType_,
        uint256 triggerThreshold_,
        uint256 destinationChainId_,
        address destinationContract_,
        uint64 callbackGasLimit_
    ) payable {
        require(originChainId_ != 0, "Origin chain required");
        require(destinationChainId_ != 0, "Destination chain required");
        require(originContract_ != address(0), "Origin contract required");
        require(destinationContract_ != address(0), "Destination contract required");
        require(monitoredFeedId_ != bytes32(0), "Feed id required");
        require(monitoredMetricType_ != bytes32(0), "Metric type required");
        require(callbackGasLimit_ != 0, "Gas limit required");

        originChainId = originChainId_;
        originContract = originContract_;
        monitoredFeedId = monitoredFeedId_;
        monitoredMetricType = monitoredMetricType_;
        triggerThreshold = triggerThreshold_;
        destinationChainId = destinationChainId_;
        destinationContract = destinationContract_;
        callbackGasLimit = callbackGasLimit_;

        if (!vm) {
            service.subscribe(
                originChainId_,
                originContract_,
                FEED_UPDATED_TOPIC_0,
                uint256(monitoredFeedId_),
                uint256(monitoredMetricType_),
                REACTIVE_IGNORE
            );
        }

        emit SubscriptionConfigured(
            originChainId_,
            originContract_,
            monitoredFeedId_,
            monitoredMetricType_,
            triggerThreshold_,
            destinationChainId_,
            destinationContract_,
            callbackGasLimit_
        );
    }

    function react(LogRecord calldata log) external override vmOnly {
        if (
            log.chain_id != originChainId || log._contract != originContract
                || log.topic_0 != FEED_UPDATED_TOPIC_0 || log.topic_1 != uint256(monitoredFeedId)
                || log.topic_2 != uint256(monitoredMetricType)
        ) {
            return;
        }

        (
            uint256 value,
            uint256 forecastValue,
            uint64 observedAt,
            uint64 expiresAt,
            uint64 version,
            bytes32 payloadHash,
            bytes32 signatureDigest,
            bytes32 sourceId
        ) = abi.decode(log.data, (uint256, uint256, uint64, uint64, uint64, bytes32, bytes32, bytes32));

        bool shouldDispatch = log.topic_3 >= triggerThreshold;
        reactionCount += 1;

        emit ThresholdEvaluated(monitoredFeedId, version, log.topic_3, shouldDispatch);

        if (!shouldDispatch) {
            return;
        }

        bytes memory payload = abi.encodeWithSignature(
            "handleReactiveUpdate(address,bytes32,bytes32,uint256,uint256,uint64,uint64,uint64,bytes32,bytes32,bytes32,uint256,uint256)",
            address(this),
            monitoredFeedId,
            monitoredMetricType,
            value,
            forecastValue,
            observedAt,
            expiresAt,
            version,
            payloadHash,
            signatureDigest,
            sourceId,
            log.topic_3,
            log.tx_hash
        );

        emit Callback(destinationChainId, destinationContract, callbackGasLimit, payload);
    }
}
