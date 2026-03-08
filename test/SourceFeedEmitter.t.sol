// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "../contracts/SourceFeedEmitter.sol";

contract SourceFeedEmitterTest {
    bytes32 private constant FEED_ID = keccak256("energy-price-demo");
    bytes32 private constant METRIC_TYPE = keccak256("price");
    bytes32 private constant SOURCE_ID = keccak256("grid-demo-v1");

    function testPublishFeedUpdateStoresLatestState() external {
        SourceFeedEmitter emitter = new SourceFeedEmitter(address(0));

        SourceFeedEmitter.FeedUpdateInput memory update = SourceFeedEmitter.FeedUpdateInput({
            feedId: FEED_ID,
            metricType: METRIC_TYPE,
            sourceId: SOURCE_ID,
            observedAt: 1_772_874_000,
            expiresAt: 1_772_877_600,
            version: 1,
            triggerValue: 97,
            value: 86,
            forecastValue: 97,
            payloadHash: keccak256("payload-1"),
            signatureDigest: keccak256("sig-1")
        });

        emitter.publishFeedUpdate(update);

        SourceFeedEmitter.FeedState memory latest = emitter.getLatestFeed(FEED_ID);
        require(latest.metricType == METRIC_TYPE, "metric type mismatch");
        require(latest.sourceId == SOURCE_ID, "source id mismatch");
        require(latest.version == 1, "version mismatch");
        require(latest.triggerValue == 97, "trigger mismatch");
        require(latest.value == 86, "value mismatch");
        require(latest.forecastValue == 97, "forecast mismatch");
    }

    function testPublishFeedUpdateRequiresIncreasingVersion() external {
        SourceFeedEmitter emitter = new SourceFeedEmitter(address(0));

        SourceFeedEmitter.FeedUpdateInput memory update = SourceFeedEmitter.FeedUpdateInput({
            feedId: FEED_ID,
            metricType: METRIC_TYPE,
            sourceId: SOURCE_ID,
            observedAt: 1_772_874_000,
            expiresAt: 1_772_877_600,
            version: 1,
            triggerValue: 97,
            value: 86,
            forecastValue: 97,
            payloadHash: keccak256("payload-1"),
            signatureDigest: keccak256("sig-1")
        });

        emitter.publishFeedUpdate(update);

        (bool success,) = address(emitter).call(
            abi.encodeWithSelector(SourceFeedEmitter.publishFeedUpdate.selector, update)
        );

        require(!success, "expected revert on duplicate version");
    }
}
