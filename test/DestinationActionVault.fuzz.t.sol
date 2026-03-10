// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "../contracts/DestinationActionVault.sol";

contract FuzzCallbackInvoker {
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

contract DestinationActionVaultFuzzTest {
    bytes32 private constant FEED_ID = keccak256("energy-price-demo");
    bytes32 private constant METRIC_TYPE = keccak256("price");
    bytes32 private constant SOURCE_ID = keccak256("grid-demo-v1");

    receive() external payable {}

    function testFuzzRewardCreditAndClaim(
        uint256 valueSeed,
        uint256 forecastSeed,
        uint64 versionSeed,
        uint256 triggerSeed
    ) external {
        FuzzCallbackInvoker invoker = new FuzzCallbackInvoker();
        DestinationActionVault vault =
            new DestinationActionVault{value: 2 ether}(address(invoker), address(this), 1 ether);

        uint64 version = uint64((versionSeed % 1000) + 1);
        uint256 triggerValue = triggerSeed % 150;

        invoker.forward(
            vault,
            address(0),
            FEED_ID,
            METRIC_TYPE,
            valueSeed % 150,
            forecastSeed % 150,
            1_772_874_000,
            1_772_877_600,
            version,
            keccak256(abi.encode(valueSeed, version)),
            keccak256(abi.encode(forecastSeed, version)),
            SOURCE_ID,
            triggerValue,
            uint256(keccak256(abi.encode(version, triggerValue)))
        );

        require(vault.claimableRewards(address(this)) == 1 ether, "reward not credited");

        uint256 balanceBefore = address(this).balance;
        vault.claimRewards();
        require(vault.claimableRewards(address(this)) == 0, "reward not cleared");
        require(address(this).balance == balanceBefore + 1 ether, "claim did not transfer");
    }

    function testFuzzDuplicateDeliveryDoesNotDoubleCredit(
        uint256 valueSeed,
        uint256 forecastSeed,
        uint64 versionSeed,
        uint256 originSeed
    ) external {
        FuzzCallbackInvoker invoker = new FuzzCallbackInvoker();
        DestinationActionVault vault =
            new DestinationActionVault{value: 2 ether}(address(invoker), address(this), 1 ether);

        uint64 version = uint64((versionSeed % 1000) + 1);
        uint256 originTxHash = uint256(keccak256(abi.encode(originSeed, version)));
        bytes32 payloadHash = keccak256(abi.encode(valueSeed, version));
        bytes32 signatureDigest = keccak256(abi.encode(forecastSeed, version));

        invoker.forward(
            vault,
            address(0),
            FEED_ID,
            METRIC_TYPE,
            valueSeed % 150,
            forecastSeed % 150,
            1_772_874_000,
            1_772_877_600,
            version,
            payloadHash,
            signatureDigest,
            SOURCE_ID,
            forecastSeed % 150,
            originTxHash
        );

        uint256 credited = vault.claimableRewards(address(this));

        (bool success,) = address(invoker).call(
            abi.encodeWithSelector(
                FuzzCallbackInvoker.forward.selector,
                vault,
                address(0),
                FEED_ID,
                METRIC_TYPE,
                valueSeed % 150,
                forecastSeed % 150,
                uint64(1_772_874_000),
                uint64(1_772_877_600),
                version,
                payloadHash,
                signatureDigest,
                SOURCE_ID,
                uint256(forecastSeed % 150),
                originTxHash
            )
        );

        require(!success, "expected duplicate delivery revert");
        require(vault.claimableRewards(address(this)) == credited, "duplicate altered rewards");
    }

    function testInvariantProcessedDeliveryFlagStaysTrue() external {
        FuzzCallbackInvoker invoker = new FuzzCallbackInvoker();
        DestinationActionVault vault =
            new DestinationActionVault{value: 1 ether}(address(invoker), address(this), 1 ether);

        bytes32 payloadHash = keccak256("payload-invariant");
        bytes32 signatureDigest = keccak256("sig-invariant");
        uint256 originTxHash = 12345;
        uint64 version = 1;

        invoker.forward(
            vault,
            address(0),
            FEED_ID,
            METRIC_TYPE,
            86,
            97,
            1_772_874_000,
            1_772_877_600,
            version,
            payloadHash,
            signatureDigest,
            SOURCE_ID,
            97,
            originTxHash
        );

        bytes32 deliveryId = keccak256(abi.encode(FEED_ID, version, payloadHash, originTxHash));
        require(vault.processedDeliveries(deliveryId), "delivery flag not set");
        require(vault.processedDeliveries(deliveryId), "delivery flag flipped");
    }
}
