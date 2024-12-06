import { HardhatRuntimeEnvironment } from "hardhat/types";
import 'hardhat-deploy';
import { RewardDistributor } from "../typechain-types/contracts/staking/RewardDistributor";
import { RewardTracker } from "../typechain-types/contracts/staking/RewardTracker";
import { RewardRouterV2 } from "../typechain-types/contracts/staking/RewardRouterV2";
import { Vester } from "../typechain-types/contracts/staking/Vester";
import "@nomicfoundation/hardhat-ethers";
import { ethers } from "ethers";


import { DeployOptions, DeployResult } from "hardhat-deploy/types";

const deployContract = async <T>(
  deploy: (name: string, options: DeployOptions) => Promise<DeployResult>,
  contractName: string,
  args: any[],
  deployer: ethers.Signer,
  name?: string
) => {
  const deployed = await deploy(name ? name : contractName, {
    contract: contractName,
    from: await deployer.getAddress(),
    args,
    log: true
  });

  return new ethers.Contract(deployed.address, deployed.abi) as T;
}

const sendTxn = async (txnPromise: Promise<any>, label: string) => {
  console.info(`Processsing ${label}:`)
  const txn = await txnPromise;
  console.info(`Sending ${label}...`)
  await txn.wait();
  console.info(`... Sent! ${txn.hash}`)
  return txn;
}


const func = async ({ deployments, getNamedAccounts, network, ethers }: HardhatRuntimeEnvironment) => {

  // We skip this
  if (true) {
    return;
  }
  const { execute, get, read, log, deploy } = deployments;
  const { deployer } = await getNamedAccounts();
  // How do I get WGAS
  const signer = await ethers.getSigner(deployer);
  const wnt = { address: '' };

  if (network.name === "hardhat" || network.name === "localhost") {

    if (process.env.NETWORK === 'NEOX') {
      wnt.address = (await get("WGAS")).address;
    } else {
      wnt.address = (await get("WETH")).address;
    }

  }
  const dFun = await deploy('DFUN', {
    from: deployer,
    log: true
  });

  const esDFun = await deploy("EsDFUN", {
    from: deployer,
    log: true
  });

  const bnDFun = await deploy("BnDFUN", {
    contract: "MintableBaseToken",
    from: deployer,
    args: ["bnDFUN", "Bonus DFUN", 0],
    log: true
  });


  const bnAlp = { address: ethers.constants.AddressZero };
  const alp = { address: ethers.constants.AddressZero };
  const stakedAlpTracker = { address: ethers.constants.AddressZero }
  const bonusAlpTracker = { address: ethers.constants.AddressZero }
  const feeAlpTracker = { address: ethers.constants.AddressZero }

  const stakedDFunTracker = await deployContract<RewardTracker>(deploy, "RewardTracker", ["Staked DFUN", "sDFUN"], signer as any, "StakedDFunTracker");
  const stakedDFunDistributor = await deployContract<RewardDistributor>(deploy, 'RewardDistributor', [esDFun.address, stakedDFunTracker.address], signer as any);
  await sendTxn(stakedDFunTracker.connect(signer as any).initialize([dFun.address, esDFun.address], stakedDFunDistributor.address), "stakedDFunTracker.initialize");
  await sendTxn(stakedDFunDistributor.connect(signer as any).updateLastDistributionTime(), "stakedDFunDistributor.updateLastDistributionTime");

  const bonusDFunTracker = await deployContract<RewardTracker>(deploy, "RewardTracker", ["Staked + Bonus DFUN", "sbDFUN"], signer as any, "BonusDFunTracker");
  const bonusDFunDistributor = await deployContract<RewardDistributor>(deploy, 'BonusDistributor', [bnDFun.address, bonusDFunTracker.address], signer as any);
  await sendTxn(bonusDFunTracker.connect(signer as any).initialize([stakedDFunTracker.address], bonusDFunDistributor.address), "bonusDFunTracker.initialize");
  await sendTxn(bonusDFunDistributor.connect(signer as any).updateLastDistributionTime(), "bonusDFunDistributor.updateLastDistributionTime");

  const feeDFunTracker = await deployContract<RewardTracker>(deploy, "RewardTracker", ["Staked + Bonus + Fee DFUN", "sbfDFUN"], signer as any, "FeeDFunTracker");
  const feeDFunDistributor = await deployContract<RewardDistributor>(deploy, 'RewardDistributor', [wnt.address, feeDFunTracker.address], signer as any);
  await sendTxn(feeDFunTracker.connect(signer as any).initialize([dFun.address, esDFun.address], stakedDFunDistributor.address), "bonusDFunTracker.initialize");
  await sendTxn(feeDFunDistributor.connect(signer as any).updateLastDistributionTime(), "bonusDFunDistributor.updateLastDistributionTime");

  await sendTxn(stakedDFunTracker.connect(signer as any).setInPrivateTransferMode(true), "stakedDFunTracker.setInPrivateTransferMode");
  await sendTxn(stakedDFunTracker.connect(signer as any).setInPrivateStakingMode(true), "stakedDFunTracker.setInPrivateStakingMode");
  await sendTxn(bonusDFunTracker.connect(signer as any).setInPrivateTransferMode(true), "bonusDFunTracker.setInPrivateTransferMode");
  await sendTxn(bonusDFunTracker.connect(signer as any).setInPrivateStakingMode(true), "bonusDFunTracker.setInPrivateStakingMode");
  await sendTxn(bonusDFunTracker.connect(signer as any).setInPrivateClaimingMode(true), "bonusDFunTracker.setInPrivateClaimingMode");
  await sendTxn(feeDFunTracker.connect(signer as any).setInPrivateTransferMode(true), "feeDFunTracker.setInPrivateTransferMode");
  await sendTxn(feeDFunTracker.connect(signer as any).setInPrivateStakingMode(true), "feeDFunTracker.setInPrivateStakingMode");

  // We now deploy the vesting contracts.
  const vestingDuration = 365 * 24 * 60 * 60;
  const dFunVester = await deployContract<Vester>(deploy, "Vester", [
    "Vested DFUN",
    "vDFUN",
    vestingDuration,
    esDFun.address,
    feeDFunTracker.address,
    dFun.address,
    stakedDFunTracker.address
  ], signer as any);

  const rewardRouter = await deployContract<RewardRouterV2>(deploy, "RewardRouterV2", [], signer as any);
  await sendTxn(rewardRouter.connect(signer as any).initialize(
    wnt.address,
    dFun.address,
    esDFun.address,
    bnDFun.address,
    stakedDFunTracker.address,
    bonusDFunTracker.address,
    feeDFunTracker.address,
    dFunVester.address
  ), "RewardRouterV2.initialize");
};

func.dependencies = ["Tokens"];
func.tags = ["Rewards"];

export default func;
