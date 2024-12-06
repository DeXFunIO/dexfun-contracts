import hre from "hardhat";

import { getMarketTokenAddress, DEFAULT_MARKET_TYPE } from "../utils/market";
import { bigNumberify, expandDecimals } from "../utils/math";

import { WNT, ExchangeRouter, MintableToken } from "../typechain-types";
import { DepositUtils } from "../typechain-types/contracts/exchange/DepositHandler";

const { ethers } = hre;

async function getValues(): Promise<{
  wnt: WNT;
}> {
  if (hre.network.name === "neoXT4") {
    return {
      wnt: await ethers.getContractAt("WNT", "0x1CE16390FD09040486221e912B87551E4e44Ab17"),
    };
  } else if (hre.network.name === "localhost") {
    return {
      wnt: await ethers.getContract("WGAS"),
    };
  }

  throw new Error("unsupported network");
}

async function main() {
  console.log("run createDepositWgasUsdc");
  const marketFactory = await ethers.getContract("MarketFactory");
  const roleStore = await ethers.getContract("RoleStore");
  const dataStore = await ethers.getContract("DataStore");
  const depositVault = await ethers.getContract("DepositVault");
  const exchangeRouter: ExchangeRouter = await ethers.getContract("ExchangeRouter");
  const router = await ethers.getContract("Router");

  const { wnt } = await getValues();

  const [wallet] = await ethers.getSigners();

  const executionFee = expandDecimals(1, 15); // 0.001 WNT
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

  const wgas: MintableToken = await ethers.getContract("WGAS");
  const longTokenAmount = expandDecimals(10000, 18); // 0.1 wgas
  const wethAllowance = await wgas.allowance(wallet.address, router.address);
  console.log("wgas address %s", wgas.address);
  console.log("wgas allowance %s", wethAllowance.toString());
  if (wethAllowance.lt(longTokenAmount)) {
    console.log("approving wgas");
    await wgas.approve(router.address, bigNumberify(2).pow(256).sub(1));
  }
  const wethBalance = await wgas.balanceOf(wallet.address);
  console.log("wgas balance %s", wethBalance);
  if (wethBalance.lt(longTokenAmount)) {
    console.log("minting %s wgas", longTokenAmount);
    await wgas.mint(wallet.address, longTokenAmount);
  }

  const usdc: MintableToken = await ethers.getContract("USDC");
  const shortTokenAmount = expandDecimals(18 * 10000, 6); // 100 USDC
  const usdcAllowance = await usdc.allowance(wallet.address, router.address);
  console.log("USDC address %s", usdc.address);
  console.log("USDC allowance %s", usdcAllowance.toString());
  if (usdcAllowance.lt(shortTokenAmount)) {
    console.log("approving USDC");
    await usdc.approve(router.address, bigNumberify(2).pow(256).sub(1));
  }
  const usdcBalance = await usdc.balanceOf(wallet.address);
  console.log("USDC balance %s", usdcBalance);
  if (usdcBalance.lt(shortTokenAmount)) {
    console.log("minting %s USDC", shortTokenAmount);
    await usdc.mint(wallet.address, shortTokenAmount);
  }

  const wgasUsdMarketAddress = await getMarketTokenAddress(
    wgas.address,
    wgas.address,
    usdc.address,
    DEFAULT_MARKET_TYPE,
    marketFactory.address,
    roleStore.address,
    dataStore.address
  );
  console.log("market %s", wgasUsdMarketAddress);

  const params: DepositUtils.CreateDepositParamsStruct = {
    receiver: wallet.address,
    callbackContract: ethers.constants.AddressZero,
    market: wgasUsdMarketAddress,
    minMarketTokens: 0,
    shouldUnwrapNativeToken: false,
    executionFee: executionFee,
    callbackGasLimit: 0,
    initialLongToken: wgas.address,
    longTokenSwapPath: [],
    initialShortToken: usdc.address,
    shortTokenSwapPath: [],
    uiFeeReceiver: ethers.constants.AddressZero,
  };
  console.log("exchange router %s", exchangeRouter.address);
  console.log("deposit store %s", depositVault.address);
  console.log("creating deposit %s", JSON.stringify(params));
  
  const multicallArgs = [
    exchangeRouter.interface.encodeFunctionData("sendWnt", [depositVault.address, executionFee]),
    exchangeRouter.interface.encodeFunctionData("sendTokens", [wgas.address, depositVault.address, longTokenAmount]),
    exchangeRouter.interface.encodeFunctionData("sendTokens", [usdc.address, depositVault.address, shortTokenAmount]),
    exchangeRouter.interface.encodeFunctionData("createDeposit", [params]),
  ];
  console.log("multicall args", multicallArgs);

  const tx = await exchangeRouter.multicall(multicallArgs, {
    value: executionFee,
    gasLimit: 4000000,
  });

  console.log("transaction sent", tx.hash);
  await tx.wait();
  console.log("receipt received");
}

main()
  .then(() => {
    process.exit(0);
  })
  .catch((ex) => {
    console.error(ex);
    process.exit(1);
  });

