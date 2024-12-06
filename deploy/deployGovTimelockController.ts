import { createDeployFunction } from "../utils/deploy";

const func = createDeployFunction({
  contractName: "GovTimelockController",
  id: "GovTimelockController_1",
  getDeployArgs: async ({ getNamedAccounts }) => {
    const { deployer } = await getNamedAccounts();
    return [
      "DFUN Gov Timelock Controller", // name
      24 * 60 * 60, // minDelay
      [deployer], // proposers
      [deployer], // executors
      deployer,
    ];
  },
});

func.skip = async () => true;

export default func;
