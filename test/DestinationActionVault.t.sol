// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "../contracts/DestinationActionVault.sol";

contract CallbackInvoker {
    function forward(
        DestinationActionVault target,
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
    ) external {
        target.handleReactiveUpdate(
            incomingRvmId,
            feedId,
            metricType,
            value,
            forecastValue,
            observedAt,
            expiresAt,
            version,
            payloadHash,
            signatureDigest,
            sourceId,
            triggerValue,
            originTxHash
        );
    }
}

contract DestinationActionVaultTest {
    bytes32 private constant FEED_ID = keccak256("energy-price-demo");
    bytes32 private constant METRIC_TYPE = keccak256("price");
    bytes32 private constant SOURCE_ID = keccak256("grid-demo-v1");

    function testHandleReactiveUpdateStoresMirroredFeedAndCreditsReward() external {
        CallbackInvoker invoker = new CallbackInvoker();
        DestinationActionVault vault =
            new DestinationActionVault(address(invoker), address(this), 1 ether);

        invoker.forward(
            vault,
            address(0),
            FEED_ID,
            METRIC_TYPE,
            86,
            97,
            1_772_874_000,
            1_772_877_600,
            2,
            keccak256("payload-2"),
            keccak256("sig-2"),
            SOURCE_ID,
            97,
            12345
        );

        DestinationActionVault.MirroredFeedState memory state = vault.getMirroredFeed(FEED_ID);
        require(state.metricType == METRIC_TYPE, "metric type mismatch");
        require(state.sourceId == SOURCE_ID, "source id mismatch");
        require(state.version == 2, "version mismatch");
        require(state.value == 86, "value mismatch");
        require(state.forecastValue == 97, "forecast mismatch");
        require(vault.claimableRewards(address(this)) == 1 ether, "reward not credited");
    }

    function testHandleReactiveUpdateRejectsDuplicateDelivery() external {
        CallbackInvoker invoker = new CallbackInvoker();
        DestinationActionVault vault =
            new DestinationActionVault(address(invoker), address(this), 1 ether);

        invoker.forward(
            vault,
            address(0),
            FEED_ID,
            METRIC_TYPE,
            86,
            97,
            1_772_874_000,
            1_772_877_600,
            2,
            keccak256("payload-2"),
            keccak256("sig-2"),
            SOURCE_ID,
            97,
            12345
        );

        (bool success,) = address(invoker).call(
            abi.encodeWithSelector(
                CallbackInvoker.forward.selector,
                vault,
                address(0),
                FEED_ID,
                METRIC_TYPE,
                86,
                97,
                uint64(1_772_874_000),
                uint64(1_772_877_600),
                uint64(2),
                keccak256("payload-2"),
                keccak256("sig-2"),
                SOURCE_ID,
                uint256(97),
                uint256(12345)
            )
        );

        require(!success, "expected duplicate delivery revert");
    }
}
