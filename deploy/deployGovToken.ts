import { createDeployFunction } from "../utils/deploy";

const func = createDeployFunction({
  contractName: "GovToken",
  id: "GovToken_1",
  dependencyNames: ["RoleStore"],
  getDeployArgs: async ({ dependencyContracts }) => {
    return [
      dependencyContracts.RoleStore.address, // roleStore
      "DFUN DAO", // name
      "DFUN_DAO", // symbol
      18, // decimals
    ];
  },
});

func.skip = async() => true;

export default func;
