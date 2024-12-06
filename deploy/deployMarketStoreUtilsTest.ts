import { createDeployFunction } from "../utils/deploy";
import { grantRoleIfNotGranted } from "../utils/role";

const func = createDeployFunction({
  contractName: "MarketStoreUtilsTest",
  libraryNames: [
    "MarketStoreUtils"
  ],
  afterDeploy: async ({ deployedContract }) => {
    await grantRoleIfNotGranted(deployedContract.address, "CONTROLLER");
  },
});

func.skip = async({ network }) => {
  const networksToSkip: string[] = ["neoX"];
  const willSkip: boolean = networksToSkip.includes(network.name);
  console.log('Will skip MarketStoreUtilsTest', willSkip);
  return willSkip;
}

export default func;