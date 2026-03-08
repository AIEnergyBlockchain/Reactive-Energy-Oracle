// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "./AbstractPayer.sol";
import "./IReactive.sol";
import "./ISystemContract.sol";
import "./IPayable.sol";

abstract contract AbstractReactive is AbstractPayer, IReactive {
    address internal constant SERVICE_ADDR = 0x0000000000000000000000000000000000fffFfF;
    uint256 internal constant REACTIVE_IGNORE =
        0xa65f96fc951c35ead38878e0f0b7a3c744a6f5ccc1476b313353ce31712313ad;

    ISystemContract public service;
    bool public vm;

    modifier vmOnly() {
        require(vm, "VM only");
        _;
    }

    modifier rnOnly() {
        require(!vm, "Reactive Network only");
        _;
    }

    constructor() {
        vendor = IPayable(payable(SERVICE_ADDR));
        service = ISystemContract(payable(SERVICE_ADDR));
        addAuthorizedSender(SERVICE_ADDR);
        detectVm();
    }

    function detectVm() internal {
        uint256 size;
        assembly {
            size := extcodesize(0x0000000000000000000000000000000000fffFfF)
        }
        vm = size == 0;
    }
}
