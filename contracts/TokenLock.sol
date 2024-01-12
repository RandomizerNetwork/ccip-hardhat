
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.21;

// import "hardhat/console.sol";

interface IERC20 {
    function transfer(address recipient, uint256 amount) external returns (bool);
}

contract TokenLock {
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

    mapping(address => VestingInfo) public vesting;

    constructor(address _token) {
        if(_token == address(0)) revert NoZeroAddress();
        token = IERC20(_token);
        owner = msg.sender;
    }

    function addVesting(
        address beneficiary,
        uint256 start,
        uint256 cliffDurationInDays,
        uint256 durationInDays,
        uint256 totalAmount
    ) public onlyOwner {
        require(msg.sender == address(token), "Not Authorized");
        
        require(vesting[beneficiary].totalBalance == 0, "Vesting already exists");

        vesting[beneficiary] = VestingInfo({
            totalBalance: totalAmount,
            released: 0,
            start: start,
            cliff: start + cliffDurationInDays * 1 days,
            duration: durationInDays * 1 days
        });
    }

    function release(address beneficiary) public {
        VestingInfo storage info = vesting[beneficiary];

        if (info.totalBalance == 0) revert NoVestingInfo();

        uint256 unreleased = _releasableAmount(beneficiary);

        if (unreleased == 0) revert NothingToRelease();

        info.released += unreleased;
        require(token.transfer(beneficiary, unreleased), "Token transfer failed");

        emit Released(beneficiary, unreleased);
    }

    function _releasableAmount(address beneficiary) private view returns (uint256) {
        VestingInfo storage info = vesting[beneficiary];

        if (block.timestamp < info.cliff) revert CliffNotReached();
        
        if (block.timestamp >= info.start + info.duration) {
            return info.totalBalance - info.released;
        } else {
            uint256 vested = (info.totalBalance * (block.timestamp - info.start)) / info.duration;
            return vested - info.released;
        }
    }
}

// // Uncomment this line to use console.log
// import "hardhat/console.sol";

// contract Lock {
//     uint public unlockTime;
//     address payable public owner;

//     event Withdrawal(uint amount, uint when);

//     constructor(uint _unlockTime) payable {
//         require(
//             block.timestamp < _unlockTime,
//             "Unlock time should be in the future"
//         );

//         unlockTime = _unlockTime;
//         owner = payable(msg.sender);
//     }

//     function withdraw() public {
//         // Uncomment this line, and the import of "hardhat/console.sol", to print a log in your terminal
//         console.log("Unlock time is %o and block timestamp is %o", unlockTime, block.timestamp);

//         require(block.timestamp >= unlockTime, "You can't withdraw yet");
//         require(msg.sender == owner, "You aren't the owner");

//         emit Withdrawal(address(this).balance, block.timestamp);

//         owner.transfer(address(this).balance);
//     }
// }
