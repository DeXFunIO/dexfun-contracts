import hre from "hardhat";

import { getMarketTokenAddress, DEFAULT_MARKET_TYPE } from "../utils/market";
import { bigNumberify, expandDecimals } from "../utils/math";
import { WNT, ExchangeRouter, MintableToken } from "../typechain-types";
import { IBaseOrderUtils } from "../typechain-types/contracts/router/ExchangeRouter";

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
  const orderVault = await ethers.getContract("OrderVault");
  const exchangeRouter: ExchangeRouter = await ethers.getContract("ExchangeRouter");
  const router = await ethers.getContract("Router");

  const [wallet] = await ethers.getSigners();
  const { wnt, stablecoin } = await getValues();
  const executionFee = expandDecimals(8, (await wnt.decimals()) - 3);

  if ((await wnt.balanceOf(wallet.address)).lt(executionFee)) {
    console.log("depositing %s WNT", executionFee.toString());
    await wnt.deposit({ value: executionFee });
  }

  const wntAllowance = await wnt.allowance(wallet.address, router.address);
  console.log("WNT address %s symbol %s", wnt.address, await wnt.symbol());
  console.log("WNT allowance %s", wntAllowance.toString());
  if (wntAllowance.lt(executionFee)) {
    console.log("approving WNT");
    await wnt.approve(router.address, bigNumberify(2).pow(256).sub(1));
  }
  console.log("WNT balance %s", await wnt.balanceOf(wallet.address));

  console.log("WNT allowance %s", (await wnt.allowance(wallet.address, router.address)).toString());
  console.log("WNT balance %s", await wnt.balanceOf(wallet.address));

  // WETH market 0x70d95587d40A2caf56bd97485aB3Eec10Bee6336
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

  const params: IBaseOrderUtils.CreateOrderParamsStruct = {
    addresses: {
      receiver: wallet.address,
      callbackContract: ethers.constants.AddressZero,
      uiFeeReceiver: ethers.constants.AddressZero,
      market: wntUsdMarketAddress,
      initialCollateralToken: wnt.address,
      swapPath: [],
    },
    numbers: {
      sizeDeltaUsd: expandDecimals(1, 30),
      triggerPrice: 0,
      acceptablePrice: 0,
      executionFee,
      callbackGasLimit: 0,
      minOutputAmount: 0,
      initialCollateralDeltaAmount: 0,
    },
    orderType: 4, // MarketDecrease
    isLong: true, // not relevant for market swap
    shouldUnwrapNativeToken: false, // not relevant for market swap
    decreasePositionSwapType: 0, // no swap
    referralCode: ethers.constants.HashZero
  };
  console.log("exchange router %s", exchangeRouter.address);
  console.log("order store %s", orderVault.address);
  console.log("creating MarketIncrease order %s", JSON.stringify(params));

  

  const multicallArgs = [
    exchangeRouter.interface.encodeFunctionData("sendWnt", [orderVault.address, executionFee]),
    exchangeRouter.interface.encodeFunctionData("createOrder", [params]),
  ];
  console.log("multicall args", multicallArgs);
  
  const tx = await exchangeRouter.multicall(multicallArgs, {
    value: executionFee,
    gasLimit: 2500000,
  });

  console.log("transaction sent", tx.hash);
  await tx.wait();
}

main()
  .then(() => {
    process.exit(0);
  })
  .catch((ex) => {
    console.error(ex);
    process.exit(1);
  });

