import { HardhatRuntimeEnvironment } from "hardhat/types";
import { DeployFunction } from "hardhat-deploy/dist/types";
import { ethers } from "hardhat";
import { developmentChains, networkConfig } from "../helper-hardhat-config";
import { verify } from "../utils/verify";
import fs from "fs";

const dynaimicNftDeploy: DeployFunction = async function ({
  getNamedAccounts,
  deployments,
  network,
}: HardhatRuntimeEnvironment) {
  const { deploy, log } = deployments;
  const { deployer } = await getNamedAccounts();

  const chainId = network.config.chainId!;
  let ethUsdPriceFeedAddress;

  if (developmentChains.includes(network.name)) {
    const EthUsdAggregator = await ethers.getContract("MockV3Aggregator");
    ethUsdPriceFeedAddress = EthUsdAggregator.address;
  } else {
    ethUsdPriceFeedAddress = networkConfig[chainId].ethUsdPriceFeed;
  }

  log("--------------------------------------------------------------");

  const lowSvg = fs.readFileSync("./images/dynamicNFT/frown.svg", {
    encoding: "utf-8",
  });

  const highSvg = fs.readFileSync("./images/dynamicNFT/happy.svg", {
    encoding: "utf-8",
  });

  const args = [ethUsdPriceFeedAddress, lowSvg, highSvg];

  const dynamicSvgNft = await deploy("DynamicSvgNft", {
    from: deployer,
    args,
    log: true,
    waitConfirmations: chainId ? networkConfig[chainId].blockConfirmations : 1,
  });

  if (
    !developmentChains.includes(network.name) &&
    process.env.ETHERSCAN_API_KEY
  ) {
    log("Verifying...");
    await verify(dynamicSvgNft.address, args);
  }

  log("------------------------------------------------------------");
};
export default dynaimicNftDeploy;

dynaimicNftDeploy.tags = ["all", "dynamicsvg", "main"];
