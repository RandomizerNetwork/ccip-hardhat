import {
    time,
    loadFixture,
  } from "@nomicfoundation/hardhat-toolbox/network-helpers";
  import { anyValue } from "@nomicfoundation/hardhat-chai-matchers/withArgs";
  import { expect } from "chai";
  import { ethers } from "hardhat";

  import { CCIPMultiTokenSender, CCIPTokenSender, RandomizerNetwork, TimelockController, TokenLock } from "../typechain-types";
  import getCCIPConfig from "../utils/getCCIPConfig";
import { formatEther } from "ethers";

  describe("RandomToken", function () {
    // We define a fixture to reuse the same setup in every test.
    // We use loadFixture to run this setup once, snapshot that state,
    // and reset Hardhat Network to that snapshot in every test.
    async function deployOneYearLockFixture() {
      const THREE_MONTHS_IN_SECS = 30 * 24 * 60 * 60;
      const SIX_MONTHS_IN_SECS = 182 * 24 * 60 * 60;
      const ONE_YEAR_IN_SECS = 365 * 24 * 60 * 60;
      const EIGHTEEN_MONTHS_IN_SECS = 547 * 24 * 60 * 60;
      const TWO_YEARS_IN_SECS = (365 * 24 * 60 * 60) * 2;
      const THREE_YEARS_IN_SECS = (365 * 24 * 60 * 60) * 3;
      const ONE_GWEI = 1_000_000_000; // 1 billion wei

      // LOCKING AMOUNT
      const DAO_RESERVE    = 453333337   // 51%
      const PARTNERSHIP    = 17777777    // 2%
      const PRIVATE_SALE   = 4444444     // 0.5%
      const PUBLIC_SALE    = 71111111    // 8%
      const TEAM           = 111111111   // 12.5%
      const TREASURY       = 26666666    // 3%
      const AIRDROP        = 35555555    // 4%
      const BUILD          = 35555555    // 4%
      const LP_RESERVER    = 44444444    // 5%
      const ECOSYSTEM_FUND = 88888888    // 10%

      // LOCKING CLIFF TIME
      const CLIFF_DAO_RESERVE = SIX_MONTHS_IN_SECS
      const CLIFF_PARTNERSHIP = SIX_MONTHS_IN_SECS
      const CLIFF_PRIVATE_SALE = SIX_MONTHS_IN_SECS
      const CLIFF_PUBLIC_SALE = 0
      const CLIFF_TEAM = SIX_MONTHS_IN_SECS
      const CLIFF_TREASURY = THREE_MONTHS_IN_SECS
      const CLIFF_AIRDROP = 0
      const CLIFF_BUILD = 0
      const CLIFF_LP_RESERVER = 0
      const CLIFF_ECOSYSTEM_FUND = 0

      // LOCKING LINEAR VEST TIME
      const VESTING_DAO_RESERVE = THREE_YEARS_IN_SECS
      const VESTING_PARTNERSHIP = TWO_YEARS_IN_SECS
      const VESTING_PRIVATE_SALE = EIGHTEEN_MONTHS_IN_SECS
      const VESTING_PUBLIC_SALE = 0
      const VESTING_TEAM = TWO_YEARS_IN_SECS
      const VESTING_TREASURY = TWO_YEARS_IN_SECS
      const VESTING_AIRDROP = 0
      const VESTING_BUILD = 0
      const VESTING_LP_RESERVER = 0
      const VESTING_ECOSYSTEM_FUND = 0

      // CCIP CONFIG
      const getConfig = getCCIPConfig.getRouterConfig('ethereumMainnet')
      const ccipRouter = getConfig.address
      const ccipWhitelistedToken = getConfig.whitelistedTokens.BnM

      const lockedAmount = ONE_GWEI;
      const unlockTime = (await time.latest()) + ONE_YEAR_IN_SECS;
  
      // Contracts are deployed using the first signer/account by default
      const [owner, otherAccount] = await ethers.getSigners();

      const minDelay = 0
      const proposers: any[] = [owner.address]
      const executors: any[] = [owner.address]
      const admin = owner.address
      console.log('before deployment');
      
      const RandomizerNetwork: RandomizerNetwork = await ethers.deployContract("RandomizerNetwork", [owner.address]);
      const TokenLock: TokenLock = await ethers.deployContract("TokenLock", [await RandomizerNetwork.getAddress()]);
      const CCIPTokenSender: CCIPTokenSender = await ethers.deployContract("CCIPTokenSender", [ccipRouter, await RandomizerNetwork.getAddress()]);
      const CCIPMultiTokenSender: CCIPMultiTokenSender = await ethers.deployContract("CCIPMultiTokenSender", [ccipRouter, [await RandomizerNetwork.getAddress()]]);
      console.log('after deployment');

      await RandomizerNetwork.mint(owner.address, lockedAmount);
      console.log('balance owner', await RandomizerNetwork.balanceOf(owner.address));
      console.log('total supply', await RandomizerNetwork.totalSupply());

      // address beneficiary,
      // uint256 start,
      // uint256 cliffDurationInDays,
      // uint256 durationInDays,
      // uint256 totalAmount

      // gnosis multisig initially
      // await TokenLock.addVesting(
      //   owner.address, 
      //   Date.now() * 1000,          // 
      //   Date.now() * 1000 + 300,    // 
      //   7,
      //   formatEther(DAO_RESERVE)
      // );
      
      return { CCIPMultiTokenSender, CCIPTokenSender, RandomizerNetwork, TokenLock, unlockTime, lockedAmount, owner, otherAccount };
    }

    describe("Deployment", function () {
      it("Should deploy token + timelock + governor", async function () {
        const { RandomizerNetwork } = await loadFixture(deployOneYearLockFixture);
        console.log('RandomizerNetwork', await RandomizerNetwork.getAddress())
        console.log('total supply', await RandomizerNetwork.totalSupply());
      });
    });
  });