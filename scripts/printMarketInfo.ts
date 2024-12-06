const fetch = (...args) => import("node-fetch").then(({ default: fetch }) => fetch(...args));
import hre from "hardhat";
import { bigNumberify, expandDecimals, formatAmount } from "../utils/math";
import * as keys from "../utils/keys";
import * as multicall3 from "../external/neoXT4/multicall3.json";

// TODO: need to add stablecoins when ready
const stablecoinPrices = {
  ["".toLowerCase()]: expandDecimals(1, 24), // USDC (neoX)
  ["".toLowerCase()]: expandDecimals(1, 24), // USDT (neoX)
};

function getTickersUrl() {
  const networkName = hre.network.name;

  if (networkName === "neoX") {
    return ""; //TODO: need to add ticker api when ready
  } else {
    throw new Error(`Unsupported network: ${networkName}`);
  }
}

function getTokenPrice({ token, pricesByTokenAddress }) {
  if (token === ethers.constants.AddressZero) {
    return {
      min: bigNumberify(0),
      max: bigNumberify(0),
    };
  }

  let price = pricesByTokenAddress[token.toLowerCase()];

  if (!price) {
    price = {
      min: stablecoinPrices[token.toLowerCase()],
      max: stablecoinPrices[token.toLowerCase()],
    };
  }

  if (!price) {
    throw new Error(`Could not get price for ${token}`);
  }

  return price;
}

async function main() {
  const multicall = await hre.ethers.getContractAt(multicall3.abi, multicall3.address);

  const tokenPricesResponse = await fetch(getTickersUrl());
  const tokenPrices = await tokenPricesResponse.json();
  const pricesByTokenAddress = {};

  for (const tokenPrice of tokenPrices) {
    pricesByTokenAddress[tokenPrice.tokenAddress.toLowerCase()] = {
      min: bigNumberify(tokenPrice.minPrice),
      max: bigNumberify(tokenPrice.maxPrice),
    };
  }

  const tokens = await hre.dFun.getTokens();
  const addressToSymbol: { [address: string]: string } = {};

  for (const [tokenSymbol, tokenConfig] of Object.entries(tokens)) {
    let address = tokenConfig.address;
    if (!address) {
      address = (await hre.ethers.getContract(tokenSymbol)).address;
    }
    addressToSymbol[address] = tokenSymbol;
  }

  const reader = await hre.ethers.getContract("Reader");
  const dataStore = await hre.ethers.getContract("DataStore");

  const markets = [...(await reader.getMarkets(dataStore.address, 0, 100))];

  const marketPricesList = [];

  for (const market of markets) {
    const marketPrices = {
      indexTokenPrice: getTokenPrice({ token: market.indexToken, pricesByTokenAddress }),
      longTokenPrice: getTokenPrice({ token: market.longToken, pricesByTokenAddress }),
      shortTokenPrice: getTokenPrice({ token: market.shortToken, pricesByTokenAddress }),
    };
    marketPricesList.push(marketPrices);
  }

  const marketInfoList = await reader.getMarketInfoList(dataStore.address, marketPricesList, 0, 100);

  const multicallReadParams = [];
  const props = [];
  let propsCount = 0;

  for (const market of markets) {
    for (const [prop, key] of [
      ["positionImpactPoolAmount", keys.positionImpactPoolAmountKey(market.marketToken)],
      ["swapImpactPoolAmountLong", keys.swapImpactPoolAmountKey(market.marketToken, market.longToken)],
      ["swapImpactPoolAmountShort", keys.swapImpactPoolAmountKey(market.marketToken, market.shortToken)],
      ["positionImpactPoolDistributionRate", keys.positionImpactPoolDistributionRateKey(market.marketToken)],
      ["minPositionImpactPoolAmount", keys.minPositionImpactPoolAmountKey(market.marketToken)],
      ["savedFundingFactorPerSecond", keys.savedFundingFactorPerSecondKey(market.marketToken)],
      ["fundingIncreaseFactorPerSecond", keys.fundingIncreaseFactorPerSecondKey(market.marketToken)],
      ["fundingDecreaseFactorPerSecond", keys.fundingDecreaseFactorPerSecondKey(market.marketToken)],
      ["fundingUpdatedAt", keys.fundingUpdatedAtKey(market.marketToken)],
      ["minFundingFactorPerSecond", keys.minFundingFactorPerSecondKey(market.marketToken)],
      ["maxFundingFactorPerSecond", keys.maxFundingFactorPerSecondKey(market.marketToken)],
      ["maxPnlFactorForTradersLong", keys.maxPnlFactorKey(keys.MAX_PNL_FACTOR_FOR_TRADERS, market.marketToken, true)],
      ["maxPnlFactorForTradersShort", keys.maxPnlFactorKey(keys.MAX_PNL_FACTOR_FOR_TRADERS, market.marketToken, false)],
      ["maxPnlFactorForAdlLong", keys.maxPnlFactorKey(keys.MAX_PNL_FACTOR_FOR_ADL, market.marketToken, true)],
      ["maxPnlFactorForAdlShort", keys.maxPnlFactorKey(keys.MAX_PNL_FACTOR_FOR_ADL, market.marketToken, false)],
      ["maxPnlFactorForDepositsLong", keys.maxPnlFactorKey(keys.MAX_PNL_FACTOR_FOR_DEPOSITS, market.marketToken, true)],
      [
        "maxPnlFactorForDepositsShort",
        keys.maxPnlFactorKey(keys.MAX_PNL_FACTOR_FOR_DEPOSITS, market.marketToken, false),
      ],
      [
        "maxPnlFactorForWithdrawalsLong",
        keys.maxPnlFactorKey(keys.MAX_PNL_FACTOR_FOR_WITHDRAWALS, market.marketToken, true),
      ],
      [
        "maxPnlFactorForWithdrawalsShort",
        keys.maxPnlFactorKey(keys.MAX_PNL_FACTOR_FOR_WITHDRAWALS, market.marketToken, false),
      ],
      ["minPnlFactorAfterAdlLong", keys.minPnlFactorAfterAdl(market.marketToken, true)],
      ["minPnlFactorAfterAdlShort", keys.minPnlFactorAfterAdl(market.marketToken, false)],
    ] as const) {
      props.push(prop);
      multicallReadParams.push({
        target: dataStore.address,
        allowFailure: false,
        callData: dataStore.interface.encodeFunctionData("getUint", [key]),
      });
    }

    if (propsCount === 0) {
      propsCount = multicallReadParams.length;
    }
  }

  const multicallReadResult = await multicall.callStatic.aggregate3(multicallReadParams);

  const consoleData: any[] = [];
  const consoleMaxPnlData: any[] = [];

  for (let i = 0; i < marketInfoList.length; i++) {
    const marketInfo = marketInfoList[i];
    const marketPrices = marketPricesList[i];

    const { fundingFactorPerSecond } = marketInfo.nextFunding;

    const indexTokenSymbol = addressToSymbol[marketInfo.market.indexToken];
    const indexToken = tokens[indexTokenSymbol];
    const longTokenSymbol = addressToSymbol[marketInfo.market.longToken];
    const shortTokenSymbol = addressToSymbol[marketInfo.market.shortToken];

    const marketValues: any = {};

    for (let j = 0; j < propsCount; j++) {
      marketValues[props[j]] = bigNumberify(multicallReadResult[i * propsCount + j].returnData);
    }

    const marketLabel = `${indexTokenSymbol || "spot"} ${longTokenSymbol}-${shortTokenSymbol}`;

    let data: any = {
      market: marketLabel,
      "swp impct pool l": formatAmount(
        marketValues.swapImpactPoolAmountLong.mul(marketPrices.longTokenPrice.max),
        30,
        0,
        true
      ),
      "swp impct pool s": formatAmount(
        marketValues.swapImpactPoolAmountShort.mul(marketPrices.shortTokenPrice.max),
        30,
        0,
        true
      ),
    };

    if (indexToken) {
      data = {
        ...data,
        "impct pool": `${formatAmount(
          marketValues.positionImpactPoolAmount,
          indexToken.decimals,
          2,
          true
        )} ($${formatAmount(
          marketValues.positionImpactPoolAmount.mul(marketPrices.indexTokenPrice.max),
          30,
          0,
          true
        )})`,
        "impct distr": formatAmount(
          bigNumberify(marketValues.positionImpactPoolDistributionRate).mul(3600),
          indexToken.decimals + 30,
          6
        ),
        "min impct pool": formatAmount(marketValues.minPositionImpactPoolAmount, indexToken.decimals, 3, true),
        "fund rate h": formatAmount(fundingFactorPerSecond.mul(3600), 30, 10),
        "fund incr rate h": formatAmount(marketValues.fundingIncreaseFactorPerSecond.mul(3600), 30, 10),
        "fund decr rate h": formatAmount(marketValues.fundingDecreaseFactorPerSecond.mul(3600), 30, 10),
        "min fund rate h": formatAmount(marketValues.minFundingFactorPerSecond.mul(3600), 30, 10),
        "max fund rate h": formatAmount(marketValues.maxFundingFactorPerSecond.mul(3600), 30, 10),
        "saved fund h": formatAmount(marketValues.savedFundingFactorPerSecond.mul(3600), 30, 10),
        "fund updated": marketValues.fundingUpdatedAt.toNumber(),
      };

      consoleMaxPnlData.push({
        market: marketLabel,
        traders: `${formatAmount(marketValues.maxPnlFactorForTradersLong, 30, 2)} / ${formatAmount(
          marketValues.maxPnlFactorForTradersShort,
          30,
          2
        )}`,
        deposits: `${formatAmount(marketValues.maxPnlFactorForDepositsLong, 30, 2)} / ${formatAmount(
          marketValues.maxPnlFactorForDepositsShort,
          30,
          2
        )}`,
        withdrawals: `${formatAmount(marketValues.maxPnlFactorForWithdrawalsLong, 30, 2)} / ${formatAmount(
          marketValues.maxPnlFactorForWithdrawalsShort,
          30,
          2
        )}`,
        adl: `${formatAmount(marketValues.maxPnlFactorForAdlLong, 30, 2)} / ${formatAmount(
          marketValues.maxPnlFactorForAdlShort,
          30,
          2
        )}`,
        minAfterAdl: `${formatAmount(marketValues.minPnlFactorAfterAdlLong, 30, 2)} / ${formatAmount(
          marketValues.minPnlFactorAfterAdlShort,
          30,
          2
        )}`,
      });
    }

    consoleData.push(data);
  }

  console.table(consoleData);

  console.log("Max pnl factors");
  console.table(consoleMaxPnlData);
}

main()
  .then(() => {
    process.exit(0);
  })
  .catch((ex) => {
    console.error(ex);
    process.exit(1);
  });
