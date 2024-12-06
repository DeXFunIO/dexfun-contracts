import { HardhatRuntimeEnvironment } from "hardhat/types";

const func = async ({ getNamedAccounts, deployments, dFun }: HardhatRuntimeEnvironment) => {
  const { deploy, execute } = deployments;
  const { deployer } = await getNamedAccounts();
  const oracleConfig = await dFun.getOracle();

  for (const [tokenSymbol, { priceFeed }] of Object.entries(oracleConfig.tokens!)) {
    if (!priceFeed || !priceFeed.deploy) {
      continue;
    }

    const contractName = `${tokenSymbol}PriceFeed`;
    const { address } = await deploy(contractName, {
      from: deployer,
      log: true,
      contract: "MockPriceFeed",
    });
    priceFeed.address = address;

    await execute(contractName, { from: deployer, log: true }, "setAnswer", priceFeed.initPrice);
  }
};

func.skip = async ({ network }: HardhatRuntimeEnvironment) => {
  return network.name === "neoXT4";
};

func.dependencies = ["Tokens", "DataStore"];
func.tags = ["PriceFeeds"];
export default func;
