import { HardhatRuntimeEnvironment } from "hardhat/types";
import * as keys from "../utils/keys";
import { setUintIfDifferent } from "../utils/dataStore";
import "@nomiclabs/hardhat-ethers";

const func = async ({ deployments, getNamedAccounts, dFun, ethers }: HardhatRuntimeEnvironment) => {
  const { read, execute, log } = deployments;
  const { deployer } = await getNamedAccounts();
  const oracleConfig = await dFun.getOracle();
  const oracleSigners = oracleConfig.signers.map((s) => ethers.utils.getAddress(s));

  const existingSignersCount = await read("OracleStore", "getSignerCount");
  const existingSigners = await read("OracleStore", "getSigners", 0, existingSignersCount);
  log("existing signers", existingSigners.join(","));

  for (const oracleSigner of oracleSigners) {
    if (!existingSigners.includes(oracleSigner)) {
      log("adding oracle signer", oracleSigner);
      await execute("OracleStore", { from: deployer, log: true }, "addSigner", oracleSigner);
    }
  }

  for (const existingSigner of existingSigners) {
    if (!oracleSigners.includes(existingSigner)) {
      log("removing oracle signer", existingSigner);
      await execute("OracleStore", { from: deployer, log: true }, "removeSigner", existingSigner);
    }
  }

  await setUintIfDifferent(keys.MIN_ORACLE_SIGNERS, oracleConfig.minOracleSigners, "min oracle signers");
};
func.tags = ["OracleSigners"];
func.dependencies = ["RoleStore", "OracleStore", "DataStore"];
export default func;
