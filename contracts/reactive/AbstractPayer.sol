// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "./IPayable.sol";
import "./IPayer.sol";

abstract contract AbstractPayer is IPayer {
    mapping(address => bool) private senders;

    IPayable public vendor;

    modifier authorizedSenderOnly() {
        require(senders[msg.sender], "Authorized sender only");
        _;
    }

    function pay(uint256 amount) external virtual override authorizedSenderOnly {
        _pay(payable(msg.sender), amount);
    }

    function coverDebt() external {
        uint256 amount = vendor.debt(address(this));
        _pay(payable(address(vendor)), amount);
    }

    function isAuthorizedSender(address sender) external view returns (bool) {
        return senders[sender];
    }

    function _pay(address payable recipient, uint256 amount) internal {
        require(address(this).balance >= amount, "Insufficient funds");
        if (amount > 0) {
            (bool success,) = recipient.call{value: amount}("");
            require(success, "Transfer failed");
        }
    }

    function addAuthorizedSender(address sender) internal {
        senders[sender] = true;
    }

    function removeAuthorizedSender(address sender) internal {
        senders[sender] = false;
    }

    receive() external payable virtual override {}
}
