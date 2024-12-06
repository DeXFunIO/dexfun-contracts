import { grantRoleIfNotGranted } from "../utils/role";
import { createDeployFunction } from "../utils/deploy";
import { setAddressIfDifferent } from "../utils/dataStore";
import * as keys from "../utils/keys";

const constructorContracts = ["RoleStore", "DataStore", "EventEmitter"];



const func = createDeployFunction({
  contractName: "FeeHandler",
  dependencyNames: constructorContracts,
  getDeployArgs: async ({ dependencyContracts }) => {
    return constructorContracts.map((dependencyName) => dependencyContracts[dependencyName].address);
  },
  libraryNames: ["MarketUtils"],
  afterDeploy: async ({ deployedContract, dFun }) => {
    // const rolesConfig = await dFun.getRoles();

    await grantRoleIfNotGranted(deployedContract.address, "CONTROLLER");

    // await setAddressIfDifferent(
    //   keys.FEE_RECEIVER,
    //   Object.keys(rolesConfig.FEE_KEEPER)[0],
    //   "setting up FEE_RECEIVER"
    // );
  },
});

export default func;
