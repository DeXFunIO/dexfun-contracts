import hre from "hardhat";

import { bigNumberify, expandDecimals } from "../utils/math";

import { WNT, ExchangeRouter, MintableToken, MarketToken } from "../typechain-types";
import { DepositUtils } from "../typechain-types/contracts/exchange/DepositHandler";
import { DEFAULT_MARKET_TYPE, getMarketTokenAddress } from "../utils/market";
import * as wntAbi from './abi/testnet/neoXT4/wnt.json';
import * as usdtAbi from './abi/testnet/neoXT4/usdt.json';
import { Signer } from "ethers";

const { ethers } = hre;

async function getValues(signer: Signer): Promise<{
  wnt: WNT;
  stablecoin: MintableToken
}> {
  if (hre.network.name === "neoXT4") {
    return {
      wnt: new ethers.Contract(wntAbi.address, wntAbi.abi, signer) as WNT,
      stablecoin: new ethers.Contract(usdtAbi.address, usdtAbi.abi, signer) as MintableToken
    };
  } else if (hre.network.name === "localhost") {
    return {
      wnt: await ethers.getContract("WGAS"),
      stablecoin: await ethers.getContract('USDC')
    };
  }

  throw new Error("unsupported network");
}

async function main() {
  const [wallet] = await ethers.getSigners();
  const marketFactory = await ethers.getContract("MarketFactory");
  const roleStore = await ethers.getContract("RoleStore");
  const dataStore = await ethers.getContract("DataStore");
  const depositVault = await ethers.getContract("DepositVault");
  const exchangeRouter: ExchangeRouter = (await ethers.getContract("ExchangeRouter"));
  const router = await ethers.getContract("Router");


  const { wnt, stablecoin } = await getValues(wallet);
  
  const wntDecimals = await wnt.decimals();
  const stablecoinDecimals = await stablecoin.decimals();
  console.log({
    wntDecimals,
    stablecoinDecimals
  });
  const longTokenAmount = expandDecimals(500, wntDecimals);
  const executionFee = expandDecimals(7, wntDecimals - 3);

  if ((await wnt.balanceOf(wallet.address)).lt(longTokenAmount.add(executionFee))) {
    console.log("depositing %s WNT", longTokenAmount.add(executionFee).toString());
    await wnt.deposit({ value: longTokenAmount.add(executionFee) });
  }

  const wntAllowance = await wnt.allowance(wallet.address, router.address);
  console.log("WNT address %s symbol %s", wnt.address, await wnt.symbol());
  console.log("WNT allowance %s", wntAllowance.toString());
  if (wntAllowance.lt(longTokenAmount.add(executionFee))) {
    console.log("approving WNT");
    await wnt.approve(router.address, bigNumberify(2).pow(256).sub(1));
  }

  console.log("WNT allowance %s", (await wnt.allowance(wallet.address, router.address)).toString());
  console.log("WNT balance %s", await wnt.balanceOf(wallet.address));

  const shortTokenAmount = expandDecimals(10000, stablecoinDecimals); // 10 stablecoins
  const stablecoinAllowance = await stablecoin.allowance(wallet.address, router.address);
  console.log("Stablecoin address %s", stablecoin.address);
  console.log("Stablecoin allowance %s", stablecoinAllowance.toString());
  if (stablecoinAllowance.lt(shortTokenAmount)) {
    console.log("approving USDC");
    await stablecoin.approve(router.address, bigNumberify(2).pow(256).sub(1));
  }
  console.log("Stablecoin allowance %s", await stablecoin.allowance(wallet.address, router.address));
  console.log("Stablecoin balance %s", await stablecoin.balanceOf(wallet.address));

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
  const marketToken: MarketToken = await ethers.getContractAt("MarketToken", wntUsdMarketAddress);
  const marketTokenBalance = await marketToken.balanceOf(wallet.address);
  console.log(`Before deposit market token balance ${marketTokenBalance}`);

  const params: DepositUtils.CreateDepositParamsStruct = {
    receiver: wallet.address,
    callbackContract: ethers.constants.AddressZero,
    market: wntUsdMarketAddress,
    minMarketTokens: 0,
    shouldUnwrapNativeToken: false,
    executionFee: executionFee,
    callbackGasLimit: 0,
    initialLongToken: wnt.address,
    longTokenSwapPath: [],
    initialShortToken: stablecoin.address,
    shortTokenSwapPath: [],
    uiFeeReceiver: ethers.constants.AddressZero,
  };
  console.log("exchange router %s", exchangeRouter.address);
  console.log("creating deposit %s", JSON.stringify(params));

  const wntBalanceOne = (await wnt.balanceOf(wallet.address)).toString();
  const stableBalanceOne = (await stablecoin.balanceOf(wallet.address)).toString();
  console.log({
    address: wallet.address,
    wntBalance: wntBalanceOne,
    stableBalance: stableBalanceOne,
    nt: (await wallet.getBalance()).toString()
  });

  const multicallArgs = [
    // exchangeRouter.interface.encodeFunctionData("sendWnt", [depositVault.address, longTokenAmount.add(executionFee)]),
    exchangeRouter.interface.encodeFunctionData("sendTokens", [wnt.address, depositVault.address, longTokenAmount.add(executionFee)]),
    exchangeRouter.interface.encodeFunctionData("sendTokens", [stablecoin.address, depositVault.address, shortTokenAmount]),
    exchangeRouter.interface.encodeFunctionData("createDeposit", [params]),
  ];
  console.log("multicall args", multicallArgs);

  const tx = await exchangeRouter.connect(wallet).multicall(multicallArgs, {
    // value: longTokenAmount.add(executionFee),
    gasLimit: 1000000,
  });

  console.log("transaction sent", tx.hash);
  const receipt = await tx.wait();
  console.log("receipt received: ", receipt.transactionHash);
  console.log("Market token balance %s", await marketToken.balanceOf(wallet.address));
  const wntBalance = (await wnt.balanceOf(wallet.address)).toString();
  const stableBalance = (await stablecoin.balanceOf(wallet.address)).toString();
  console.log({
    address: wallet.address,
    wntBalance,
    stableBalance,
    nt: (await wallet.getBalance()).toString()
  });
}

main()
  .then(() => {
    process.exit(0);
  })
  .catch((ex) => {
    console.error(ex);
    process.exit(1);
  });
