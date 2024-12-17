import { BasicNft } from "./../../typechain-types/contracts/BasicNft";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { assert } from "chai";
import { network, deployments, ethers } from "hardhat";
import { developmentChains } from "../../helper-hardhat-config";

const NAME = "Dogie";
const SYMBOL = "DOG";

!developmentChains.includes(network.name)
  ? describe.skip
  : describe("Basic NFT Unit Test", () => {
      let basicNft: BasicNft;
      let deployer: SignerWithAddress;

      beforeEach(async () => {
        const accounts = await ethers.getSigners();
        deployer = accounts[0];
        await deployments.fixture(["basicnft"]);
        basicNft = await ethers.getContract("BasicNft");
      });

      describe("constructor", () => {
        it("initializes the counter correctly", async () => {
          const initialCount = await basicNft.getTokenCounter();
          assert.equal(initialCount.toString(), "0");
        });
        it("initializes the name correctly", async () => {
          const name = await basicNft.name();
          assert.equal(name, NAME);
        });
        it("initializes the symbol correctly", async () => {
          const symbol = await basicNft.symbol();
          assert.equal(symbol, SYMBOL);
        });
      });

      describe("mintNFT", () => {
        beforeEach(async () => {
          const txResponse = await basicNft.mintNft();
          await txResponse.wait(1);
        });

        it("updates the tokenuri correctly after minting", async () => {
          const tokenuri = await basicNft.tokenURI(0);
          assert.equal(tokenuri, await basicNft.TOKEN_URI());
        });

        it("updates the token counter correctly", async () => {
          const tokenCounter = await basicNft.getTokenCounter();
          assert.equal(tokenCounter.toString(), "1");
        });

        it("shows correct balance", async () => {
          const deployerBalance = await basicNft.balanceOf(deployer.address);
          assert.equal(deployerBalance.toString(), "1");
        });

        it("shows owner of nft", async () => {
          const owner = await basicNft.ownerOf("0");
          assert.equal(owner, deployer.address);
        });
      });
    });
