import { HardhatRuntimeEnvironment } from "hardhat/types";
import { TokensConfig } from "../config/tokens";

import * as keys from "../utils/keys";
import { setUintIfDifferent } from "../utils/dataStore";
import 'hardhat-deploy';

const func = async ({ getNamedAccounts, deployments, dFun, network }: HardhatRuntimeEnvironment) => {
  console.log('Deploying new ownable mintable tokens');
  const runForNetworks = ['localhost', 'hardhat', 'neoXT4'];

  if (!runForNetworks.includes(network.name)) {
    return;
  }

  const { deploy, log } = deployments;
  const { deployer } = await getNamedAccounts();
  const tokens: TokensConfig = {
    WETH: {
      deploy: true,
      decimals: 18,
      transferGasLimit: 200 * 1000,
    },
    WBTC: {
      deploy: true,
      decimals: 18,
      transferGasLimit: 200 * 1000,
    },
    USDT: {
      deploy: true,
      decimals: 18,
      transferGasLimit: 200 * 1000,
    },
    USDC: {
      deploy: true,
      decimals: 18,
      transferGasLimit: 200 * 1000,
    }
  };

  if (runForNetworks.includes(network.name)) {
    for (const [tokenSymbol, token] of Object.entries(tokens)) {
      // const newTokenSymbol = 'Ownable' + tokenSymbol;
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
        contract: "OwnableMintableToken",
        args: [tokenSymbol, tokenSymbol, token.decimals],
        gasLimit: 2500000,
      });
  
      tokens[tokenSymbol].address = address;
      // if (newlyDeployed) {
      //   const tokenContract = await ethers.getContractAt("OwnableMintableToken", address) as OwnableMintableToken;
      //   await tokenContract.mint(deployer, expandDecimals(1000000000, token.decimals), { maxFeePerGas: '100000', maxPriorityFeePerGas: '100000' });
      //   await (await tokenContract.transferOwnership('0xF3e7699dfAd3E889A471A542aC5FE26CD2bD5375')).wait();
      //   const balance = await tokenContract.balanceOf(deployer);
      //   console.log(`The balance of ${deployer} for token ${tokenSymbol} is ${balance.toString()}`);
      // }
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
};

func.tags = ["OwnableTokens"];
func.dependencies = ["DataStore"];
export default func;
