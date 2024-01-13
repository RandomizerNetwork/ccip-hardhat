  import { time, loadFixture } from "@nomicfoundation/hardhat-toolbox/network-helpers";
  import { anyValue } from "@nomicfoundation/hardhat-chai-matchers/withArgs";
  import { expect } from "chai";
  import { ethers } from "hardhat";
  import { formatEther, parseEther } from "ethers";
  import { CCIPMultiTokenSender, CCIPTokenSender, RandomizerNetwork, TokenLock, PinkLock02 } from "../typechain-types";
  import { CLIFF_DAO_RESERVE, CLIFF_PARTNERSHIP, DAO_RESERVE, PARTNERSHIP, VESTING_DAO_RESERVE, VESTING_PARTNERSHIP, halfYearInSeconds, oneYearInSeconds, threeYearsInSeconds } from "../utils/vesting/randomTokenDistribution";
  import { getCurrentTimestamp, jumpAheadBlockchainTime } from "../utils/helpers/hardhat";
  import getCCIPConfig from "../utils/ccip/getCCIPConfig";

  describe("RandomToken", function () {
    // We define a fixture to reuse the same setup in every test.
    // We use loadFixture to run this setup once, snapshot that state,
    // and reset Hardhat Network to that snapshot in every test.
    async function deployOneYearLockFixture() {
      // GNOSIS SAFE - MATIC - MULTISIG - 
      const SAFE = "0xA8c10CEB5F5d0691D3aa1201797cb106409Cce79"
      // matic:owner:0x1a912923Fc5E9cdA84866B13912EE90e0253f016

      // CCIP CONFIG
      const getConfig = getCCIPConfig.getRouterConfig('polygonMainnet')
      const ccipRouter = getConfig.address
      const ccipWhitelistedToken = getConfig.whitelistedTokens.BnM

      // Contracts are deployed using the first signer/account by default
      const [owner, otherAccount, daoMultisig, partnershipsMultisig] = await ethers.getSigners();

      console.log('--------------------------- starting contracts deployment ---------------------------');
      const RandomizerNetwork: RandomizerNetwork = await ethers.deployContract("RandomizerNetwork", [owner.address]);
      const TokenLock: TokenLock = await ethers.deployContract("TokenLock", [await RandomizerNetwork.getAddress()]);
      const CCIPMultiTokenSender: CCIPMultiTokenSender = await ethers.deployContract("CCIPMultiTokenSender", [ccipRouter, [await RandomizerNetwork.getAddress()]]);
      const CCIPTokenSender: CCIPTokenSender = await ethers.deployContract("CCIPTokenSender", [ccipRouter, await RandomizerNetwork.getAddress()]);
      const PinkLock02: PinkLock02 = await ethers.deployContract("PinkLock02");

      console.log('--------------------------- mint total supply ---------------------------');
      await RandomizerNetwork.mint(owner.address, parseEther("888888888"));
      console.log('balance owner', await RandomizerNetwork.balanceOf(owner.address));
      console.log('total supply', await RandomizerNetwork.totalSupply());

      console.log('--------------------------- after contract deployment ---------------------------');
      return { 
        // OWNER ADDRESSESS
        owner, otherAccount, daoMultisig, partnershipsMultisig, SAFE,
        // DEPLOYED CONTRACTS
        CCIPMultiTokenSender, CCIPTokenSender, RandomizerNetwork, TokenLock, PinkLock02,
      };
    }

    describe("Deployment", function () {
      it("Should lock RANDOM tokens for DAO RESERVE distribution", async function () {
        const { RandomizerNetwork, TokenLock, daoMultisig, owner } = await loadFixture(deployOneYearLockFixture);

        console.log('--------------------------- starting TOKEN LOCK distribution ---------------------------');
        console.log('balance TokenLock', await RandomizerNetwork.balanceOf(await TokenLock.getAddress()));
        await RandomizerNetwork.transfer(await TokenLock.getAddress(), parseEther(DAO_RESERVE));
        console.log('balance TokenLock', await RandomizerNetwork.balanceOf(await TokenLock.getAddress()));

        // gnosis multisig initially
        await TokenLock.connect(owner).addVesting(
          daoMultisig.address,       // beneficiary
          CLIFF_DAO_RESERVE,         // cliffDurationInDays,
          VESTING_DAO_RESERVE,       // vestingDurationInDays,
          parseEther(DAO_RESERVE)    // totalAmount
        );
        
        // withdraw after 12 months
        await expect(TokenLock.connect(daoMultisig).release(daoMultisig.address, 0)).to.be.revertedWithCustomError(TokenLock, 'CliffNotReached')

        console.log('balance daoMultisig after initial release', await RandomizerNetwork.balanceOf(await daoMultisig.getAddress()));

        console.log('--------------------------- before increse time ---------------------------');
        await jumpAheadBlockchainTime(halfYearInSeconds);

        console.log('balance daoMultisig', await RandomizerNetwork.balanceOf(await daoMultisig.getAddress()));
        await TokenLock.connect(daoMultisig).release(daoMultisig.address, 0)
        console.log('balance daoMultisig', await RandomizerNetwork.balanceOf(await daoMultisig.getAddress()));
                
        await jumpAheadBlockchainTime(oneYearInSeconds);

        console.log('balance daoMultisig', await RandomizerNetwork.balanceOf(await daoMultisig.getAddress()));
        await TokenLock.connect(daoMultisig).release(daoMultisig.address, 0)
        console.log('balance daoMultisig', await RandomizerNetwork.balanceOf(await daoMultisig.getAddress()));
                
        await jumpAheadBlockchainTime(oneYearInSeconds);

        console.log('balance daoMultisig', await RandomizerNetwork.balanceOf(await daoMultisig.getAddress()));
        await TokenLock.connect(daoMultisig).release(daoMultisig.address, 0)
        console.log('balance daoMultisig', await RandomizerNetwork.balanceOf(await daoMultisig.getAddress()));
                
        console.log('--------------------------- before pre-final increase time ---------------------------');
        await jumpAheadBlockchainTime(oneYearInSeconds);

        console.log('balance daoMultisig', await RandomizerNetwork.balanceOf(await daoMultisig.getAddress()));
        // await expect(TokenLock.connect(daoMultisig).release(daoMultisig.address, 0)).to.be.revertedWithCustomError(TokenLock, 'NothingToRelease')
        await TokenLock.connect(daoMultisig).release(daoMultisig.address, 0)
        console.log('balance daoMultisig', await RandomizerNetwork.balanceOf(await daoMultisig.getAddress()));

        console.log('--------------------------- before final increase time ---------------------------');
        await jumpAheadBlockchainTime(oneYearInSeconds);

        console.log('balance daoMultisig', await RandomizerNetwork.balanceOf(await daoMultisig.getAddress()));
        await expect(TokenLock.connect(daoMultisig).release(daoMultisig.address, 0)).to.be.revertedWithCustomError(TokenLock, 'NothingToRelease')
        // await TokenLock.connect(daoMultisig).release(daoMultisig.address)
        console.log('balance daoMultisig', await RandomizerNetwork.balanceOf(await daoMultisig.getAddress()));
      });

      it("Should lock RANDOM tokens for STRATEGIC PARTNERSHIPS distribution", async function () {
        const { RandomizerNetwork, TokenLock, owner, partnershipsMultisig } = await loadFixture(deployOneYearLockFixture);

        console.log('balance TokenLock', await RandomizerNetwork.balanceOf(await TokenLock.getAddress()));
        await RandomizerNetwork.transfer(await TokenLock.getAddress(), parseEther(PARTNERSHIP));
        console.log('balance TokenLock', await RandomizerNetwork.balanceOf(await TokenLock.getAddress()));

        // withdraw after 12 months
        await expect(TokenLock.connect(partnershipsMultisig).release(partnershipsMultisig.address, 0)).to.be.revertedWithCustomError(TokenLock, 'CliffNotReached')
        
        // gnosis multisig initially
        await TokenLock.connect(owner).addVesting(
          partnershipsMultisig.address,   // beneficiary
          CLIFF_PARTNERSHIP,              // cliffDurationInDays,
          VESTING_PARTNERSHIP,            // vestingDurationInDays,
          parseEther(PARTNERSHIP)         // totalAmount
        );
        
        console.log('balance TokenLock', await RandomizerNetwork.balanceOf(await TokenLock.getAddress()));
        await RandomizerNetwork.transfer(await TokenLock.getAddress(), parseEther(PARTNERSHIP));
        console.log('balance TokenLock', await RandomizerNetwork.balanceOf(await TokenLock.getAddress()));

        console.log('--------------------------- before pre-final increase time ---------------------------');
        await jumpAheadBlockchainTime(oneYearInSeconds);

        console.log('balance daoMultisig', await RandomizerNetwork.balanceOf(await partnershipsMultisig.getAddress()));
        await TokenLock.connect(partnershipsMultisig).release(partnershipsMultisig.address, 1)
        console.log('balance partnershipsMultisig', await RandomizerNetwork.balanceOf(await partnershipsMultisig.getAddress()));

        // await expect(TokenLock.connect(partnershipsMultisig).release(partnershipsMultisig.address, 0)).to.be.revertedWithCustomError(TokenLock, 'NothingToRelease')
      });

      it("Should lock RANDOM Tokens for Partnerships distributions", async function () {
        const { RandomizerNetwork, TokenLock, owner, partnershipsMultisig } = await loadFixture(deployOneYearLockFixture);
        
        console.log('balance TokenLock', await RandomizerNetwork.balanceOf(await TokenLock.getAddress()));
        await RandomizerNetwork.transfer(await TokenLock.getAddress(), PARTNERSHIP);

        // withdraw after 12 months
        await expect(TokenLock.connect(partnershipsMultisig).release(partnershipsMultisig.address, 0)).to.be.revertedWithCustomError(TokenLock, 'CliffNotReached')

        // gnosis multisig initially
        await TokenLock.connect(owner).addVesting(
          partnershipsMultisig.address,                  // beneficiary
          CLIFF_PARTNERSHIP,                             // cliffDurationInDays,
          VESTING_PARTNERSHIP,                           // vestingDurationInDays,
          parseEther(PARTNERSHIP)                        // totalAmount
        );

        console.log('--------------------------- before pre-final increase time ---------------------------');
        await jumpAheadBlockchainTime(oneYearInSeconds);

        console.log('balance daoMultisig', await RandomizerNetwork.balanceOf(await partnershipsMultisig.getAddress()));
        await TokenLock.connect(partnershipsMultisig).release(partnershipsMultisig.address, 1)
        console.log('balance partnershipsMultisig', await RandomizerNetwork.balanceOf(await partnershipsMultisig.getAddress()));

        // await expect(TokenLock.connect(partnershipsMultisig).release(partnershipsMultisig.address, 0)).to.be.revertedWithCustomError(TokenLock, 'NothingToRelease')
      });

      it("Should lock RANDOM LP Tokens for LP RESERVE for UNISWAP V2 distribution", async function () {
        const {RandomizerNetwork, PinkLock02, SAFE } = await loadFixture(deployOneYearLockFixture);
        await RandomizerNetwork.approve(await PinkLock02.getAddress(), parseEther("1"))
        await PinkLock02.lock(
            SAFE,                                         // owner
            await RandomizerNetwork.getAddress(),         // token
            false,                                        // isLpToken
            parseEther("1"),                              // amount
            getCurrentTimestamp() + threeYearsInSeconds,  // unlockDate
            "Lock WETH/RANDOM LP for 3 years"             // description
          )

          console.log('--------------------------- before pre-final increase time ---------------------------');
          await jumpAheadBlockchainTime(oneYearInSeconds);
      });

    });
  });