// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "./AbstractPayer.sol";
import "./IPayable.sol";

abstract contract AbstractCallback is AbstractPayer {
    address public immutable callbackSender;
    address public rvmId;

    modifier callbackOnly(address incomingRvmId) {
        require(msg.sender == callbackSender, "Callback sender only");
        require(rvmId == address(0) || rvmId == incomingRvmId, "Authorized RVM ID only");
        _;
    }

    constructor(address callbackSender_) {
        require(callbackSender_ != address(0), "Callback sender required");
        rvmId = address(0);
        callbackSender = callbackSender_;
        vendor = IPayable(payable(callbackSender_));
        addAuthorizedSender(callbackSender_);
    }
}
