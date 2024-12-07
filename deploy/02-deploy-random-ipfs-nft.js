const { network, ethers } = require("hardhat");
const {
  developmentChains,
  networkConfig,
} = require("../helper-hardhat-config");
const { verify } = require("../utils/verify");
const {
  storeImages,
  storeTokenUriMetadata,
} = require("../utils/uploadToPinata");

const imagesLocation = "./images/randomNft";

const metadataTemplate = {
  name: "",
  description: "",
  image: "",
  attributes: [
    {
      trait_type: "Cuteness",
      value: 100,
    },
  ],
};

let tokenUris = [
  "ipfs://QmYwFaSdqj7NuqVDWmdyQjUkhWwK158ybnWHqWLbCFTMJP",
  "ipfs://QmSy5X6641zp7xwhMX1kAG1ixja2HU86tCQpRBmcPXA6bf",
  "ipfs://QmNWSTd4bfkWWFmCF21N49Par1TKzAfcCY6ES7DofdfwKj",
];

const VRF_SUB_FUND_AMOUNT = ethers.utils.parseEther("30");

module.exports = async function ({ getNamedAccounts, deployments }) {
  const { deploy, log } = deployments;
  const { deployer } = await getNamedAccounts();
  const chainId = network.config.chainId;

  // Get the IPFS hashes of our images.
  // 1 with our own IPFS node
  // 2 Pinata
  // 3 nft.storage

  if (process.env.UPLOAD_TO_PINATA == "true") {
    tokenUris = await handleTokensUris();
  }

  let vrfCoordinatorV2Address, subscriptionId;

  if (developmentChains.includes(network.name)) {
    const vrfCoordinatorV2Mock = await ethers.getContract(
      "VRFCoordinatorV2Mock"
    );
    vrfCoordinatorV2Address = vrfCoordinatorV2Mock.address;

    const tx = await vrfCoordinatorV2Mock.createSubscription();
    const txReceipt = await tx.wait(1);

    subscriptionId = txReceipt.events[0].args.subId;
    await vrfCoordinatorV2Mock.fundSubscription(
      subscriptionId,
      VRF_SUB_FUND_AMOUNT
    );
  } else {
    vrfCoordinatorV2Address = networkConfig[chainId].vrfCoordinatorV2;
    subscriptionId = networkConfig[chainId].subscriptionId;
  }

  log("--------------------------------------------------------------");

  const args = [
    vrfCoordinatorV2Address,
    subscriptionId,
    networkConfig[chainId].gasLane,
    networkConfig[chainId].callbackGasLimit,
    tokenUris,
    networkConfig[chainId].mintFee,
  ];

  const randomIpfsNft = await deploy("RandomIpfsNft", {
    from: deployer,
    args,
    log: true,
    waitConfirmations: network.config.blockConfirmations || 1,
  });

  if (
    !developmentChains.includes(network.name) &&
    process.env.ETHERSCAN_API_KEY
  ) {
    log("Verifying...");
    await verify(randomIpfsNft.address, args);
  }

  log("------------------------------------------------------------");
};

module.exports.tags = ["all", "randomipfs", "main"];

async function handleTokensUris() {
  let tokenUris = [];

  const { resposnes: imagesUploadResponses, files } = await storeImages(
    imagesLocation
  );

  for (const imagesUploadResponseIndex in imagesUploadResponses) {
    let tokenUriMetadata = { ...metadataTemplate };
    tokenUriMetadata.name = files[imagesUploadResponseIndex].replace(
      ".png",
      ""
    );
    tokenUriMetadata.description = `An adorable ${tokenUriMetadata} pup!`;
    tokenUriMetadata.image = `ipfs://${imagesUploadResponses[imagesUploadResponseIndex].IpfsHash}`;
    console.log(`Uploading ${tokenUriMetadata.name}`);

    const metadataUploadResponse = await storeTokenUriMetadata(
      tokenUriMetadata
    );
    tokenUris.push(`ipfs://${metadataUploadResponse.IpfsHash}`);
  }
  console.log("Token URIs Uploaded! They are:");
  console.log(tokenUris);

  return tokenUris;
}
