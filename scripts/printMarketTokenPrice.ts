import hre from "hardhat";

import * as keys from "../utils/keys";
import { toLoggableObject } from "../utils/print";
import got from "got";

function getValues() {
  if (hre.network.name === "neoXT4") {
    return {
      tickersUrl: "https://dexfun-api-staging.vercel.app/api/prices/tickers",
    };
  }

  if (hre.network.name === "neoX") {
    return {
      tickersUrl: "", // TODO: add neoX 
    };
  }

  throw new Error("Unsupported network");
}

async function main() {
  const dataStore = await hre.ethers.getContract("DataStore");
  const reader = await hre.ethers.getContract("Reader");

  const { tickersUrl } = getValues();

  const marketToken = process.env.MARKET;
  const market = await reader.getMarket(dataStore.address, marketToken);

  const tickers = (await got(tickersUrl).json()) as any[];
  const tickerByToken = Object.fromEntries(tickers.map((t) => [t.tokenAddress, t]));

  const indexTokenTicker = tickerByToken[market.indexToken];
  const longTokenTicker = tickerByToken[market.longToken];
  const shortTokenTicker = tickerByToken[market.shortToken];

  const pnlFactorType = keys[process.env.PNL_FACTOR_TYPE];
  const maximize = process.env.MAXIMIZE === "true" ? true : false;

  console.log("Getting price data for market %s", marketToken);
  console.log("indexToken: %s longToken: %s shortToken: %s", market.indexToken, market.longToken, market.shortToken);
  console.log("pnlFactorType: %s maximize: %s", pnlFactorType, maximize);

  const data = await reader.getMarketTokenPrice(
    dataStore.address,
    market,
    {
      min: indexTokenTicker.minPrice,
      max: indexTokenTicker.maxPrice,
    },
    {
      min: longTokenTicker.minPrice,
      max: longTokenTicker.maxPrice,
    },
    {
      min: shortTokenTicker.minPrice,
      max: shortTokenTicker.maxPrice,
    },
    pnlFactorType,
    maximize
  );

  console.log("Price for market %s is %s", marketToken, data[0]);
  console.log(toLoggableObject(data[1]));
}

main()
  .then(() => {
    process.exit(0);
  })
  .catch((ex) => {
    console.error(ex);
    process.exit(1);
  });
