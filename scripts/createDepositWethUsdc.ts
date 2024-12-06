import hre from "hardhat";

import { getMarketTokenAddress, DEFAULT_MARKET_TYPE } from "../utils/market";
import { bigNumberify, expandDecimals } from "../utils/math";

import { WNT, ExchangeRouter, MintableToken } from "../typechain-types";
import { DepositUtils } from "../typechain-types/contracts/exchange/DepositHandler";
import { Signer } from "ethers";
import * as wethAbi from './abi/testnet/neoXT4/weth.json';
import * as usdtAbi from './abi/testnet/neoXT4/usdt.json';

const { ethers } = hre;

async function getValues(signer: Signer): Promise<{
  wnt: WNT;
  weth: MintableToken,
  stablecoin: MintableToken
}> {
  if (hre.network.name === "neoXT4") {
    return {
      wnt: await ethers.getContractAt("WNT", "0x1CE16390FD09040486221e912B87551E4e44Ab17"),
      weth: await ethers.getContractAt(wethAbi.abi, wethAbi.address, signer) as MintableToken,
      stablecoin: await ethers.getContractAt(usdtAbi.abi, usdtAbi.address, signer) as MintableToken
    };
  } else if (hre.network.name === "localhost") {
    return {
      wnt: await ethers.getContract("WGAS"),
      weth: await ethers.getContract("WETH"),
      stablecoin: await ethers.getContract("USDC"),
    };
  }

  throw new Error("unsupported network");
}

async function main() {
  console.log("run createDepositWethUsdc");
  const marketFactory = await ethers.getContract("MarketFactory");
  const roleStore = await ethers.getContract("RoleStore");
  const dataStore = await ethers.getContract("DataStore");
  const depositVault = await ethers.getContract("DepositVault");
  const exchangeRouter: ExchangeRouter = await ethers.getContract("ExchangeRouter");
  const router = await ethers.getContract("Router");
  const [wallet] = await ethers.getSigners();

  const { wnt, weth, stablecoin } = await getValues(wallet);

  const decimals = {
    wnt: await wnt.decimals(),
    weth: await weth.decimals(),
    stablecoin: await stablecoin.decimals()
  }

  const executionFee = expandDecimals(1, decimals.wnt - 3); // 0.001 WNT
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

  const longTokenAmount = expandDecimals(1, decimals.weth - 2); // 0.1 weth
  const wethAllowance = await weth.allowance(wallet.address, router.address);
  console.log("weth address %s", weth.address);
  console.log("weth allowance %s", wethAllowance.toString());
  if (wethAllowance.lt(longTokenAmount)) {
    console.log("approving weth");
    await weth.approve(router.address, bigNumberify(2).pow(256).sub(1));
  }
  const wethBalance = await weth.balanceOf(wallet.address);
  console.log("weth balance %s", wethBalance);
  if (wethBalance.lt(longTokenAmount)) {
    console.log("minting %s weth", longTokenAmount);
    await weth.mint(wallet.address, longTokenAmount);
  }

  const shortTokenAmount = expandDecimals(100, decimals.stablecoin); // 100 USDC
  const usdcAllowance = await stablecoin.allowance(wallet.address, router.address);
  console.log("USDC address %s", stablecoin.address);
  console.log("USDC allowance %s", usdcAllowance.toString());
  if (usdcAllowance.lt(shortTokenAmount)) {
    console.log("approving USDC");
    await stablecoin.approve(router.address, bigNumberify(2).pow(256).sub(1));
  }
  const usdcBalance = await stablecoin.balanceOf(wallet.address);
  console.log("USDC balance %s", usdcBalance);
  if (usdcBalance.lt(shortTokenAmount)) {
    console.log("minting %s USDC", shortTokenAmount);
    await stablecoin.mint(wallet.address, shortTokenAmount);
  }

  const wethUsdMarketAddress = await getMarketTokenAddress(
    weth.address,
    weth.address,
    stablecoin.address,
    DEFAULT_MARKET_TYPE,
    marketFactory.address,
    roleStore.address,
    dataStore.address
  );
  console.log("market %s", wethUsdMarketAddress);

  const params: DepositUtils.CreateDepositParamsStruct = {
    receiver: wallet.address,
    callbackContract: ethers.constants.AddressZero,
    market: wethUsdMarketAddress,
    minMarketTokens: 0,
    shouldUnwrapNativeToken: false,
    executionFee: executionFee,
    callbackGasLimit: 0,
    initialLongToken: weth.address,
    longTokenSwapPath: [],
    initialShortToken: stablecoin.address,
    shortTokenSwapPath: [],
    uiFeeReceiver: ethers.constants.AddressZero,
  };
  console.log("exchange router %s", exchangeRouter.address);
  console.log("deposit store %s", depositVault.address);
  console.log("creating deposit %s", JSON.stringify(params));

  const multicallArgs = [
    exchangeRouter.interface.encodeFunctionData("sendWnt", [depositVault.address, executionFee]),
    exchangeRouter.interface.encodeFunctionData("sendTokens", [weth.address, depositVault.address, longTokenAmount]),
    exchangeRouter.interface.encodeFunctionData("sendTokens", [stablecoin.address, depositVault.address, shortTokenAmount]),
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

