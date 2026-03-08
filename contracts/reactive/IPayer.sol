// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

interface IPayer {
    function pay(uint256 amount) external;

    receive() external payable;
}
