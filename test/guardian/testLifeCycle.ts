import { expect } from "chai";
import { ethers } from "hardhat";
const { provider } = ethers;
import { time } from "@nomicfoundation/hardhat-network-helpers";

import { deployFixture } from "../../utils/fixture";
import { expandDecimals, decimalToFloat } from "../../utils/math";
import { handleDeposit } from "../../utils/deposit";
import { OrderType, handleOrder } from "../../utils/order";
import { getEventData } from "../../utils/event";
import { hashString } from "../../utils/hash";
import * as keys from "../../utils/keys";
import { getPositionCount } from "../../utils/position";
import { getBalanceOf, getSupplyOf } from "../../utils/token";

import { handleWithdrawal } from "../../utils/withdrawal";
import { OrderType, getOrderCount } from "../../utils/order";

describe("Guardian.Lifecycle", () => {
  let fixture;
  let user0, user1, user2, user3;
  let dataStore, exchangeRouter, ethUsdMarket, referralStorage, wnt, usdc;

  const referralCode0 = hashString("example code 0");
  const referralCode1 = hashString("example code 1");
  beforeEach(async () => {
    fixture = await deployFixture();

    ({ user0, user1, user2, user3 } = fixture.accounts);
    ({ dataStore, exchangeRouter, ethUsdMarket, referralStorage, wnt, usdc } =
      fixture.contracts);

    await provider.send("evm_setAutomine", [true]);

    // REFERRAL
    await referralStorage.connect(user2).registerCode(referralCode0);
    await referralStorage.connect(user3).registerCode(referralCode1);

    await referralStorage.setTier(1, 1000, 2000); // tier 1, totalRebate: 10%, discountShare: 20%
    await referralStorage.setTier(2, 2000, 2500); // tier 2, totalRebate: 20%, discountShare: 25%

    await referralStorage.setReferrerTier(user2.address, 1);
    await referralStorage.setReferrerTier(user3.address, 2);
  });

  it("Life Cycle Test", async () => {
    // POSITION FEES
    await dataStore.setUint(
      keys.positionFeeFactorKey(ethUsdMarket.marketToken, false),
      decimalToFloat(5, 4)
    );
    await dataStore.setUint(
      keys.positionFeeFactorKey(ethUsdMarket.marketToken, true),
      decimalToFloat(1, 3)
    );
    await dataStore.setUint(
      keys.POSITION_FEE_RECEIVER_FACTOR,
      decimalToFloat(2, 1)
    ); // 20%

    // PRICE IMPACT
    await dataStore.setUint(
      keys.positionImpactFactorKey(ethUsdMarket.marketToken, true),
      decimalToFloat(2, 8)
    );
    await dataStore.setUint(
      keys.positionImpactFactorKey(ethUsdMarket.marketToken, false),
      decimalToFloat(1, 8)
    );
    await dataStore.setUint(
      keys.positionImpactExponentFactorKey(ethUsdMarket.marketToken),
      decimalToFloat(2, 0)
    );

    // BORROWING FEES
    await dataStore.setUint(
      keys.borrowingFactorKey(ethUsdMarket.marketToken, true),
      decimalToFloat(1, 7)
    );
    await dataStore.setUint(
      keys.borrowingFactorKey(ethUsdMarket.marketToken, false),
      decimalToFloat(2, 7)
    );
    await dataStore.setUint(
      keys.borrowingExponentFactorKey(ethUsdMarket.marketToken, true),
      decimalToFloat(1)
    );
    await dataStore.setUint(
      keys.borrowingExponentFactorKey(ethUsdMarket.marketToken, false),
      decimalToFloat(1)
    );

    // FUNDING FEES
    await dataStore.setUint(
      keys.fundingFactorKey(ethUsdMarket.marketToken),
      decimalToFloat(1, 10)
    );
    await dataStore.setUint(
      keys.fundingExponentFactorKey(ethUsdMarket.marketToken),
      decimalToFloat(1)
    );

    // KEYS
    await dataStore.setUint(
      keys.POSITION_FEE_RECEIVER_FACTOR,
      decimalToFloat(2, 1)
    ); // 20%
    await dataStore.setUint(
      keys.BORROWING_FEE_RECEIVER_FACTOR,
      decimalToFloat(4, 1)
    ); // 40%

    // #1 Deposit 50,000 long and short
    await handleDeposit(fixture, {
      create: {
        market: ethUsdMarket,
        longTokenAmount: expandDecimals(10, 18), // $50,000
        shortTokenAmount: expandDecimals(50 * 1000, 6), // $50,000
      },
    });

    // #1 Market increase 5,000 Collateral 10,000 size
    await handleOrder(fixture, {
      create: {
        account: user2,
        market: ethUsdMarket,
        initialCollateralToken: wnt,
        initialCollateralDeltaAmount: expandDecimals(1, 18), // $5,000
        swapPath: [],
        sizeDeltaUsd: decimalToFloat(10 * 1000), // $10,000
        acceptablePrice: expandDecimals(50006, 11), // 5000.6 per token
        executionFee: expandDecimals(1, 15),
        minOutputAmount: 0,
        orderType: OrderType.MarketIncrease,
        isLong: true,
        shouldUnwrapNativeToken: false,
      },
      execute: {
        afterExecution: ({ logs }) => {
          const positionIncreaseEvent = getEventData(logs, "PositionIncrease");
          expect(positionIncreaseEvent.executionPrice).eq("5000500050005000"); // ~5000 per token
        },
      },
    });

    // Deposit 50,000 of long token
    await handleDeposit(fixture, {
      create: {
        account: user1,
        market: ethUsdMarket,
        longTokenAmount: expandDecimals(10, 18), // $50,000
      },
    });

    expect(await getOrderCount(dataStore)).to.eq(0);
    expect(await getPositionCount(dataStore)).to.eq(1);

    // 1 Day later
    await time.increase(24 * 60 * 60); // 1 day

    // Deposit 10,000 of short token
    await handleDeposit(fixture, {
      create: {
        account: user2,
        market: ethUsdMarket,
        shortTokenAmount: expandDecimals(10 * 1000, 6), // $10,000
      },
    });

    // #2 Market increase 1,000 Collateral 2,000 size
    await handleOrder(fixture, {
      create: {
        account: user1,
        market: ethUsdMarket,
        initialCollateralToken: usdc,
        initialCollateralDeltaAmount: expandDecimals(1000, 6), // $1,000
        swapPath: [],
        sizeDeltaUsd: decimalToFloat(2 * 1000), // $2,000
        acceptablePrice: expandDecimals(50009, 11), // 5000.9 per token
        executionFee: expandDecimals(1, 15),
        minOutputAmount: 0,
        orderType: OrderType.MarketIncrease,
        isLong: false,
        shouldUnwrapNativeToken: false,
      },
      execute: {
        afterExecution: ({ logs }) => {
          const positionIncreaseEvent = getEventData(logs, "PositionIncrease");
          expect(positionIncreaseEvent.executionPrice).eq("5000900162029165"); // ~5000 per token
        },
      },
    });
    // LONGS PAYS SHORTS
    expect(await getOrderCount(dataStore)).to.eq(0);
    expect(await getPositionCount(dataStore)).to.eq(2);

    // 5 Hours later
    await time.increase(5 * 60 * 60); // 5 Hours

    // #1 Market decrease 5,000
    await handleOrder(fixture, {
      create: {
        account: user2,
        market: ethUsdMarket,
        initialCollateralToken: wnt,
        initialCollateralDeltaAmount: 0,
        swapPath: [],
        sizeDeltaUsd: decimalToFloat(5 * 1000), // $5,000
        acceptablePrice: expandDecimals(50004, 11), // 5000.4 per token
        executionFee: expandDecimals(1, 15),
        minOutputAmount: 0,
        orderType: OrderType.MarketDecrease,
        isLong: true,
        shouldUnwrapNativeToken: false,
      },
      execute: {
        afterExecution: ({ logs }) => {
          const positionDecreaseEvent = getEventData(logs, "PositionDecrease");
          expect(positionDecreaseEvent.executionPrice).eq("5000550055005500"); // ~5000 per token

          const positionFeesCollectedEvent = getEventData(
            logs,
            "PositionFeesCollected"
          );
          expect(positionFeesCollectedEvent.fundingFeeAmount).closeTo(
            "2400400000000",
            "10000000000"
          ); // 0.0000024004 ETH
          expect(positionFeesCollectedEvent.borrowingFeeAmount).closeTo(
            "2088007649694012",
            "100000000000"
          ); // 0.0020880 ETH
        },
      },
    });

    // #3 Market increase 3,000 Collateral 15,000 size
    await handleOrder(fixture, {
      create: {
        account: user0,
        market: ethUsdMarket,
        initialCollateralToken: usdc,
        initialCollateralDeltaAmount: expandDecimals(3 * 1000, 6), // $3,000
        swapPath: [],
        sizeDeltaUsd: decimalToFloat(15 * 1000), // $15,000
        acceptablePrice: expandDecimals(50011, 11), // 5001.1 per token
        executionFee: expandDecimals(1, 15),
        minOutputAmount: 0,
        orderType: OrderType.MarketIncrease,
        isLong: true,
        shouldUnwrapNativeToken: false,
      },
      execute: {
        afterExecution: ({ logs }) => {
          const positionIncreaseEvent = getEventData(logs, "PositionIncrease");
          expect(positionIncreaseEvent.executionPrice).eq("5001050220546314"); // ~5001 per token
        },
      },
    });

    expect(await getPositionCount(dataStore)).to.eq(3);

    // 14 Hours later
    await time.increase(14 * 60 * 60); // 14 Hours

    // #2 Market decrease 5,000
    await handleOrder(fixture, {
      create: {
        account: user2,
        market: ethUsdMarket,
        initialCollateralToken: wnt,
        initialCollateralDeltaAmount: 0,
        swapPath: [],
        sizeDeltaUsd: decimalToFloat(5 * 1000), // $5,000
        acceptablePrice: expandDecimals(50004, 11), // 5000.4 per token
        executionFee: expandDecimals(1, 15),
        minOutputAmount: 0,
        orderType: OrderType.MarketDecrease,
        isLong: true,
        shouldUnwrapNativeToken: false,
      },
      execute: {
        afterExecution: ({ logs }) => {
          const positionDecreaseEvent = getEventData(logs, "PositionDecrease");
          expect(positionDecreaseEvent.executionPrice).eq("5001550155015501"); // ~5001 per token

          const positionFeesCollectedEvent = getEventData(
            logs,
            "PositionFeesCollected"
          );
          expect(positionFeesCollectedEvent.fundingFeeAmount).to.closeTo(
            "4124096103897",
            "10000000000"
          ); // 0.000004124053 ETH
          expect(positionFeesCollectedEvent.borrowingFeeAmount).to.closeTo(
            "1007798089821825",
            "50000000000000"
          ); // 0.00100777 ETH
        },
      },
    });

    // 24 Hours later
    await time.increase(24 * 60 * 60); // 24 Hours

    expect(await getBalanceOf(ethUsdMarket.marketToken, user0.address)).eq(
      "100000000000000000000000"
    );

    // #1 Withdraw
    await handleWithdrawal(fixture, {
      create: {
        market: ethUsdMarket,
        marketTokenAmount: "50000000000000000000000",
      },
    });
    expect(await getBalanceOf(ethUsdMarket.marketToken, user0.address)).eq(
      "50000000000000000000000"
    );

    // #4 Market increase 3,000 Collateral 3,000 size
    await handleOrder(fixture, {
      create: {
        account: user3,
        market: ethUsdMarket,
        initialCollateralToken: usdc,
        initialCollateralDeltaAmount: expandDecimals(3 * 1000, 6), // $3,000
        swapPath: [],
        sizeDeltaUsd: decimalToFloat(3 * 1000), // $3,000
        acceptablePrice: expandDecimals(5001, 11), // 5001 per token
        executionFee: expandDecimals(1, 15),
        minOutputAmount: 0,
        orderType: OrderType.MarketIncrease,
        isLong: false,
        shouldUnwrapNativeToken: false,
      },
      execute: {
        afterExecution: ({ logs }) => {
          const positionIncreaseEvent = getEventData(logs, "PositionIncrease");
          expect(positionIncreaseEvent.executionPrice).eq("5001150264560848"); // ~5001 per token
        },
      },
    });

    expect(await getPositionCount(dataStore)).to.eq(3);

    // 24 Hours later
    await time.increase(24 * 60 * 60); // 24 Hours

    // #3 Market increase 5,000 Collateral 5,000 size
    await handleOrder(fixture, {
      create: {
        account: user3,
        market: ethUsdMarket,
        initialCollateralToken: usdc,
        initialCollateralDeltaAmount: expandDecimals(5 * 1000, 6), // $5,000
        swapPath: [],
        sizeDeltaUsd: decimalToFloat(5 * 1000), // $5,000
        acceptablePrice: expandDecimals(50013, 11), // 5001.3 per token
        executionFee: expandDecimals(1, 15),
        minOutputAmount: 0,
        orderType: OrderType.MarketIncrease,
        isLong: true,
        shouldUnwrapNativeToken: false,
      },
      execute: {
        afterExecution: ({ logs }) => {
          const positionIncreaseEvent = getEventData(logs, "PositionIncrease");
          expect(positionIncreaseEvent.executionPrice).eq("5001250312578144"); // ~5001 per token
        },
      },
    });

    // #3 Market decrease 15,000
    await handleOrder(fixture, {
      create: {
        account: user0,
        market: ethUsdMarket,
        initialCollateralToken: usdc,
        initialCollateralDeltaAmount: 0,
        swapPath: [],
        sizeDeltaUsd: decimalToFloat(15 * 1000), // $15,000
        acceptablePrice: expandDecimals(500005, 10), // 5000.05 per token
        executionFee: expandDecimals(1, 15),
        minOutputAmount: 0,
        orderType: OrderType.MarketDecrease,
        isLong: true,
        shouldUnwrapNativeToken: false,
      },
      execute: {
        afterExecution: ({ logs }) => {
          const positionDecreaseEvent = getEventData(logs, "PositionDecrease");
          expect(positionDecreaseEvent.executionPrice).eq("5000750157533081"); // ~5000 per token

          const positionFeesCollectedEvent = getEventData(
            logs,
            "PositionFeesCollected"
          );
          expect(positionFeesCollectedEvent.fundingFeeAmount).closeTo(
            "225779",
            "20000"
          ); // 0.225779 USDC
          expect(positionFeesCollectedEvent.borrowingFeeAmount).closeTo(
            "71659938",
            "20000"
          ); // 71.65 USDC
        },
      },
    });

    expect(await getPositionCount(dataStore)).to.eq(3);

    // 15 Hours later
    await time.increase(15 * 60 * 60); // 15 Hours

    // #6 Market increase 15,000 Collateral 15,000 size
    await handleOrder(fixture, {
      create: {
        account: user0,
        market: ethUsdMarket,
        initialCollateralToken: usdc,
        initialCollateralDeltaAmount: expandDecimals(15 * 1000, 6), // $15,000
        swapPath: [],
        sizeDeltaUsd: decimalToFloat(15 * 1000), // $15,000
        acceptablePrice: expandDecimals(49992, 11), // 4999.2 per token
        executionFee: expandDecimals(1, 15),
        minOutputAmount: 0,
        orderType: OrderType.MarketIncrease,
        isLong: false,
        shouldUnwrapNativeToken: false,
      },
      execute: {
        afterExecution: ({ logs }) => {
          const positionIncreaseEvent = getEventData(logs, "PositionIncrease");
          expect(positionIncreaseEvent.executionPrice).eq("4999250112483127"); // ~4998 per token
        },
      },
    });

    expect(await getBalanceOf(ethUsdMarket.marketToken, user0.address)).eq(
      "50000000000000000000000"
    );

    // Deposit 25,000 long and short
    await handleDeposit(fixture, {
      create: {
        market: ethUsdMarket,
        longTokenAmount: expandDecimals(5, 18), // $25,000
        shortTokenAmount: expandDecimals(25 * 1000, 6), // $25,000
      },
    });

    // 48 Hours later
    await time.increase(48 * 60 * 60); // 48 Hours

    const marketTokenBalUser2 = await getBalanceOf(
      ethUsdMarket.marketToken,
      user2.address
    );

    expect(marketTokenBalUser2).closeTo(
      "9999254451370059838522",
      "1000000000000000000"
    );

    // #2 Withdraw
    await handleWithdrawal(fixture, {
      create: {
        account: user2,
        market: ethUsdMarket,
        marketTokenAmount: marketTokenBalUser2,
      },
    });

    expect(await getPositionCount(dataStore)).to.eq(4);

    // #4 Market decrease 2,000
    await handleOrder(fixture, {
      create: {
        account: user1,
        market: ethUsdMarket,
        initialCollateralToken: usdc,
        initialCollateralDeltaAmount: 0,
        swapPath: [],
        sizeDeltaUsd: decimalToFloat(2 * 1000), // $2,000
        acceptablePrice: expandDecimals(49986, 11), // 4998.6 per token
        executionFee: expandDecimals(1, 15),
        minOutputAmount: 0,
        orderType: OrderType.MarketDecrease,
        isLong: false,
        shouldUnwrapNativeToken: false,
      },
      execute: {
        afterExecution: ({ logs }) => {
          const positionDecreaseEvent = getEventData(logs, "PositionDecrease");
          expect(positionDecreaseEvent.executionPrice).eq("4998599747954632"); // ~4998 per token

          const positionFeesCollectedEvent = getEventData(
            logs,
            "PositionFeesCollected"
          );
          expect(positionFeesCollectedEvent.fundingFeeAmount).closeTo(
            "20738",
            "20000"
          ); // 0.020738 USDC
          expect(positionFeesCollectedEvent.borrowingFeeAmount).closeTo(
            "31634419",
            "20000"
          ); // 31.63 USDC
        },
      },
    });
    expect(await getPositionCount(dataStore)).to.eq(3);

    // #5 Market decrease 5,000
    await handleOrder(fixture, {
      create: {
        account: user3,
        market: ethUsdMarket,
        initialCollateralToken: usdc,
        initialCollateralDeltaAmount: 0,
        swapPath: [],
        sizeDeltaUsd: decimalToFloat(5 * 1000), // $5,000
        acceptablePrice: expandDecimals(49983, 11), // 4998.3 per token
        executionFee: expandDecimals(1, 15),
        minOutputAmount: 0,
        orderType: OrderType.MarketDecrease,
        isLong: true,
        shouldUnwrapNativeToken: false,
      },
      execute: {
        afterExecution: ({ logs }) => {
          const positionDecreaseEvent = getEventData(logs, "PositionDecrease");
          expect(positionDecreaseEvent.executionPrice).eq("4998449612403101"); // ~4998 per token

          const positionFeesCollectedEvent = getEventData(
            logs,
            "PositionFeesCollected"
          );
          expect(positionFeesCollectedEvent.fundingFeeAmount).closeTo(
            "1",
            "10"
          ); // 0.000001 USDC
          expect(positionFeesCollectedEvent.borrowingFeeAmount).closeTo(
            "6878373",
            "20000"
          ); // 6.87 USDC
        },
      },
    });
    expect(await getPositionCount(dataStore)).to.eq(2);

    // #6 Market decrease 3,000
    await handleOrder(fixture, {
      create: {
        account: user3,
        market: ethUsdMarket,
        initialCollateralToken: usdc,
        initialCollateralDeltaAmount: 0,
        swapPath: [],
        sizeDeltaUsd: decimalToFloat(3 * 1000), // $3,000
        acceptablePrice: expandDecimals(49984, 11), // 4998.4 per token
        executionFee: expandDecimals(1, 15),
        minOutputAmount: 0,
        orderType: OrderType.MarketDecrease,
        isLong: false,
        shouldUnwrapNativeToken: false,
      },
      execute: {
        afterExecution: ({ logs }) => {
          const positionDecreaseEvent = getEventData(logs, "PositionDecrease");
          expect(positionDecreaseEvent.executionPrice).eq("4998349620412695"); // ~4998 per token

          const positionFeesCollectedEvent = getEventData(
            logs,
            "PositionFeesCollected"
          );
          expect(positionFeesCollectedEvent.fundingFeeAmount).closeTo(
            "31107",
            "2000"
          ); //  0.031107 USDC
          expect(positionFeesCollectedEvent.borrowingFeeAmount).closeTo(
            "43570951",
            "20000"
          ); // 43.57 USDC
        },
      },
    });

    // 48 Hours later
    await time.increase(48 * 60 * 60); // 48 Hours

    expect(await getPositionCount(dataStore)).to.eq(1);

    // #7 Market decrease 15,000
    await handleOrder(fixture, {
      create: {
        account: user0,
        market: ethUsdMarket,
        initialCollateralToken: usdc,
        initialCollateralDeltaAmount: 0,
        swapPath: [],
        sizeDeltaUsd: decimalToFloat(15 * 1000), // $15,000
        acceptablePrice: expandDecimals(49993, 11), // 4999.3 per token
        executionFee: expandDecimals(1, 15),
        minOutputAmount: 0,
        orderType: OrderType.MarketDecrease,
        isLong: false,
        shouldUnwrapNativeToken: false,
      },
      execute: {
        afterExecution: ({ logs }) => {
          const positionDecreaseEvent = getEventData(logs, "PositionDecrease");
          expect(positionDecreaseEvent.executionPrice).eq("4999250112483128"); // ~4999 per token

          const positionFeesCollectedEvent = getEventData(
            logs,
            "PositionFeesCollected"
          );
          expect(positionFeesCollectedEvent.fundingFeeAmount).closeTo(
            "155534",
            "20000"
          ); // 0.155534 USDC
          expect(positionFeesCollectedEvent.borrowingFeeAmount).closeTo(
            "291821924",
            "500000"
          ); // 291.82 USDC
        },
      },
    });

    expect(await getPositionCount(dataStore)).to.eq(0);

    const marketTokenBalUser0 = await getBalanceOf(
      ethUsdMarket.marketToken,
      user0.address
    );

    expect(marketTokenBalUser0).closeTo(
      "99967192604493996634452",
      "10000000000000000000"
    );

    // #3 Withdraw
    await handleWithdrawal(fixture, {
      create: {
        account: user0,
        market: ethUsdMarket,
        marketTokenAmount: marketTokenBalUser0,
      },
    });

    const marketTokenBalUser1 = await getBalanceOf(
      ethUsdMarket.marketToken,
      user1.address
    );

    expect(marketTokenBalUser1).closeTo(
      "49997999840059193216263",
      "1000000000000000000"
    );

    // #4 Withdraw
    await handleWithdrawal(fixture, {
      create: {
        account: user1,
        market: ethUsdMarket,
        marketTokenAmount: marketTokenBalUser1,
      },
    });

    expect(
      await dataStore.getUint(
        keys.claimableFundingAmountKey(
          ethUsdMarket.marketToken,
          wnt.address,
          user0.address
        )
      )
    ).eq("0");

    expect(
      await dataStore.getUint(
        keys.claimableFundingAmountKey(
          ethUsdMarket.marketToken,
          usdc.address,
          user0.address
        )
      )
    ).eq("0");

    expect(
      await dataStore.getUint(
        keys.claimableFundingAmountKey(
          ethUsdMarket.marketToken,
          wnt.address,
          user2.address
        )
      )
    ).eq("0");

    expect(
      await dataStore.getUint(
        keys.claimableFundingAmountKey(
          ethUsdMarket.marketToken,
          usdc.address,
          user2.address
        )
      )
    ).eq("0");

    expect(
      await dataStore.getUint(
        keys.claimableFundingAmountKey(
          ethUsdMarket.marketToken,
          wnt.address,
          user3.address
        )
      )
    ).eq("0");

    let balBefore = await wnt.balanceOf(user1.address);
    await exchangeRouter
      .connect(user1)
      .claimFundingFees(
        [ethUsdMarket.marketToken],
        [wnt.address],
        user1.address
      );
    let balAfter = await wnt.balanceOf(user1.address);

    expect(balAfter.sub(balBefore)).to.closeTo("6524453246753", "1000000000");

    balBefore = await usdc.balanceOf(user1.address);
    await exchangeRouter
      .connect(user1)
      .claimFundingFees(
        [ethUsdMarket.marketToken],
        [usdc.address],
        user1.address
      );
    balAfter = await usdc.balanceOf(user1.address);

    expect(balAfter.sub(balBefore)).to.closeTo("186895", "10000");

    balBefore = await usdc.balanceOf(user3.address);
    await exchangeRouter
      .connect(user3)
      .claimFundingFees(
        [ethUsdMarket.marketToken],
        [usdc.address],
        user3.address
      );
    balAfter = await usdc.balanceOf(user3.address);

    expect(balAfter.sub(balBefore)).to.closeTo("246260", "10000");

    expect(await getPositionCount(dataStore)).to.eq(0);
    expect(await getOrderCount(dataStore)).to.eq(0);

    expect(await getSupplyOf(ethUsdMarket.marketToken)).eq("0");
  });

  it("Life Cycle Test Using Swap Paths", async () => {
    // POSITION FEES
    await dataStore.setUint(
      keys.positionFeeFactorKey(ethUsdMarket.marketToken, false),
      decimalToFloat(5, 4)
    );
    await dataStore.setUint(
      keys.positionFeeFactorKey(ethUsdMarket.marketToken, true),
      decimalToFloat(1, 3)
    );
    await dataStore.setUint(
      keys.POSITION_FEE_RECEIVER_FACTOR,
      decimalToFloat(2, 1)
    ); // 20%

    // PRICE IMPACT
    await dataStore.setUint(
      keys.positionImpactFactorKey(ethUsdMarket.marketToken, true),
      decimalToFloat(2, 8)
    );
    await dataStore.setUint(
      keys.positionImpactFactorKey(ethUsdMarket.marketToken, false),
      decimalToFloat(1, 8)
    );
    await dataStore.setUint(
      keys.positionImpactExponentFactorKey(ethUsdMarket.marketToken),
      decimalToFloat(2, 0)
    );

    // BORROWING FEES
    await dataStore.setUint(
      keys.borrowingFactorKey(ethUsdMarket.marketToken, true),
      decimalToFloat(1, 7)
    );
    await dataStore.setUint(
      keys.borrowingFactorKey(ethUsdMarket.marketToken, false),
      decimalToFloat(2, 7)
    );
    await dataStore.setUint(
      keys.borrowingExponentFactorKey(ethUsdMarket.marketToken, true),
      decimalToFloat(1)
    );
    await dataStore.setUint(
      keys.borrowingExponentFactorKey(ethUsdMarket.marketToken, false),
      decimalToFloat(1)
    );

    // FUNDING FEES
    await dataStore.setUint(
      keys.fundingFactorKey(ethUsdMarket.marketToken),
      decimalToFloat(1, 10)
    );
    await dataStore.setUint(
      keys.fundingExponentFactorKey(ethUsdMarket.marketToken),
      decimalToFloat(1)
    );

    // KEYS
    await dataStore.setUint(
      keys.POSITION_FEE_RECEIVER_FACTOR,
      decimalToFloat(2, 1)
    ); // 20%
    await dataStore.setUint(
      keys.BORROWING_FEE_RECEIVER_FACTOR,
      decimalToFloat(4, 1)
    ); // 40%

    // #1 Deposit 50,000 long and short
    await handleDeposit(fixture, {
      create: {
        market: ethUsdMarket,
        longTokenAmount: expandDecimals(10, 18), // $50,000
        shortTokenAmount: expandDecimals(50 * 1000, 6), // $50,000
      },
    });

    // #1 Market increase 5,000 Collateral 10,000 size
    await handleOrder(fixture, {
      create: {
        account: user2,
        market: ethUsdMarket,
        initialCollateralToken: wnt,
        initialCollateralDeltaAmount: expandDecimals(1, 18), // $5,000
        swapPath: [],
        sizeDeltaUsd: decimalToFloat(10 * 1000), // $10,000
        acceptablePrice: expandDecimals(50006, 11), // 5000.6 per token
        executionFee: expandDecimals(1, 15),
        minOutputAmount: 0,
        orderType: OrderType.MarketIncrease,
        isLong: true,
        shouldUnwrapNativeToken: false,
      },
      execute: {
        afterExecution: ({ logs }) => {
          const positionIncreaseEvent = getEventData(logs, "PositionIncrease");
          expect(positionIncreaseEvent.executionPrice).eq("5000500050005000"); // ~5000 per token
        },
      },
    });

    // Deposit 50,000 of long token
    await handleDeposit(fixture, {
      create: {
        account: user1,
        market: ethUsdMarket,
        longTokenAmount: expandDecimals(10, 18), // $50,000
      },
    });

    expect(await getOrderCount(dataStore)).to.eq(0);
    expect(await getPositionCount(dataStore)).to.eq(1);

    // 1 Day later
    await time.increase(24 * 60 * 60); // 1 day

    // Deposit 10,000 of short token
    await handleDeposit(fixture, {
      create: {
        account: user2,
        market: ethUsdMarket,
        shortTokenAmount: expandDecimals(10 * 1000, 6), // $10,000
      },
    });

    // #2 Market increase 1,000 Collateral 2,000 size
    await handleOrder(fixture, {
      create: {
        account: user1,
        market: ethUsdMarket,
        initialCollateralToken: usdc,
        initialCollateralDeltaAmount: expandDecimals(1000, 6), // $1,000
        swapPath: [ethUsdMarket.marketToken],
        sizeDeltaUsd: decimalToFloat(2 * 1000), // $2,000
        acceptablePrice: expandDecimals(50009, 11), // 5000.9 per token
        executionFee: expandDecimals(1, 15),
        minOutputAmount: 0,
        orderType: OrderType.MarketIncrease,
        isLong: false,
        shouldUnwrapNativeToken: false,
      },
      execute: {
        afterExecution: ({ logs }) => {
          const positionIncreaseEvent = getEventData(logs, "PositionIncrease");
          expect(positionIncreaseEvent.executionPrice).eq("5000900162029165"); // ~5000 per token
        },
      },
    });

    expect(await getOrderCount(dataStore)).to.eq(0);
    expect(await getPositionCount(dataStore)).to.eq(2);

    // 5 Hours later
    await time.increase(5 * 60 * 60); // 5 Hours

    // #1 Market decrease 5,000
    await handleOrder(fixture, {
      create: {
        account: user2,
        market: ethUsdMarket,
        initialCollateralToken: wnt,
        initialCollateralDeltaAmount: 0,
        swapPath: [],
        sizeDeltaUsd: decimalToFloat(5 * 1000), // $5,000
        acceptablePrice: expandDecimals(50004, 11), // 5000.4 per token
        executionFee: expandDecimals(1, 15),
        minOutputAmount: 0,
        orderType: OrderType.MarketDecrease,
        isLong: true,
        shouldUnwrapNativeToken: false,
      },
      execute: {
        afterExecution: ({ logs }) => {
          const positionDecreaseEvent = getEventData(logs, "PositionDecrease");
          expect(positionDecreaseEvent.executionPrice).eq("5000550055005500"); // ~5000 per token

          const positionFeesCollectedEvent = getEventData(
            logs,
            "PositionFeesCollected"
          );
          expect(positionFeesCollectedEvent.fundingFeeAmount).closeTo(
            "2400400000000",
            "10000000000000"
          ); // 0.0000024004 ETH
          expect(positionFeesCollectedEvent.borrowingFeeAmount).closeTo(
            "2109097783927922",
            "10000000000000"
          ); // 0.0021090 ETH
        },
      },
    });

    // #3 Market increase 3,000 Collateral 15,000 size
    await handleOrder(fixture, {
      create: {
        account: user0,
        market: ethUsdMarket,
        initialCollateralToken: usdc,
        initialCollateralDeltaAmount: expandDecimals(3 * 1000, 6), // $3,000
        swapPath: [],
        sizeDeltaUsd: decimalToFloat(15 * 1000), // $15,000
        acceptablePrice: expandDecimals(50011, 11), // 5001.1 per token
        executionFee: expandDecimals(1, 15),
        minOutputAmount: 0,
        orderType: OrderType.MarketIncrease,
        isLong: true,
        shouldUnwrapNativeToken: false,
      },
      execute: {
        afterExecution: ({ logs }) => {
          const positionIncreaseEvent = getEventData(logs, "PositionIncrease");
          expect(positionIncreaseEvent.executionPrice).eq("5001050220546314"); // ~5001 per token
        },
      },
    });

    expect(await getPositionCount(dataStore)).to.eq(3);

    // 14 Hours later
    await time.increase(14 * 60 * 60); // 14 Hours

    // #2 Market decrease 5,000
    await handleOrder(fixture, {
      create: {
        account: user2,
        market: ethUsdMarket,
        initialCollateralToken: wnt,
        initialCollateralDeltaAmount: 0,
        swapPath: [ethUsdMarket.marketToken],
        sizeDeltaUsd: decimalToFloat(5 * 1000), // $5,000
        acceptablePrice: expandDecimals(50004, 11), // 5000.4 per token
        executionFee: expandDecimals(1, 15),
        minOutputAmount: 0,
        orderType: OrderType.MarketDecrease,
        isLong: true,
        shouldUnwrapNativeToken: false,
      },
      execute: {
        afterExecution: ({ logs }) => {
          const positionDecreaseEvent = getEventData(logs, "PositionDecrease");
          expect(positionDecreaseEvent.executionPrice).eq("5001550155015501"); // ~5001 per token

          const positionFeesCollectedEvent = getEventData(
            logs,
            "PositionFeesCollected"
          );
          expect(positionFeesCollectedEvent.fundingFeeAmount).closeTo(
            "4124053246754",
            "100000000000"
          ); // 0.000004124053 ETH
          expect(positionFeesCollectedEvent.borrowingFeeAmount).closeTo(
            "1017971118355485",
            "100000000000"
          ); // 0.0010179 ETH
        },
      },
    });

    // 24 Hours later
    await time.increase(24 * 60 * 60); // 24 Hours

    expect(await getBalanceOf(ethUsdMarket.marketToken, user0.address)).eq(
      "100000000000000000000000"
    );

    // #1 Withdraw
    await handleWithdrawal(fixture, {
      create: {
        market: ethUsdMarket,
        marketTokenAmount: "50000000000000000000000",
      },
    });

    expect(await getBalanceOf(ethUsdMarket.marketToken, user0.address)).eq(
      "50000000000000000000000"
    );

    // #4 Market increase 3,000 Collateral 3,000 size
    await handleOrder(fixture, {
      create: {
        account: user3,
        market: ethUsdMarket,
        initialCollateralToken: usdc,
        initialCollateralDeltaAmount: expandDecimals(3 * 1000, 6), // $3,000
        swapPath: [],
        sizeDeltaUsd: decimalToFloat(3 * 1000), // $3,000
        acceptablePrice: expandDecimals(5001, 11), // 5001 per token
        executionFee: expandDecimals(1, 15),
        minOutputAmount: 0,
        orderType: OrderType.MarketIncrease,
        isLong: false,
        shouldUnwrapNativeToken: false,
      },
      execute: {
        afterExecution: ({ logs }) => {
          const positionIncreaseEvent = getEventData(logs, "PositionIncrease");
          expect(positionIncreaseEvent.executionPrice).eq("5001150264560848"); // ~5001 per token
        },
      },
    });

    expect(await getPositionCount(dataStore)).to.eq(3);

    // 24 Hours later
    await time.increase(24 * 60 * 60); // 24 Hours

    // #3 Market increase 5,000 Collateral 5,000 size
    await handleOrder(fixture, {
      create: {
        account: user3,
        market: ethUsdMarket,
        initialCollateralToken: usdc,
        initialCollateralDeltaAmount: expandDecimals(5 * 1000, 6), // $5,000
        swapPath: [ethUsdMarket.marketToken],
        sizeDeltaUsd: decimalToFloat(5 * 1000), // $5,000
        acceptablePrice: expandDecimals(50013, 11), // 5001.3 per token
        executionFee: expandDecimals(1, 15),
        minOutputAmount: 0,
        orderType: OrderType.MarketIncrease,
        isLong: true,
        shouldUnwrapNativeToken: false,
      },
      execute: {
        afterExecution: ({ logs }) => {
          const positionIncreaseEvent = getEventData(logs, "PositionIncrease");
          expect(positionIncreaseEvent.executionPrice).eq("5001250312578144"); // ~5001 per token
        },
      },
    });

    // #3 Market decrease 15,000
    await handleOrder(fixture, {
      create: {
        account: user0,
        market: ethUsdMarket,
        initialCollateralToken: usdc,
        initialCollateralDeltaAmount: 0,
        swapPath: [],
        sizeDeltaUsd: decimalToFloat(15 * 1000), // $15,000
        acceptablePrice: expandDecimals(500005, 10), // 5000.05 per token
        executionFee: expandDecimals(1, 15),
        minOutputAmount: 0,
        orderType: OrderType.MarketDecrease,
        isLong: true,
        shouldUnwrapNativeToken: false,
      },
      execute: {
        afterExecution: ({ logs }) => {
          const positionDecreaseEvent = getEventData(logs, "PositionDecrease");
          expect(positionDecreaseEvent.executionPrice).eq("5000750157533081"); // ~5000 per token

          const positionFeesCollectedEvent = getEventData(
            logs,
            "PositionFeesCollected"
          );
          expect(positionFeesCollectedEvent.fundingFeeAmount).to.closeTo(
            "225780",
            "20000"
          ); // 0.225780 USDC
          expect(positionFeesCollectedEvent.borrowingFeeAmount).to.closeTo(
            "71692885",
            "1000000"
          ); // 73.737219 USDC
        },
      },
    });

    expect(await getPositionCount(dataStore)).to.eq(3);

    // 15 Hours later
    await time.increase(15 * 60 * 60); // 15 Hours

    // #6 Market increase 15,000 Collateral 15,000 size
    await handleOrder(fixture, {
      create: {
        account: user0,
        market: ethUsdMarket,
        initialCollateralToken: usdc,
        initialCollateralDeltaAmount: expandDecimals(15 * 1000, 6), // $15,000
        swapPath: [],
        sizeDeltaUsd: decimalToFloat(15 * 1000), // $15,000
        acceptablePrice: expandDecimals(49992, 11), // 4999.2 per token
        executionFee: expandDecimals(1, 15),
        minOutputAmount: 0,
        orderType: OrderType.MarketIncrease,
        isLong: false,
        shouldUnwrapNativeToken: false,
      },
      execute: {
        afterExecution: ({ logs }) => {
          const positionIncreaseEvent = getEventData(logs, "PositionIncrease");
          expect(positionIncreaseEvent.executionPrice).eq("4999250112483127"); // ~4999 per token
        },
      },
    });

    expect(await getBalanceOf(ethUsdMarket.marketToken, user0.address)).eq(
      "50000000000000000000000"
    );

    // Deposit 25,000 long and short
    await handleDeposit(fixture, {
      create: {
        market: ethUsdMarket,
        longTokenAmount: expandDecimals(5, 18), // $25,000
        shortTokenAmount: expandDecimals(25 * 1000, 6), // $25,000
      },
    });

    // 48 Hours later
    await time.increase(48 * 60 * 60); // 48 Hours

    const marketTokenBalUser2 = await getBalanceOf(
      ethUsdMarket.marketToken,
      user2.address
    );

    expect(marketTokenBalUser2).closeTo(
      "9999254451370059838522",
      "1000000000000000000"
    );

    // #2 Withdraw
    await handleWithdrawal(fixture, {
      create: {
        account: user2,
        market: ethUsdMarket,
        marketTokenAmount: marketTokenBalUser2,
      },
    });

    expect(await getPositionCount(dataStore)).to.eq(4);

    // #4 Market decrease 2,000
    await handleOrder(fixture, {
      create: {
        account: user1,
        market: ethUsdMarket,
        initialCollateralToken: wnt,
        initialCollateralDeltaAmount: 0,
        swapPath: [],
        sizeDeltaUsd: decimalToFloat(2 * 1000), // $2,000
        acceptablePrice: expandDecimals(49986, 11), // 4998.6 per token
        executionFee: expandDecimals(1, 15),
        minOutputAmount: 0,
        orderType: OrderType.MarketDecrease,
        isLong: false,
        shouldUnwrapNativeToken: false,
      },
      execute: {
        afterExecution: ({ logs }) => {
          const positionDecreaseEvent = getEventData(logs, "PositionDecrease");
          expect(positionDecreaseEvent.executionPrice).eq("4998599747954632"); // ~4998 per token

          const positionFeesCollectedEvent = getEventData(
            logs,
            "PositionFeesCollected"
          );
          expect(positionFeesCollectedEvent.fundingFeeAmount).closeTo(
            "4147488000000",
            "100000000000"
          ); // 0.00000414 ETH
          expect(positionFeesCollectedEvent.borrowingFeeAmount).closeTo(
            "6130220287120206",
            "100000000000000"
          ); // 0.006130 ETH
        },
      },
    });

    expect(await getPositionCount(dataStore)).to.eq(3);

    // #5 Market decrease 5,000
    await handleOrder(fixture, {
      create: {
        account: user3,
        market: ethUsdMarket,
        initialCollateralToken: wnt,
        initialCollateralDeltaAmount: 0,
        swapPath: [],
        sizeDeltaUsd: decimalToFloat(5 * 1000), // $5,000
        acceptablePrice: expandDecimals(49983, 11), // 4998.3 per token
        executionFee: expandDecimals(1, 15),
        minOutputAmount: 0,
        orderType: OrderType.MarketDecrease,
        isLong: true,
        shouldUnwrapNativeToken: false,
      },
      execute: {
        afterExecution: ({ logs }) => {
          const positionDecreaseEvent = getEventData(logs, "PositionDecrease");
          expect(positionDecreaseEvent.executionPrice).eq("4998449612403101"); // ~4998 per token

          const positionFeesCollectedEvent = getEventData(
            logs,
            "PositionFeesCollected"
          );
          expect(positionFeesCollectedEvent.borrowingFeeAmount).closeTo(
            "1413328318437226",
            "1000000000000"
          ); // 0.0013217 ETH
        },
      },
    });

    expect(await getPositionCount(dataStore)).to.eq(2);

    // #6 Market decrease 3,000
    await handleOrder(fixture, {
      create: {
        account: user3,
        market: ethUsdMarket,
        initialCollateralToken: usdc,
        initialCollateralDeltaAmount: 0,
        swapPath: [ethUsdMarket.marketToken],
        sizeDeltaUsd: decimalToFloat(3 * 1000), // $3,000
        acceptablePrice: expandDecimals(49984, 11), // 4998.4 per token
        executionFee: expandDecimals(1, 15),
        minOutputAmount: 0,
        orderType: OrderType.MarketDecrease,
        isLong: false,
        shouldUnwrapNativeToken: false,
      },
      execute: {
        afterExecution: ({ logs }) => {
          const positionDecreaseEvent = getEventData(logs, "PositionDecrease");
          expect(positionDecreaseEvent.executionPrice).eq("4998349620412695"); // ~4998 per token

          const positionFeesCollectedEvent = getEventData(
            logs,
            "PositionFeesCollected"
          );
          expect(positionFeesCollectedEvent.fundingFeeAmount).closeTo(
            "31107",
            "20000"
          ); //  0.031107 USDC
          expect(positionFeesCollectedEvent.borrowingFeeAmount).closeTo(
            "41939785",
            "20000"
          ); // 41.925332 USDC
        },
      },
    });

    // 48 Hours later
    await time.increase(48 * 60 * 60); // 48 Hours

    expect(await getPositionCount(dataStore)).to.eq(1);

    // #7 Market decrease 15,000
    await handleOrder(fixture, {
      create: {
        account: user0,
        market: ethUsdMarket,
        initialCollateralToken: usdc,
        initialCollateralDeltaAmount: 0,
        swapPath: [],
        sizeDeltaUsd: decimalToFloat(15 * 1000), // $15,000
        acceptablePrice: expandDecimals(49993, 11), // 4999.3 per token
        executionFee: expandDecimals(1, 15),
        minOutputAmount: 0,
        orderType: OrderType.MarketDecrease,
        isLong: false,
        shouldUnwrapNativeToken: false,
      },
      execute: {
        afterExecution: ({ logs }) => {
          const positionDecreaseEvent = getEventData(logs, "PositionDecrease");
          expect(positionDecreaseEvent.executionPrice).eq("4999250112483128"); // ~4999 per token

          const positionFeesCollectedEvent = getEventData(
            logs,
            "PositionFeesCollected"
          );
          expect(positionFeesCollectedEvent.fundingFeeAmount).closeTo(
            "155534",
            "20000"
          ); // 0.155534 USDC
          expect(positionFeesCollectedEvent.borrowingFeeAmount).closeTo(
            "276931439",
            "200000"
          ); // 276.888126 USDC
        },
      },
    });

    expect(await getPositionCount(dataStore)).to.eq(0);

    const marketTokenBalUser0 = await getBalanceOf(
      ethUsdMarket.marketToken,
      user0.address
    );

    expect(marketTokenBalUser0).closeTo(
      "99967304180429821063761",
      "20000000000000000000"
    );

    // #3 Withdraw
    await handleWithdrawal(fixture, {
      create: {
        account: user0,
        market: ethUsdMarket,
        marketTokenAmount: marketTokenBalUser0,
      },
    });

    const marketTokenBalUser1 = await getBalanceOf(
      ethUsdMarket.marketToken,
      user1.address
    );

    expect(marketTokenBalUser1).closeTo(
      "49997999840059193216263",
      "10000000000000000000"
    );

    // #4 Withdraw
    await handleWithdrawal(fixture, {
      create: {
        account: user1,
        market: ethUsdMarket,
        marketTokenAmount: marketTokenBalUser1,
      },
    });

    expect(
      await dataStore.getUint(
        keys.claimableFundingAmountKey(
          ethUsdMarket.marketToken,
          wnt.address,
          user0.address
        )
      )
    ).eq("0");

    expect(
      await dataStore.getUint(
        keys.claimableFundingAmountKey(
          ethUsdMarket.marketToken,
          usdc.address,
          user0.address
        )
      )
    ).eq("0");

    expect(
      await dataStore.getUint(
        keys.claimableFundingAmountKey(
          ethUsdMarket.marketToken,
          wnt.address,
          user2.address
        )
      )
    ).eq("0");

    expect(
      await dataStore.getUint(
        keys.claimableFundingAmountKey(
          ethUsdMarket.marketToken,
          usdc.address,
          user2.address
        )
      )
    ).eq("0");

    let balBefore = await wnt.balanceOf(user1.address);

    await exchangeRouter
      .connect(user1)
      .claimFundingFees(
        [ethUsdMarket.marketToken],
        [wnt.address],
        user1.address
      );

    let balAfter = await wnt.balanceOf(user1.address);

    expect(balAfter.sub(balBefore)).to.closeTo("6524525246753", "10000000000");

    balBefore = await usdc.balanceOf(user1.address);

    await exchangeRouter
      .connect(user1)
      .claimFundingFees(
        [ethUsdMarket.marketToken],
        [usdc.address],
        user1.address
      );

    balAfter = await usdc.balanceOf(user1.address);

    expect(balAfter.sub(balBefore)).to.closeTo("186895", "10000");

    balBefore = await usdc.balanceOf(user3.address);

    await exchangeRouter
      .connect(user3)
      .claimFundingFees(
        [ethUsdMarket.marketToken],
        [usdc.address],
        user3.address
      );

    balAfter = await usdc.balanceOf(user3.address);

    expect(balAfter.sub(balBefore)).to.closeTo("225523", "10000");

    expect(
      await dataStore.getUint(
        keys.claimableFundingAmountKey(
          ethUsdMarket.marketToken,
          usdc.address,
          user3.address
        )
      )
    ).eq("0");

    expect(await getPositionCount(dataStore)).to.eq(0);
    expect(await getOrderCount(dataStore)).to.eq(0);

    expect(await getSupplyOf(ethUsdMarket.marketToken)).eq("0");
  });

  it("Life Cycle Test With Swaps", async () => {
    // POSITION FEES
    await dataStore.setUint(
      keys.positionFeeFactorKey(ethUsdMarket.marketToken, false),
      decimalToFloat(5, 4)
    );
    await dataStore.setUint(
      keys.positionFeeFactorKey(ethUsdMarket.marketToken, true),
      decimalToFloat(1, 3)
    );
    await dataStore.setUint(
      keys.POSITION_FEE_RECEIVER_FACTOR,
      decimalToFloat(2, 1)
    ); // 20%

    // PRICE IMPACT
    await dataStore.setUint(
      keys.positionImpactFactorKey(ethUsdMarket.marketToken, true),
      decimalToFloat(2, 8)
    );
    await dataStore.setUint(
      keys.positionImpactFactorKey(ethUsdMarket.marketToken, false),
      decimalToFloat(1, 8)
    );
    await dataStore.setUint(
      keys.positionImpactExponentFactorKey(ethUsdMarket.marketToken),
      decimalToFloat(2, 0)
    );

    // BORROWING FEES
    await dataStore.setUint(
      keys.borrowingFactorKey(ethUsdMarket.marketToken, true),
      decimalToFloat(1, 7)
    );
    await dataStore.setUint(
      keys.borrowingFactorKey(ethUsdMarket.marketToken, false),
      decimalToFloat(2, 7)
    );
    await dataStore.setUint(
      keys.borrowingExponentFactorKey(ethUsdMarket.marketToken, true),
      decimalToFloat(1)
    );
    await dataStore.setUint(
      keys.borrowingExponentFactorKey(ethUsdMarket.marketToken, false),
      decimalToFloat(1)
    );

    // FUNDING FEES
    await dataStore.setUint(
      keys.fundingFactorKey(ethUsdMarket.marketToken),
      decimalToFloat(1, 10)
    );
    await dataStore.setUint(
      keys.fundingExponentFactorKey(ethUsdMarket.marketToken),
      decimalToFloat(1)
    );

    // KEYS
    await dataStore.setUint(
      keys.POSITION_FEE_RECEIVER_FACTOR,
      decimalToFloat(2, 1)
    ); // 20%
    await dataStore.setUint(
      keys.BORROWING_FEE_RECEIVER_FACTOR,
      decimalToFloat(4, 1)
    ); // 40%

    // #1 Deposit 50,000 long and short
    await handleDeposit(fixture, {
      create: {
        market: ethUsdMarket,
        longTokenAmount: expandDecimals(10, 18), // $50,000
        shortTokenAmount: expandDecimals(50 * 1000, 6), // $50,000
      },
    });

    // #1 Market increase 5,000 Collateral 10,000 size
    await handleOrder(fixture, {
      create: {
        account: user2,
        market: ethUsdMarket,
        initialCollateralToken: wnt,
        initialCollateralDeltaAmount: expandDecimals(1, 18), // $5,000
        swapPath: [],
        sizeDeltaUsd: decimalToFloat(10 * 1000), // $10,000
        acceptablePrice: expandDecimals(50006, 11), // 5000.6 per token
        executionFee: expandDecimals(1, 15),
        minOutputAmount: 0,
        orderType: OrderType.MarketIncrease,
        isLong: true,
        shouldUnwrapNativeToken: false,
      },
      execute: {
        afterExecution: ({ logs }) => {
          const positionIncreaseEvent = getEventData(logs, "PositionIncrease");
          expect(positionIncreaseEvent.executionPrice).eq("5000500050005000"); // ~5000 per token
        },
      },
    });

    // Deposit 50,000 of long token
    await handleDeposit(fixture, {
      create: {
        account: user1,
        market: ethUsdMarket,
        longTokenAmount: expandDecimals(10, 18), // $50,000
      },
    });

    expect(await getPositionCount(dataStore)).to.eq(1);

    // 1 Day later
    await time.increase(24 * 60 * 60); // 1 day

    // Deposit 10,000 of short token
    await handleDeposit(fixture, {
      create: {
        account: user2,
        market: ethUsdMarket,
        shortTokenAmount: expandDecimals(10 * 1000, 6), // $10,000
      },
    });

    // #2 Market increase 1,000 Collateral 2,000 size
    await handleOrder(fixture, {
      create: {
        account: user1,
        market: ethUsdMarket,
        initialCollateralToken: usdc,
        initialCollateralDeltaAmount: expandDecimals(1000, 6), // $1,000
        swapPath: [],
        sizeDeltaUsd: decimalToFloat(2 * 1000), // $2,000
        acceptablePrice: expandDecimals(50009, 11), // 5000.9 per token
        executionFee: expandDecimals(1, 15),
        minOutputAmount: 0,
        orderType: OrderType.MarketIncrease,
        isLong: false,
        shouldUnwrapNativeToken: false,
      },
      execute: {
        afterExecution: ({ logs }) => {
          const positionIncreaseEvent = getEventData(logs, "PositionIncrease");
          expect(positionIncreaseEvent.executionPrice).eq("5000900162029165"); // ~5000 per token
        },
      },
    });

    expect(await getOrderCount(dataStore)).to.eq(0);
    expect(await getPositionCount(dataStore)).to.eq(2);

    // 5 Hours later
    await time.increase(5 * 60 * 60); // 5 Hours

    // #1 Market decrease 5,000
    await handleOrder(fixture, {
      create: {
        account: user2,
        market: ethUsdMarket,
        initialCollateralToken: wnt,
        initialCollateralDeltaAmount: 0,
        swapPath: [],
        sizeDeltaUsd: decimalToFloat(5 * 1000), // $5,000
        acceptablePrice: expandDecimals(50004, 11), // 5000.4 per token
        executionFee: expandDecimals(1, 15),
        minOutputAmount: 0,
        orderType: OrderType.MarketDecrease,
        isLong: true,
        shouldUnwrapNativeToken: false,
      },
      execute: {
        afterExecution: ({ logs }) => {
          const positionDecreaseEvent = getEventData(logs, "PositionDecrease");
          expect(positionDecreaseEvent.executionPrice).eq("5000550055005500"); // ~5000 per token

          const positionFeesCollectedEvent = getEventData(
            logs,
            "PositionFeesCollected"
          );
          expect(positionFeesCollectedEvent.fundingFeeAmount).closeTo(
            "2400400000000",
            "100000000000"
          ); // 0.0000024004 ETH
          expect(positionFeesCollectedEvent.borrowingFeeAmount).closeTo(
            "2088007649694012",
            "100000000000"
          ); // 0.0020880 ETH
        },
      },
    });

    // #3 Market increase 3,000 Collateral 15,000 size
    await handleOrder(fixture, {
      create: {
        account: user0,
        market: ethUsdMarket,
        initialCollateralToken: usdc,
        initialCollateralDeltaAmount: expandDecimals(3 * 1000, 6), // $3,000
        swapPath: [],
        sizeDeltaUsd: decimalToFloat(15 * 1000), // $15,000
        acceptablePrice: expandDecimals(50011, 11), // 5001.1 per token
        executionFee: expandDecimals(1, 15),
        minOutputAmount: 0,
        orderType: OrderType.MarketIncrease,
        isLong: true,
        shouldUnwrapNativeToken: false,
      },
      execute: {
        afterExecution: ({ logs }) => {
          const positionIncreaseEvent = getEventData(logs, "PositionIncrease");
          expect(positionIncreaseEvent.executionPrice).eq("5001050220546314"); // ~5001 per token
        },
      },
    });

    expect(await getPositionCount(dataStore)).to.eq(3);

    // 14 Hours later
    await time.increase(14 * 60 * 60); // 14 Hours

    // #2 Market decrease 5,000
    await handleOrder(fixture, {
      create: {
        account: user2,
        market: ethUsdMarket,
        initialCollateralToken: wnt,
        initialCollateralDeltaAmount: 0,
        swapPath: [],
        sizeDeltaUsd: decimalToFloat(5 * 1000), // $5,000
        acceptablePrice: expandDecimals(50004, 11), // 5000.4 per token
        executionFee: expandDecimals(1, 15),
        minOutputAmount: 0,
        orderType: OrderType.MarketDecrease,
        isLong: true,
        shouldUnwrapNativeToken: false,
      },
      execute: {
        afterExecution: ({ logs }) => {
          const positionDecreaseEvent = getEventData(logs, "PositionDecrease");
          expect(positionDecreaseEvent.executionPrice).eq("5001550155015501"); // ~5001 per token

          const positionFeesCollectedEvent = getEventData(
            logs,
            "PositionFeesCollected"
          );
          expect(positionFeesCollectedEvent.fundingFeeAmount).closeTo(
            "4124053246754",
            "100000000000"
          ); // 0.000004124053 ETH
          expect(positionFeesCollectedEvent.borrowingFeeAmount).closeTo(
            "1007793090832423",
            "100000000000"
          ); // 0.00100779 ETH
        },
      },
    });

    // 24 Hours later
    await time.increase(24 * 60 * 60); // 24 Hours

    expect(await getBalanceOf(ethUsdMarket.marketToken, user0.address)).eq(
      "100000000000000000000000"
    );

    // #1 Withdraw
    await handleWithdrawal(fixture, {
      create: {
        market: ethUsdMarket,
        marketTokenAmount: "50000000000000000000000",
      },
    });
    expect(await getBalanceOf(ethUsdMarket.marketToken, user0.address)).eq(
      "50000000000000000000000"
    );

    // #4 Market increase 3,000 Collateral 3,000 size
    await handleOrder(fixture, {
      create: {
        account: user3,
        market: ethUsdMarket,
        initialCollateralToken: usdc,
        initialCollateralDeltaAmount: expandDecimals(3 * 1000, 6), // $3,000
        swapPath: [],
        sizeDeltaUsd: decimalToFloat(3 * 1000), // $3,000
        acceptablePrice: expandDecimals(5001, 12), // 5001 per token
        executionFee: expandDecimals(1, 15),
        minOutputAmount: 0,
        orderType: OrderType.MarketIncrease,
        isLong: false,
        shouldUnwrapNativeToken: false,
      },
      execute: {
        afterExecution: ({ logs }) => {
          const positionIncreaseEvent = getEventData(logs, "PositionIncrease");
          expect(positionIncreaseEvent.executionPrice).eq("5001150264560848"); // ~5001 per token
        },
      },
    });

    expect(await getPositionCount(dataStore)).to.eq(3);

    // 24 Hours later
    await time.increase(24 * 60 * 60); // 24 Hours

    // #1 Swap 5,000
    await handleOrder(fixture, {
      create: {
        account: user1,
        initialCollateralToken: wnt,
        initialCollateralDeltaAmount: expandDecimals(1, 18),
        acceptablePrice: 0,
        orderType: OrderType.MarketSwap,
        swapPath: [ethUsdMarket.marketToken],
      },
    });

    // #3 Market increase 5,000 Collateral 5,000 size
    await handleOrder(fixture, {
      create: {
        account: user3,
        market: ethUsdMarket,
        initialCollateralToken: usdc,
        initialCollateralDeltaAmount: expandDecimals(5 * 1000, 6), // $5,000
        swapPath: [],
        sizeDeltaUsd: decimalToFloat(5 * 1000), // $5,000
        acceptablePrice: expandDecimals(50013, 11), // 5001.3 per token
        executionFee: expandDecimals(1, 15),
        minOutputAmount: 0,
        orderType: OrderType.MarketIncrease,
        isLong: true,
        shouldUnwrapNativeToken: false,
      },
      execute: {
        afterExecution: ({ logs }) => {
          const positionIncreaseEvent = getEventData(logs, "PositionIncrease");
          expect(positionIncreaseEvent.executionPrice).eq("5001250312578144"); // ~5001 per token
        },
      },
    });

    // #3 Market decrease 15,000
    await handleOrder(fixture, {
      create: {
        account: user0,
        market: ethUsdMarket,
        initialCollateralToken: usdc,
        initialCollateralDeltaAmount: 0,
        swapPath: [],
        sizeDeltaUsd: decimalToFloat(15 * 1000), // $15,000
        acceptablePrice: expandDecimals(500005, 10), // 5000.05 per token
        executionFee: expandDecimals(1, 15),
        minOutputAmount: 0,
        orderType: OrderType.MarketDecrease,
        isLong: true,
        shouldUnwrapNativeToken: false,
      },
      execute: {
        afterExecution: ({ logs }) => {
          const positionDecreaseEvent = getEventData(logs, "PositionDecrease");
          expect(positionDecreaseEvent.executionPrice).eq("5000750157533081"); // ~5000 per token

          const positionFeesCollectedEvent = getEventData(
            logs,
            "PositionFeesCollected"
          );
          expect(positionFeesCollectedEvent.fundingFeeAmount).closeTo(
            "225782",
            "10000"
          ); // 0.225782 USDC
          expect(positionFeesCollectedEvent.borrowingFeeAmount).closeTo(
            "69744521",
            "100000"
          ); // 67.825617 USDC
        },
      },
    });

    // #2 Swap 4,000
    await handleOrder(fixture, {
      create: {
        account: user3,
        initialCollateralToken: usdc,
        initialCollateralDeltaAmount: expandDecimals(4000, 6),
        orderType: OrderType.MarketSwap,
        swapPath: [ethUsdMarket.marketToken],
      },
    });

    expect(await getPositionCount(dataStore)).to.eq(3);

    // 15 Hours later
    await time.increase(15 * 60 * 60); // 15 Hours

    // #6 Market increase 15,000 Collateral 15,000 size
    await handleOrder(fixture, {
      create: {
        account: user0,
        market: ethUsdMarket,
        initialCollateralToken: usdc,
        initialCollateralDeltaAmount: expandDecimals(15 * 1000, 6), // $15,000
        swapPath: [],
        sizeDeltaUsd: decimalToFloat(15 * 1000), // $15,000
        acceptablePrice: expandDecimals(49992, 11), // 4999.2 per token
        executionFee: expandDecimals(1, 15),
        minOutputAmount: 0,
        orderType: OrderType.MarketIncrease,
        isLong: false,
        shouldUnwrapNativeToken: false,
      },
      execute: {
        afterExecution: ({ logs }) => {
          const positionIncreaseEvent = getEventData(logs, "PositionIncrease");
          expect(positionIncreaseEvent.executionPrice).eq("4999250112483127"); // ~4999 per token
        },
      },
    });

    expect(await getBalanceOf(ethUsdMarket.marketToken, user0.address)).eq(
      "50000000000000000000000"
    );

    // Deposit 25,000 long and short
    await handleDeposit(fixture, {
      create: {
        market: ethUsdMarket,
        longTokenAmount: expandDecimals(5, 18), // $25,000
        shortTokenAmount: expandDecimals(25 * 1000, 6), // $25,000
      },
    });

    // 48 Hours later
    await time.increase(48 * 60 * 60); // 48 Hours

    const marketTokenBalUser2 = await getBalanceOf(
      ethUsdMarket.marketToken,
      user2.address
    );

    expect(marketTokenBalUser2).closeTo(
      "9999254451370059838522",
      "100000000000000000"
    );

    // #2 Withdraw
    await handleWithdrawal(fixture, {
      create: {
        account: user2,
        market: ethUsdMarket,
        marketTokenAmount: marketTokenBalUser2,
      },
    });

    expect(await getPositionCount(dataStore)).to.eq(4);

    // #4 Market decrease 2,000
    await handleOrder(fixture, {
      create: {
        account: user1,
        market: ethUsdMarket,
        initialCollateralToken: usdc,
        initialCollateralDeltaAmount: 0,
        swapPath: [],
        sizeDeltaUsd: decimalToFloat(2 * 1000), // $2,000
        acceptablePrice: expandDecimals(49986, 11), // 4998.6 per token
        executionFee: expandDecimals(1, 15),
        minOutputAmount: 0,
        orderType: OrderType.MarketDecrease,
        isLong: false,
        shouldUnwrapNativeToken: false,
      },
      execute: {
        afterExecution: ({ logs }) => {
          const positionDecreaseEvent = getEventData(logs, "PositionDecrease");
          expect(positionDecreaseEvent.executionPrice).eq("4998599747954632"); // ~4998 per token

          const positionFeesCollectedEvent = getEventData(
            logs,
            "PositionFeesCollected"
          );
          expect(positionFeesCollectedEvent.fundingFeeAmount).closeTo(
            "20738",
            "20000"
          ); // 0.020738 USDC
          expect(positionFeesCollectedEvent.borrowingFeeAmount).closeTo(
            "32618639",
            "20000"
          ); // 32.61 USDC
        },
      },
    });

    expect(await getPositionCount(dataStore)).to.eq(3);

    // #5 Market decrease 5,000
    await handleOrder(fixture, {
      create: {
        account: user3,
        market: ethUsdMarket,
        initialCollateralToken: usdc,
        initialCollateralDeltaAmount: 0,
        swapPath: [],
        sizeDeltaUsd: decimalToFloat(5 * 1000), // $5,000
        acceptablePrice: expandDecimals(49983, 11), // 4998.3 per token
        executionFee: expandDecimals(1, 15),
        minOutputAmount: 0,
        orderType: OrderType.MarketDecrease,
        isLong: true,
        shouldUnwrapNativeToken: false,
      },
      execute: {
        afterExecution: ({ logs }) => {
          const positionDecreaseEvent = getEventData(logs, "PositionDecrease");
          expect(positionDecreaseEvent.executionPrice).eq("4998449612403101"); // ~4998 per token

          const positionFeesCollectedEvent = getEventData(
            logs,
            "PositionFeesCollected"
          );
          expect(positionFeesCollectedEvent.fundingFeeAmount).closeTo("1", "1"); // 0.000001 USDC
          expect(positionFeesCollectedEvent.borrowingFeeAmount).closeTo(
            "6798477",
            "20000"
          ); // 6.382766 USDC
        },
      },
    });

    expect(await getPositionCount(dataStore)).to.eq(2);

    // #6 Market decrease 3,000
    await handleOrder(fixture, {
      create: {
        account: user3,
        market: ethUsdMarket,
        initialCollateralToken: usdc,
        initialCollateralDeltaAmount: 0,
        swapPath: [],
        sizeDeltaUsd: decimalToFloat(3 * 1000), // $3,000
        acceptablePrice: expandDecimals(49984, 11), // 4998.4 per token
        executionFee: expandDecimals(1, 15),
        minOutputAmount: 0,
        orderType: OrderType.MarketDecrease,
        isLong: false,
        shouldUnwrapNativeToken: false,
      },
      execute: {
        afterExecution: ({ logs }) => {
          const positionDecreaseEvent = getEventData(logs, "PositionDecrease");
          expect(positionDecreaseEvent.executionPrice).eq("4998349620412695"); // ~4998 per token

          const positionFeesCollectedEvent = getEventData(
            logs,
            "PositionFeesCollected"
          );
          expect(positionFeesCollectedEvent.fundingFeeAmount).closeTo(
            "31107",
            "20000"
          ); //  0.031107 USDC
          expect(positionFeesCollectedEvent.borrowingFeeAmount).closeTo(
            "45047297",
            "20000"
          ); // 44.324054 USDC
        },
      },
    });

    // 48 Hours later
    await time.increase(48 * 60 * 60); // 48 Hours

    expect(await getPositionCount(dataStore)).to.eq(1);

    // #7 Market decrease 15,000
    await handleOrder(fixture, {
      create: {
        account: user0,
        market: ethUsdMarket,
        initialCollateralToken: usdc,
        initialCollateralDeltaAmount: 0,
        swapPath: [],
        sizeDeltaUsd: decimalToFloat(15 * 1000), // $15,000
        acceptablePrice: expandDecimals(49993, 11), // 4999.3 per token
        executionFee: expandDecimals(1, 15),
        minOutputAmount: 0,
        orderType: OrderType.MarketDecrease,
        isLong: false,
        shouldUnwrapNativeToken: false,
      },
      execute: {
        afterExecution: ({ logs }) => {
          const positionDecreaseEvent = getEventData(logs, "PositionDecrease");
          expect(positionDecreaseEvent.executionPrice).eq("4999250112483128"); // ~4999 per token

          const positionFeesCollectedEvent = getEventData(
            logs,
            "PositionFeesCollected"
          );
          expect(positionFeesCollectedEvent.fundingFeeAmount).closeTo(
            "155534",
            "20000"
          ); // 0.155534 USDC
          expect(positionFeesCollectedEvent.borrowingFeeAmount).closeTo(
            "296291492",
            "2000000"
          ); // 296.29 USDC
        },
      },
    });

    expect(await getPositionCount(dataStore)).to.eq(0);

    const marketTokenBalUser0 = await getBalanceOf(
      ethUsdMarket.marketToken,
      user0.address
    );

    expect(await getBalanceOf(ethUsdMarket.marketToken, user0.address)).closeTo(
      "99967283907885161940595",
      "10000000000000000000"
    );

    // #3 Withdraw
    await handleWithdrawal(fixture, {
      create: {
        account: user0,
        market: ethUsdMarket,
        marketTokenAmount: marketTokenBalUser0,
      },
    });

    const marketTokenBalUser1 = await getBalanceOf(
      ethUsdMarket.marketToken,
      user1.address
    );

    expect(marketTokenBalUser1).closeTo(
      "49997999840059193216263",
      "10000000000000000000"
    );

    // #4 Withdraw
    await handleWithdrawal(fixture, {
      create: {
        account: user1,
        market: ethUsdMarket,
        marketTokenAmount: marketTokenBalUser1,
      },
    });
    expect(
      await dataStore.getUint(
        keys.claimableFundingAmountKey(
          ethUsdMarket.marketToken,
          wnt.address,
          user0.address
        )
      )
    ).eq("0");

    expect(
      await dataStore.getUint(
        keys.claimableFundingAmountKey(
          ethUsdMarket.marketToken,
          usdc.address,
          user0.address
        )
      )
    ).eq("0");

    expect(
      await dataStore.getUint(
        keys.claimableFundingAmountKey(
          ethUsdMarket.marketToken,
          wnt.address,
          user2.address
        )
      )
    ).eq("0");

    expect(
      await dataStore.getUint(
        keys.claimableFundingAmountKey(
          ethUsdMarket.marketToken,
          usdc.address,
          user2.address
        )
      )
    ).eq("0");

    expect(
      await dataStore.getUint(
        keys.claimableFundingAmountKey(
          ethUsdMarket.marketToken,
          wnt.address,
          user3.address
        )
      )
    ).eq("0");

    let balBefore = await wnt.balanceOf(user1.address);

    await exchangeRouter
      .connect(user1)
      .claimFundingFees(
        [ethUsdMarket.marketToken],
        [wnt.address],
        user1.address
      );

    let balAfter = await wnt.balanceOf(user1.address);

    expect(balAfter.sub(balBefore)).to.closeTo("6524453246753", "10000000000");

    balBefore = await usdc.balanceOf(user1.address);

    await exchangeRouter
      .connect(user1)
      .claimFundingFees(
        [ethUsdMarket.marketToken],
        [usdc.address],
        user1.address
      );

    balAfter = await usdc.balanceOf(user1.address);

    expect(balAfter.sub(balBefore)).to.closeTo("186897", "10000");

    balBefore = await usdc.balanceOf(user3.address);

    await exchangeRouter
      .connect(user3)
      .claimFundingFees(
        [ethUsdMarket.marketToken],
        [usdc.address],
        user3.address
      );

    balAfter = await usdc.balanceOf(user3.address);

    expect(balAfter.sub(balBefore)).to.closeTo("246262", "10000");

    expect(await getPositionCount(dataStore)).to.eq(0);
    expect(await getOrderCount(dataStore)).to.eq(0);

    expect(await getSupplyOf(ethUsdMarket.marketToken)).eq("0");
  });
});
