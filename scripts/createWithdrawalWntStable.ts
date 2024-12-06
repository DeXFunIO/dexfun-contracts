import hre from "hardhat";

import { getMarketTokenAddress, DEFAULT_MARKET_TYPE } from "../utils/market";
import { bigNumberify, expandDecimals } from "../utils/math";

import { WNT, ExchangeRouter, MintableToken, WithdrawalVault, MarketToken } from "../typechain-types";
import { WithdrawalUtils } from "../typechain-types/contracts/exchange/WithdrawalHandler";
import { Signer } from "ethers";
import * as wntAbi from './abi/testnet/neoXT4/wnt.json';
import * as usdtAbi from './abi/testnet/neoXT4/usdt.json';

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
  console.log("run createWithdrawWethUsdc");
  const marketFactory = await ethers.getContract("MarketFactory");
  const roleStore = await ethers.getContract("RoleStore");
  const dataStore = await ethers.getContract("DataStore");
  const withdrawalVault: WithdrawalVault = await ethers.getContract("WithdrawalVault");
  const exchangeRouter: ExchangeRouter = await ethers.getContract("ExchangeRouter");
  // const multicall: Multicall3 = await ethers.getContract("Multicall3");
  const router = await ethers.getContract("Router");

  const [wallet] = await ethers.getSigners();
  const { wnt, stablecoin } = await getValues(wallet);

  const executionFee = expandDecimals(8, (await wnt.decimals()) - 3); // 0.001 WNT
  if ((await wnt.balanceOf(wallet.address)).lt(executionFee)) {
    console.log("withdrawing %s WNT", executionFee.toString());
    await wnt.withdraw(executionFee);
  }

  const wntAllowance = await wnt.allowance(wallet.address, router.address);
  console.log("WNT address %s symbol %s", wnt.address, await wnt.symbol());
  console.log("WNT allowance %s", wntAllowance.toString());
  if (wntAllowance.lt(executionFee)) {
    console.log("approving WNT");
    await wnt.approve(router.address, bigNumberify(2).pow(256).sub(1));
  }
  console.log("WNT balance %s", await wnt.balanceOf(wallet.address));

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
  const marketTokenAllowance = await marketToken.allowance(wallet.address, router.address);
  console.log("Market token address %s", wntUsdMarketAddress);
  console.log("Market token balance %s", marketTokenBalance);
  console.log("Market token allowance %s", marketTokenAllowance.toString());
  if (marketTokenAllowance.lt(marketTokenBalance)) {
    console.log("approving Market token");
    await marketToken.approve(router.address, bigNumberify(2).pow(256).sub(1));
    await marketToken.approve(withdrawalVault.address, bigNumberify(2).pow(256).sub(1));
  }

  const params: WithdrawalUtils.CreateWithdrawalParamsStruct = {
    receiver: wallet.address,
    callbackContract: ethers.constants.AddressZero,
    uiFeeReceiver: ethers.constants.AddressZero,
    market: wntUsdMarketAddress,
    longTokenSwapPath: [],
    shortTokenSwapPath: [],
    minLongTokenAmount: 0,
    minShortTokenAmount: 0,
    shouldUnwrapNativeToken: false,
    executionFee: executionFee,
    callbackGasLimit: 0,
  };
  console.log("exchange router %s", exchangeRouter.address);
  console.log("withdrawal store %s", withdrawalVault.address);
  console.log("creating withdrawal %s", JSON.stringify(params));

  // transfer DF token to withdrawal vault, then sync and create withdrawal
  const multicallArgs = [
    exchangeRouter.interface.encodeFunctionData("sendWnt", [withdrawalVault.address, executionFee]),
    exchangeRouter.interface.encodeFunctionData("sendTokens", [wntUsdMarketAddress, withdrawalVault.address, marketTokenBalance]),
    exchangeRouter.interface.encodeFunctionData("createWithdrawal", [params])
  ];
  console.log("multicall args", multicallArgs);

  const tx = await exchangeRouter.multicall(multicallArgs, {
    value: executionFee,
    gasLimit: 4000000,
  });

  console.log("multicall transaction sent", tx.hash);
  await tx.wait();
  console.log("multicall receipt received");

  console.log("Market token balance %s", await marketToken.balanceOf(wallet.address));

  // const syncBalTxn = await withdrawalVault.syncTokenBalance(wethUsdMarketAddress);
  // console.log("token sync transaction sent", syncBalTxn.hash);
  // await syncBalTxn.wait();
  // console.log("token sync receipt received");

  // console.log("Market token balance %s", await marketToken.balanceOf(wallet.address));

  // const withdrawalTxn = await exchangeRouter.createWithdrawal(params);
  // console.log("withdrawal transaction sent", withdrawalTxn.hash);
  // await withdrawalTxn.wait();
  // console.log("withdrawal receipt received");
}

main()
  .then(() => {
    process.exit(0);
  })
  .catch((ex) => {
    console.error(ex);
    process.exit(1);
  });

