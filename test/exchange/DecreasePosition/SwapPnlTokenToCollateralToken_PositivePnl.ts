import { expect } from "chai";
import { ethers } from "hardhat";
const { provider } = ethers;

import { scenes } from "../../scenes";
import { deployFixture } from "../../../utils/fixture";
import { DecreasePositionSwapType } from "../../../utils/order";

describe("Exchange.DecreasePosition", () => {
  let fixture;
  let user1;
  let wnt, usdc;

  beforeEach(async () => {
    fixture = await deployFixture();
    (
      ({ user1 } = fixture.accounts)
    );
    ({ wnt, usdc } = fixture.contracts);
    await provider.send("evm_setAutomine", [true])

    await scenes.deposit(fixture);
  });

  it("DecreasePositionSwapType: SwapPnlTokenToCollateralToken, positive pnl", async () => {
    await scenes.increasePosition.long(fixture);

    expect(await wnt.balanceOf(user1.address)).eq(0);
    expect(await usdc.balanceOf(user1.address)).eq(0);

    await scenes.decreasePosition.long.positivePnl(fixture, {
      create: {
        receiver: user1,
        initialCollateralDeltaAmount: 0,
        decreasePositionSwapType:
          DecreasePositionSwapType.SwapPnlTokenToCollateralToken,
      },
    });

    expect(await wnt.balanceOf(user1.address)).eq(0);
    expect(await usdc.balanceOf(user1.address)).eq("79999999"); // ~80
  });
});
