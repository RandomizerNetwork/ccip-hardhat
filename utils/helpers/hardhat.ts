import { ethers } from "hardhat";

export function getCurrentTimestamp(): number {
  return Math.floor(Date.now() / 1000);
}

export async function getCurrentBlockchainTime() {
  const latestBlock = await ethers.provider.getBlock("latest");
  return latestBlock!.timestamp;
}

export async function jumpAheadBlockchainTime(oneYearInSeconds: number) {
  console.log("before increse time", await getCurrentBlockchainTime());
  // Request Hardhat Network to increase time
  await ethers.provider.send("evm_increaseTime", [oneYearInSeconds]);
  // Mine a new block to ensure the time change takes effect
  await ethers.provider.send("evm_mine");
  console.log("after increse time", await getCurrentBlockchainTime());
}
