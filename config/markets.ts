import { BigNumberish, ethers } from "ethers";

import { expandDecimals, decimalToFloat, bigNumberify, percentageToFloat } from "../utils/math";
import { hashString } from "../utils/hash";
import { HardhatRuntimeEnvironment } from "hardhat/types";

export type BaseMarketConfig = {
  reserveFactorLongs: BigNumberish;
  reserveFactorShorts: BigNumberish;

  openInterestReserveFactorLongs: BigNumberish;
  openInterestReserveFactorShorts: BigNumberish;

  minCollateralFactor: BigNumberish;
  minCollateralFactorForOpenInterestMultiplierLong: BigNumberish;
  minCollateralFactorForOpenInterestMultiplierShort: BigNumberish;

  maxLongTokenPoolAmount: BigNumberish;
  maxShortTokenPoolAmount: BigNumberish;

  maxLongTokenPoolAmountForDeposit: BigNumberish;
  maxShortTokenPoolAmountForDeposit: BigNumberish;

  maxOpenInterestForLongs: BigNumberish;
  maxOpenInterestForShorts: BigNumberish;

  maxPnlFactorForTradersLongs: BigNumberish;
  maxPnlFactorForTradersShorts: BigNumberish;

  maxPnlFactorForAdlLongs: BigNumberish;
  maxPnlFactorForAdlShorts: BigNumberish;

  minPnlFactorAfterAdlLongs: BigNumberish;
  minPnlFactorAfterAdlShorts: BigNumberish;

  maxPnlFactorForDepositsLongs: BigNumberish;
  maxPnlFactorForDepositsShorts: BigNumberish;

  maxPnlFactorForWithdrawalsLongs: BigNumberish;
  maxPnlFactorForWithdrawalsShorts: BigNumberish;

  positionFeeFactorForPositiveImpact: BigNumberish;
  positionFeeFactorForNegativeImpact: BigNumberish;

  negativePositionImpactFactor: BigNumberish;
  positivePositionImpactFactor: BigNumberish;
  positionImpactExponentFactor: BigNumberish;

  negativeMaxPositionImpactFactor: BigNumberish;
  positiveMaxPositionImpactFactor: BigNumberish;
  maxPositionImpactFactorForLiquidations: BigNumberish;

  swapFeeFactorForPositiveImpact: BigNumberish;
  swapFeeFactorForNegativeImpact: BigNumberish;

  negativeSwapImpactFactor: BigNumberish;
  positiveSwapImpactFactor: BigNumberish;
  swapImpactExponentFactor: BigNumberish;

  minCollateralUsd: BigNumberish;

  borrowingFactorForLongs: BigNumberish;
  borrowingFactorForShorts: BigNumberish;

  borrowingExponentFactorForLongs: BigNumberish;
  borrowingExponentFactorForShorts: BigNumberish;

  fundingFactor: BigNumberish;
  fundingExponentFactor: BigNumberish;
  fundingIncreaseFactorPerSecond: BigNumberish;
  fundingDecreaseFactorPerSecond: BigNumberish;
  thresholdForStableFunding: BigNumberish;
  thresholdForDecreaseFunding: BigNumberish;
  minFundingFactorPerSecond: BigNumberish;
  maxFundingFactorPerSecond: BigNumberish;

  positionImpactPoolDistributionRate: BigNumberish;
  minPositionImpactPoolAmount: BigNumberish;

  virtualMarketId?: string;
  virtualTokenIdForIndexToken?: string;

  isDisabled?: boolean;
};

export type SpotMarketConfig = Partial<BaseMarketConfig> & {
  tokens: {
    longToken: string;
    shortToken: string;
    indexToken?: never;
  };
  swapOnly: true;
};

export type PerpMarketConfig = Partial<BaseMarketConfig> & {
  tokens: {
    indexToken: string;
    longToken: string;
    shortToken: string;
  };
  swapOnly?: never;
};

export type MarketConfig = SpotMarketConfig | PerpMarketConfig;

const baseMarketConfig: Partial<BaseMarketConfig> = {
  minCollateralFactor: decimalToFloat(1, 2), // 1%

  minCollateralFactorForOpenInterestMultiplierLong: 0,
  minCollateralFactorForOpenInterestMultiplierShort: 0,

  maxLongTokenPoolAmount: expandDecimals(1_000_000_000, 18),
  maxShortTokenPoolAmount: expandDecimals(1_000_000_000, 18),

  maxLongTokenPoolAmountForDeposit: expandDecimals(1_000_000_000, 18),
  maxShortTokenPoolAmountForDeposit: expandDecimals(1_000_000_000, 18),

  maxOpenInterestForLongs: expandDecimals(1_000_000_000, 30),
  maxOpenInterestForShorts: expandDecimals(1_000_000_000, 30),

  reserveFactorLongs: percentageToFloat("95%"), // 95%,
  reserveFactorShorts: percentageToFloat("95%"), // 95%,

  openInterestReserveFactorLongs: percentageToFloat("90%"),
  openInterestReserveFactorShorts: percentageToFloat("90%"),

  maxPnlFactorForTradersLongs: percentageToFloat("90%"), // 90%
  maxPnlFactorForTradersShorts: percentageToFloat("90%"), // 90%

  maxPnlFactorForAdlLongs: percentageToFloat("100%"), // 100%, no ADL under normal operation
  maxPnlFactorForAdlShorts: percentageToFloat("100%"), // 100%, no ADL under normal operation

  minPnlFactorAfterAdlLongs: percentageToFloat("90%"), // 80%, no ADL under normal operation
  minPnlFactorAfterAdlShorts: percentageToFloat("90%"), // 80%, no ADL under normal operation

  maxPnlFactorForDepositsLongs: percentageToFloat("90%"), // 80%
  maxPnlFactorForDepositsShorts: percentageToFloat("90%"), // 80%

  maxPnlFactorForWithdrawalsLongs: percentageToFloat("90%"), // 80%
  maxPnlFactorForWithdrawalsShorts: percentageToFloat("90%"), // 80%

  positionFeeFactorForPositiveImpact: percentageToFloat("0.05%"), // 0.05%
  positionFeeFactorForNegativeImpact: percentageToFloat("0.07%"), // 0.07%

  negativePositionImpactFactor: percentageToFloat("0.00001%"), // 0.00001%
  positivePositionImpactFactor: percentageToFloat("0.000005%"), // 0.000005%
  positionImpactExponentFactor: decimalToFloat(2, 0), // 2

  negativeMaxPositionImpactFactor: percentageToFloat("0.5%"), // 0.5%
  positiveMaxPositionImpactFactor: percentageToFloat("0.5%"), // 0.5%
  maxPositionImpactFactorForLiquidations: bigNumberify(0), // 0%

  swapFeeFactorForPositiveImpact: percentageToFloat("0.05%"), // 0.05%,
  swapFeeFactorForNegativeImpact: percentageToFloat("0.07%"), // 0.07%,

  negativeSwapImpactFactor: percentageToFloat("0.001%"), // 0.001%
  positiveSwapImpactFactor: percentageToFloat("0.0005%"), // 0.0005%
  swapImpactExponentFactor: decimalToFloat(2, 0), // 2

  minCollateralUsd: decimalToFloat(1, 0), // 1 USD

  // factor in open interest reserve factor 80%
  borrowingFactorForLongs: decimalToFloat(625, 11), // 0.00000000625 * 80% = 0.000000005, 0.0000005% / second, 15.77% per year if the pool is 100% utilized
  borrowingFactorForShorts: decimalToFloat(625, 11), // 0.00000000625 * 80% = 0.000000005, 0.0000005% / second, 15.77% per year if the pool is 100% utilized

  borrowingExponentFactorForLongs: decimalToFloat(1),
  borrowingExponentFactorForShorts: decimalToFloat(1),

  fundingFactor: decimalToFloat(2, 8), // ~63% per year for a 100% skew
  fundingExponentFactor: decimalToFloat(1),

  fundingIncreaseFactorPerSecond: 0,
  fundingDecreaseFactorPerSecond: 0,
  thresholdForStableFunding: 0,
  thresholdForDecreaseFunding: 0,
  minFundingFactorPerSecond: 0,
  maxFundingFactorPerSecond: 0,

  positionImpactPoolDistributionRate: 0,
  minPositionImpactPoolAmount: 0,
};

const synthethicMarketConfig: Partial<BaseMarketConfig> = {
  ...baseMarketConfig,

  reserveFactorLongs: percentageToFloat("95%"),
  reserveFactorShorts: percentageToFloat("95%"),

  openInterestReserveFactorLongs: percentageToFloat("90%"),
  openInterestReserveFactorShorts: percentageToFloat("90%"),

  maxPnlFactorForTradersLongs: percentageToFloat("60%"),
  maxPnlFactorForTradersShorts: percentageToFloat("60%"),

  maxPnlFactorForAdlLongs: percentageToFloat("55%"),
  maxPnlFactorForAdlShorts: percentageToFloat("55%"),

  minPnlFactorAfterAdlLongs: percentageToFloat("50%"),
  minPnlFactorAfterAdlShorts: percentageToFloat("50%"),

  maxPnlFactorForDepositsLongs: percentageToFloat("70%"),
  maxPnlFactorForDepositsShorts: percentageToFloat("70%"),

  maxPnlFactorForWithdrawalsLongs: percentageToFloat("45%"),
  maxPnlFactorForWithdrawalsShorts: percentageToFloat("45%"),
};

const synthethicMarketConfig_IncreasedCapacity: Partial<BaseMarketConfig> = {
  ...synthethicMarketConfig,

  reserveFactorLongs: percentageToFloat("125%"),
  reserveFactorShorts: percentageToFloat("125%"),

  openInterestReserveFactorLongs: percentageToFloat("120%"),
  openInterestReserveFactorShorts: percentageToFloat("120%"),

  maxPnlFactorForTradersLongs: percentageToFloat("70%"),
  maxPnlFactorForTradersShorts: percentageToFloat("70%"),

  maxPnlFactorForAdlLongs: percentageToFloat("65%"),
  maxPnlFactorForAdlShorts: percentageToFloat("65%"),

  minPnlFactorAfterAdlLongs: percentageToFloat("60%"),
  minPnlFactorAfterAdlShorts: percentageToFloat("60%"),

  maxPnlFactorForDepositsLongs: percentageToFloat("80%"),
  maxPnlFactorForDepositsShorts: percentageToFloat("80%"),

  maxPnlFactorForWithdrawalsLongs: percentageToFloat("55%"),
  maxPnlFactorForWithdrawalsShorts: percentageToFloat("55%"),
};

const stablecoinSwapMarketConfig: Partial<SpotMarketConfig> = {
  swapOnly: true,

  swapFeeFactorForPositiveImpact: decimalToFloat(1, 4), // 0.01%,
  swapFeeFactorForNegativeImpact: decimalToFloat(1, 4), // 0.01%,

  negativeSwapImpactFactor: decimalToFloat(5, 10), // 0.01% for 200,000 USD of imbalance
  positiveSwapImpactFactor: decimalToFloat(5, 10), // 0.01% for 200,000 USD of imbalance
};

const hardhatBaseMarketConfig: Partial<BaseMarketConfig> = {
  reserveFactorLongs: decimalToFloat(5, 1), // 50%,
  reserveFactorShorts: decimalToFloat(5, 1), // 50%,

  openInterestReserveFactorLongs: decimalToFloat(5, 1), // 50%,
  openInterestReserveFactorShorts: decimalToFloat(5, 1), // 50%,

  minCollateralFactor: decimalToFloat(1, 2), // 1%

  minCollateralFactorForOpenInterestMultiplierLong: 0,
  minCollateralFactorForOpenInterestMultiplierShort: 0,

  maxLongTokenPoolAmount: expandDecimals(1 * 1000 * 1000 * 1000, 18),
  maxShortTokenPoolAmount: expandDecimals(1 * 1000 * 1000 * 1000, 18),

  maxLongTokenPoolAmountForDeposit: expandDecimals(1 * 1000 * 1000 * 1000, 18),
  maxShortTokenPoolAmountForDeposit: expandDecimals(1 * 1000 * 1000 * 1000, 18),

  maxOpenInterestForLongs: decimalToFloat(1 * 1000 * 1000 * 1000),
  maxOpenInterestForShorts: decimalToFloat(1 * 1000 * 1000 * 1000),

  maxPnlFactorForTradersLongs: decimalToFloat(5, 1), // 50%
  maxPnlFactorForTradersShorts: decimalToFloat(5, 1), // 50%

  maxPnlFactorForAdlLongs: decimalToFloat(45, 2), // 45%
  maxPnlFactorForAdlShorts: decimalToFloat(45, 2), // 45%

  minPnlFactorAfterAdlLongs: decimalToFloat(4, 1), // 40%
  minPnlFactorAfterAdlShorts: decimalToFloat(4, 1), // 40%

  maxPnlFactorForDepositsLongs: decimalToFloat(6, 1), // 60%
  maxPnlFactorForDepositsShorts: decimalToFloat(6, 1), // 60%

  maxPnlFactorForWithdrawalsLongs: decimalToFloat(3, 1), // 30%
  maxPnlFactorForWithdrawalsShorts: decimalToFloat(3, 1), // 30%

  positiveMaxPositionImpactFactor: decimalToFloat(2, 2), // 2%
  negativeMaxPositionImpactFactor: decimalToFloat(2, 2), // 2%
  maxPositionImpactFactorForLiquidations: decimalToFloat(1, 2), // 1%
};

const config: {
  [network: string]: MarketConfig[];
} = {
  neoX: [
    {
      tokens: { indexToken: "FUNGAS", longToken: "FUNGAS", shortToken: "FUNUSDT" },
      virtualTokenIdForIndexToken: hashString("PERP:FUNGAS/USD"),
      virtualMarketId: hashString("SPOT:FUNGASv3/USD"),

      ...baseMarketConfig,

      reserveFactorLongs: percentageToFloat("105%"),
      reserveFactorShorts: percentageToFloat("105%"),

      openInterestReserveFactorLongs: percentageToFloat("100%"),
      openInterestReserveFactorShorts: percentageToFloat("100%"),

      maxLongTokenPoolAmount: expandDecimals(100_000_000, 18),
      maxShortTokenPoolAmount: expandDecimals(600_000_000, 18),

      maxLongTokenPoolAmountForDeposit: expandDecimals(10_000_000, 18),
      maxShortTokenPoolAmountForDeposit: expandDecimals(60_000_000, 18),

      negativePositionImpactFactor: decimalToFloat(30, 11), // 0.05% for ~1,600,000 USD of imbalance
      positivePositionImpactFactor: decimalToFloat(18, 11), // 0.05% for ~2,700,000 USD of imbalance

      positionImpactPoolDistributionRate: expandDecimals(8288, 40), // 8.28884E+43, 7.161555678 GAS / day
      minPositionImpactPoolAmount: expandDecimals(10, 18), // 10 GAS

      negativeSwapImpactFactor: decimalToFloat(2, 10), // 0.05% for 2,500,000 USD of imbalance
      positiveSwapImpactFactor: decimalToFloat(2, 10), // 0.05% for 2,500,000 USD of imbalance

      // minCollateralFactor of 0.01 (1%) when open interest is 50,000,000 USD
      minCollateralFactorForOpenInterestMultiplierLong: decimalToFloat(2, 10),
      minCollateralFactorForOpenInterestMultiplierShort: decimalToFloat(2, 10),

      maxOpenInterestForLongs: decimalToFloat(50_000_000),
      maxOpenInterestForShorts: decimalToFloat(300_000_000),

      fundingIncreaseFactorPerSecond: decimalToFloat(158, 14), // 0.00000000000158, at least 3.5 hours to reach max funding
      fundingDecreaseFactorPerSecond: decimalToFloat(0), // not applicable if thresholdForDecreaseFunding = 0
      minFundingFactorPerSecond: decimalToFloat(3, 10), // 0.00000003%, 0.000108% per hour, 0.95% per year
      maxFundingFactorPerSecond: decimalToFloat(20, 9), // 0.000002%,  0.1728% per day, ~63% per year
      thresholdForStableFunding: decimalToFloat(5, 2), // 5%
      thresholdForDecreaseFunding: decimalToFloat(0), // 0%

      // factor in open interest reserve factor 130%
      borrowingFactorForLongs: decimalToFloat(910, 14), // 9.10E-12, 50% at 100% utilisation
      borrowingFactorForShorts: decimalToFloat(910, 14), // 9.10E-12, 50% at 100% utilisation

      borrowingExponentFactorForLongs: decimalToFloat(14, 1), // 1.4
      borrowingExponentFactorForShorts: decimalToFloat(14, 1), // 1.4
    },
    {
      tokens: { indexToken: "FUNBTC", longToken: "FUNBTC", shortToken: "FUNUSDT" },
      virtualTokenIdForIndexToken: hashString("PERP:FUNBTC/USD"),
      virtualMarketId: hashString("SPOT:FUNBTC/USD"),

      ...baseMarketConfig,

      reserveFactorLongs: percentageToFloat("105%"),
      reserveFactorShorts: percentageToFloat("105%"),

      openInterestReserveFactorLongs: percentageToFloat("100%"),
      openInterestReserveFactorShorts: percentageToFloat("100%"),

      maxLongTokenPoolAmount: expandDecimals(6_000, 18),
      maxShortTokenPoolAmount: expandDecimals(600_000_000, 18),

      maxLongTokenPoolAmountForDeposit: expandDecimals(600, 18),
      maxShortTokenPoolAmountForDeposit: expandDecimals(6_000_000, 18),

      negativePositionImpactFactor: decimalToFloat(30, 11), // 0.05% for ~1,600,000 USD of imbalance
      positivePositionImpactFactor: decimalToFloat(18, 11), // 0.05% for ~2,700,000 USD of imbalance

      negativeSwapImpactFactor: decimalToFloat(24, 11), // 0.05% for ~2,100,000 USD of imbalance
      positiveSwapImpactFactor: decimalToFloat(24, 11), // 0.05% for ~2,100,000 USD of imbalance

      // minCollateralFactor of 0.01 (1%) when open interest is 50,000,000 USD
      minCollateralFactorForOpenInterestMultiplierLong: decimalToFloat(2, 10),
      minCollateralFactorForOpenInterestMultiplierShort: decimalToFloat(2, 10),

      maxOpenInterestForLongs: decimalToFloat(3_000),
      maxOpenInterestForShorts: decimalToFloat(300_000_000),

      fundingIncreaseFactorPerSecond: decimalToFloat(136, 14), // 0.00000000000136, at least 3.5 hours to reach max funding
      fundingDecreaseFactorPerSecond: decimalToFloat(0), // not applicable if thresholdForDecreaseFunding = 0
      minFundingFactorPerSecond: decimalToFloat(3, 10), // 0.00000003%, 0.000108% per hour, 0.95% per year
      maxFundingFactorPerSecond: decimalToFloat(17, 9), // 0.0000017%,  0.14212% per hour, 53.61% per year
      thresholdForStableFunding: decimalToFloat(5, 2), // 5%
      thresholdForDecreaseFunding: decimalToFloat(0), // 0%

      // for OI reserve factor = 100%
      borrowingFactorForLongs: decimalToFloat(1900, 11), // 0.000000019 * 100% max reserve, 60% per year
      borrowingFactorForShorts: decimalToFloat(1900, 11),
    },
    {
      tokens: { indexToken: "FUNETH", longToken: "FUNETH", shortToken: "FUNUSDT" },
      virtualTokenIdForIndexToken: hashString("PERP:FUNETH/USD"),
      virtualMarketId: hashString("SPOT:FUNETH/USD"),

      ...baseMarketConfig,

      reserveFactorLongs: percentageToFloat("105%"),
      reserveFactorShorts: percentageToFloat("105%"),

      openInterestReserveFactorLongs: percentageToFloat("100%"),
      openInterestReserveFactorShorts: percentageToFloat("100%"),

      maxLongTokenPoolAmount: expandDecimals(200_000, 18),
      maxShortTokenPoolAmount: expandDecimals(600_000_000, 18),

      maxLongTokenPoolAmountForDeposit: decimalToFloat(30_000),
      maxShortTokenPoolAmountForDeposit: decimalToFloat(100_000_000),

      negativePositionImpactFactor: decimalToFloat(30, 11), // 0.05% for ~1,600,000 USD of imbalance
      positivePositionImpactFactor: decimalToFloat(18, 11), // 0.05% for ~2,700,000 USD of imbalance

      negativeSwapImpactFactor: decimalToFloat(1, 9),
      positiveSwapImpactFactor: decimalToFloat(5, 10),

      // minCollateralFactor of 0.01 (1%) when open interest is 50,000,000 USD
      minCollateralFactorForOpenInterestMultiplierLong: decimalToFloat(2, 10),
      minCollateralFactorForOpenInterestMultiplierShort: decimalToFloat(2, 10),

      maxOpenInterestForLongs: decimalToFloat(100_000),
      maxOpenInterestForShorts: decimalToFloat(300_000_000),

      fundingIncreaseFactorPerSecond: decimalToFloat(136, 14), // 0.00000000000136, at least 3.5 hours to reach max funding
      fundingDecreaseFactorPerSecond: decimalToFloat(0), // not applicable if thresholdForDecreaseFunding = 0
      minFundingFactorPerSecond: decimalToFloat(3, 10), // 0.00000003%, 0.000108% per hour, 0.95% per year
      maxFundingFactorPerSecond: decimalToFloat(17, 9), // 0.0000017%,  0.14212% per hour, 53.61% per year
      thresholdForStableFunding: decimalToFloat(5, 2), // 5%
      thresholdForDecreaseFunding: decimalToFloat(0), // 0%

      // for OI reserve factor = 100%
      borrowingFactorForLongs: decimalToFloat(1900, 11), // 0.000000019 * 100% max reserve, 60% per year
      borrowingFactorForShorts: decimalToFloat(1900, 11),
    },
  ],
  neoXT4: [
    {
      tokens: { indexToken: "WGAS", longToken: "WGAS", shortToken: "USDT" },
      virtualTokenIdForIndexToken: hashString("PERP:GAS/USD"),
      virtualMarketId: hashString("SPOT:GAS/USD"),

      ...baseMarketConfig,

      reserveFactorLongs: percentageToFloat("105%"),
      reserveFactorShorts: percentageToFloat("105%"),

      openInterestReserveFactorLongs: percentageToFloat("100%"),
      openInterestReserveFactorShorts: percentageToFloat("100%"),

      maxLongTokenPoolAmount: expandDecimals(100_000_000, 18),
      maxShortTokenPoolAmount: expandDecimals(600_000_000, 18),

      maxLongTokenPoolAmountForDeposit: expandDecimals(10_000_000, 18),
      maxShortTokenPoolAmountForDeposit: expandDecimals(60_000_000, 18),

      negativePositionImpactFactor: decimalToFloat(30, 11), // 0.05% for ~1,600,000 USD of imbalance
      positivePositionImpactFactor: decimalToFloat(18, 11), // 0.05% for ~2,700,000 USD of imbalance

      positionImpactPoolDistributionRate: expandDecimals(8288, 40), // 8.28884E+43, 7.161555678 GAS / day
      minPositionImpactPoolAmount: expandDecimals(10, 18), // 10 GAS

      negativeSwapImpactFactor: decimalToFloat(2, 10), // 0.05% for 2,500,000 USD of imbalance
      positiveSwapImpactFactor: decimalToFloat(2, 10), // 0.05% for 2,500,000 USD of imbalance

      // minCollateralFactor of 0.01 (1%) when open interest is 50,000,000 USD
      minCollateralFactorForOpenInterestMultiplierLong: decimalToFloat(2, 10),
      minCollateralFactorForOpenInterestMultiplierShort: decimalToFloat(2, 10),

      maxOpenInterestForLongs: decimalToFloat(80_000_000),
      maxOpenInterestForShorts: decimalToFloat(80_000_000),

      fundingIncreaseFactorPerSecond: decimalToFloat(158, 14), // 0.00000000000158, at least 3.5 hours to reach max funding
      fundingDecreaseFactorPerSecond: decimalToFloat(0), // not applicable if thresholdForDecreaseFunding = 0
      minFundingFactorPerSecond: decimalToFloat(3, 10), // 0.00000003%, 0.000108% per hour, 0.95% per year
      maxFundingFactorPerSecond: decimalToFloat(20, 9), // 0.000002%,  0.1728% per day, ~63% per year
      thresholdForStableFunding: decimalToFloat(5, 2), // 5%
      thresholdForDecreaseFunding: decimalToFloat(0), // 0%

      // factor in open interest reserve factor 130%
      borrowingFactorForLongs: decimalToFloat(910, 14), // 9.10E-12, 50% at 100% utilisation
      borrowingFactorForShorts: decimalToFloat(910, 14), // 9.10E-12, 50% at 100% utilisation

      borrowingExponentFactorForLongs: decimalToFloat(14, 1), // 1.4
      borrowingExponentFactorForShorts: decimalToFloat(14, 1), // 1.4
    },
    {
      tokens: { indexToken: "WBTC", longToken: "WBTC", shortToken: "USDT" },
      virtualTokenIdForIndexToken: hashString("PERP:BTC/USD"),
      virtualMarketId: hashString("SPOT:BTC/USD"),

      ...baseMarketConfig,

      reserveFactorLongs: percentageToFloat("105%"),
      reserveFactorShorts: percentageToFloat("105%"),

      openInterestReserveFactorLongs: percentageToFloat("100%"),
      openInterestReserveFactorShorts: percentageToFloat("100%"),

      maxLongTokenPoolAmount: expandDecimals(10_000_000, 18),
      maxShortTokenPoolAmount: expandDecimals(10_000_000, 18),

      maxLongTokenPoolAmountForDeposit: expandDecimals(10_000_000, 18),
      maxShortTokenPoolAmountForDeposit: expandDecimals(10_000_000, 18),

      negativePositionImpactFactor: decimalToFloat(15, 11), // 0.05% for ~1,600,000 USD of imbalance
      positivePositionImpactFactor: decimalToFloat(9, 11), // 0.05% for ~2,700,000 USD of imbalance

      negativeSwapImpactFactor: decimalToFloat(24, 11), // 0.05% for ~2,100,000 USD of imbalance
      positiveSwapImpactFactor: decimalToFloat(24, 11), // 0.05% for ~2,100,000 USD of imbalance

      // minCollateralFactor of 0.01 (1%) when open interest is 50,000,000 USD
      minCollateralFactorForOpenInterestMultiplierLong: decimalToFloat(2, 10),
      minCollateralFactorForOpenInterestMultiplierShort: decimalToFloat(2, 10),

      maxOpenInterestForLongs: decimalToFloat(1_500_000),
      maxOpenInterestForShorts: decimalToFloat(1_500_000),

      fundingIncreaseFactorPerSecond: decimalToFloat(136, 14), // 0.00000000000136, at least 3.5 hours to reach max funding
      fundingDecreaseFactorPerSecond: decimalToFloat(0), // not applicable if thresholdForDecreaseFunding = 0
      minFundingFactorPerSecond: decimalToFloat(3, 10), // 0.00000003%, 0.000108% per hour, 0.95% per year
      maxFundingFactorPerSecond: decimalToFloat(17, 9), // 0.0000017%,  0.14212% per hour, 53.61% per year
      thresholdForStableFunding: decimalToFloat(5, 2), // 5%
      thresholdForDecreaseFunding: decimalToFloat(0), // 0%

      // for OI reserve factor = 100%
      borrowingFactorForLongs: decimalToFloat(1900, 11), // 0.000000019 * 100% max reserve, 60% per year
      borrowingFactorForShorts: decimalToFloat(1900, 11),
    },
    {
      tokens: { indexToken: "WETH", longToken: "WETH", shortToken: "USDT" },
      virtualTokenIdForIndexToken: hashString("PERP:ETH/USD"),
      virtualMarketId: hashString("SPOT:ETH/USD"),

      ...baseMarketConfig,

      reserveFactorLongs: percentageToFloat("105%"),
      reserveFactorShorts: percentageToFloat("105%"),

      openInterestReserveFactorLongs: percentageToFloat("100%"),
      openInterestReserveFactorShorts: percentageToFloat("100%"),

      maxLongTokenPoolAmount: expandDecimals(10_000_000, 18),
      maxShortTokenPoolAmount: expandDecimals(10_000_000, 18),

      maxLongTokenPoolAmountForDeposit: decimalToFloat(10_000_000),
      maxShortTokenPoolAmountForDeposit: decimalToFloat(10_000_000),

      negativePositionImpactFactor: decimalToFloat(15, 11), // 0.05% for ~1,600,000 USD of imbalance
      positivePositionImpactFactor: decimalToFloat(9, 11), // 0.05% for ~2,700,000 USD of imbalance

      negativeSwapImpactFactor: decimalToFloat(1, 9),
      positiveSwapImpactFactor: decimalToFloat(5, 10),

      // minCollateralFactor of 0.01 (1%) when open interest is 50,000,000 USD
      minCollateralFactorForOpenInterestMultiplierLong: decimalToFloat(2, 10),
      minCollateralFactorForOpenInterestMultiplierShort: decimalToFloat(2, 10),

      maxOpenInterestForLongs: decimalToFloat(1_000_000),
      maxOpenInterestForShorts: decimalToFloat(1_000_000),

      fundingIncreaseFactorPerSecond: decimalToFloat(136, 14), // 0.00000000000136, at least 3.5 hours to reach max funding
      fundingDecreaseFactorPerSecond: decimalToFloat(0), // not applicable if thresholdForDecreaseFunding = 0
      minFundingFactorPerSecond: decimalToFloat(3, 10), // 0.00000003%, 0.000108% per hour, 0.95% per year
      maxFundingFactorPerSecond: decimalToFloat(17, 9), // 0.0000017%,  0.14212% per hour, 53.61% per year
      thresholdForStableFunding: decimalToFloat(5, 2), // 5%
      thresholdForDecreaseFunding: decimalToFloat(0), // 0%

      // for OI reserve factor = 100%
      borrowingFactorForLongs: decimalToFloat(1900, 11), // 0.000000019 * 100% max reserve, 60% per year
      borrowingFactorForShorts: decimalToFloat(1900, 11),
    },
    {
      tokens: { indexToken: "FUNGAS", longToken: "FUNGAS", shortToken: "FUNUSDT" },
      virtualTokenIdForIndexToken: hashString("PERP:FUNGASv3/USD"),
      virtualMarketId: hashString("SPOT:FUNGASv3/USD"),

      ...baseMarketConfig,

      reserveFactorLongs: percentageToFloat("140%"),
      reserveFactorShorts: percentageToFloat("140%"),

      openInterestReserveFactorLongs: percentageToFloat("135%"),
      openInterestReserveFactorShorts: percentageToFloat("135%"),

      maxLongTokenPoolAmount: expandDecimals(100_000_000, 18),
      maxShortTokenPoolAmount: expandDecimals(100_000_000, 18),

      maxLongTokenPoolAmountForDeposit: expandDecimals(90_000_000, 18),
      maxShortTokenPoolAmountForDeposit: expandDecimals(90_000_000, 18),

      negativePositionImpactFactor: decimalToFloat(15, 11), // 0.05% for ~1,600,000 USD of imbalance
      positivePositionImpactFactor: decimalToFloat(9, 11), // 0.05% for ~2,700,000 USD of imbalance

      positionImpactPoolDistributionRate: expandDecimals(8288, 40), // 8.28884E+43, 7.161555678 GAS / day
      minPositionImpactPoolAmount: expandDecimals(10, 18), // 10 GAS

      negativeSwapImpactFactor: decimalToFloat(2, 10), // 0.05% for 2,500,000 USD of imbalance
      positiveSwapImpactFactor: decimalToFloat(2, 10), // 0.05% for 2,500,000 USD of imbalance

      // minCollateralFactor of 0.01 (1%) when open interest is 50,000,000 USD
      minCollateralFactorForOpenInterestMultiplierLong: decimalToFloat(2, 10),
      minCollateralFactorForOpenInterestMultiplierShort: decimalToFloat(2, 10),

      maxOpenInterestForLongs: decimalToFloat(80_000_000),
      maxOpenInterestForShorts: decimalToFloat(80_000_000),

      fundingIncreaseFactorPerSecond: decimalToFloat(158, 14), // 0.00000000000158, at least 3.5 hours to reach max funding
      fundingDecreaseFactorPerSecond: decimalToFloat(0), // not applicable if thresholdForDecreaseFunding = 0
      minFundingFactorPerSecond: decimalToFloat(3, 10), // 0.00000003%, 0.000108% per hour, 0.95% per year
      maxFundingFactorPerSecond: decimalToFloat(20, 9), // 0.000002%,  0.1728% per day, ~63% per year
      thresholdForStableFunding: decimalToFloat(5, 2), // 5%
      thresholdForDecreaseFunding: decimalToFloat(0), // 0%

      // factor in open interest reserve factor 130%
      borrowingFactorForLongs: decimalToFloat(910, 14), // 9.10E-12, 50% at 100% utilisation
      borrowingFactorForShorts: decimalToFloat(910, 14), // 9.10E-12, 50% at 100% utilisation

      borrowingExponentFactorForLongs: decimalToFloat(14, 1), // 1.4
      borrowingExponentFactorForShorts: decimalToFloat(14, 1), // 1.4
    },
    {
      tokens: { indexToken: "FUNBTC", longToken: "FUNBTC", shortToken: "FUNUSDT" },
      virtualTokenIdForIndexToken: hashString("PERP:FUNBTCv3/USD"),
      virtualMarketId: hashString("SPOT:FUNBTCv3/USD"),

      ...baseMarketConfig,

      reserveFactorLongs: percentageToFloat("105%"),
      reserveFactorShorts: percentageToFloat("105%"),

      openInterestReserveFactorLongs: percentageToFloat("100%"),
      openInterestReserveFactorShorts: percentageToFloat("100%"),

      maxLongTokenPoolAmount: expandDecimals(10_000_000, 18),
      maxShortTokenPoolAmount: expandDecimals(10_000_000, 18),

      maxLongTokenPoolAmountForDeposit: expandDecimals(10_000_000, 18),
      maxShortTokenPoolAmountForDeposit: expandDecimals(10_000_000, 18),

      negativePositionImpactFactor: decimalToFloat(15, 11), // 0.05% for ~1,600,000 USD of imbalance
      positivePositionImpactFactor: decimalToFloat(9, 11), // 0.05% for ~2,700,000 USD of imbalance

      negativeSwapImpactFactor: decimalToFloat(24, 11), // 0.05% for ~2,100,000 USD of imbalance
      positiveSwapImpactFactor: decimalToFloat(24, 11), // 0.05% for ~2,100,000 USD of imbalance

      // minCollateralFactor of 0.01 (1%) when open interest is 50,000,000 USD
      minCollateralFactorForOpenInterestMultiplierLong: decimalToFloat(2, 10),
      minCollateralFactorForOpenInterestMultiplierShort: decimalToFloat(2, 10),

      maxOpenInterestForLongs: decimalToFloat(1_500_000),
      maxOpenInterestForShorts: decimalToFloat(1_500_000),

      fundingIncreaseFactorPerSecond: decimalToFloat(136, 14), // 0.00000000000136, at least 3.5 hours to reach max funding
      fundingDecreaseFactorPerSecond: decimalToFloat(0), // not applicable if thresholdForDecreaseFunding = 0
      minFundingFactorPerSecond: decimalToFloat(3, 10), // 0.00000003%, 0.000108% per hour, 0.95% per year
      maxFundingFactorPerSecond: decimalToFloat(17, 9), // 0.0000017%,  0.14212% per hour, 53.61% per year
      thresholdForStableFunding: decimalToFloat(5, 2), // 5%
      thresholdForDecreaseFunding: decimalToFloat(0), // 0%

      // for OI reserve factor = 100%
      borrowingFactorForLongs: decimalToFloat(1900, 11), // 0.000000019 * 100% max reserve, 60% per year
      borrowingFactorForShorts: decimalToFloat(1900, 11),
    },
    {
      tokens: { indexToken: "FUNETH", longToken: "FUNETH", shortToken: "FUNUSDT" },
      virtualTokenIdForIndexToken: hashString("PERP:FUNETHv3/USD"),
      virtualMarketId: hashString("SPOT:FUNETHv3/USD"),

      ...baseMarketConfig,

      reserveFactorLongs: percentageToFloat("105%"),
      reserveFactorShorts: percentageToFloat("105%"),

      openInterestReserveFactorLongs: percentageToFloat("100%"),
      openInterestReserveFactorShorts: percentageToFloat("100%"),

      maxLongTokenPoolAmount: expandDecimals(10_000_000, 18),
      maxShortTokenPoolAmount: expandDecimals(10_000_000, 18),

      maxLongTokenPoolAmountForDeposit: decimalToFloat(10_000_000),
      maxShortTokenPoolAmountForDeposit: decimalToFloat(10_000_000),

      negativePositionImpactFactor: decimalToFloat(15, 11), // 0.05% for ~1,600,000 USD of imbalance
      positivePositionImpactFactor: decimalToFloat(9, 11), // 0.05% for ~2,700,000 USD of imbalance

      negativeSwapImpactFactor: decimalToFloat(1, 9),
      positiveSwapImpactFactor: decimalToFloat(5, 10),

      // minCollateralFactor of 0.01 (1%) when open interest is 50,000,000 USD
      minCollateralFactorForOpenInterestMultiplierLong: decimalToFloat(2, 10),
      minCollateralFactorForOpenInterestMultiplierShort: decimalToFloat(2, 10),

      maxOpenInterestForLongs: decimalToFloat(1_000_000),
      maxOpenInterestForShorts: decimalToFloat(1_000_000),

      fundingIncreaseFactorPerSecond: decimalToFloat(136, 14), // 0.00000000000136, at least 3.5 hours to reach max funding
      fundingDecreaseFactorPerSecond: decimalToFloat(0), // not applicable if thresholdForDecreaseFunding = 0
      minFundingFactorPerSecond: decimalToFloat(3, 10), // 0.00000003%, 0.000108% per hour, 0.95% per year
      maxFundingFactorPerSecond: decimalToFloat(17, 9), // 0.0000017%,  0.14212% per hour, 53.61% per year
      thresholdForStableFunding: decimalToFloat(5, 2), // 5%
      thresholdForDecreaseFunding: decimalToFloat(0), // 0%

      // for OI reserve factor = 100%
      borrowingFactorForLongs: decimalToFloat(1900, 11), // 0.000000019 * 100% max reserve, 60% per year
      borrowingFactorForShorts: decimalToFloat(1900, 11),
    },
    {
      tokens: { longToken: "USDC", shortToken: "USDT" },

      ...baseMarketConfig,
      ...stablecoinSwapMarketConfig,

      maxLongTokenPoolAmount: expandDecimals(10_000_000, 6),
      maxShortTokenPoolAmount: expandDecimals(10_000_000, 6),

      maxLongTokenPoolAmountForDeposit: expandDecimals(10_000_000, 6),
      maxShortTokenPoolAmountForDeposit: expandDecimals(10_000_000, 6),

      negativeSwapImpactFactor: decimalToFloat(5, 9), // 0.01% for 20,000 USD of imbalance
      positiveSwapImpactFactor: decimalToFloat(5, 9), // 0.01% for 20,000 USD of imbalance

      swapFeeFactorForPositiveImpact: decimalToFloat(5, 5), // 0.005%,
      swapFeeFactorForNegativeImpact: decimalToFloat(2, 4), // 0.02%,
    },
  ],
  hardhat: [
    {
      tokens: { indexToken: "WGAS", longToken: "WGAS", shortToken: "USDC" },
    },
    {
      tokens: { indexToken: "WETH", longToken: "WETH", shortToken: "USDC" },
    },
    {
      tokens: { indexToken: "WETH", longToken: "WETH", shortToken: "USDT" },
    },
    {
      tokens: { indexToken: "WETH", longToken: "USDC", shortToken: "USDC" },
    },
    {
      tokens: { indexToken: "WGAS", longToken: "WGAS", shortToken: "USDT" },
    },
    {
      tokens: { longToken: "WGAS", shortToken: "USDC" },
      swapOnly: true,
    },
    {
      tokens: { longToken: "WETH", shortToken: "USDC" },
      swapOnly: true,
    },
    {
      tokens: { indexToken: "WBTC", longToken: "WBTC", shortToken: "USDC" },
    },
    {
      tokens: { indexToken: "SOL", longToken: "WGAS", shortToken: "USDC" },
    },
    {
      tokens: { indexToken: "WGAS", longToken: "USDC", shortToken: "USDC" },
    },
  ],
  localhost: [
    {
      tokens: { indexToken: "WGAS", longToken: "WGAS", shortToken: "USDC" },
    },
    {
      tokens: { indexToken: "WETH", longToken: "WETH", shortToken: "USDC" },
    },
    {
      tokens: { longToken: "WGAS", shortToken: "USDC" },
      swapOnly: true,
    },
    {
      tokens: { longToken: "WETH", shortToken: "USDC" },
      swapOnly: true,
    },
  ],
};

export default async function (hre: HardhatRuntimeEnvironment) {
  const markets = config[hre.network.name];
  const tokens = await hre.dFun.getTokens();
  const defaultMarketConfig = hre.network.name === "hardhat" ? hardhatBaseMarketConfig : baseMarketConfig;
  if (markets) {
    const seen = new Set<string>();
    for (const market of markets) {
      const tokenSymbols = Object.values(market.tokens);
      const tokenSymbolsKey = tokenSymbols.join(":");
      if (seen.has(tokenSymbolsKey)) {
        throw new Error(`Duplicate market: ${tokenSymbolsKey}`);
      }
      seen.add(tokenSymbolsKey);
      for (const tokenSymbol of tokenSymbols) {
        if (!tokens[tokenSymbol]) {
          throw new Error(`Market ${tokenSymbols.join(":")} uses token that does not exist: ${tokenSymbol}`);
        }
      }

      for (const key of Object.keys(defaultMarketConfig)) {
        if (market[key] === undefined) {
          market[key] = defaultMarketConfig[key];
        }
      }
    }
  }
  return markets;
}
