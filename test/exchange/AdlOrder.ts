import { expect } from "chai";
import { ethers } from "hardhat";
import { deployFixture } from "../../utils/fixture";
import { expandDecimals, decimalToFloat } from "../../utils/math";
import { handleDeposit } from "../../utils/deposit";
import { OrderType, handleOrder } from "../../utils/order";
import { getIsAdlEnabled, updateAdlState, executeAdl } from "../../utils/adl";
import { grantRole } from "../../utils/role";
import { getEventData } from "../../utils/event";
import * as keys from "../../utils/keys";

describe("Exchange.AdlOrder", () => {
  const { provider } = ethers;
  let fixture;
  let wallet, user0;
  let roleStore, dataStore, ethUsdMarket, wnt, usdc;

  beforeEach(async () => {
    fixture = await deployFixture();
    ({ wallet, user0 } = fixture.accounts);
    ({ roleStore, dataStore, ethUsdMarket, wnt, usdc } = fixture.contracts);
    await provider.send("evm_setAutomine", [true])
    
    await handleDeposit(fixture, {
      create: {
        market: ethUsdMarket,
        longTokenAmount: expandDecimals(1000, 18),
      },
    });
  });

  it("updateAdlState", async () => {
    await handleOrder(fixture, {
      create: {
        market: ethUsdMarket,
        initialCollateralToken: wnt,
        initialCollateralDeltaAmount: expandDecimals(100, 18),
        sizeDeltaUsd: decimalToFloat(2000 * 1000),
        acceptablePrice: expandDecimals(5001, 12),
        orderType: OrderType.MarketIncrease,
        isLong: true,
      },
    });

    const maxPnlFactorForAdlKey = keys.maxPnlFactorKey(keys.MAX_PNL_FACTOR_FOR_ADL, ethUsdMarket.marketToken, true);
    const minPnlFactorAfterAdlKey = keys.minPnlFactorAfterAdl(ethUsdMarket.marketToken, true);

    await dataStore.setUint(maxPnlFactorForAdlKey, decimalToFloat(10, 2)); // 10%
    await dataStore.setUint(minPnlFactorAfterAdlKey, decimalToFloat(2, 2)); // 2%
    await grantRole(roleStore, wallet.address, "ADL_KEEPER");

    await updateAdlState(fixture, {
      market: ethUsdMarket,
      isLong: true,
      tokens: [wnt.address, usdc.address],
      minPrices: [expandDecimals(10000, 4), expandDecimals(1, 6)],
      maxPrices: [expandDecimals(10000, 4), expandDecimals(1, 6)],
      gasUsageLabel: "updateAdlState",
    });

    expect(await getIsAdlEnabled(dataStore, ethUsdMarket.marketToken, true)).eq(true);

    await executeAdl(fixture, {
      account: user0.address,
      market: ethUsdMarket,
      collateralToken: wnt,
      isLong: true,
      sizeDeltaUsd: decimalToFloat(100 * 1000),
      tokens: [wnt.address, usdc.address],
      minPrices: [expandDecimals(10000, 4), expandDecimals(1, 6)],
      maxPrices: [expandDecimals(10000, 4), expandDecimals(1, 6)],
      gasUsageLabel: "executeAdl",
      afterExecution: ({ logs }) => {
        const orderExecutedEvent = getEventData(logs, "OrderExecuted");
        expect(orderExecutedEvent.secondaryOrderType).eq(1);
      },
    });
  });
});
