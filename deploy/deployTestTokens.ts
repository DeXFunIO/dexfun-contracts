import { setBalance } from "@nomicfoundation/hardhat-network-helpers";
import { HardhatRuntimeEnvironment } from "hardhat/types";
import { TokenConfig } from "../config/tokens";
import { MintableToken } from '../typechain-types';

import * as keys from "../utils/keys";
import { setAddressIfDifferent, setUintIfDifferent } from "../utils/dataStore";
import { expandDecimals } from "../utils/math";

const func = async ({ getNamedAccounts, deployments, dFun, network }: HardhatRuntimeEnvironment) => {
  const runForNetworks = ['localhost', 'hardhat'];
  const { deploy, log } = deployments;
  const { deployer } = await getNamedAccounts();
  const { getTokens } = dFun;
  const tokens: Record<string, TokenConfig> = await getTokens();

  if (!runForNetworks.includes(network.name)) {
    return;
  }

  if (runForNetworks.includes(network.name)) {
    for (const [tokenSymbol, token] of Object.entries(tokens)) {
      const newTokenSymbol = tokenSymbol + 'New';
      if (token.synthetic || !token.deploy) {
        continue;
      }
  
      if (network.live) {
        console.warn("WARN: Deploying token on live network");
      }
  
      const existingToken = await deployments.getOrNull(tokenSymbol);
      if (existingToken) {
        log(`Reusing ${tokenSymbol} at ${existingToken.address}`);
        console.warn(`WARN: bytecode diff is not checked`);
        tokens[tokenSymbol].address = existingToken.address;
        continue;
      }
  
      const { address, newlyDeployed } = await deploy(tokenSymbol, {
        from: deployer,
        log: true,
        contract: token.wrappedNative ? "WGAS10" : "MintableToken",
        args: token.wrappedNative ? [] : [tokenSymbol, tokenSymbol, token.decimals],
      });
  
      tokens[tokenSymbol].address = address;
      if (newlyDeployed) {
        if (token.wrappedNative && !network.live) {
          await setBalance(address, expandDecimals(1000, token.decimals));
        }
        const tokenContract = await ethers.getContractAt("MintableToken", address) as MintableToken;
        await tokenContract.mint(deployer, expandDecimals(1000000000, token.decimals));
        const balance = await tokenContract.balanceOf(deployer);
        console.log(`The balance of ${deployer.address} for token ${tokenSymbol} is ${balance.toString()}`);
      }
    }
  }
  
  for (const [tokenSymbol, token] of Object.entries(tokens)) {
    if (token.synthetic) {
      continue;
    }

    await setUintIfDifferent(
      keys.tokenTransferGasLimit(token.address!),
      token.transferGasLimit,
      `${tokenSymbol} transfer gas limit`
    );
  }
  const wrappedAddress = Object.values(tokens).find((token) => token.wrappedNative)?.address;
  if (!wrappedAddress) {
    throw new Error("No wrapped native token found");
  }
  await setAddressIfDifferent(keys.WNT, wrappedAddress, "WNT");
};

func.tags = ["Tokens"];
func.dependencies = ["DataStore"];
export default func;
