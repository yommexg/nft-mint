const { network, getNamedAccounts, deployments, ethers } = require("hardhat");
const { assert, expect } = require("chai");
const {
  developmentChains,
  networkConfig,
} = require("../../helper-hardhat-config");

const NAME = "Random IPFS NFT";
const SYMBOL = "RIN";

!developmentChains.includes(network.name)
  ? describe.skip
  : describe("Random IPFS NFT Unit Test", () => {
      let randomIpfsNft,
        deployer,
        buyer,
        vrfCoordinatorV2Mock,
        event,
        initialBalance,
        endingBalance,
        requestId,
        mintFee;

      const chainId = network.config.chainId;

      beforeEach(async () => {
        accounts = await ethers.getSigners();
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
        it("reverts when you dont pay enough eth for NFT", async () => {
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
          event = receipt.events.find(
            (event) => event.event === "NFTRequested"
          );
          requestId = event.args.requestId;

          endingBalance = await ethers.provider.getBalance(
            randomIpfsNft.address
          );
        });

        it("should request a random number when sufficient ETH is sent", async function () {
          expect(event).to.exist;
          assert(requestId.toString() > 0);
        });

        it("should store the sender address correctly in the mapping", async function () {
          const sender = await randomIpfsNft.s_requestIdToSender(requestId);
          assert(sender, buyer.address);
        });

        it("should increase the contract balance by the mint fee", async function () {
          assert(endingBalance, initialBalance.add(mintFee.toString()));
        });
      });

      describe("fufillRandomWords", () => {
        it("cannot be called until a request for nft has been made", async () => {
          await expect(
            vrfCoordinatorV2Mock.fulfillRandomWords(0, randomIpfsNft.address)
          ).to.be.revertedWith("nonexistent request");
          await expect(
            vrfCoordinatorV2Mock.fulfillRandomWords(1, randomIpfsNft.address)
          ).to.be.revertedWith("nonexistent request");
        });

        it("mints NFT after random number is returned", async function () {
          await new Promise(async (resolve, reject) => {
            randomIpfsNft.once(
              "NFTMinted",
              async (tokenId, dogBreed, newOwner) => {
                try {
                  assert.equal(newOwner, buyer.address);

                  const tokenCounter = await randomIpfsNft.getTokenCounter();
                  assert.equal(tokenCounter.toString(), 1);

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
                  console.log(error);
                  reject(error);
                }
              }
            );

            try {
              const tx = await randomIpfsNft.connect(buyer).requestNft({
                value: mintFee,
              });

              const receipt = await tx.wait();
              event = receipt.events.find(
                (event) => event.event === "NFTRequested"
              );
              requestId = event.args.requestId;

              await vrfCoordinatorV2Mock.fulfillRandomWords(
                requestId,
                randomIpfsNft.address
              );
            } catch (error) {
              console.log(error);
              reject(error);
            }
          });
        });
      });

      describe("getBreedFromModdedRng", () => {
        it("should show that NFT minted is a PUG", async function () {
          // 0 to 9
          const dogBreed = await randomIpfsNft.getBreedFromModdedRng(9);
          assert.equal(dogBreed, 0);
        });

        it("should show that NFT minted is a SHIBA_INU ", async function () {
          // 10 to  29
          const dogBreed = await randomIpfsNft.getBreedFromModdedRng(10);
          assert(dogBreed, 1);
        });

        it("should show that NFT minted is a ST_BENARD", async function () {
          // 30 to 100
          const dogBreed = await randomIpfsNft.getBreedFromModdedRng(101);
          assert(dogBreed, 2);
        });

        it("should revert if random number is out of bounds", async function () {
          await expect(
            randomIpfsNft.getBreedFromModdedRng(2000000)
          ).to.be.revertedWith("RandomIpfsNft__RangeOutOfBounds");
        });
      });
    });
