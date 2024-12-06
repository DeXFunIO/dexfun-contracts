import hre from "hardhat";

import * as keys from "../utils/keys";

async function main() {
  console.log(await hre.dFun.getTokens());
  const tokens = await hre.dFun.getTokens();
  const dataStore = await hre.ethers.getContract("DataStore");
  console.log(dataStore.address);
  for (const [tokenSymbol, tokenConfig] of Object.entries(tokens)) {
    let tokenAddress = tokenConfig.address;
    if (!tokenAddress) {
      tokenAddress = (await hre.ethers.getContract(tokenSymbol)).address;
    }

    const oracleTypeKey = keys.oracleTypeKey(tokenAddress);
    const oracleType = await dataStore.getBytes32(oracleTypeKey);

    const priceFeedKey = keys.priceFeedKey(tokenAddress);
    const priceFeed = await dataStore.getAddress(priceFeedKey);

    console.log("%s %s oracleTypeKey: %s oracleType: %s priceFeed: %s", tokenSymbol.padEnd(5), tokenAddress, oracleTypeKey, oracleType, priceFeed);
  }
}

main()
  .then(() => {
    process.exit(0);
  })
  .catch((ex) => {
    console.error(ex);
    process.exit(1);
  });
