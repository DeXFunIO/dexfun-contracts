import { createDeployFunction } from "../utils/deploy";
import { grantRoleIfNotGranted } from "../utils/role";

const func = createDeployFunction({
  contractName: "RoleStore",
  id: "RoleStore_3",
  afterDeploy: async () => {
    // grant role admin to safe address
    await grantRoleIfNotGranted("0xFe35FF29D0C507969869E0a64ad3d53B434fa402", "ROLE_ADMIN");
  }
});

func.dependencies = func.dependencies.concat(["FundAccounts"]);

export default func;
