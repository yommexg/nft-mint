import { RandomIpfsNft } from "../../typechain-types/contracts/RandomIpfsNft";
import { VRFCoordinatorV2Mock } from "../../typechain-types/@chainlink/contracts/src/v0.8/mocks/VRFCoordinatorV2Mock";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { assert, expect } from "chai";
import { network, deployments, ethers } from "hardhat";
import { developmentChains, networkConfig } from "../../helper-hardhat-config";
import { BigNumber } from "ethers";

// Constants for NFT initialization
const NAME = "Random IPFS NFT";
const SYMBOL = "RIN";

// Only run on development chains
!developmentChains.includes(network.name)
  ? describe.skip
  : describe("Random IPFS NFT Unit Test", () => {
      let randomIpfsNft: RandomIpfsNft;
      let deployer: SignerWithAddress;
      let buyer: SignerWithAddress;
      let vrfCoordinatorV2Mock: VRFCoordinatorV2Mock;
      let event: any;
      let initialBalance: BigNumber;
      let endingBalance: BigNumber;
      let requestId: BigNumber;
      let mintFee: BigNumber;

      const chainId = network.config.chainId!;

      beforeEach(async () => {
        const accounts = await ethers.getSigners();
        deployer = accounts[0];
        buyer = accounts[1];
        await deployments.fixture(["all"]);
        randomIpfsNft = await ethers.getContract("RandomIpfsNft");

        vrfCoordinatorV2Mock = await ethers.getContract(
          "VRFCoordinatorV2Mock",
          deployer
        );
        await vrfCoordinatorV2Mock.addConsumer(
          networkConfig[chainId]["subscriptionId"],
          randomIpfsNft.address
        );

        mintFee = await randomIpfsNft.getMintFee();
      });

      describe("constructor", () => {
        it("initializes the counter correctly", async () => {
          const initialCount = await randomIpfsNft.getTokenCounter();
          assert.equal(initialCount.toString(), "0");
        });
        it("initializes the name correctly", async () => {
          const name = await randomIpfsNft.name();
          assert.equal(name, NAME);
        });
        it("initializes the symbol correctly", async () => {
          const symbol = await randomIpfsNft.symbol();
          assert.equal(symbol, SYMBOL);
        });
      });

      describe("requestNFT", () => {
        it("reverts when you don't pay enough ETH for NFT", async () => {
          await expect(randomIpfsNft.requestNft()).to.be.revertedWith(
            "RandomIpfsNft__NeedMoreETHSent"
          );
        });

        beforeEach(async () => {
          initialBalance = await ethers.provider.getBalance(
            randomIpfsNft.address
          );

          const tx = await randomIpfsNft.connect(buyer).requestNft({
            value: mintFee,
          });

          const receipt = await tx.wait();
          event = receipt.events?.find(
            (event: any) => event.event === "NFTRequested"
          );
          if (event) {
            requestId = event.args.requestId;
          }

          endingBalance = await ethers.provider.getBalance(
            randomIpfsNft.address
          );
        });

        it("should request a random number when sufficient ETH is sent", async function () {
          expect(event).to.exist;
          assert(requestId.toString() > "0");
        });

        it("should store the sender address correctly in the mapping", async function () {
          const sender = await randomIpfsNft.s_requestIdToSender(requestId);
          assert.equal(sender, buyer.address);
        });

        it("should increase the contract balance by the mint fee", async function () {
          assert.equal(
            endingBalance.toString(),
            initialBalance.add(mintFee).toString()
          );
        });
      });

      describe("fulfillRandomWords", () => {
        it("cannot be called until a request for nft has been made", async () => {
          await expect(
            vrfCoordinatorV2Mock.fulfillRandomWords(0, randomIpfsNft.address)
          ).to.be.revertedWith("nonexistent request");
          await expect(
            vrfCoordinatorV2Mock.fulfillRandomWords(1, randomIpfsNft.address)
          ).to.be.revertedWith("nonexistent request");
        });

        it("mints NFT after random number is returned", async function () {
          await new Promise<void>(async (resolve, reject) => {
            randomIpfsNft.once(
              "NFTMinted",
              async (
                tokenId: BigNumber,
                dogBreed: BigNumber,
                newOwner: string
              ) => {
                try {
                  assert.equal(newOwner, buyer.address);

                  const tokenCounter = await randomIpfsNft.getTokenCounter();
                  assert.equal(tokenCounter.toString(), "1");

                  const tokenUri = await randomIpfsNft.tokenURI(
                    tokenId.toString()
                  );
                  const dogUri = await randomIpfsNft.getDogTokenUris(
                    dogBreed.toString()
                  );

                  assert.equal(tokenUri.toString().includes("ipfs://"), true);
                  assert.equal(dogUri.toString(), tokenUri.toString());

                  resolve();
                } catch (error) {
                  console.error(error);
                  reject(error);
                }
              }
            );

            try {
              const tx = await randomIpfsNft.connect(buyer).requestNft({
                value: mintFee,
              });

              const receipt = await tx.wait();
              event = receipt.events?.find(
                (event: any) => event.event === "NFTRequested"
              );
              requestId = event?.args.requestId;

              await vrfCoordinatorV2Mock.fulfillRandomWords(
                requestId,
                randomIpfsNft.address
              );
            } catch (error) {
              console.error(error);
              reject(error);
            }
          });
        });
      });

      describe("getBreedFromModdedRng", () => {
        it("should show that NFT minted is a PUG", async function () {
          const dogBreed = await randomIpfsNft.getBreedFromModdedRng(9);
          assert.equal(dogBreed, 0);
        });

        it("should show that NFT minted is a SHIBA_INU", async function () {
          const dogBreed = await randomIpfsNft.getBreedFromModdedRng(10);
          assert.equal(dogBreed, 1);
        });

        it("should show that NFT minted is a ST_BERNARD", async function () {
          const dogBreed = await randomIpfsNft.getBreedFromModdedRng(101);
          assert.equal(dogBreed, 2);
        });

        it("should revert if random number is out of bounds", async function () {
          await expect(
            randomIpfsNft.getBreedFromModdedRng(2000000)
          ).to.be.revertedWith("RandomIpfsNft__RangeOutOfBounds");
        });
      });
    });
