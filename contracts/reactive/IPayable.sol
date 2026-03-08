// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

interface IPayable {
    receive() external payable;

    function debt(address reactiveContract) external view returns (uint256);
}
