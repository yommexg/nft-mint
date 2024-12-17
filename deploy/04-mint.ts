import { HardhatRuntimeEnvironment } from "hardhat/types";
import { DeployFunction } from "hardhat-deploy/dist/types";
import { ethers } from "hardhat";
import { developmentChains, networkConfig } from "../helper-hardhat-config";

const deployMint: DeployFunction = async function ({
  getNamedAccounts,
  network,
}: HardhatRuntimeEnvironment) {
  const { deployer } = await getNamedAccounts();
  await ethers.getSigners();

  // Basic NFT
  const basicNft = await ethers.getContract("BasicNft", deployer);
  const basicMintTx = await basicNft.mintNft();
  await basicMintTx.wait(1);
  console.log(`Basic NFT index 0 has tokenURI: ${await basicNft.tokenURI(0)}`);

  // DynamicSVG NFT
  const highValue = ethers.utils.parseEther("4000");
  const dynamicSvgNft = await ethers.getContract("DynamicSvgNft", deployer);
  const dynamicSvgNFTMintTx = await dynamicSvgNft.mintNft(highValue.toString());
  await dynamicSvgNFTMintTx.wait(1);
  console.log(
    `Dynamic SVG NFT index 0 tokenURI: ${await dynamicSvgNft.tokenURI(0)}`
  );

  // Random IPFS NFT
  const randomIpfsNft = await ethers.getContract("RandomIpfsNft", deployer);
  const mintFee = await randomIpfsNft.getMintFee();
  const chainId = network.config.chainId!;

  try {
    await new Promise<void>(async (resolve, reject) => {
      setTimeout(
        () => reject("Timeout: 'NFTMinted' event did not fire"),
        300000
      );
      randomIpfsNft.once("NFTMinted", async () => {
        console.log(
          `Random IPFS NFT index 0 tokenURI: ${await randomIpfsNft.tokenURI(0)}`
        );
        resolve();
      });

      if (developmentChains.includes(network.name)) {
        const vrfCoordinatorV2Mock = await ethers.getContract(
          "VRFCoordinatorV2Mock",
          deployer
        );

        const subscriptionId = networkConfig[chainId]["subscriptionId"];
        await vrfCoordinatorV2Mock.addConsumer(
          subscriptionId,
          randomIpfsNft.address
        );

        const randomIpfsNftMintTx = await randomIpfsNft.requestNft({
          value: mintFee,
        });

        const randomIpfsNftMintTxReceipt = await randomIpfsNftMintTx.wait(1);
        const requestId =
          randomIpfsNftMintTxReceipt.events[1].args.requestId.toString();

        console.log("Fulfill request with ID: ", requestId);
        await vrfCoordinatorV2Mock.fulfillRandomWords(
          requestId,
          randomIpfsNft.address
        );
      } else {
        const gasLimit = await randomIpfsNft.estimateGas.requestNft({
          value: mintFee,
        });

        const gasPrice = await ethers.provider.getGasPrice();

        const randomIpfsNftMintTx = await randomIpfsNft.requestNft({
          value: mintFee,
          gasLimit: "500000",
          maxFeePerGas: gasPrice, // Current gas price for Sepolia
          maxPriorityFeePerGas: gasPrice, // Same for priority fee
        });

        await randomIpfsNftMintTx.wait(1);
      }
    });
  } catch (error) {
    console.error("Error during transaction: ", error);
  }
};

export default deployMint;

deployMint.tags = ["all", "mint"];
