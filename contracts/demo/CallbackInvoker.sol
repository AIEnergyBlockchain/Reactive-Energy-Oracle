// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "../DestinationActionVault.sol";

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
