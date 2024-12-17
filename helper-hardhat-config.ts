interface NetworkConfig {
  name: string;
  ethUsdPriceFeed: string;
  vrfCoordinatorV2?: string; // Optional, because not all networks have this field (localhost does not)
  gasLane: string;
  callbackGasLimit: string; // This is a string, as it's a large number in string format
  mintFee: string; // Same as above, it's a string due to the large number
  subscriptionId: string | number; // This could be a string or number depending on the network
  blockConfirmations: number;
}

export const networkConfig: { [key: number]: NetworkConfig } = {
  31337: {
    name: "localhost",
    ethUsdPriceFeed: "0x694AA1769357215DE4FAC081bf1f309aDC325306",
    gasLane:
      "0x474e34a077df58807dbe9c96d3c009b23b3c6d0cce433e59bbf5b34f823bc56c", // 30 gwei
    mintFee: "10000000000000000", // 0.01 ETH
    callbackGasLimit: "50000000", // 500,000 gas
    subscriptionId: 1,
    blockConfirmations: 1,
  },
  // Price Feed Address, values can be obtained at https://docs.chain.link/data-feeds/price-feeds/addresses
  11155111: {
    name: "sepolia",
    ethUsdPriceFeed: "0x694AA1769357215DE4FAC081bf1f309aDC325306",
    vrfCoordinatorV2: "0x9DdfaCa8183c41ad55329BdeeD9F6A8d53168B1B",
    gasLane:
      "0x787d74caea10b2b357790d5b5247c2f63d1d91572a9846f780606e4d953677ae",
    callbackGasLimit: "50000000", // 500,000 gas
    mintFee: "10000000000000000", // 0.01 ETH
    subscriptionId:
      "51238782602135163638734166276964334503598593971092232547118543695384205557554",
    blockConfirmations: 1,
  },
};

export const DECIMALS = "18";
export const INITIAL_PRICE = "200000000000000000000";
export const developmentChains = ["hardhat", "localhost"];
