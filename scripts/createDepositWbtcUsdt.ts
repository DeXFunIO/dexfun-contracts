import hre from "hardhat";

import { bigNumberify, expandDecimals } from "../utils/math";

import { ExchangeRouter, MintableToken, MarketToken } from "../typechain-types";
import { DepositUtils } from "../typechain-types/contracts/exchange/DepositHandler";
import { DEFAULT_MARKET_TYPE, getMarketTokenAddress } from "../utils/market";
import * as btcAbi from './abi/testnet/neoXT4/wbtc.json';
import * as usdtAbi from './abi/testnet/neoXT4/usdt.json';
import { Signer } from "ethers";

const { ethers } = hre;

async function getValues(signer: Signer): Promise<{
  wbtc: MintableToken;
  stablecoin: MintableToken
}> {
  if (hre.network.name === "neoXT4") {
    return {
      wbtc: new ethers.Contract(btcAbi.address, btcAbi.abi, signer) as MintableToken,
      stablecoin: new ethers.Contract(usdtAbi.address, usdtAbi.abi, signer) as MintableToken
    };
  } else if (hre.network.name === "localhost") {
    return {
      wbtc: await ethers.getContract("WBTC"),
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


  const { wbtc, stablecoin } = await getValues(wallet);
  
  const wbtcDecimals = await wbtc.decimals();
  const stablecoinDecimals = await stablecoin.decimals();

  const longTokenAmount = expandDecimals(1, wbtcDecimals-2);
  const executionFee = expandDecimals(7, wbtcDecimals - 3);

  const wbtcAllowance = await wbtc.allowance(wallet.address, router.address);
  console.log("wbtc address %s symbol %s", wbtc.address, await wbtc.symbol());
  console.log("wbtc allowance %s", wbtcAllowance.toString());
  if (wbtcAllowance.lt(longTokenAmount.add(executionFee))) {
    console.log("approving wbtc");
    await wbtc.approve(router.address, bigNumberify(2).pow(256).sub(1));
  }

  console.log("wbtc allowance %s", (await wbtc.allowance(wallet.address, router.address)).toString());
  console.log("wbtc balance %s", await wbtc.balanceOf(wallet.address));

  const shortTokenAmount = expandDecimals(50, stablecoinDecimals); // 100 USDC
  const stablecoinAllowance = await stablecoin.allowance(wallet.address, router.address);
  console.log("Stablecoin address %s", stablecoin.address);
  console.log("Stablecoin allowance %s", stablecoinAllowance.toString());
  if (stablecoinAllowance.lt(shortTokenAmount)) {
    console.log("approving USDC");
    await stablecoin.approve(router.address, bigNumberify(2).pow(256).sub(1));
  }
  console.log("Stablecoin allowance %s", await stablecoin.allowance(wallet.address, router.address));
  console.log("Stablecoin balance %s", await stablecoin.balanceOf(wallet.address));

  
  const wbtcUsdMarketAddress = await getMarketTokenAddress(
    wbtc.address,
    wbtc.address,
    stablecoin.address,
    DEFAULT_MARKET_TYPE,
    marketFactory.address,
    roleStore.address,
    dataStore.address
  );
  console.log("market %s", wbtcUsdMarketAddress);
  const marketToken: MarketToken = await ethers.getContractAt("MarketToken", wbtcUsdMarketAddress);
  const marketTokenBalance = await marketToken.balanceOf(wallet.address);
  console.log(`Before deposit market token balance ${marketTokenBalance}`);

  const params: DepositUtils.CreateDepositParamsStruct = {
    receiver: wallet.address,
    callbackContract: ethers.constants.AddressZero,
    market: wbtcUsdMarketAddress,
    minMarketTokens: 0,
    shouldUnwrapNativeToken: false,
    executionFee: executionFee,
    callbackGasLimit: 0,
    initialLongToken: wbtc.address,
    longTokenSwapPath: [],
    initialShortToken: stablecoin.address,
    shortTokenSwapPath: [],
    uiFeeReceiver: ethers.constants.AddressZero,
  };
  console.log("exchange router %s", exchangeRouter.address);
  console.log("creating deposit %s", JSON.stringify(params));

  const multicallArgs = [
    exchangeRouter.interface.encodeFunctionData("sendWnt", [depositVault.address, executionFee]),
    exchangeRouter.interface.encodeFunctionData("sendTokens", [wbtc.address, depositVault.address,longTokenAmount]),
    exchangeRouter.interface.encodeFunctionData("sendTokens", [stablecoin.address, depositVault.address, shortTokenAmount]),
    exchangeRouter.interface.encodeFunctionData("createDeposit", [params]),
  ];
  console.log("multicall args", multicallArgs);

  const tx = await exchangeRouter.connect(wallet).multicall(multicallArgs, {
    value: longTokenAmount.add(executionFee),
    gasLimit: 1000000,
  });

  console.log("transaction sent", tx.hash);
  const receipt = await tx.wait();
  console.log("receipt received: ", receipt.transactionHash);
  console.log("Market token balance %s", await marketToken.balanceOf(wallet.address));
  
}

main()
  .then(() => {
    process.exit(0);
  })
  .catch((ex) => {
    console.error(ex);
    process.exit(1);
  });
