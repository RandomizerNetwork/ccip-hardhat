// import { ethers } from "ethers-V5";

// // Initialize provider and signer
// const provider = new ethers.providers.JsonRpcProvider(process.env.ALCHEMY_SEPOLIA!);
// const signer = new ethers.Wallet(process.env.PRIVATE_KEY_2!, provider);

// // Contract setup
// const contractAddress = "YOUR_CONTRACT_ADDRESS";
// const contractABI = []; // ABI of your contract
// const contract = new ethers.Contract(contractAddress, contractABI, signer);

// // EIP-712 Domain
// const domain = {
//     name: "CCIPMultiTokenSender",
//     version: "1",
//     chainId: 1, // replace with actual chain ID
//     verifyingContract: contractAddress
// };

// // EIP-712 Types
// const types = {
//     EVM2AnyMessageWithSig: [
//         { name: "feeToken", type: "address" },
//         { name: "tokenAmounts", type: "uint256[]" },
//         { name: "data", type: "bytes" },
//         { name: "extraArgs", type: "bytes" },
//         { name: "v", type: "uint8" },
//         { name: "r", type: "bytes32" },
//         { name: "s", type: "bytes32" }
//     ]
// };

// // Message to be signed
// const message = {
//     feeToken: "0x...", // fee token address
//     tokenAmounts: [/* array of amounts */],
//     data: ethers.utils.hexlify(ethers.utils.toUtf8Bytes("")), // or other data
//     extraArgs: ethers.utils.hexlify(ethers.utils.toUtf8Bytes("")), // or other args
//     v: 0,
//     r: ethers.constants.HashZero,
//     s: ethers.constants.HashZero
// };

// async function signAndSend() {
//     // Sign the message
//     const signature = await signer._signTypedData(domain, types, message);

//     // Split the signature
//     const { v, r, s } = ethers.utils.splitSignature(signature);

//     // Update the message with the signature parts
//     message.v = v;
//     message.r = r;
//     message.s = s;

//     // Send the signed message to the contract
//     const tx = await contract.ccipSendWithSig(/* chain selector */, message, {
//         value: ethers.utils.parseEther("0.1") // ETH value, if required
//     });

//     console.log("Transaction hash:", tx.hash);
// }

// signAndSend().catch(console.error);
