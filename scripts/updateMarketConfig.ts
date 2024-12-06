import hre, { network } from "hardhat";

import { validateMarketConfigs } from "./validateMarketConfigsUtils";
import { encodeData } from "../utils/hash";
import { bigNumberify } from "../utils/math";
import { getMarketKey, getMarketTokenAddresses, getOnchainMarkets } from "../utils/market";
import { getFullKey, appendUintConfigIfDifferent } from "../utils/config";
import * as keys from "../utils/keys";
import * as multicall3 from "../external/neoXT4/multicall3.json";

const processMarkets = async ({ markets, onchainMarketsByTokens, tokens, generalConfig, handleConfig }) => {
  for (const marketConfig of markets) {
    const [indexToken, longToken, shortToken] = getMarketTokenAddresses(marketConfig, tokens);
    const marketKey = getMarketKey(indexToken, longToken, shortToken);
    const onchainMarket = onchainMarketsByTokens[marketKey];

    if (!onchainMarket) {
      console.warn("WARN: market %s:%s:%s:%s does not exist. skip", marketKey, indexToken, longToken, shortToken);
      continue;
    }

    const marketToken = onchainMarket.marketToken;

    await handleConfig(
      "uint",
      keys.MAX_POOL_AMOUNT,
      encodeData(["address", "address"], [marketToken, longToken]),
      marketConfig.maxLongTokenPoolAmount,
      `maxLongTokenPoolAmount ${marketToken}, ${longToken}`
    );

    await handleConfig(
      "uint",
      keys.MAX_POOL_AMOUNT,
      encodeData(["address", "address"], [marketToken, shortToken]),
      marketConfig.maxShortTokenPoolAmount,
      `maxShortTokenPoolAmount ${marketToken}, ${shortToken}`
    );

    await handleConfig(
      "uint",
      keys.MAX_POOL_AMOUNT_FOR_DEPOSIT,
      encodeData(["address", "address"], [marketToken, longToken]),
      marketConfig.maxLongTokenPoolAmountForDeposit,
      `maxLongTokenPoolAmountForDeposit ${marketToken}, ${longToken}`
    );

    await handleConfig(
      "uint",
      keys.MAX_POOL_AMOUNT_FOR_DEPOSIT,
      encodeData(["address", "address"], [marketToken, shortToken]),
      marketConfig.maxShortTokenPoolAmountForDeposit,
      `maxShortTokenPoolAmountForDeposit ${marketToken}, ${shortToken}`
    );

    await handleConfig(
      "uint",
      keys.SWAP_IMPACT_EXPONENT_FACTOR,
      encodeData(["address"], [marketToken]),
      marketConfig.swapImpactExponentFactor,
      `swapImpactExponentFactor ${marketToken}`
    );

    await handleConfig(
      "uint",
      keys.SWAP_FEE_FACTOR,
      encodeData(["address", "bool"], [marketToken, true]),
      marketConfig.swapFeeFactorForPositiveImpact,
      `swapFeeFactorForPositiveImpact ${marketToken}`
    );

    await handleConfig(
      "uint",
      keys.SWAP_FEE_FACTOR,
      encodeData(["address", "bool"], [marketToken, false]),
      marketConfig.swapFeeFactorForNegativeImpact,
      `swapFeeFactorForNegativeImpact ${marketToken}`
    );

    await handleConfig(
      "uint",
      keys.SWAP_IMPACT_FACTOR,
      encodeData(["address", "bool"], [marketToken, true]),
      marketConfig.positiveSwapImpactFactor,
      `positiveSwapImpactFactor ${marketToken}`
    );

    await handleConfig(
      "uint",
      keys.SWAP_IMPACT_FACTOR,
      encodeData(["address", "bool"], [marketToken, false]),
      marketConfig.negativeSwapImpactFactor,
      `negativeSwapImpactFactor ${marketToken}`
    );

    await handleConfig(
      "uint",
      keys.TOKEN_TRANSFER_GAS_LIMIT,
      encodeData(["address"], [marketToken]),
      generalConfig.tokenTransferGasLimit,
      `tokenTransferGasLimit ${marketToken}`
    );

    // the rest of the params are not used for swap-only markets
    if (marketConfig.swapOnly) {
      continue;
    }

    await handleConfig(
      "uint",
      keys.MIN_COLLATERAL_FACTOR,
      encodeData(["address"], [marketToken]),
      marketConfig.minCollateralFactor,
      `minCollateralFactor ${marketToken}`
    );

    await handleConfig(
      "uint",
      keys.MIN_COLLATERAL_FACTOR_FOR_OPEN_INTEREST_MULTIPLIER,
      encodeData(["address", "bool"], [marketToken, true]),
      marketConfig.minCollateralFactorForOpenInterestMultiplierLong,
      `minCollateralFactorForOpenInterestMultiplierLong ${marketToken}`
    );

    await handleConfig(
      "uint",
      keys.MIN_COLLATERAL_FACTOR_FOR_OPEN_INTEREST_MULTIPLIER,
      encodeData(["address", "bool"], [marketToken, false]),
      marketConfig.minCollateralFactorForOpenInterestMultiplierShort,
      `minCollateralFactorForOpenInterestMultiplierShort ${marketToken}`
    );

    await handleConfig(
      "uint",
      keys.MAX_OPEN_INTEREST,
      encodeData(["address", "bool"], [marketToken, true]),
      marketConfig.maxOpenInterestForLongs,
      `maxOpenInterestForLongs ${marketToken}`
    );

    await handleConfig(
      "uint",
      keys.MAX_OPEN_INTEREST,
      encodeData(["address", "bool"], [marketToken, false]),
      marketConfig.maxOpenInterestForShorts,
      `maxOpenInterestForShorts ${marketToken}`
    );

    await handleConfig(
      "uint",
      keys.RESERVE_FACTOR,
      encodeData(["address", "bool"], [marketToken, true]),
      marketConfig.reserveFactorLongs,
      `reserveFactorLongs ${marketToken}`
    );

    await handleConfig(
      "uint",
      keys.RESERVE_FACTOR,
      encodeData(["address", "bool"], [marketToken, false]),
      marketConfig.reserveFactorShorts,
      `reserveFactorShorts ${marketToken}`
    );

    await handleConfig(
      "uint",
      keys.OPEN_INTEREST_RESERVE_FACTOR,
      encodeData(["address", "bool"], [marketToken, true]),
      marketConfig.openInterestReserveFactorLongs,
      `openInterestReserveFactorLongs ${marketToken}`
    );

    await handleConfig(
      "uint",
      keys.OPEN_INTEREST_RESERVE_FACTOR,
      encodeData(["address", "bool"], [marketToken, false]),
      marketConfig.openInterestReserveFactorShorts,
      `openInterestReserveFactorShorts ${marketToken}`
    );

    await handleConfig(
      "uint",
      keys.MAX_PNL_FACTOR,
      encodeData(["bytes32", "address", "bool"], [keys.MAX_PNL_FACTOR_FOR_TRADERS, marketToken, true]),
      marketConfig.maxPnlFactorForTradersLongs,
      `maxPnlFactorForTradersLongs ${marketToken}`
    );

    await handleConfig(
      "uint",
      keys.MAX_PNL_FACTOR,
      encodeData(["bytes32", "address", "bool"], [keys.MAX_PNL_FACTOR_FOR_TRADERS, marketToken, false]),
      marketConfig.maxPnlFactorForTradersShorts,
      `maxPnlFactorForTradersShorts ${marketToken}`
    );

    await handleConfig(
      "uint",
      keys.MAX_PNL_FACTOR,
      encodeData(["bytes32", "address", "bool"], [keys.MAX_PNL_FACTOR_FOR_ADL, marketToken, true]),
      marketConfig.maxPnlFactorForAdlLongs,
      `maxPnlFactorForAdlLongs ${marketToken}`
    );

    await handleConfig(
      "uint",
      keys.MAX_PNL_FACTOR,
      encodeData(["bytes32", "address", "bool"], [keys.MAX_PNL_FACTOR_FOR_ADL, marketToken, false]),
      marketConfig.maxPnlFactorForAdlShorts,
      `maxPnlFactorForAdlShorts ${marketToken}`
    );

    await handleConfig(
      "uint",
      keys.MIN_PNL_FACTOR_AFTER_ADL,
      encodeData(["address", "bool"], [marketToken, true]),
      marketConfig.minPnlFactorAfterAdlLongs,
      `minPnlFactorAfterAdlLongs ${marketToken}`
    );

    await handleConfig(
      "uint",
      keys.MIN_PNL_FACTOR_AFTER_ADL,
      encodeData(["address", "bool"], [marketToken, false]),
      marketConfig.minPnlFactorAfterAdlShorts,
      `minPnlFactorAfterAdlShorts ${marketToken}`
    );

    await handleConfig(
      "uint",
      keys.MAX_PNL_FACTOR,
      encodeData(["bytes32", "address", "bool"], [keys.MAX_PNL_FACTOR_FOR_DEPOSITS, marketToken, true]),
      marketConfig.maxPnlFactorForDepositsLongs,
      `maxPnlFactorForDepositsLongs ${marketToken}`
    );

    await handleConfig(
      "uint",
      keys.MAX_PNL_FACTOR,
      encodeData(["bytes32", "address", "bool"], [keys.MAX_PNL_FACTOR_FOR_DEPOSITS, marketToken, false]),
      marketConfig.maxPnlFactorForDepositsShorts,
      `maxPnlFactorForDepositsShorts ${marketToken}`
    );

    await handleConfig(
      "uint",
      keys.MAX_PNL_FACTOR,
      encodeData(["bytes32", "address", "bool"], [keys.MAX_PNL_FACTOR_FOR_WITHDRAWALS, marketToken, true]),
      marketConfig.maxPnlFactorForWithdrawalsLongs,
      `maxPnlFactorForWithdrawalsLongs ${marketToken}`
    );

    await handleConfig(
      "uint",
      keys.MAX_PNL_FACTOR,
      encodeData(["bytes32", "address", "bool"], [keys.MAX_PNL_FACTOR_FOR_WITHDRAWALS, marketToken, false]),
      marketConfig.maxPnlFactorForWithdrawalsShorts,
      `maxPnlFactorForWithdrawalsShorts ${marketToken}`
    );

    await handleConfig(
      "uint",
      keys.POSITION_IMPACT_EXPONENT_FACTOR,
      encodeData(["address"], [marketToken]),
      marketConfig.positionImpactExponentFactor,
      `positionImpactExponentFactor ${marketToken}`
    );

    await handleConfig(
      "uint",
      keys.FUNDING_FACTOR,
      encodeData(["address"], [marketToken]),
      marketConfig.fundingFactor,
      `fundingFactor ${marketToken}`
    );

    await handleConfig(
      "uint",
      keys.FUNDING_EXPONENT_FACTOR,
      encodeData(["address"], [marketToken]),
      marketConfig.fundingExponentFactor,
      `fundingFactor ${marketToken}`
    );

    await handleConfig(
      "uint",
      keys.FUNDING_INCREASE_FACTOR_PER_SECOND,
      encodeData(["address"], [marketToken]),
      marketConfig.fundingIncreaseFactorPerSecond,
      `fundingIncreaseFactorPerSecond ${marketToken}`
    );

    await handleConfig(
      "uint",
      keys.FUNDING_DECREASE_FACTOR_PER_SECOND,
      encodeData(["address"], [marketToken]),
      marketConfig.fundingDecreaseFactorPerSecond,
      `fundingDecreaseFactorPerSecond ${marketToken}`
    );

    await handleConfig(
      "uint",
      keys.MIN_FUNDING_FACTOR_PER_SECOND,
      encodeData(["address"], [marketToken]),
      marketConfig.minFundingFactorPerSecond,
      `minFundingFactorPerSecond ${marketToken}`
    );

    await handleConfig(
      "uint",
      keys.MAX_FUNDING_FACTOR_PER_SECOND,
      encodeData(["address"], [marketToken]),
      marketConfig.maxFundingFactorPerSecond,
      `maxFundingFactorPerSecond ${marketToken}`
    );

    await handleConfig(
      "uint",
      keys.THRESHOLD_FOR_STABLE_FUNDING,
      encodeData(["address"], [marketToken]),
      marketConfig.thresholdForStableFunding,
      `thresholdForStableFunding ${marketToken}`
    );

    await handleConfig(
      "uint",
      keys.THRESHOLD_FOR_DECREASE_FUNDING,
      encodeData(["address"], [marketToken]),
      marketConfig.thresholdForDecreaseFunding,
      `thresholdForDecreaseFunding ${marketToken}`
    );

    await handleConfig(
      "uint",
      keys.POSITION_FEE_FACTOR,
      encodeData(["address", "bool"], [marketToken, true]),
      marketConfig.positionFeeFactorForPositiveImpact,
      `positionFeeFactorForPositiveImpact ${marketToken}`
    );

    await handleConfig(
      "uint",
      keys.POSITION_FEE_FACTOR,
      encodeData(["address", "bool"], [marketToken, false]),
      marketConfig.positionFeeFactorForNegativeImpact,
      `positionFeeFactorForNegativeImpact ${marketToken}`
    );

    await handleConfig(
      "uint",
      keys.BORROWING_FACTOR,
      encodeData(["address", "bool"], [marketToken, true]),
      marketConfig.borrowingFactorForLongs,
      `borrowingFactorForLongs ${marketToken}`
    );

    await handleConfig(
      "uint",
      keys.BORROWING_FACTOR,
      encodeData(["address", "bool"], [marketToken, false]),
      marketConfig.borrowingFactorForShorts,
      `borrowingFactorForShorts ${marketToken}`
    );

    await handleConfig(
      "uint",
      keys.BORROWING_EXPONENT_FACTOR,
      encodeData(["address", "bool"], [marketToken, true]),
      marketConfig.borrowingExponentFactorForLongs,
      `borrowingExponentFactorForLongs ${marketToken}`
    );

    await handleConfig(
      "uint",
      keys.BORROWING_EXPONENT_FACTOR,
      encodeData(["address", "bool"], [marketToken, false]),
      marketConfig.borrowingExponentFactorForShorts,
      `borrowingExponentFactorForShorts ${marketToken}`
    );

    await handleConfig(
      "uint",
      keys.POSITION_IMPACT_FACTOR,
      encodeData(["address", "bool"], [marketToken, true]),
      marketConfig.positivePositionImpactFactor,
      `positivePositionImpactFactor ${marketToken}`
    );

    await handleConfig(
      "uint",
      keys.POSITION_IMPACT_FACTOR,
      encodeData(["address", "bool"], [marketToken, false]),
      marketConfig.negativePositionImpactFactor,
      `negativePositionImpactFactor ${marketToken}`
    );

    await handleConfig(
      "uint",
      keys.MAX_POSITION_IMPACT_FACTOR_FOR_LIQUIDATIONS,
      encodeData(["address"], [marketToken]),
      marketConfig.maxPositionImpactFactorForLiquidations,
      `maxPositionImpactFactorForLiquidations ${marketToken}`
    );

    await handleConfig(
      "uint",
      keys.MAX_POSITION_IMPACT_FACTOR,
      encodeData(["address", "bool"], [marketToken, true]),
      marketConfig.positiveMaxPositionImpactFactor,
      `positiveMaxPositionImpactFactor ${marketToken}`
    );

    await handleConfig(
      "uint",
      keys.MAX_POSITION_IMPACT_FACTOR,
      encodeData(["address", "bool"], [marketToken, false]),
      marketConfig.negativeMaxPositionImpactFactor,
      `negativeMaxPositionImpactFactor ${marketToken}`
    );
  }
};

async function main() {
  if (!["neoXT4"].includes(network.name)) {
    const { errors } = await validateMarketConfigs();
    if (errors.length !== 0) {
      throw new Error("Invalid market configs");
    }
  }

  const { read } = hre.deployments;

  const generalConfig = await hre.dFun.getGeneral();
  const tokens = await hre.dFun.getTokens();
  const markets = await hre.dFun.getMarkets();

  const dataStore = await hre.ethers.getContract("DataStore");
  const multicall = await hre.ethers.getContractAt(multicall3.abi, multicall3.address);
  const config = await hre.ethers.getContract("Config");

  const onchainMarketsByTokens = await getOnchainMarkets(read, dataStore.address);

  const keys = [];
  const multicallReadParams = [];

  await processMarkets({
    markets,
    onchainMarketsByTokens,
    tokens,
    generalConfig,
    handleConfig: async (type, baseKey, keyData) => {
      if (type !== "uint") {
        throw new Error("Unsupported type");
      }

      const key = getFullKey(baseKey, keyData);

      keys.push(key);
      multicallReadParams.push({
        target: dataStore.address,
        allowFailure: false,
        callData: dataStore.interface.encodeFunctionData("getUint", [key]),
      });
    },
  });

  const result = await multicall.callStatic.aggregate3(multicallReadParams);
  const dataCache = {};
  for (let i = 0; i < keys.length; i++) {
    const key = keys[i];
    const value = result[i].returnData;
    dataCache[key] = bigNumberify(value);
  }

  const multicallWriteParams = [];

  await processMarkets({
    markets,
    onchainMarketsByTokens,
    tokens,
    generalConfig,
    handleConfig: async (type, baseKey, keyData, value, label) => {
      if (type !== "uint") {
        throw new Error("Unsupported type");
      }

      await appendUintConfigIfDifferent(multicallWriteParams, dataCache, baseKey, keyData, value, label);
    },
  });

  console.info(`updating ${multicallWriteParams.length} params`);
  console.info("multicallWriteParams", multicallWriteParams);

  if (process.env.WRITE === "true") {
    const tx = await config.multicall(multicallWriteParams);
    console.info(`tx sent: ${tx.hash}`);
  } else {
    console.info("NOTE: executed in read-only mode, no transactions were sent");
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
