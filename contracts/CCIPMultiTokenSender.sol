// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import {IERC20} from "@chainlink/contracts-ccip/src/v0.8/vendor/openzeppelin-solidity/v4.8.0/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@chainlink/contracts-ccip/src/v0.8/vendor/openzeppelin-solidity/v4.8.0/contracts/token/ERC20/utils/SafeERC20.sol";
import {IRouterClient} from "@chainlink/contracts-ccip/src/v0.8/ccip/interfaces/IRouterClient.sol";
import {Client} from "@chainlink/contracts-ccip/src/v0.8/ccip/libraries/Client.sol";

interface IERC1271 {
    function isValidSignature(bytes32 _hash, bytes memory _signature) external view returns (bytes4 magicValue);
}

contract CCIPMultiTokenSender {
    using SafeERC20 for IERC20;

    error InvalidToken();
    error NoDataAllowed();
    error GasShouldBeZero();
    error ExceedsTokenLimit();

    // EIP-712 Domain Separator
    bytes32 public immutable DOMAIN_SEPARATOR;

    // Struct for EIP-712
    struct EVM2AnyMessageWithSig {
        Client.EVM2AnyMessage message;
        uint8 v;
        bytes32 r;
        bytes32 s;
    }

    // Hash of the struct
    bytes32 public constant EVM2ANYMESSAGE_TYPEHASH = keccak256(
        "EVM2AnyMessageWithSig(address feeToken,uint256[] tokenAmounts,bytes data,bytes extraArgs,uint8 v,bytes32 r,bytes32 s)"
    );

    IRouterClient public immutable ccipRouter;
    mapping(address => bool) public ccipWhitelistedTokens;

    constructor(address _router, address[] memory _tokens) {
        // if (_tokens.length > 5) revert ExceedsTokenLimit();
        ccipRouter = IRouterClient(_router);
        for (uint i = 0; i < _tokens.length; i++) {
            ccipWhitelistedTokens[_tokens[i]] = true;
            IERC20(_tokens[i]).approve(_router, type(uint256).max);
        }
        DOMAIN_SEPARATOR = keccak256(
            abi.encode(
                keccak256(
                    "EIP712Domain(string name,string version,uint256 chainId,address verifyingContract)"
                ),
                keccak256(bytes("CCIPMultiTokenSender")), // Replace with your contract's name
                keccak256(bytes("1")), // Version
                block.chainid,
                address(this)
            )
        );
    }

    /** @notice Validates and processes the signed message
     *  @param messageWithSig The signed message
     *  @return messageId The CCIP transfer response from the destination chain
     */
    function ccipSendWithSig(
        uint64 destinationChainSelector,
        EVM2AnyMessageWithSig calldata messageWithSig
    ) external payable returns (bytes32 messageId) {
        // Verify the signature
        require(
            _verify(messageWithSig),
            "Invalid signature"
        );

        // Process the message
        return this.ccipSend(destinationChainSelector, messageWithSig.message);
    }

    /** @notice Verifies the signature for both EIP712 for EOA and EIP1271 for AA
     *  @param messageWithSig The message with signature
     *  @return True if the signature is valid, false otherwise
     */
    function _verify(EVM2AnyMessageWithSig calldata messageWithSig)
        internal
        view
        returns (bool)
    {
        bytes32 structHash = keccak256(
            abi.encode(
                EVM2ANYMESSAGE_TYPEHASH,
                messageWithSig.message.feeToken,
                keccak256(abi.encode(messageWithSig.message.tokenAmounts)),
                keccak256(messageWithSig.message.data),
                keccak256(messageWithSig.message.extraArgs),
                messageWithSig.v,
                messageWithSig.r,
                messageWithSig.s
            )
        );

        bytes32 digest = keccak256(abi.encodePacked("\x19\x01", DOMAIN_SEPARATOR, structHash));
        address signer = ecrecover(digest, messageWithSig.v, messageWithSig.r, messageWithSig.s);
        
        if (signer == address(0)) {
            return false;
        }

        uint256 size;
        assembly {
            size := extcodesize(signer)
        }

        if (size > 0) {
            // Signer is a contract, use EIP-1271
            bytes memory signature = abi.encodePacked(messageWithSig.r, messageWithSig.s, messageWithSig.v);
            return IERC1271(signer).isValidSignature(digest, signature) == 0x1626ba7e; // ERC1271 MAGIC VALUE
        } else {
            // Signer is an EOA
            return signer == msg.sender;
        }
    }

    /** @notice Forwards Fee request to the CCIP router and returns the result
     *  @dev Reverts with appropriate reason upon invalid message.
     *  @param destinationChainSelector The destination chainSelector
     *  @param message The cross-chain CCIP message including data and/or tokens
     *  @return fee The transfer fee for message delivery to destination chain
     */
    function getFee(
        uint64 destinationChainSelector,
        Client.EVM2AnyMessage calldata message
    ) external view returns (uint256 fee) {
        _validateMessage(message);
        return ccipRouter.getFee(destinationChainSelector, message);
    }

    function getSupportedTokens(
        uint64 destinationChainSelector
    ) external view returns (address[] memory supportedTokens) {
        return ccipRouter.getSupportedTokens(destinationChainSelector);
    }

    /** @notice Validates the message content, forwards it to the CCIP router and returns the result.
     *  @param destinationChainSelector The destination chainSelector
     *  @param message The cross-chain CCIP message including data and/or tokens
     *  @return messageId The CCIP transfer response from the destination chain
     */
    function ccipSend(
        uint64 destinationChainSelector,
        Client.EVM2AnyMessage calldata message
    ) external payable returns (bytes32 messageId) {
        _validateMessage(message);
        if (message.feeToken != address(0)) {
            uint256 feeAmount = ccipRouter.getFee(
                destinationChainSelector,
                message
            );
            IERC20(message.feeToken).safeTransferFrom(
                msg.sender,
                address(this),
                feeAmount
            );
            IERC20(message.feeToken).approve(address(ccipRouter), feeAmount);
        }

        // Transfer the tokens from the sender to this contract.
        for (uint i = 0; i < message.tokenAmounts.length; i++) {
            IERC20 token = IERC20(message.tokenAmounts[i].token);
            uint256 amount = message.tokenAmounts[i].amount;
            token.safeTransferFrom(msg.sender, address(this), amount);
        }

        return
            ccipRouter.ccipSend{value: msg.value}(
                destinationChainSelector,
                message
            );
    }

    /** @notice Validates the message content
     *  @dev allows a single token to be sent with no data
     */
    function _validateMessage(
        Client.EVM2AnyMessage calldata message
    ) internal view {
        if (message.tokenAmounts.length == 0 || message.tokenAmounts.length > 5) revert ExceedsTokenLimit();

        for (uint i = 0; i < message.tokenAmounts.length; i++) {
            if (!ccipWhitelistedTokens[message.tokenAmounts[i].token]) {
                revert InvalidToken();
            }
        }

        if (message.data.length > 0) revert NoDataAllowed();

        if (
            message.extraArgs.length == 0 ||
            bytes4(message.extraArgs) != Client.EVM_EXTRA_ARGS_V1_TAG
        ) revert GasShouldBeZero();

        if (
            abi
                .decode(message.extraArgs[4:], (Client.EVMExtraArgsV1))
                .gasLimit != 0
        ) revert GasShouldBeZero();
    }
}
