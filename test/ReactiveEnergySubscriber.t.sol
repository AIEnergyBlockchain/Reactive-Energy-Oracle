// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "../contracts/ReactiveEnergySubscriber.sol";
import "../contracts/reactive/IReactive.sol";

contract ReactiveEnergySubscriberTest {
    bytes32 private constant FEED_ID = keccak256("energy-price-demo");
    bytes32 private constant METRIC_TYPE = keccak256("price");
    uint256 private constant FEED_UPDATED_TOPIC_0 =
        uint256(
            keccak256(
                "FeedUpdated(bytes32,bytes32,uint256,uint256,uint256,uint64,uint64,uint64,bytes32,bytes32,bytes32)"
            )
        );

    function testReactIncrementsReactionCountForMatchingLog() external {
        ReactiveEnergySubscriber subscriber = new ReactiveEnergySubscriber(
            11155111,
            address(0x1234),
            FEED_ID,
            METRIC_TYPE,
            95,
            421614,
            address(0x5678),
            500000
        );

        IReactive.LogRecord memory log = IReactive.LogRecord({
            chain_id: 11155111,
            _contract: address(0x1234),
            topic_0: FEED_UPDATED_TOPIC_0,
            topic_1: uint256(FEED_ID),
            topic_2: uint256(METRIC_TYPE),
            topic_3: 97,
            data: abi.encode(
                uint256(86),
                uint256(97),
                uint64(1_772_874_000),
                uint64(1_772_877_600),
                uint64(2),
                keccak256("payload-2"),
                keccak256("sig-2"),
                keccak256("grid-demo-v1")
            ),
            block_number: 1,
            op_code: 0,
            block_hash: 11,
            tx_hash: 22,
            log_index: 0
        });

        subscriber.react(log);

        require(subscriber.reactionCount() == 1, "reaction count mismatch");
    }

    function testReactIgnoresNonMatchingOrigin() external {
        ReactiveEnergySubscriber subscriber = new ReactiveEnergySubscriber(
            11155111,
            address(0x1234),
            FEED_ID,
            METRIC_TYPE,
            95,
            421614,
            address(0x5678),
            500000
        );

        IReactive.LogRecord memory log = IReactive.LogRecord({
            chain_id: 11155111,
            _contract: address(0x9999),
            topic_0: FEED_UPDATED_TOPIC_0,
            topic_1: uint256(FEED_ID),
            topic_2: uint256(METRIC_TYPE),
            topic_3: 97,
            data: abi.encode(
                uint256(86),
                uint256(97),
                uint64(1_772_874_000),
                uint64(1_772_877_600),
                uint64(2),
                keccak256("payload-2"),
                keccak256("sig-2"),
                keccak256("grid-demo-v1")
            ),
            block_number: 1,
            op_code: 0,
            block_hash: 11,
            tx_hash: 22,
            log_index: 0
        });

        subscriber.react(log);

        require(subscriber.reactionCount() == 0, "non-matching log should be ignored");
    }
}
