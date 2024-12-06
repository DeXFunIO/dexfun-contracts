import { HardhatRuntimeEnvironment } from "hardhat/types";
import { decimalToFloat, percentageToFloat, expandDecimals } from "../utils/math";

export default async function ({ network }: HardhatRuntimeEnvironment) {
  const addresses = {
    neoXT4: {
      feeReceiver: "0xdd57E125E270E89443839d08A8B816c34a7ec13C",
      holdingAddress: "0xbB32C3bCBB223f172De74e6E17a9D04C1264B1Be",
    },
    neoX: {
      feeReceiver: "0xEAB251263fADA76DB54d6C381582Fab3d62F1587",
      holdingAddress: "0x8ecF3B99cD9141A7E221E7d5680193B95E51510D",
    }
  }[network.name];

  if (network.name === "hardhat") {
    // Note that this is only for the hardhat config
    return {
      feeReceiver: ethers.constants.AddressZero,
      holdingAddress: ethers.constants.AddressZero,
      maxUiFeeFactor: decimalToFloat(5, 5), // 0.005%
      minHandleExecutionErrorGas: 1_200_000,
      minHandleExecutionErrorGasToForward: 1_000_000,
      minAdditionalGasForExecution: 1_000_000,

      depositGasLimitSingle: 0,
      depositGasLimitMultiple: 0,
      withdrawalGasLimit: 0,

      singleSwapGasLimit: 0,
      increaseOrderGasLimit: 0,
      decreaseOrderGasLimit: 0,
      swapOrderGasLimit: 0,

      tokenTransferGasLimit: 200_000,
      nativeTokenTransferGasLimit: 50_000,

      estimatedGasFeeBaseAmount: 0,
      estimatedGasFeeMultiplierFactor: 0,

      executionGasFeeBaseAmount: 0,
      executionGasFeeMultiplierFactor: 0,

      maxSwapPathLength: 5,
      maxCallbackGasLimit: 2_000_000,
      minCollateralUsd: decimalToFloat(1),

      minPositionSizeUsd: decimalToFloat(1),
      claimableCollateralTimeDivisor: 60 * 60,

      positionFeeReceiverFactor: 0,
      swapFeeReceiverFactor: 0,
      borrowingFeeReceiverFactor: 0,

      skipBorrowingFeeForSmallerSide: false,
    };
  }

  const generalConfig = {
    ...addresses,
    maxUiFeeFactor: percentageToFloat("0.05%"),
    minHandleExecutionErrorGas: 120_000,
    minHandleExecutionErrorGasToForward: 100_000, // measured gas required for an order cancellation: ~600,000
    minAdditionalGasForExecution: 100_000,

    depositGasLimitSingle: 30_000,
    depositGasLimitMultiple: 50_000,
    withdrawalGasLimit: 80_000,

    singleSwapGasLimit: 80_000, // measured gas required for a swap in a market increase order: ~600,000
    increaseOrderGasLimit: 80_000,
    decreaseOrderGasLimit: 80_000,
    swapOrderGasLimit: 70_000,

    tokenTransferGasLimit: 150_000,
    nativeTokenTransferGasLimit: 50_000,

    estimatedGasFeeBaseAmount: 60_000, // measured gas for an order execution without any main logic: ~500,000
    estimatedGasFeeMultiplierFactor: expandDecimals(1, 30), // 1x

    executionGasFeeBaseAmount: 250_000, // measured gas for an order execution without any main logic: ~500,000
    executionGasFeeMultiplierFactor: expandDecimals(1, 30), // 1x

    maxSwapPathLength: 3,
    maxCallbackGasLimit: 2_000_000,
    minCollateralUsd: decimalToFloat(1),

    minPositionSizeUsd: decimalToFloat(1),
    claimableCollateralTimeDivisor: 60 * 60,

    positionFeeReceiverFactor: decimalToFloat(37, 2), // 37%
    swapFeeReceiverFactor: decimalToFloat(37, 2), // 37%
    borrowingFeeReceiverFactor: decimalToFloat(37, 2), // 37%

    skipBorrowingFeeForSmallerSide: true,
  };

  const networkConfig = {
    neoX: {
      requestExpirationBlockAge: 30 // about 5 minutes assuming 1 block per 10 second
    },
    neoXT4: {
      requestExpirationBlockAge: 30 // about 5 minutes assuming 1 block per 10 second
    },
    localhost: {
      requestExpirationBlockAge: 30 // about 5 minutes assuming 1 block per 10 second
    }
  }[network.name];

  if (!networkConfig) {
    throw new Error(`Network config not defined for ${network.name}`);
  }



  return { ...generalConfig, ...networkConfig };
}
