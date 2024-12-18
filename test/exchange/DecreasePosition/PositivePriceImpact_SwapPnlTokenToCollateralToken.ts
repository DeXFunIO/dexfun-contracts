import { expect } from "chai";
import { ethers } from "hardhat";
const { provider } = ethers;

import { usingResult } from "../../../utils/use";
import { scenes } from "../../scenes";
import { deployFixture } from "../../../utils/fixture";
import { DecreasePositionSwapType } from "../../../utils/order";
import { expandDecimals, decimalToFloat } from "../../../utils/math";
import { getPositionKey } from "../../../utils/position";
import {
  getPoolAmount,
  getMarketTokenPriceWithPoolValue,
} from "../../../utils/market";
import { prices } from "../../../utils/prices";
import * as keys from "../../../utils/keys";

describe("Exchange.DecreasePosition", () => {
  let fixture;
  let user0, user1;
  let reader, dataStore, referralStorage, ethUsdMarket, wnt, usdc;

  beforeEach(async () => {
    fixture = await deployFixture();
    ({ user0, user1 } = fixture.accounts);
    ({ reader, dataStore, referralStorage, ethUsdMarket, wnt, usdc } =
      fixture.contracts);
    await provider.send("evm_setAutomine", [true]);
    await scenes.deposit(fixture);
  });

  it("positive price impact, DecreasePositionSwapType: SwapPnlTokenToCollateralToken", async () => {
    await dataStore.setUint(
      keys.positionImpactFactorKey(ethUsdMarket.marketToken, true),
      decimalToFloat(5, 9)
    );
    await dataStore.setUint(
      keys.positionImpactFactorKey(ethUsdMarket.marketToken, false),
      decimalToFloat(1, 8)
    );
    await dataStore.setUint(
      keys.positionImpactExponentFactorKey(ethUsdMarket.marketToken),
      decimalToFloat(2, 0)
    );

    expect(
      await dataStore.getUint(
        keys.positionImpactPoolAmountKey(ethUsdMarket.marketToken)
      )
    ).eq(0);

    await usingResult(
      getMarketTokenPriceWithPoolValue(fixture, {
        prices: prices.ethUsdMarket,
      }),
      ([marketTokenPrice, poolValueInfo]) => {
        expect(marketTokenPrice).eq(decimalToFloat(1));
        expect(poolValueInfo.poolValue).eq(decimalToFloat(6_000_000));
      }
    );

    await scenes.increasePosition.long(fixture);

    const positionKey0 = getPositionKey(
      user0.address,
      ethUsdMarket.marketToken,
      usdc.address,
      true
    );

    await usingResult(
      reader.getPositionInfo(
        dataStore.address,
        referralStorage.address,
        positionKey0,
        prices.ethUsdMarket,
        0,
        ethers.constants.AddressZero,
        true
      ),
      (positionInfo) => {
        expect(positionInfo.position.numbers.collateralAmount).eq(
          expandDecimals(50_000, 6)
        );
        expect(positionInfo.position.numbers.sizeInTokens).eq(
          "39920000000000000001"
        ); // 39.920000000000000001
        expect(positionInfo.position.numbers.sizeInUsd).eq(
          decimalToFloat(200_000)
        );
        expect(positionInfo.basePnlUsd).eq(
          "-399999999999999995000000000000000"
        ); // -400
      }
    );

    await usingResult(
      getMarketTokenPriceWithPoolValue(fixture, {
        prices: prices.ethUsdMarket,
      }),
      ([marketTokenPrice, poolValueInfo]) => {
        expect(marketTokenPrice).eq(decimalToFloat(1));
        expect(poolValueInfo.poolValue).eq(decimalToFloat(6_000_000));
      }
    );

    expect(
      await dataStore.getUint(
        keys.positionImpactPoolAmountKey(ethUsdMarket.marketToken)
      )
    ).eq("79999999999999999"); // 0.079999999999999999 ETH

    expect(await wnt.balanceOf(user1.address)).eq(0);
    expect(await usdc.balanceOf(user1.address)).eq(0);

    expect(
      await getPoolAmount(dataStore, ethUsdMarket.marketToken, wnt.address)
    ).eq(expandDecimals(1000, 18));
    expect(
      await getPoolAmount(dataStore, ethUsdMarket.marketToken, usdc.address)
    ).eq(expandDecimals(1_000_000, 6));

    await scenes.decreasePosition.long(fixture, {
      create: {
        receiver: user1,
        initialCollateralDeltaAmount: 0,
        decreasePositionSwapType:
          DecreasePositionSwapType.SwapPnlTokenToCollateralToken,
      },
    });

    expect(
      await dataStore.getUint(
        keys.positionImpactPoolAmountKey(ethUsdMarket.marketToken)
      )
    ).eq("72399999999999999"); // 0.072399999999999999 ETH

    expect(await wnt.balanceOf(user1.address)).eq(0);
    expect(await usdc.balanceOf(user1.address)).eq(0);

    expect(
      await getPoolAmount(dataStore, ethUsdMarket.marketToken, wnt.address)
    ).eq(expandDecimals(1000, 18));
    expect(
      await getPoolAmount(dataStore, ethUsdMarket.marketToken, usdc.address)
    ).eq("1000002000001"); // 1,000,002

    await usingResult(
      reader.getPositionInfo(
        dataStore.address,
        referralStorage.address,
        positionKey0,
        prices.ethUsdMarket,
        0,
        ethers.constants.AddressZero,
        true
      ),
      (positionInfo) => {
        expect(positionInfo.position.numbers.collateralAmount).eq(
          "49997999999"
        ); // 49997.999999
        expect(positionInfo.position.numbers.sizeInTokens).eq(
          "35928000000000000000"
        ); // 35.928
        expect(positionInfo.position.numbers.sizeInUsd).eq(
          decimalToFloat(180_000)
        );
        expect(positionInfo.basePnlUsd).eq(decimalToFloat(-360));
      }
    );

    await usingResult(
      getMarketTokenPriceWithPoolValue(fixture, {
        prices: prices.ethUsdMarket,
      }),
      ([marketTokenPrice, poolValueInfo]) => {
        expect(marketTokenPrice).eq("1000000000000166666667500000000");
        expect(poolValueInfo.poolValue).eq(
          "6000000000001000000005000000000000000"
        );
      }
    );
  });
});
