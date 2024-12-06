import hre from "hardhat";

import * as keys from "../utils/keys";

import { getMarketTokenAddress, DEFAULT_MARKET_TYPE } from "../utils/market";

import { MintableToken, WNT } from "../typechain-types";

const { ethers } = hre;

async function getValues(): Promise<{
  wnt: WNT;
  stablecoin: MintableToken
}> {
  if (hre.network.name === "neoXT4") {
    return {
      wnt: await ethers.getContractAt("WNT", "0x1CE16390FD09040486221e912B87551E4e44Ab17"),
      stablecoin: await ethers.getContractAt("MintableToken", "0xa97763a7cDab6E96b04F837174dDe78C34B317Af")
    };
  } else if (hre.network.name === "localhost") {
    return {
      wnt: await ethers.getContract("WGAS"),
      stablecoin: await ethers.getContract("USDC")
    };
  }

  throw new Error("unsupported network");
}

async function main() {
  const marketFactory = await ethers.getContract("MarketFactory");
  const roleStore = await ethers.getContract("RoleStore");
  const dataStore = await ethers.getContract("DataStore");
  const { wnt, stablecoin } = await getValues();

  const wntUsdMarketAddress = await getMarketTokenAddress(
    wnt.address,
    wnt.address,
    stablecoin.address,
    DEFAULT_MARKET_TYPE,
    marketFactory.address,
    roleStore.address,
    dataStore.address
  );
  console.log("market %s", wntUsdMarketAddress);

  const poolAmountA = await dataStore.getUint(keys.poolAmountKey(wntUsdMarketAddress, wnt.address));
  console.log("poolAmountA %s %s %s", poolAmountA.toString(), "WNT", wnt.address);

  const poolAmountB = await dataStore.getUint(keys.poolAmountKey(wntUsdMarketAddress, stablecoin.address));
  console.log("poolAmountB %s", poolAmountB.toString(), "STABLE", stablecoin.address);
}

main()
  .then(() => {
    process.exit(0);
  })
  .catch((ex) => {
    console.error(ex);
    process.exit(1);
  });
