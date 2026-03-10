// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "../contracts/SourceFeedEmitter.sol";

contract UnapprovedCaller {
    function tryPublish(SourceFeedEmitter emitter, SourceFeedEmitter.FeedUpdateInput memory update)
        external
        returns (bool)
    {
        (bool success,) = address(emitter).call(
            abi.encodeWithSelector(SourceFeedEmitter.publishFeedUpdate.selector, update)
        );
        return success;
    }
}

contract SourceFeedEmitterFuzzTest {
    bytes32 private constant FEED_ID = keccak256("energy-price-demo");
    bytes32 private constant METRIC_TYPE = keccak256("price");
    bytes32 private constant SOURCE_ID = keccak256("grid-demo-v1");

    function testFuzzPublishFeedUpdateVersionAndTimestamps(
        uint64 observedSeed,
        uint64 deltaSeed,
        uint64 versionSeed,
        uint64 bumpSeed,
        uint256 valueSeed,
        uint256 forecastSeed
    ) external {
        SourceFeedEmitter emitter = new SourceFeedEmitter(address(0));

        uint64 observedAt = uint64(observedSeed % (type(uint64).max - 10000)) + 1;
        uint64 expiresAt = observedAt + uint64((deltaSeed % 3600) + 1);
        uint64 version1 = uint64((versionSeed % 1000) + 1);
        uint64 version2 = version1 + uint64((bumpSeed % 1000) + 1);

        SourceFeedEmitter.FeedUpdateInput memory update = SourceFeedEmitter.FeedUpdateInput({
            feedId: FEED_ID,
            metricType: METRIC_TYPE,
            sourceId: SOURCE_ID,
            observedAt: observedAt,
            expiresAt: expiresAt,
            version: version1,
            triggerValue: forecastSeed % 150,
            value: valueSeed % 150,
            forecastValue: forecastSeed % 150,
            payloadHash: keccak256(abi.encode(valueSeed, observedAt, version1)),
            signatureDigest: keccak256(abi.encode(forecastSeed, version1))
        });

        emitter.publishFeedUpdate(update);

        (bool successDuplicate,) = address(emitter).call(
            abi.encodeWithSelector(SourceFeedEmitter.publishFeedUpdate.selector, update)
        );
        require(!successDuplicate, "expected duplicate version revert");

        update.version = version2;
        update.observedAt = observedAt + 1;
        update.expiresAt = update.observedAt + uint64((deltaSeed % 3600) + 1);
        update.payloadHash = keccak256(abi.encode(valueSeed, update.observedAt, version2));
        update.signatureDigest = keccak256(abi.encode(forecastSeed, version2));

        emitter.publishFeedUpdate(update);

        SourceFeedEmitter.FeedState memory latest = emitter.getLatestFeed(FEED_ID);
        require(latest.version == version2, "version mismatch");
        require(latest.observedAt >= observedAt, "timestamp regression");
    }

    function testFuzzNonPublisherRejected(uint256 seed) external {
        SourceFeedEmitter emitter = new SourceFeedEmitter(address(0));
        UnapprovedCaller caller = new UnapprovedCaller();

        SourceFeedEmitter.FeedUpdateInput memory update = SourceFeedEmitter.FeedUpdateInput({
            feedId: FEED_ID,
            metricType: METRIC_TYPE,
            sourceId: SOURCE_ID,
            observedAt: 1_772_874_000,
            expiresAt: 1_772_877_600,
            version: uint64((seed % 1000) + 1),
            triggerValue: seed % 150,
            value: (seed / 3) % 150,
            forecastValue: (seed / 7) % 150,
            payloadHash: keccak256(abi.encode(seed, block.number)),
            signatureDigest: keccak256(abi.encode(seed, block.timestamp))
        });

        bool success = caller.tryPublish(emitter, update);
        require(!success, "expected non-publisher rejection");
    }
}
