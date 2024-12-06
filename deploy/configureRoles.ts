import { grantRoleIfNotGranted, revokeRoleIfGranted } from "../utils/role";

const rolesToRemove = {
  localhost: [
    {
      role: "ORDER_KEEPER",
      member: "some address"
    }
  ],
  hardhat: [],
  neoXT4: [],
  neoX: []
};

const func = async ({ dFun, network }) => {
  const rolesConfig = await dFun.getRoles();
  for (const role in rolesConfig) {
    const accounts = rolesConfig[role];
    for (const account in accounts) {
      await grantRoleIfNotGranted(account, role);
    }
  }

  const _rolesToRemove = rolesToRemove[network.name];
  for (const { account, role } of _rolesToRemove) {
    await revokeRoleIfGranted(account, role);
  }
};

func.tags = ["Roles"];
func.dependencies = ["RoleStore"];

export default func;
