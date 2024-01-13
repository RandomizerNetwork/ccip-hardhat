
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.21;

import "hardhat/console.sol";
import "@uniswap/v2-core/contracts/interfaces/IUniswapV2Pair.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import {SafeERC20, IERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

contract TokenLock is ReentrancyGuard {
    IERC20 public token;
    address public owner;

    error NotOwner();
    error NoZeroAddress();
    error NoVestingInfo();
    error NothingToRelease();
    error CliffNotReached();

    event Released(address indexed beneficiary, uint256 amount);

    modifier onlyOwner {
        if(msg.sender != owner) revert NotOwner();
        _;
    }

    struct VestingInfo {
        uint256 totalBalance;
        uint256 released;
        uint256 start;
        uint256 cliff;
        uint256 duration;
    }

    mapping(address => VestingInfo[]) public vesting;

    constructor(address _token) {
        if(_token == address(0)) revert NoZeroAddress();
        token = IERC20(_token);
        owner = msg.sender;
    }

    function addVesting(
        address beneficiary,
        uint256 cliffDurationInDays,
        uint256 vestingDurationInDays,
        uint256 totalAmount
    ) public onlyOwner {
        require(msg.sender == owner, "Not Authorized");
        // require(vesting[beneficiary].totalBalance == 0, "Vesting already exists");

        uint256 start = block.timestamp;
        vesting[beneficiary].push(VestingInfo({
            totalBalance: totalAmount,
            released: 0,
            start: start,
            cliff: start + cliffDurationInDays * 1 days,
            duration: vestingDurationInDays * 1 days
        }));
    }

    function release(address beneficiary, uint256 vestingIndex) public nonReentrant {
        require(vestingIndex < vesting[beneficiary].length, "Invalid vesting index");
        VestingInfo storage info = vesting[beneficiary][vestingIndex];

        if (info.totalBalance == 0) revert NoVestingInfo();

        uint256 unreleased = releasableAmount(beneficiary, vestingIndex);

        console.log("Inside release unreleased %o", unreleased);

        if (unreleased == 0) revert NothingToRelease();

        info.released += unreleased;
        SafeERC20.safeTransfer(IERC20(token), beneficiary, unreleased);
        // require(token.transfer(beneficiary, unreleased), "Token transfer failed");

        emit Released(beneficiary, unreleased);
    }

    function releasableAmount(address beneficiary, uint256 vestingIndex) public view returns (uint256) {
        require(vestingIndex < vesting[beneficiary].length, "Invalid vesting index");
        VestingInfo storage info = vesting[beneficiary][vestingIndex];

        // If we are still in the cliff period, no tokens are vested.
        if (block.timestamp < info.cliff) {
            revert CliffNotReached();
        }

        // If the vesting period has ended, all tokens are vested.
        if (block.timestamp >= info.start + info.cliff + info.duration) {
            return info.totalBalance - info.released;
        }

        // Calculate the fraction of the vesting duration that has passed since the cliff.
        uint256 timeSinceCliff = block.timestamp - info.cliff; // Time since the cliff started
        uint256 vestingDurationSinceCliff = info.duration - (info.cliff - info.start); // Total vesting duration minus the cliff duration
        uint256 vested = (info.totalBalance * timeSinceCliff) / vestingDurationSinceCliff;

        // Ensure that the calculation does not exceed the total balance.
        if (vested > info.totalBalance) {
            vested = info.totalBalance;
        }

        return vested - info.released;
    }

}