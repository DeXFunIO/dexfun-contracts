import { HardhatRuntimeEnvironment } from "hardhat/types";

import * as keys from "../utils/keys";
import { setUintIfDifferent } from "../utils/dataStore";
import 'hardhat-deploy';
import { BigNumber, ethers } from "ethers";

const func = async ({ getNamedAccounts, deployments, dFun, network }: HardhatRuntimeEnvironment) => {
  console.log('Deploying new fun tokens');
  const { deploy, log } = deployments;
  const { deployer } = await getNamedAccounts();

  type FunTokenConfig = {
    [tokenSymbol: string]: {
      address?: string;
      itemId: number;
      deploy: boolean;
      decimals: 18,
      transferGasLimit: 200000
      maxSupply?: BigNumber | undefined,
      owner: string
    }
  }

  const tokens: FunTokenConfig = {
    FUNUSDT: {
      itemId: 1,
      deploy: true,
      decimals: 18,
      transferGasLimit: 200000,
      maxSupply: ethers.constants.MaxUint256,
      owner: network.name === 'neoX' ? ethers.utils.getAddress('0x8a6Fc918d1A58295CE01af914565cc25F3dbBD2c') : deployer
    },
    FUNBTC: {
      itemId: 2,
      deploy: true,
      decimals: 18,
      transferGasLimit: 200000,
      maxSupply: ethers.utils.parseEther("21000000"),
      owner: network.name === 'neoX' ? ethers.utils.getAddress('0x8a6Fc918d1A58295CE01af914565cc25F3dbBD2c') : deployer
    },
    FUNETH: {
      itemId: 3,
      deploy: true,
      decimals: 18,
      transferGasLimit: 200000, //120mil
      maxSupply: ethers.utils.parseEther("120000000"),
      owner: network.name === 'neoX' ? ethers.utils.getAddress('0x8a6Fc918d1A58295CE01af914565cc25F3dbBD2c') : deployer
    },
    FUNGAS: {
      itemId: 4,
      deploy: true,
      decimals: 18,
      transferGasLimit: 200000, //65 mil
      maxSupply: ethers.utils.parseEther("65000000"),
      owner: network.name === 'neoX' ? ethers.utils.getAddress('0x8a6Fc918d1A58295CE01af914565cc25F3dbBD2c') : deployer
    },
    FUNUSDC: {
      itemId: 5,
      deploy: true,
      decimals: 18,
      transferGasLimit: 200000,
      maxSupply: ethers.constants.MaxUint256,
      owner: network.name === 'neoX' ? ethers.utils.getAddress('0x8a6Fc918d1A58295CE01af914565cc25F3dbBD2c') : deployer
    },
  };
  
  console.log('===================================== DEPLOYING FUN TOKENS ==============================================');
  for (const [tokenSymbol, token] of Object.entries(tokens)) {
    if (!token.deploy) {
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

    console.log(token);

    const { address, newlyDeployed } = await deploy(tokenSymbol, {
      from: deployer,
      log: true,
      contract: "FunToken",
      args: [tokenSymbol, tokenSymbol, token.decimals, token.itemId, token.owner, token.maxSupply], // In this case deployer will be 
      gasLimit: 2500000,
    });

    tokens[tokenSymbol].address = address;
    // if (newlyDeployed) {
    //   const tokenContract = await ethers.getContractAt("FunToken", address) as OwnableMintableToken;
    //   (await tokenContract.transferOwnership(owner, { maxFeePerGas: '20000000000', maxPriorityFeePerGas: '20000000000' })).wait();
    // }
  }

  
  for (const [tokenSymbol, token] of Object.entries(tokens)) {
    await setUintIfDifferent(
      keys.tokenTransferGasLimit(token.address!),
      token.transferGasLimit,
      `${tokenSymbol} transfer gas limit`
    );
  }
};

func.tags = ["FunTokens"];
func.dependencies = ["DataStore"];
export default func;
